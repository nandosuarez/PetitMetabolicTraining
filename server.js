require("dotenv").config();

const express = require("express");
const path = require("path");
const { query, checkConnection } = require("./server/db");
const {
  clearSessionCookie,
  countActiveAdminUsers,
  createAppUser,
  createSession,
  deleteSession,
  deleteSessionsForUser,
  findUserByUsername,
  getSessionTokenFromRequest,
  getSessionUserFromToken,
  getUserAuthById,
  getUserById,
  listAppUsers,
  normalizeRole,
  roleLabel,
  setAppUserPassword,
  setAppUserActiveStatus,
  setSessionCookie,
  setTemporaryAppUserPassword,
  upsertAppUser,
  verifyPassword,
} = require("./server/auth");

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const rootDir = __dirname;

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const catalogGroups = new Set([
  "gimnasioCategorias",
  "restauranteCategorias",
  "tipos",
  "mediosPago",
  "estadosPago",
]);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(rootDir));

app.get("/api/health", asyncHandler(async (_req, res) => {
  const result = await checkConnection();
  res.json({
    ok: true,
    now: result.now,
  });
}));

app.get("/api/auth/session", asyncHandler(async (req, res) => {
  const user = await readCurrentUser(req);

  if (!user) {
    return res.status(200).json({
      authenticated: false,
    });
  }

  res.json({
    authenticated: true,
    user: withRoleLabel(user),
  });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const userRow = await findUserByUsername(username);

  if (!userRow || !userRow.is_active || !verifyPassword(password, userRow)) {
    return res.status(401).json({
      error: "Usuario o contraseña incorrectos.",
    });
  }

  const session = await createSession(userRow.id);
  setSessionCookie(res, session.token, session.expiresAt);

  res.json({
    authenticated: true,
    user: withRoleLabel({
      id: Number(userRow.id),
      username: userRow.username,
      fullName: userRow.full_name || "",
      role: userRow.role,
      mustChangePassword: Boolean(userRow.must_change_password),
      isActive: userRow.is_active,
    }),
  });
}));

app.post("/api/auth/logout", asyncHandler(async (req, res) => {
  const token = getSessionTokenFromRequest(req);

  if (token) {
    await deleteSession(token);
  }

  clearSessionCookie(res);
  res.status(204).send();
}));

app.use("/api", asyncHandler(async (req, res, next) => {
  if (
    req.path === "/health" ||
    req.path === "/auth/session" ||
    req.path === "/auth/login" ||
    req.path === "/auth/logout"
  ) {
    return next();
  }

  const user = await readCurrentUser(req);

  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({
      error: "Debes iniciar sesión para continuar.",
    });
  }

  req.authUser = user;

  if (
    user.mustChangePassword &&
    req.path !== "/auth/change-password"
  ) {
    return res.status(403).json({
      error:
        "Debes cambiar tu contraseña temporal antes de continuar en la plataforma.",
      mustChangePassword: true,
    });
  }

  next();
}));

app.post("/api/auth/change-password", asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  const cleanCurrentUserId = Number(req.authUser?.id || 0);

  if (!cleanCurrentUserId) {
    return res.status(401).json({
      error: "Debes iniciar sesión para actualizar tu contraseña.",
    });
  }

  if (!currentPassword) {
    return res.status(400).json({
      error: "Debes escribir la contraseña actual o temporal.",
    });
  }

  if (newPassword.length < 10) {
    return res.status(400).json({
      error: "La nueva contraseña debe tener al menos 10 caracteres.",
    });
  }

  const userRow = await getUserAuthById(cleanCurrentUserId);
  if (!userRow || !userRow.is_active) {
    return res.status(404).json({
      error: "Usuario no encontrado o inactivo.",
    });
  }

  if (!verifyPassword(currentPassword, userRow)) {
    return res.status(400).json({
      error: "La contraseña actual o temporal no coincide.",
    });
  }

  if (verifyPassword(newPassword, userRow)) {
    return res.status(400).json({
      error: "La nueva contraseña debe ser diferente a la actual.",
    });
  }

  const updatedUser = await setAppUserPassword(cleanCurrentUserId, newPassword, {
    mustChangePassword: false,
  });

  res.json({
    authenticated: true,
    user: withRoleLabel(updatedUser),
  });
}));

