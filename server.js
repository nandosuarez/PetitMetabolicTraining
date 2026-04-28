require("dotenv").config();

const express = require("express");
const path = require("path");
const { query, withClient, checkConnection } = require("./server/db");
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

const protectedCatalogGroups = new Set([
  "tipos",
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

app.get("/api/clients", asyncHandler(async (_req, res) => {
  const clients = await listClients();
  res.json({
    clients,
  });
}));

app.post("/api/clients", asyncHandler(async (req, res) => {
  const payload = normalizeClientPayload(req.body);
  validateClientPayload(payload);

  const existingClient = await findClientByName(payload.fullName);
  if (existingClient) {
    return res.status(409).json({
      error: "Ya existe un cliente registrado con ese nombre.",
    });
  }

  const result = await query(
    `
      insert into clients (
        full_name,
        document_number,
        phone,
        email,
        notes,
        is_active
      )
      values ($1, $2, $3, $4, $5, true)
      returning *
    `,
    [
      payload.fullName,
      payload.documentNumber,
      payload.phone,
      payload.email,
      payload.notes,
    ]
  );

  res.status(201).json(mapClientRow(result.rows[0]));
}));

app.patch(
  "/api/clients/:id/status",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const clientId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ error: "Cliente invalido." });
    }

    const result = await query(
      `
        update clients
        set
          is_active = $2,
          updated_at = now()
        where id = $1
        returning *
      `,
      [clientId, isActive]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    res.json(mapClientRow(result.rows[0]));
  })
);