app.get("/api/users", requireAdmin, asyncHandler(async (_req, res) => {
  const users = await listAppUsers();
  res.json({
    users: users.map(withRoleLabel),
  });
}));

app.post("/api/users", requireAdmin, asyncHandler(async (req, res) => {
  const payload = normalizeUserPayload(req.body);
  validateUserCreationPayload(payload);

  const user = await createAppUser({
    ...payload,
    mustChangePassword: true,
  });
  res.status(201).json(withRoleLabel(user));
}));

app.patch(
  "/api/users/:id/status",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const targetUserId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Usuario invalido." });
    }

    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    if (!isActive) {
      if (Number(req.authUser.id) === targetUserId) {
        return res.status(400).json({
          error: "No puedes inactivar tu propio usuario.",
        });
      }

      if (targetUser.role === "administrador") {
        const activeAdmins = await countActiveAdminUsers();
        if (activeAdmins <= 1) {
          return res.status(400).json({
            error:
              "Debe existir al menos un administrador activo en el sistema.",
          });
        }
      }
    }

    const updatedUser = await setAppUserActiveStatus(targetUserId, isActive);

    if (!updatedUser) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    if (!isActive) {
      await deleteSessionsForUser(targetUserId);
    }

    res.json(withRoleLabel(updatedUser));
  })
);

app.post(
  "/api/users/:id/temporary-password",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const targetUserId = Number(req.params.id);
    const temporaryPassword = String(req.body.temporaryPassword || "");

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Usuario invalido." });
    }

    if (temporaryPassword.length < 10) {
      return res.status(400).json({
        error: "La contraseña temporal debe tener al menos 10 caracteres.",
      });
    }

    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const updatedUser = await setTemporaryAppUserPassword(
      targetUserId,
      temporaryPassword
    );

    await deleteSessionsForUser(targetUserId);

    res.json(withRoleLabel(updatedUser));
  })
);

app.get("/api/bootstrap", asyncHandler(async (req, res) => {
  const isAssistantOperative = req.authUser?.role === "asistente_operativo";

  const [catalogResult, movementResult, portfolioResult, notesResult] =
    await Promise.all([
    query(
      `
        select group_name, value
        from catalog_items
        order by group_name asc, sort_order asc, value asc
      `
    ),
    query(
      `
        select *
        from movements
        ${isAssistantOperative ? "where created_at >= now() - interval '24 hours'" : ""}
        order by movement_date desc, updated_at desc, id desc
      `
    ),
    query(
      `
        select *
        from movements
        where balance_due > 0
        order by movement_date desc, updated_at desc, id desc
      `
    ),
    isAssistantOperative
      ? Promise.resolve({ rows: [] })
      : query(
          `
            select note_type, note_key, content
            from report_notes
            order by note_type asc, note_key asc
          `
        ),
  ]);

  res.json({
    lists: mapCatalogRows(catalogResult.rows),
    movements: movementResult.rows.map(mapMovementRow),
    portfolioMovements: portfolioResult.rows.map(mapMovementRow),
    notes: mapNotesRows(notesResult.rows),
  });
}));