app.get("/api/bootstrap", asyncHandler(async (req, res) => {
  const isAssistantOperative = req.authUser?.role === "asistente_operativo";

  const [
    catalogResult,
    movementResult,
    boxMovementResult,
    portfolioResult,
    notesResult,
    clientResult,
    collectionResult,
    transferResult,
  ] =
    await Promise.all([
    query(
      `
        select id, group_name, value, sort_order, is_active, created_at, updated_at
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
    query(
      `
        select *
        from clients
        order by is_active desc, full_name asc, id asc
      `
    ),
    query(
      `
        select
          mc.*,
          coalesce(nullif(u.full_name, ''), u.username) as registered_by_name,
          u.username as registered_by_username
        from movement_collections mc
        join app_users u
          on u.id = mc.registered_by_user_id
        order by mc.collection_date desc, mc.created_at desc, mc.id desc
      `
    ),
    query(
      `
        select
          bt.*,
          coalesce(nullif(u.full_name, ''), u.username) as registered_by_name,
          u.username as registered_by_username
        from box_transfers bt
        join app_users u
          on u.id = bt.registered_by_user_id
        order by bt.transfer_date desc, bt.created_at desc, bt.id desc
      `
    ),
  ]);

  res.json({
    lists: mapCatalogRows(catalogResult.rows),
    catalogItems: mapCatalogItemRows(catalogResult.rows),
    movements: movementResult.rows.map(mapMovementRow),
    boxMovements: boxMovementResult.rows.map(mapMovementRow),
    portfolioMovements: portfolioResult.rows.map(mapMovementRow),
    clients: clientResult.rows.map(mapClientRow),
    collections: collectionResult.rows.map(mapCollectionRow),
    boxTransfers: transferResult.rows.map(mapBoxTransferRow),
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
  const movementId = Number(req.params.id);
  await assertMovementMutationAllowed(req.authUser, movementId);

  const payload = normalizeMovementPayload(req.body);
  validateMovementPayload(payload, {
    requireEditJustification:
      req.authUser?.role === "asistente_operativo",
  });

  const existingMovementResult = await query(
    `
      select *
      from movements
      where id = $1
      limit 1
    `,
    [movementId]
  );

  if (!existingMovementResult.rows.length) {
    return res.status(404).json({ error: "Movimiento no encontrado." });
  }

  const previousSnapshot = mapMovementRow(existingMovementResult.rows[0]);
  const collectionsResult = await query(
    `
      select coalesce(sum(amount), 0) as collected_amount
      from movement_collections
      where movement_id = $1
    `,
    [movementId]
  );
  const collectedAmount = Number(
    collectionsResult.rows[0]?.collected_amount || 0
  );

  if (collectedAmount > 0 && payload.tipo !== "Ingreso") {
    return res.status(400).json({
      error:
        "No puedes cambiar este movimiento a una salida porque ya tiene cobros registrados en cartera.",
    });
  }

  if (payload.abono < collectedAmount) {
    return res.status(400).json({
      error:
        "El abono no puede ser menor al valor ya registrado en cobros de cartera.",
    });
  }

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
      movementId,
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

  const updatedMovement = mapMovementRow(result.rows[0]);

  if (req.authUser?.role === "asistente_operativo") {
    await query(
      `
        insert into movement_edit_audits (
          movement_id,
          edited_by_user_id,
          justification,
          before_snapshot,
          after_snapshot
        )
        values ($1, $2, $3, $4::jsonb, $5::jsonb)
      `,
      [
        movementId,
        Number(req.authUser.id),
        payload.justificacionEdicion,
        JSON.stringify(previousSnapshot),
        JSON.stringify(updatedMovement),
      ]
    );
  }

  res.json(updatedMovement);
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

app.post("/api/movements/:id/collections", asyncHandler(async (req, res) => {
  const movementId = Number(req.params.id);

  if (!Number.isInteger(movementId) || movementId <= 0) {
    return res.status(400).json({ error: "Movimiento invalido." });
  }

  const payload = normalizeCollectionPayload(req.body);
  validateCollectionPayload(payload);

  const movementResult = await query(
    `
      select *
      from movements
      where id = $1
      limit 1
    `,
    [movementId]
  );

  if (!movementResult.rows.length) {
    return res.status(404).json({ error: "Movimiento no encontrado." });
  }

  const movementRow = movementResult.rows[0];
  const movement = mapMovementRow(movementRow);
  const pendingBalance = Number(movement.saldoPendiente || 0);

  if (movement.tipo !== "Ingreso") {
    return res.status(400).json({
      error: "Solo puedes registrar cobros sobre ingresos que esten en cartera.",
    });
  }

  if (!(pendingBalance > 0)) {
    return res.status(400).json({
      error: "El movimiento seleccionado ya no tiene saldo pendiente.",
    });
  }

  if (payload.amount > pendingBalance) {
    return res.status(400).json({
      error: "El cobro no puede ser mayor que el saldo pendiente.",
    });
  }

  const paymentMethodResult = await query(
    `
      select 1
      from catalog_items
      where group_name = 'mediosPago'
        and value = $1
        and is_active = true
      limit 1
    `,
    [payload.paymentMethod]
  );

  if (!paymentMethodResult.rows.length) {
    return res.status(400).json({
      error: "La caja seleccionada para el cobro no existe o esta inactiva.",
    });
  }

  const nextPaidAmount = Number(movement.abono || 0) + payload.amount;
  const totalAmount = Number(movement.valorTotal || 0);
  const nextBalance = Math.max(totalAmount - nextPaidAmount, 0);
  const nextStatus = resolvePaymentStatus(nextPaidAmount, totalAmount);
  const nextCashFlow = movement.tipo === "Ingreso" ? nextPaidAmount : nextPaidAmount * -1;

  const collectionResult = await query(
    `
      insert into movement_collections (
        movement_id,
        collection_date,
        amount,
        payment_method,
        notes,
        registered_by_user_id
      )
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `,
    [
      movementId,
      payload.collectionDate,
      payload.amount,
      payload.paymentMethod,
      payload.notes,
      Number(req.authUser.id),
    ]
  );

  const updatedMovementResult = await query(
    `
      update movements
      set
        paid_amount = $2,
        balance_due = $3,
        payment_status = $4,
        cash_flow = $5,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      movementId,
      nextPaidAmount,
      nextBalance,
      nextStatus,
      nextCashFlow,
    ]
  );

  res.status(201).json({
    collection: mapCollectionRow({
      ...collectionResult.rows[0],
      registered_by_name:
        req.authUser.fullName || req.authUser.username || "Sistema",
      registered_by_username: req.authUser.username || "",
    }),
    movement: mapMovementRow(updatedMovementResult.rows[0]),
  });
}));

app.post("/api/box-transfers", asyncHandler(async (req, res) => {
  const payload = normalizeBoxTransferPayload(req.body);
  validateBoxTransferPayload(payload);

  const transferRow = await withClient(async (client) => {
    const methods = await listActivePaymentMethodsFromClient(client);

    if (!methods.includes(payload.sourcePaymentMethod)) {
      throw httpError(400, "La caja de origen no existe o esta inactiva.");
    }

    if (!methods.includes(payload.targetPaymentMethod)) {
      throw httpError(400, "La caja destino no existe o esta inactiva.");
    }

    const balances = await calculatePaymentBoxBalancesFromClient(client);
    const sourceBalance = Number(balances[payload.sourcePaymentMethod] || 0);

    if (sourceBalance < payload.amount) {
      throw httpError(
        400,
        `La caja ${payload.sourcePaymentMethod} no tiene saldo suficiente para mover ${payload.amount}.`
      );
    }

    const result = await client.query(
      `
        insert into box_transfers (
          transfer_date,
          source_payment_method,
          target_payment_method,
          amount,
          notes,
          registered_by_user_id
        )
        values ($1, $2, $3, $4, $5, $6)
        returning *
      `,
      [
        payload.transferDate,
        payload.sourcePaymentMethod,
        payload.targetPaymentMethod,
        payload.amount,
        payload.notes,
        Number(req.authUser.id),
      ]
    );

    return result.rows[0];
  });

  res.status(201).json(
    mapBoxTransferRow({
      ...transferRow,
      registered_by_name:
        req.authUser.fullName || req.authUser.username || "Sistema",
      registered_by_username: req.authUser.username || "",
    })
  );
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

  if (protectedCatalogGroups.has(group)) {
    return res.status(400).json({
      error:
        "Este catalogo es estructural del sistema. No se pueden agregar nuevos valores desde la interfaz.",
    });
  }

  if (!value) {
    return res.status(400).json({ error: "El valor es obligatorio." });
  }

  const result = await query(
    `
      insert into catalog_items (group_name, value, sort_order, is_active, updated_at)
      values (
        $1,
        $2,
        coalesce((select max(sort_order) + 1 from catalog_items where group_name = $1), 1),
        true,
        now()
      )
      on conflict (group_name, value)
      do update set
        is_active = true,
        updated_at = now()
      returning *
    `,
    [group, value]
  );

  res.status(201).json(mapCatalogItemRow(result.rows[0]));
}));

app.patch("/api/catalogs/:group/items/:id", requireAdmin, asyncHandler(async (req, res) => {
  const group = String(req.params.group || "");
  const itemId = Number(req.params.id);
  const hasValue = Object.prototype.hasOwnProperty.call(req.body || {}, "value");
  const hasActive = Object.prototype.hasOwnProperty.call(req.body || {}, "isActive");
  const nextValue = hasValue ? String(req.body.value || "").trim() : null;
  const nextActive = hasActive ? Boolean(req.body.isActive) : null;

  if (!catalogGroups.has(group)) {
    return res.status(400).json({ error: "Grupo de catalogo invalido." });
  }

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ error: "Item de catalogo invalido." });
  }

  if (!hasValue && !hasActive) {
    return res.status(400).json({
      error: "Debes enviar un nuevo nombre o un cambio de estado.",
    });
  }

  if (protectedCatalogGroups.has(group)) {
    return res.status(400).json({
      error:
        "Este catalogo es estructural del sistema. No se puede editar ni inactivar desde la interfaz.",
    });
  }

  if (hasValue && !nextValue) {
    return res.status(400).json({ error: "El nombre del item es obligatorio." });
  }

  try {
    const updatedItem = await withClient(async (client) => {
      await client.query("begin");

      try {
        const currentResult = await client.query(
          `
            select *
            from catalog_items
            where id = $1 and group_name = $2
            limit 1
          `,
          [itemId, group]
        );

        if (!currentResult.rows.length) {
          throw httpError(404, "Item de catalogo no encontrado.");
        }

        const currentRow = currentResult.rows[0];
        const currentValue = String(currentRow.value || "");
        const finalValue = hasValue ? nextValue : currentValue;
        const finalActive = hasActive ? nextActive : Boolean(currentRow.is_active);

        const result = await client.query(
          `
            update catalog_items
            set
              value = $3,
              is_active = $4,
              updated_at = now()
            where id = $1 and group_name = $2
            returning *
          `,
          [itemId, group, finalValue, finalActive]
        );

        if (hasValue && finalValue !== currentValue) {
          await syncCatalogValueRename(client, group, currentValue, finalValue);
        }

        await client.query("commit");
        return result.rows[0];
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    res.json(mapCatalogItemRow(updatedItem));
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({
        error: "Ya existe un item con ese nombre dentro de esta lista.",
      });
    }

    throw error;
  }
}));

app.delete("/api/catalogs/:group/items", requireAdmin, asyncHandler(async (_req, res) => {
  res.status(405).json({
    error: "Los items del catalogo ya no se eliminan. Debes inactivarlos.",
  });
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

function normalizeClientPayload(body) {
  return {
    fullName: String(body.fullName || "").trim(),
    documentNumber: String(body.documentNumber || "").trim(),
    phone: String(body.phone || "").trim(),
    email: String(body.email || "").trim(),
    notes: String(body.notes || "").trim(),
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

function validateClientPayload(payload) {
  if (!payload.fullName) {
    throw httpError(400, "El nombre del cliente es obligatorio.");
  }

  if (
    payload.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
  ) {
    throw httpError(400, "El correo del cliente no es valido.");
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
    justificacionEdicion: String(body.justificacionEdicion || "").trim(),
  };
}

function normalizeCollectionPayload(body) {
  return {
    collectionDate: String(body.collectionDate || "").trim(),
    amount: Number(body.amount || 0),
    paymentMethod: String(body.paymentMethod || "").trim(),
    notes: String(body.notes || "").trim(),
  };
}

function normalizeBoxTransferPayload(body) {
  return {
    transferDate: String(body.transferDate || "").trim(),
    sourcePaymentMethod: String(body.sourcePaymentMethod || "").trim(),
    targetPaymentMethod: String(body.targetPaymentMethod || "").trim(),
    amount: Number(body.amount || 0),
    notes: String(body.notes || "").trim(),
  };
}

function validateMovementPayload(payload, options = {}) {
  if (!["Gimnasio", "Restaurante"].includes(payload.linea)) {
    throw httpError(400, "Linea de negocio invalida.");
  }

  if (!payload.fecha) {
    throw httpError(400, "La fecha es obligatoria.");
  }

  if (!["Ingreso", "Gasto", "Costo"].includes(payload.tipo)) {
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

  if (
    options.requireEditJustification &&
    String(payload.justificacionEdicion || "").length < 10
  ) {
    throw httpError(
      400,
      "Debes registrar una justificacion de al menos 10 caracteres para editar la transaccion."
    );
  }
}

function validateCollectionPayload(payload) {
  if (!payload.collectionDate) {
    throw httpError(400, "La fecha del cobro es obligatoria.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.collectionDate)) {
    throw httpError(400, "La fecha del cobro no tiene un formato valido.");
  }

  if (!Number.isFinite(payload.amount) || !(payload.amount > 0)) {
    throw httpError(400, "El valor del cobro debe ser mayor a cero.");
  }

  if (!payload.paymentMethod) {
    throw httpError(400, "El medio de pago del cobro es obligatorio.");
  }
}

function validateBoxTransferPayload(payload) {
  if (!payload.transferDate) {
    throw httpError(400, "La fecha del movimiento entre cajas es obligatoria.");
  }

  if (!payload.sourcePaymentMethod) {
    throw httpError(400, "Selecciona la caja de origen.");
  }

  if (!payload.targetPaymentMethod) {
    throw httpError(400, "Selecciona la caja de destino.");
  }

  if (payload.sourcePaymentMethod === payload.targetPaymentMethod) {
    throw httpError(400, "La caja de origen y la de destino deben ser diferentes.");
  }

  if (!(payload.amount > 0)) {
    throw httpError(400, "El valor a mover debe ser mayor que cero.");
  }
}

function mapCatalogRows(rows) {
  const lists = createEmptyCatalogMap();

  rows
    .filter((row) => Boolean(row.is_active))
    .forEach((row) => {
      if (!lists[row.group_name]) {
        lists[row.group_name] = [];
      }

      lists[row.group_name].push(row.value);
    });

  return lists;
}

function mapCatalogItemRows(rows) {
  const groupedItems = createEmptyCatalogMap();

  rows.forEach((row) => {
    if (!groupedItems[row.group_name]) {
      groupedItems[row.group_name] = [];
    }

    groupedItems[row.group_name].push(mapCatalogItemRow(row));
  });

  return groupedItems;
}

function mapCatalogItemRow(row) {
  return {
    id: Number(row.id),
    group: row.group_name,
    value: row.value,
    sortOrder: Number(row.sort_order || 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function createEmptyCatalogMap() {
  return {
    gimnasioCategorias: [],
    restauranteCategorias: [],
    tipos: [],
    mediosPago: [],
    estadosPago: [],
  };
}

async function listActivePaymentMethodsFromClient(client) {
  const result = await client.query(
    `
      select value
      from catalog_items
      where group_name = 'mediosPago'
        and is_active = true
      order by sort_order asc, value asc
    `
  );

  return result.rows.map((row) => row.value);
}

async function calculatePaymentBoxBalancesFromClient(client) {
  const [movementsResult, collectionsResult, transfersResult] = await Promise.all([
    client.query(
      `
        select id, movement_type, payment_method, paid_amount
        from movements
        where paid_amount > 0
      `
    ),
    client.query(
      `
        select movement_id, amount, payment_method
        from movement_collections
      `
    ),
    client.query(
      `
        select source_payment_method, target_payment_method, amount
        from box_transfers
      `
    ),
  ]);

  const collectionTotalsByMovement = new Map();
  const balances = {};

  collectionsResult.rows.forEach((row) => {
    const movementId = String(row.movement_id);
    const amount = Number(row.amount || 0);
    const paymentMethod = String(row.payment_method || "").trim();

    collectionTotalsByMovement.set(
      movementId,
      Number(collectionTotalsByMovement.get(movementId) || 0) + amount
    );

    if (paymentMethod) {
      balances[paymentMethod] = Number(balances[paymentMethod] || 0) + amount;
    }
  });

  movementsResult.rows.forEach((row) => {
    const paymentMethod = String(row.payment_method || "").trim();
    const paidAmount = Number(row.paid_amount || 0);

    if (!paymentMethod || !(paidAmount > 0)) {
      return;
    }

    const collectedAmount = Number(
      collectionTotalsByMovement.get(String(row.id)) || 0
    );
    const directAmount =
      row.movement_type === "Ingreso"
        ? Math.max(paidAmount - collectedAmount, 0)
        : paidAmount;

    if (!(directAmount > 0)) {
      return;
    }

    const signedAmount =
      row.movement_type === "Ingreso" ? directAmount : directAmount * -1;

    balances[paymentMethod] = Number(balances[paymentMethod] || 0) + signedAmount;
  });

  transfersResult.rows.forEach((row) => {
    const amount = Number(row.amount || 0);
    const sourceMethod = String(row.source_payment_method || "").trim();
    const targetMethod = String(row.target_payment_method || "").trim();

    if (sourceMethod) {
      balances[sourceMethod] = Number(balances[sourceMethod] || 0) - amount;
    }

    if (targetMethod) {
      balances[targetMethod] = Number(balances[targetMethod] || 0) + amount;
    }
  });

  return balances;
}

async function syncCatalogValueRename(client, group, previousValue, nextValue) {
  if (!previousValue || !nextValue || previousValue === nextValue) {
    return;
  }

  if (group === "gimnasioCategorias") {
    await client.query(
      `
        update movements
        set
          category = $2,
          updated_at = now()
        where business_line = 'Gimnasio'
          and category = $1
      `,
      [previousValue, nextValue]
    );
    return;
  }

  if (group === "restauranteCategorias") {
    await client.query(
      `
        update movements
        set
          category = $2,
          updated_at = now()
        where business_line = 'Restaurante'
          and category = $1
      `,
      [previousValue, nextValue]
    );
    return;
  }

  if (group === "mediosPago") {
    await Promise.all([
      client.query(
        `
          update movements
          set
            payment_method = $2,
            updated_at = now()
          where payment_method = $1
        `,
        [previousValue, nextValue]
      ),
      client.query(
        `
          update movement_collections
          set payment_method = $2
          where payment_method = $1
        `,
        [previousValue, nextValue]
      ),
      client.query(
        `
          update box_transfers
          set
            source_payment_method = $2
          where source_payment_method = $1
        `,
        [previousValue, nextValue]
      ),
      client.query(
        `
          update box_transfers
          set
            target_payment_method = $2
          where target_payment_method = $1
        `,
        [previousValue, nextValue]
      ),
    ]);
  }
}

function mapClientRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    documentNumber: row.document_number || "",
    phone: row.phone || "",
    email: row.email || "",
    notes: row.notes || "",
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function normalizeDateOnly(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const rawValue = String(value).trim();
  const rawMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (rawMatch) {
    return rawMatch[1];
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }

  return parsed.toISOString().slice(0, 10);
}

function mapMovementRow(row) {
  const fecha = normalizeDateOnly(row.movement_date);

  return {
    id: row.id,
    linea: row.business_line,
    fecha,
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
    ano: Number(row.year),
    mesNumero: Number(row.month_number),
    mesNombre: row.month_name,
    observaciones: row.notes || "",
    creadoEn: row.created_at,
    actualizadoEn: row.updated_at,
  };
}

function mapCollectionRow(row) {
  return {
    id: row.id,
    movementId: row.movement_id,
    collectionDate: normalizeDateOnly(row.collection_date),
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    notes: row.notes || "",
    registeredBy:
      row.registered_by_name ||
      row.registered_by_username ||
      "Sistema",
    createdAt: row.created_at || null,
  };
}

function mapBoxTransferRow(row) {
  return {
    id: row.id,
    transferDate: normalizeDateOnly(row.transfer_date),
    sourcePaymentMethod: row.source_payment_method,
    targetPaymentMethod: row.target_payment_method,
    amount: Number(row.amount),
    notes: row.notes || "",
    registeredBy:
      row.registered_by_name ||
      row.registered_by_username ||
      "Sistema",
    createdAt: row.created_at || null,
  };
}

function resolvePaymentStatus(paidAmount, totalAmount) {
  if (paidAmount <= 0) {
    return "Pendiente";
  }

  if (paidAmount >= totalAmount) {
    return "Pagado";
  }

  return "Parcial";
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

async function listClients() {
  const result = await query(
    `
      select *
      from clients
      order by is_active desc, full_name asc, id asc
    `
  );

  return result.rows.map(mapClientRow);
}

async function findClientByName(fullName) {
  const result = await query(
    `
      select *
      from clients
      where lower(full_name) = lower($1)
      limit 1
    `,
    [String(fullName || "").trim()]
  );

  return result.rows[0] ? mapClientRow(result.rows[0]) : null;
}

function requireAdmin(req, res, next) {
  if (req.authUser?.role !== "administrador") {
    return res.status(403).json({
      error: "Solo el perfil administrador puede realizar esta operacion.",
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