app.post("/api/movements", asyncHandler(async (req, res) => {
  const payload = normalizeMovementPayload(req.body);
  validateMovementPayload(payload);

  const result = await query(
    `
      insert into movements (
        business_line,
        movement_date,
        movement_type,
        category,
        client_name,
        description,
        payment_status,
        payment_method,
        total_amount,
        paid_amount,
        balance_due,
        cash_flow,
        year,
        month_number,
        month_name,
        notes
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16
      )
      returning *
    `,
    [
      payload.linea,
      payload.fecha,
      payload.tipo,
      payload.categoria,
      payload.cliente,
      payload.descripcion,
      payload.estadoPago,
      payload.medioPago,
      payload.valorTotal,
      payload.abono,
      payload.saldoPendiente,
      payload.flujoNeto,
      payload.ano,
      payload.mesNumero,
      payload.mesNombre,
      payload.observaciones,
    ]
  );

  res.status(201).json(mapMovementRow(result.rows[0]));
}));

app.put("/api/movements/:id", asyncHandler(async (req, res) => {
  await assertMovementMutationAllowed(req.authUser, Number(req.params.id));

  const payload = normalizeMovementPayload(req.body);
  validateMovementPayload(payload);

  const result = await query(
    `
      update movements
      set
        business_line = $2,
        movement_date = $3,
        movement_type = $4,
        category = $5,
        client_name = $6,
        description = $7,
        payment_status = $8,
        payment_method = $9,
        total_amount = $10,
        paid_amount = $11,
        balance_due = $12,
        cash_flow = $13,
        year = $14,
        month_number = $15,
        month_name = $16,
        notes = $17,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      Number(req.params.id),
      payload.linea,
      payload.fecha,
      payload.tipo,
      payload.categoria,
      payload.cliente,
      payload.descripcion,
      payload.estadoPago,
      payload.medioPago,
      payload.valorTotal,
      payload.abono,
      payload.saldoPendiente,
      payload.flujoNeto,
      payload.ano,
      payload.mesNumero,
      payload.mesNombre,
      payload.observaciones,
    ]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "Movimiento no encontrado." });
  }

  res.json(mapMovementRow(result.rows[0]));
}));

app.delete("/api/movements/:id", asyncHandler(async (req, res) => {
  await assertMovementMutationAllowed(req.authUser, Number(req.params.id));

  const result = await query(
    "delete from movements where id = $1 returning id",
    [Number(req.params.id)]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "Movimiento no encontrado." });
  }

  res.status(204).send();
}));

app.post("/api/notes", requireAdmin, asyncHandler(async (req, res) => {
  const noteType = String(req.body.noteType || "").trim();
  const noteKey = String(req.body.noteKey || "").trim();
  const content = String(req.body.content || "");

  if (!["daily", "weekly"].includes(noteType)) {
    return res.status(400).json({ error: "Tipo de nota invalido." });
  }

  if (!noteKey) {
    return res.status(400).json({ error: "La llave de la nota es obligatoria." });
  }

  await query(
    `
      insert into report_notes (note_type, note_key, content)
      values ($1, $2, $3)
      on conflict (note_type, note_key)
      do update set content = excluded.content, updated_at = now()
    `,
    [noteType, noteKey, content]
  );

  res.json({
    noteType,
    noteKey,
    content,
  });
}));

app.post("/api/catalogs/:group/items", requireAdmin, asyncHandler(async (req, res) => {
  const group = String(req.params.group || "");
  const value = String(req.body.value || "").trim();

  if (!catalogGroups.has(group)) {
    return res.status(400).json({ error: "Grupo de catalogo invalido." });
  }

  if (!value) {
    return res.status(400).json({ error: "El valor es obligatorio." });
  }

  await query(
    `
      insert into catalog_items (group_name, value, sort_order)
      values (
        $1,
        $2,
        coalesce((select max(sort_order) + 1 from catalog_items where group_name = $1), 1)
      )
      on conflict (group_name, value) do nothing
    `,
    [group, value]
  );

  res.status(201).json({ ok: true });
}));

app.delete("/api/catalogs/:group/items", requireAdmin, asyncHandler(async (req, res) => {
  const group = String(req.params.group || "");
  const value = String(req.query.value || "").trim();

  if (!catalogGroups.has(group)) {
    return res.status(400).json({ error: "Grupo de catalogo invalido." });
  }

  if (!value) {
    return res.status(400).json({ error: "El valor es obligatorio." });
  }

  await query(
    "delete from catalog_items where group_name = $1 and value = $2",
    [group, value]
  );

  res.status(204).send();
}));

app.get("*", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

function normalizeUserPayload(body) {
  return {
    username: String(body.username || "").trim(),
    password: String(body.password || ""),
    fullName: String(body.fullName || "").trim(),
    role: normalizeRole(body.role),
  };
}

function validateUserCreationPayload(payload) {
  if (!payload.username) {
    throw httpError(400, "El usuario es obligatorio.");
  }

  if (!payload.role) {
    throw httpError(400, "El perfil del usuario es obligatorio.");
  }

  if (payload.password.length < 10) {
    throw httpError(
      400,
      "La contraseña debe tener al menos 10 caracteres."
    );
  }
}

function normalizeMovementPayload(body) {
  const fecha = String(body.fecha || "").trim();
  const [ano, mesNumero] = fecha.split("-").map(Number);
  const valorTotal = Number(body.valorTotal || 0);
  const abono = Number(body.abono || 0);
  const saldoPendiente = Math.max(valorTotal - abono, 0);
  const tipo = String(body.tipo || "").trim();

  return {
    linea: String(body.linea || "").trim(),
    fecha,
    tipo,
    categoria: String(body.categoria || "").trim(),
    cliente: String(body.cliente || "").trim(),
    descripcion: String(body.descripcion || "").trim(),
    estadoPago: String(body.estadoPago || "").trim(),
    medioPago: String(body.medioPago || "").trim(),
    valorTotal,
    abono,
    saldoPendiente,
    flujoNeto: tipo === "Ingreso" ? abono : abono * -1,
    ano,
    mesNumero,
    mesNombre: monthNames[(mesNumero || 1) - 1] || "",
    observaciones: String(body.observaciones || "").trim(),
  };
}

function validateMovementPayload(payload) {
  if (!["Gimnasio", "Restaurante"].includes(payload.linea)) {
    throw httpError(400, "Linea de negocio invalida.");
  }

  if (!payload.fecha) {
    throw httpError(400, "La fecha es obligatoria.");
  }

  if (!["Ingreso", "Gasto"].includes(payload.tipo)) {
    throw httpError(400, "Tipo de movimiento invalido.");
  }

  if (!payload.categoria) {
    throw httpError(400, "La categoria es obligatoria.");
  }

  if (!payload.descripcion) {
    throw httpError(400, "La descripcion es obligatoria.");
  }

  if (!["Pagado", "Parcial", "Pendiente"].includes(payload.estadoPago)) {
    throw httpError(400, "Estado de pago invalido.");
  }

  if (!payload.medioPago) {
    throw httpError(400, "El medio de pago es obligatorio.");
  }

  if (!(payload.valorTotal > 0)) {
    throw httpError(400, "El valor total debe ser mayor a cero.");
  }

  if (payload.abono < 0) {
    throw httpError(400, "El abono no puede ser negativo.");
  }

  if (payload.abono > payload.valorTotal) {
    throw httpError(400, "El abono no puede ser mayor que el valor total.");
  }

  const statusRules = {
    Pagado: payload.abono === payload.valorTotal,
    Parcial: payload.abono > 0 && payload.abono < payload.valorTotal,
    Pendiente: payload.abono === 0,
  };

  if (!statusRules[payload.estadoPago]) {
    throw httpError(
      400,
      "El estado de pago no coincide con el valor total y el abono."
    );
  }
}

function mapCatalogRows(rows) {
  const lists = {
    gimnasioCategorias: [],
    restauranteCategorias: [],
    tipos: [],
    mediosPago: [],
    estadosPago: [],
  };

  rows.forEach((row) => {
    if (!lists[row.group_name]) {
      lists[row.group_name] = [];
    }

    lists[row.group_name].push(row.value);
  });

  return lists;
}

function mapMovementRow(row) {
  return {
    id: row.id,
    linea: row.business_line,
    fecha: row.movement_date,
    tipo: row.movement_type,
    categoria: row.category,
    cliente: row.client_name || "",
    descripcion: row.description,
    estadoPago: row.payment_status,
    medioPago: row.payment_method,
    valorTotal: Number(row.total_amount),
    abono: Number(row.paid_amount),
    saldoPendiente: Number(row.balance_due),
    flujoNeto: Number(row.cash_flow),
    ano: row.year,
    mesNumero: row.month_number,
    mesNombre: row.month_name,
    observaciones: row.notes || "",
    actualizadoEn: row.updated_at,
  };
}

function mapNotesRows(rows) {
  const notes = {
    daily: {},
    weekly: {},
  };

  rows.forEach((row) => {
    if (!notes[row.note_type]) {
      notes[row.note_type] = {};
    }

    notes[row.note_type][row.note_key] = row.content;
  });

  return notes;
}

async function assertMovementMutationAllowed(user, movementId) {
  if (!Number.isInteger(movementId) || movementId <= 0) {
    throw httpError(400, "Movimiento invalido.");
  }

  if (user?.role !== "asistente_operativo") {
    return;
  }

  const recentResult = await query(
    `
      select id
      from movements
      where id = $1
        and created_at >= now() - interval '24 hours'
      limit 1
    `,
    [movementId]
  );

  if (recentResult.rows.length) {
    return;
  }

  const existsResult = await query(
    `
      select id
      from movements
      where id = $1
      limit 1
    `,
    [movementId]
  );

  if (!existsResult.rows.length) {
    throw httpError(404, "Movimiento no encontrado.");
  }

  throw httpError(
    403,
    "El asistente operativo solo puede modificar movimientos registrados en las ultimas 24 horas."
  );
}

function requireAdmin(req, res, next) {
  if (req.authUser?.role !== "administrador") {
    return res.status(403).json({
      error: "Solo el perfil administrador puede gestionar usuarios.",
    });
  }

  next();
}

function withRoleLabel(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    roleLabel: roleLabel(user.role),
  };
}

async function readCurrentUser(req) {
  const token = getSessionTokenFromRequest(req);

  if (!token) {
    return null;
  }

  return getSessionUserFromToken(token);
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

app.use((error, _req, res, _next) => {
  const status = Number(error.status || 500);
  const message =
    status >= 500 ? "Ocurrio un error interno en el servidor." : error.message;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ error: message });
});

async function start() {
  await checkConnection();
  await ensureBootstrapAdmin();

  app.listen(port, host, () => {
    console.log(`Servidor listo en http://${host}:${port}`);
  });
}

start().catch((error) => {
  console.error("No se pudo iniciar el servidor.");
  console.error(error.message);
  process.exit(1);
});

async function ensureBootstrapAdmin() {
  const totalUsersResult = await query(
    "select count(*)::integer as total from app_users"
  );
  const totalUsers = Number(totalUsersResult.rows[0]?.total || 0);

  if (totalUsers > 0) {
    return;
  }

  const username = String(process.env.BOOTSTRAP_ADMIN_USERNAME || "").trim();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || "");
  const fullName = String(process.env.BOOTSTRAP_ADMIN_FULL_NAME || "").trim();

  if (!username || !password) {
    if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
      throw new Error(
        "No hay usuarios creados. Define BOOTSTRAP_ADMIN_USERNAME y BOOTSTRAP_ADMIN_PASSWORD para inicializar el primer administrador."
      );
    }

    console.warn(
      "No hay usuarios creados y no se definieron credenciales bootstrap. El sistema quedara sin acceso inicial hasta crear un usuario manualmente."
    );
    return;
  }

  await upsertAppUser({
    username,
    password,
    fullName,
    role: "administrador",
    mustChangePassword: true,
  });

  console.log(
    `Administrador inicial preparado: ${username}. Debe cambiar la contraseña en el primer ingreso.`
  );
}
