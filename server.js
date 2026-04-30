require("dotenv").config();

const express = require("express");
const path = require("path");
const officeCrypto = require("officecrypto-tool");
const XLSX = require("xlsx");
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

const programmingExerciseFamilies = new Set([
  "multiarticular_tren_inferior",
  "multiarticular_tren_superior",
  "aislado_por_musculo",
  "hyrox_oficial",
]);

app.use(express.json({ limit: "10mb" }));
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

app.put("/api/clients/:id", asyncHandler(async (req, res) => {
  const clientId = Number(req.params.id);
  const payload = normalizeClientPayload(req.body);
  validateClientPayload(payload);

  if (!Number.isInteger(clientId) || clientId <= 0) {
    return res.status(400).json({ error: "Cliente invalido." });
  }

  const existingClient = await findClientByName(payload.fullName, {
    excludeId: clientId,
  });
  if (existingClient) {
    return res.status(409).json({
      error: "Ya existe un cliente registrado con ese nombre.",
    });
  }

  const updatedClient = await withClient(async (client) => {
    await client.query("begin");

    try {
      const currentResult = await client.query(
        `
          select *
          from clients
          where id = $1
          limit 1
        `,
        [clientId]
      );

      if (!currentResult.rows.length) {
        throw httpError(404, "Cliente no encontrado.");
      }

      const currentClient = currentResult.rows[0];
      const result = await client.query(
        `
          update clients
          set
            full_name = $2,
            document_number = $3,
            phone = $4,
            email = $5,
            notes = $6,
            updated_at = now()
          where id = $1
          returning *
        `,
        [
          clientId,
          payload.fullName,
          payload.documentNumber,
          payload.phone,
          payload.email,
          payload.notes,
        ]
      );

      await syncClientNameRename(client, currentClient.full_name, payload.fullName);
      await client.query("commit");
      return result.rows[0];
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });

  res.json(mapClientRow(updatedClient));
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

app.post(
  "/api/programming/exercises",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const payload = normalizeProgrammingExercisePayload(req.body);
    validateProgrammingExercisePayload(payload);

    await assertProgrammingExerciseNameAvailable(payload.name);

    const result = await query(
      `
        insert into programming_exercises (
          name,
          family,
          category,
          primary_muscle,
          movement_pattern,
          equipment,
          coaching_notes,
          is_active
        )
        values ($1, $2, $3, $4, $5, $6, $7, true)
        returning *
      `,
      [
        payload.name,
        payload.family,
        payload.category,
        payload.primaryMuscle,
        payload.movementPattern,
        payload.equipment,
        payload.coachingNotes,
      ]
    );

    res.status(201).json(mapProgrammingExerciseRow(result.rows[0]));
  })
);

app.put(
  "/api/programming/exercises/:id",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const exerciseId = Number(req.params.id);
    const payload = normalizeProgrammingExercisePayload(req.body);
    validateProgrammingExercisePayload(payload);

    if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
      return res.status(400).json({ error: "Ejercicio invalido." });
    }

    await assertProgrammingExerciseNameAvailable(payload.name, {
      excludeId: exerciseId,
    });

    const result = await query(
      `
        update programming_exercises
        set
          name = $2,
          family = $3,
          category = $4,
          primary_muscle = $5,
          movement_pattern = $6,
          equipment = $7,
          coaching_notes = $8,
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        exerciseId,
        payload.name,
        payload.family,
        payload.category,
        payload.primaryMuscle,
        payload.movementPattern,
        payload.equipment,
        payload.coachingNotes,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Ejercicio no encontrado." });
    }

    res.json(mapProgrammingExerciseRow(result.rows[0]));
  })
);

app.patch(
  "/api/programming/exercises/:id/active",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const exerciseId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
      return res.status(400).json({ error: "Ejercicio invalido." });
    }

    const result = await query(
      `
        update programming_exercises
        set
          is_active = $2,
          updated_at = now()
        where id = $1
        returning *
      `,
      [exerciseId, isActive]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Ejercicio no encontrado." });
    }

    res.json(mapProgrammingExerciseRow(result.rows[0]));
  })
);

app.post(
  "/api/programming/programs",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const payload = normalizeClassProgramPayload(req.body);
    validateClassProgramPayload(payload);
    await assertProgrammingReferencesExist(payload);

    const userId = Number(req.authUser?.id || 0);
    let programId = 0;

    await withClient(async (client) => {
      await client.query("begin");

      try {
        const result = await client.query(
          `
            insert into class_programs (
              class_date,
              title,
              class_group,
              focus_area,
              method_id,
              duration_minutes,
              objective,
              general_notes,
              is_active,
              created_by_user_id,
              updated_by_user_id
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)
            returning id
          `,
          [
            payload.classDate,
            payload.title,
            payload.classGroup,
            payload.focusArea,
            payload.methodId,
            payload.durationMinutes,
            payload.objective,
            payload.generalNotes,
            userId,
          ]
        );

        programId = Number(result.rows[0]?.id || 0);
        await replaceClassProgramItems(client, programId, payload.items);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    const program = await readClassProgramById(programId);
    res.status(201).json(program);
  })
);

app.put(
  "/api/programming/programs/:id",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const programId = Number(req.params.id);
    const payload = normalizeClassProgramPayload(req.body);
    validateClassProgramPayload(payload);
    await assertProgrammingReferencesExist(payload);

    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({ error: "Programación invalida." });
    }

    const userId = Number(req.authUser?.id || 0);
    let updated = false;

    await withClient(async (client) => {
      await client.query("begin");

      try {
        const result = await client.query(
          `
            update class_programs
            set
              class_date = $2,
              title = $3,
              class_group = $4,
              focus_area = $5,
              method_id = $6,
              duration_minutes = $7,
              objective = $8,
              general_notes = $9,
              updated_by_user_id = $10,
              updated_at = now()
            where id = $1
            returning id
          `,
          [
            programId,
            payload.classDate,
            payload.title,
            payload.classGroup,
            payload.focusArea,
            payload.methodId,
            payload.durationMinutes,
            payload.objective,
            payload.generalNotes,
            userId,
          ]
        );

        if (!result.rows.length) {
          throw httpError(404, "Programación no encontrada.");
        }

        await replaceClassProgramItems(client, programId, payload.items);
        await client.query("commit");
        updated = true;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    if (!updated) {
      return res.status(404).json({ error: "Programación no encontrada." });
    }

    const program = await readClassProgramById(programId);
    res.json(program);
  })
);

app.patch(
  "/api/programming/programs/:id/active",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const programId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({ error: "Programación invalida." });
    }

    const result = await query(
      `
        update class_programs
        set
          is_active = $2,
          updated_by_user_id = $3,
          updated_at = now()
        where id = $1
        returning id
      `,
      [programId, isActive, Number(req.authUser?.id || 0)]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Programación no encontrada." });
    }

    const program = await readClassProgramById(programId);
    res.json(program);
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
    programmingMethods,
    programmingExercises,
    classPrograms,
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
    listProgrammingMethods(),
    listProgrammingExercises(),
    listClassPrograms(),
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
    programmingMethods,
    programmingExercises,
    classPrograms,
    notes: mapNotesRows(notesResult.rows),
  });
}));

app.post("/api/import/excel", requireAdmin, asyncHandler(async (req, res) => {
  const payload = normalizeExcelImportPayload(req.body);
  validateExcelImportPayload(payload);

  const report = await importExcelWorkbook(payload);
  res.status(201).json(report);
}));

app.post(
  "/api/import/clients-users-workbook",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = normalizeUsersClientsImportPayload(req.body);
    validateUsersClientsImportPayload(payload);

    const report = await importUsersWorkbookClients(payload);
    res.status(201).json(report);
  })
);

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
  const estadoPago = derivePaymentStatus(valorTotal, abono);

  return {
    linea: String(body.linea || "").trim(),
    fecha,
    tipo,
    categoria: String(body.categoria || "").trim(),
    cliente: String(body.cliente || "").trim(),
    descripcion: String(body.descripcion || "").trim(),
    estadoPago,
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

function derivePaymentStatus(valorTotal, abono) {
  const total = Number(valorTotal || 0);
  const paid = Number(abono || 0);

  if (!(total > 0)) {
    return "";
  }

  if (paid <= 0) {
    return "Pendiente";
  }

  if (paid >= total) {
    return "Pagado";
  }

  return "Parcial";
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

function normalizeExcelImportPayload(body) {
  return {
    fileName: String(body.fileName || "").trim(),
    fileDataBase64: String(body.fileDataBase64 || "").trim(),
    importLists: body.importLists !== false,
    importMovements: body.importMovements !== false,
    importClients: body.importClients !== false,
  };
}

function normalizeUsersClientsImportPayload(body) {
  return {
    fileName: String(body.fileName || "").trim(),
    fileDataBase64: String(body.fileDataBase64 || "").trim(),
    password: String(body.password || ""),
  };
}

function normalizeProgrammingExercisePayload(body) {
  return {
    name: String(body.name || "").trim(),
    family: String(body.family || "").trim(),
    category: String(body.category || "").trim(),
    primaryMuscle: String(body.primaryMuscle || "").trim(),
    movementPattern: String(body.movementPattern || "").trim(),
    equipment: String(body.equipment || "").trim(),
    coachingNotes: String(body.coachingNotes || "").trim(),
  };
}

function normalizeClassProgramPayload(body) {
  const rawItems = Array.isArray(body.items) ? body.items : [];

  return {
    classDate: String(body.classDate || "").trim(),
    title: String(body.title || "").trim(),
    classGroup: String(body.classGroup || "").trim(),
    focusArea: String(body.focusArea || "").trim(),
    methodId: Number(body.methodId || 0),
    durationMinutes: Number(body.durationMinutes || 0),
    objective: String(body.objective || "").trim(),
    generalNotes: String(body.generalNotes || "").trim(),
    items: rawItems.map((item, index) => ({
      sortOrder: index + 1,
      blockName: String(item?.blockName || "").trim(),
      exerciseId: Number(item?.exerciseId || 0),
      methodId: item?.methodId ? Number(item.methodId) : null,
      prescription: String(item?.prescription || "").trim(),
      repetitionText: String(item?.repetitionText || "").trim(),
      weightText: String(item?.weightText || "").trim(),
      conditionNotes: String(item?.conditionNotes || "").trim(),
      coachNotes: String(item?.coachNotes || "").trim(),
    })),
  };
}

function validateProgrammingExercisePayload(payload) {
  if (!payload.name) {
    throw httpError(400, "El nombre del ejercicio es obligatorio.");
  }

  if (!programmingExerciseFamilies.has(payload.family)) {
    throw httpError(400, "La familia del ejercicio no es valida.");
  }

  if (!payload.category) {
    throw httpError(400, "La categoría del ejercicio es obligatoria.");
  }

  if (!payload.primaryMuscle) {
    throw httpError(400, "El músculo principal es obligatorio.");
  }
}

function validateClassProgramPayload(payload) {
  if (!payload.classDate) {
    throw httpError(400, "La fecha de la clase es obligatoria.");
  }

  if (!payload.title) {
    throw httpError(400, "El nombre de la clase es obligatorio.");
  }

  if (!Number.isInteger(payload.methodId) || payload.methodId <= 0) {
    throw httpError(400, "Selecciona un método principal válido.");
  }

  if (
    !Number.isInteger(payload.durationMinutes) ||
    payload.durationMinutes <= 0 ||
    payload.durationMinutes > 240
  ) {
    throw httpError(400, "La duración debe estar entre 1 y 240 minutos.");
  }

  if (!Array.isArray(payload.items) || !payload.items.length) {
    throw httpError(400, "Agrega al menos un ejercicio a la clase.");
  }

  payload.items.forEach((item, index) => {
    if (!item.blockName) {
      throw httpError(
        400,
        `El bloque del ejercicio ${index + 1} es obligatorio.`
      );
    }

    if (!Number.isInteger(item.exerciseId) || item.exerciseId <= 0) {
      throw httpError(
        400,
        `Selecciona un ejercicio válido en la fila ${index + 1}.`
      );
    }

    if (item.methodId !== null && (!Number.isInteger(item.methodId) || item.methodId <= 0)) {
      throw httpError(
        400,
        `El método puntual del ejercicio ${index + 1} no es válido.`
      );
    }

    if (!item.prescription) {
      throw httpError(
        400,
        `La dosificación del ejercicio ${index + 1} es obligatoria.`
      );
    }
  });
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

  const expectedStatus = derivePaymentStatus(payload.valorTotal, payload.abono);
  if (!["Pagado", "Parcial", "Pendiente"].includes(expectedStatus)) {
    throw httpError(400, "No se pudo calcular el estado de pago del movimiento.");
  }

  if (payload.estadoPago !== expectedStatus) {
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

function validateExcelImportPayload(payload) {
  if (!payload.fileDataBase64) {
    throw httpError(400, "Debes adjuntar el archivo Excel a importar.");
  }

  if (!payload.fileName) {
    throw httpError(400, "El archivo debe conservar su nombre para la trazabilidad.");
  }

  if (!payload.importLists && !payload.importMovements && !payload.importClients) {
    throw httpError(400, "Selecciona al menos un bloque de datos para importar.");
  }
}

function validateUsersClientsImportPayload(payload) {
  if (!payload.fileDataBase64) {
    throw httpError(400, "Debes adjuntar el archivo Excel de usuarios.");
  }

  if (!payload.fileName) {
    throw httpError(
      400,
      "El archivo debe conservar su nombre para la trazabilidad."
    );
  }

  if (!payload.password) {
    throw httpError(400, "Debes escribir la contraseña del archivo.");
  }
}

async function importExcelWorkbook(payload) {
  const warnings = [];
  let workbook;

  try {
    const buffer = Buffer.from(payload.fileDataBase64, "base64");
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      raw: true,
    });
  } catch (_error) {
    throw httpError(400, "No se pudo leer el archivo Excel. Verifica que sea un .xlsx o .xls válido.");
  }

  const parsedWorkbook = parseWorkbookForImport(workbook, warnings);

  if (
    payload.importMovements &&
    !parsedWorkbook.movements.length &&
    !parsedWorkbook.catalogEntries.length
  ) {
    throw httpError(
      400,
      "No encontré movimientos ni listas utilizables dentro del Excel."
    );
  }

  return withClient(async (client) => {
    await client.query("begin");

    try {
      const catalogState = await loadCatalogState(client);
      const clientState = await loadClientState(client);
      const movementKeys = await loadMovementKeys(client);

      const report = {
        fileName: payload.fileName,
        message: "La carga del Excel terminó correctamente.",
        catalogInserted: 0,
        catalogReactivated: 0,
        movementsInserted: 0,
        movementsSkipped: 0,
        clientsInserted: 0,
        clientsMatched: 0,
        warnings,
      };

      const requiredCatalogEntries = [
        ...(payload.importLists ? parsedWorkbook.catalogEntries : []),
        ...(payload.importMovements
          ? buildCatalogEntriesFromImportedMovements(parsedWorkbook.movements)
          : []),
      ];

      if (requiredCatalogEntries.length) {
        const catalogReport = await upsertCatalogEntries(
          client,
          catalogState,
          requiredCatalogEntries
        );
        report.catalogInserted += catalogReport.inserted;
        report.catalogReactivated += catalogReport.reactivated;
      }

      if (payload.importClients) {
        const clientReport = await createMissingClientsFromImport(
          client,
          clientState,
          parsedWorkbook.clientNames
        );
        report.clientsInserted += clientReport.inserted;
        report.clientsMatched += clientReport.matched;
      }

      if (payload.importMovements) {
        const movementReport = await insertImportedMovements(
          client,
          parsedWorkbook.movements,
          catalogState,
          clientState,
          movementKeys,
          warnings
        );
        report.movementsInserted += movementReport.inserted;
        report.movementsSkipped += movementReport.skipped;
      }

      await client.query("commit");
      return report;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function importUsersWorkbookClients(payload) {
  let workbook;

  try {
    const encryptedBuffer = Buffer.from(payload.fileDataBase64, "base64");
    const decryptedBuffer = await officeCrypto.decrypt(encryptedBuffer, {
      password: payload.password,
    });
    workbook = XLSX.read(decryptedBuffer, {
      type: "buffer",
      cellDates: true,
      raw: true,
    });
  } catch (_error) {
    throw httpError(
      400,
      "No pude abrir el archivo protegido. Revisa la contraseña y que el Excel sea válido."
    );
  }

  const parsedClients = parseUsersWorkbookClients(workbook);

  if (!parsedClients.length) {
    throw httpError(
      400,
      "No encontré clientes activos con pago hasta vigente dentro del archivo."
    );
  }

  return withClient(async (client) => {
    await client.query("begin");

    try {
      const clientState = await loadDetailedClientState(client);
      const report = {
        fileName: payload.fileName,
        message:
          "La carga de clientes terminó correctamente desde el archivo de usuarios.",
        considered: parsedClients.length,
        inserted: 0,
        updated: 0,
        matchedByDocument: 0,
        matchedByName: 0,
        totalClients: 0,
      };

      for (const clientPayload of parsedClients) {
        const normalizedName = normalizeComparableText(clientPayload.fullName);
        const normalizedDocument = normalizeComparableText(
          clientPayload.documentNumber
        );

        let existingId = null;
        if (
          normalizedDocument &&
          clientState.byDocument.has(normalizedDocument)
        ) {
          existingId = clientState.byDocument.get(normalizedDocument);
          report.matchedByDocument += 1;
        } else if (normalizedName && clientState.byName.has(normalizedName)) {
          existingId = clientState.byName.get(normalizedName);
          report.matchedByName += 1;
        }

        if (existingId) {
          const current = clientState.byId.get(existingId);
          const result = await client.query(
            `
              update clients
              set
                full_name = $2,
                document_number = $3,
                phone = $4,
                email = $5,
                notes = $6,
                is_active = true,
                updated_at = now()
              where id = $1
              returning *
            `,
            [
              existingId,
              clientPayload.fullName,
              clientPayload.documentNumber || current.documentNumber || "",
              clientPayload.phone || current.phone || "",
              clientPayload.email || current.email || "",
              mergeClientImportNotes(current.notes, clientPayload.notes),
            ]
          );

          syncClientImportStateRow(clientState, result.rows[0]);
          report.updated += 1;
          continue;
        }

        const result = await client.query(
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
            clientPayload.fullName,
            clientPayload.documentNumber,
            clientPayload.phone,
            clientPayload.email,
            clientPayload.notes,
          ]
        );

        syncClientImportStateRow(clientState, result.rows[0]);
        report.inserted += 1;
      }

      const totalResult = await client.query(
        "select count(*)::int as total from clients"
      );
      report.totalClients = totalResult.rows[0].total;

      await client.query("commit");
      return report;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

function parseUsersWorkbookClients(workbook) {
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  if (!sheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: true,
  });
  const todayIso = formatDateInBogota(new Date());

  return rows
    .map((row) => {
      const fullName = cleanExcelText(row["Nombre para mostrar"]);
      const paidUntil = row["Pagado hasta:"];
      const isDeleted = Boolean(row["Borrado"]);

      if (!fullName || isDeleted || !(paidUntil instanceof Date)) {
        return null;
      }

      const paidUntilIso = formatDateInBogota(paidUntil);
      if (!paidUntilIso || paidUntilIso < todayIso) {
        return null;
      }

      const documentNumber =
        cleanExcelText(row["Dni"]) || cleanExcelText(row["Dni(Facturación)"]);
      const phone = cleanExcelText(row["Teléfono"]).replace(/\s+/g, "");
      const email = cleanExcelText(row["Email"]).toLowerCase();
      const tariff = cleanExcelText(row["Tarifa"]);
      const clientType = cleanExcelText(row["Tipo"]);
      const notesParts = [
        "Importado desde archivo de usuarios",
        `Pago hasta: ${paidUntilIso}`,
      ];

      if (tariff) {
        notesParts.push(`Tarifa: ${tariff}`);
      }

      if (clientType) {
        notesParts.push(`Tipo: ${clientType}`);
      }

      return {
        fullName,
        documentNumber,
        phone,
        email,
        notes: notesParts.join(" · "),
      };
    })
    .filter(Boolean);
}

async function loadDetailedClientState(client) {
  const result = await client.query(`
    select id, full_name, document_number, phone, email, notes, is_active
    from clients
    order by id asc
  `);

  const state = {
    byId: new Map(),
    byName: new Map(),
    byDocument: new Map(),
  };

  result.rows.forEach((row) => {
    syncClientImportStateRow(state, row);
  });

  return state;
}

function syncClientImportStateRow(state, row) {
  const normalizedRow = {
    id: Number(row.id),
    fullName: row.full_name,
    documentNumber: row.document_number || "",
    phone: row.phone || "",
    email: row.email || "",
    notes: row.notes || "",
    isActive: Boolean(row.is_active),
  };

  state.byId.set(normalizedRow.id, normalizedRow);

  const normalizedName = normalizeComparableText(normalizedRow.fullName);
  if (normalizedName) {
    state.byName.set(normalizedName, normalizedRow.id);
  }

  const normalizedDocument = normalizeComparableText(
    normalizedRow.documentNumber
  );
  if (normalizedDocument) {
    state.byDocument.set(normalizedDocument, normalizedRow.id);
  }
}

function mergeClientImportNotes(currentNotes, importedNotes) {
  const current = cleanExcelText(currentNotes);
  const incoming = cleanExcelText(importedNotes);

  if (!current) {
    return incoming;
  }

  if (!incoming) {
    return current;
  }

  if (current === incoming || current.includes(incoming)) {
    return current;
  }

  if (incoming.includes(current)) {
    return incoming;
  }

  return `${current} | ${incoming}`;
}

function formatDateInBogota(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const map = Object.fromEntries(
    parts
      .filter((item) => item.type !== "literal")
      .map((item) => [item.type, item.value])
  );

  return `${map.year}-${map.month}-${map.day}`;
}

function parseWorkbookForImport(workbook, warnings) {
  const catalogEntries = extractCatalogEntries(workbook, warnings);
  const gymMovements = extractMovementsFromWorkbookSheet(
    workbook,
    "Gimnasio",
    "Gimnasio",
    warnings
  );
  const restaurantMovements = extractMovementsFromWorkbookSheet(
    workbook,
    "Restaurante",
    "Restaurante",
    warnings
  );
  const movements = [...gymMovements, ...restaurantMovements];
  const clientNames = [...new Set(
    movements
      .map((item) => item.cliente)
      .filter(Boolean)
      .map((item) => String(item).trim())
  )];

  return {
    catalogEntries,
    movements,
    clientNames,
  };
}

function extractCatalogEntries(workbook, warnings) {
  const sheet = workbook.Sheets?.Listas;
  if (!sheet) {
    warnings.push("La hoja 'Listas' no existe; se omitió la carga de listas maestras.");
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const definitions = [
    { group: "gimnasioCategorias", columnIndex: 0 },
    { group: "restauranteCategorias", columnIndex: 1 },
    { group: "tipos", columnIndex: 2 },
    { group: "mediosPago", columnIndex: 3 },
    { group: "estadosPago", columnIndex: 5 },
  ];

  const entries = [];
  definitions.forEach((definition) => {
    let sortOrder = 1;
    rows.slice(1).forEach((row) => {
      const value = cleanExcelText(row[definition.columnIndex]);
      if (!value) {
        return;
      }

      entries.push({
        group: definition.group,
        value,
        sortOrder,
      });
      sortOrder += 1;
    });
  });

  return uniqueCatalogEntries(entries);
}

function extractMovementsFromWorkbookSheet(workbook, sheetName, businessLine, warnings) {
  const sheet = workbook.Sheets?.[sheetName];
  if (!sheet) {
    warnings.push(`La hoja '${sheetName}' no existe; se omitieron esos movimientos.`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const headerRowIndex = rows.findIndex((row) => {
    const first = normalizeComparableText(row?.[0]);
    const second = normalizeComparableText(row?.[1]);
    const third = normalizeComparableText(row?.[2]);
    return first === "fecha" && second === "tipo" && third === "categoria";
  });

  if (headerRowIndex < 0) {
    warnings.push(`No encontré la fila de encabezados en la hoja '${sheetName}'.`);
    return [];
  }

  const movements = [];
  rows.slice(headerRowIndex + 1).forEach((row, index) => {
    if (isExcelMovementRowEmpty(row)) {
      return;
    }

    const totalAmount = toPositiveAmount(row[7]);
    const movementType = normalizeImportedMovementType(row[1]);
    const category = cleanExcelText(row[2]);
    const movementDate = excelCellToIsoDate(row[0]);

    if (!movementDate || !movementType || !category || !(totalAmount > 0)) {
      return;
    }

    let paidAmount = toAmount(row[8]);
    if (paidAmount < 0) {
      paidAmount = 0;
    }
    if (paidAmount > totalAmount) {
      warnings.push(
        `${sheetName} fila ${headerRowIndex + index + 2}: el abono superaba el total y fue ajustado al valor total.`
      );
      paidAmount = totalAmount;
    }

    const paymentStatus = resolveImportedPaymentStatus(row[5], totalAmount, paidAmount);
    const paymentMethod = cleanExcelText(row[6]) || "Otro";
    const description =
      cleanExcelText(row[4]) || `${movementType} ${category}`.trim();

    movements.push({
      linea: businessLine,
      fecha: movementDate,
      tipo: movementType,
      categoria: category,
      cliente: cleanExcelText(row[3]),
      descripcion: description,
      estadoPago: paymentStatus,
      medioPago: paymentMethod,
      valorTotal: totalAmount,
      abono: paidAmount,
      observaciones: "",
    });
  });

  return movements;
}

function isExcelMovementRowEmpty(row) {
  return !Array.isArray(row) || row.every((cell) => !cleanExcelText(cell) && !Number(cell));
}

function normalizeImportedMovementType(value) {
  const normalized = normalizeComparableText(value);
  if (normalized === "ingreso") {
    return "Ingreso";
  }
  if (normalized === "gasto") {
    return "Gasto";
  }
  if (normalized === "costo") {
    return "Costo";
  }
  return "";
}

function resolveImportedPaymentStatus(rawValue, totalAmount, paidAmount) {
  const normalized = normalizeComparableText(rawValue);

  if (paidAmount >= totalAmount && totalAmount > 0) {
    return "Pagado";
  }

  if (paidAmount > 0 && paidAmount < totalAmount) {
    return "Parcial";
  }

  if (normalized === "pagado") {
    return "Pagado";
  }

  if (normalized === "parcial") {
    return paidAmount > 0 && paidAmount < totalAmount ? "Parcial" : "Pendiente";
  }

  return "Pendiente";
}

function buildCatalogEntriesFromImportedMovements(movements) {
  const entries = [];

  movements.forEach((movement) => {
    entries.push({
      group: movement.linea === "Gimnasio"
        ? "gimnasioCategorias"
        : "restauranteCategorias",
      value: movement.categoria,
      sortOrder: 999,
    });
    entries.push({
      group: "tipos",
      value: movement.tipo,
      sortOrder: 999,
    });
    entries.push({
      group: "mediosPago",
      value: movement.medioPago,
      sortOrder: 999,
    });
    entries.push({
      group: "estadosPago",
      value: movement.estadoPago,
      sortOrder: 999,
    });
  });

  return uniqueCatalogEntries(entries);
}

function uniqueCatalogEntries(entries) {
  const seen = new Set();
  const uniqueEntries = [];

  entries.forEach((entry) => {
    const value = cleanExcelText(entry.value);
    if (!entry.group || !value) {
      return;
    }

    const key = `${entry.group}::${normalizeComparableText(value)}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    uniqueEntries.push({
      group: entry.group,
      value,
      sortOrder: Number(entry.sortOrder || 999),
    });
  });

  return uniqueEntries;
}

async function loadCatalogState(client) {
  const result = await client.query(
    `
      select id, group_name, value, sort_order, is_active
      from catalog_items
      order by group_name asc, sort_order asc, value asc
    `
  );

  const state = new Map();
  result.rows.forEach((row) => {
    const group = row.group_name;
    const groupMap = state.get(group) || new Map();
    groupMap.set(normalizeComparableText(row.value), {
      id: Number(row.id),
      value: row.value,
      isActive: Boolean(row.is_active),
      sortOrder: Number(row.sort_order || 999),
    });
    state.set(group, groupMap);
  });

  return state;
}

async function upsertCatalogEntries(client, catalogState, entries) {
  let inserted = 0;
  let reactivated = 0;

  for (const entry of entries) {
    const groupMap = catalogState.get(entry.group) || new Map();
    const normalizedKey = normalizeComparableText(entry.value);
    const existing = groupMap.get(normalizedKey);

    if (existing) {
      if (!existing.isActive) {
        await client.query(
          `
            update catalog_items
            set is_active = true, updated_at = now()
            where id = $1
          `,
          [existing.id]
        );
        existing.isActive = true;
        reactivated += 1;
      }
      continue;
    }

    const result = await client.query(
      `
        insert into catalog_items (group_name, value, sort_order, is_active, updated_at)
        values ($1, $2, $3, true, now())
        returning id, group_name, value, sort_order, is_active
      `,
      [entry.group, entry.value, entry.sortOrder]
    );

    const row = result.rows[0];
    groupMap.set(normalizeComparableText(row.value), {
      id: Number(row.id),
      value: row.value,
      isActive: Boolean(row.is_active),
      sortOrder: Number(row.sort_order || 999),
    });
    catalogState.set(entry.group, groupMap);
    inserted += 1;
  }

  return { inserted, reactivated };
}

async function loadClientState(client) {
  const result = await client.query(
    `
      select id, full_name, is_active
      from clients
      order by id asc
    `
  );

  const state = new Map();
  result.rows.forEach((row) => {
    state.set(normalizeComparableText(row.full_name), {
      id: Number(row.id),
      fullName: row.full_name,
      isActive: Boolean(row.is_active),
    });
  });

  return state;
}

async function createMissingClientsFromImport(client, clientState, clientNames) {
  let inserted = 0;
  let matched = 0;

  for (const clientName of clientNames) {
    const cleanName = cleanExcelText(clientName);
    if (!cleanName) {
      continue;
    }

    const normalizedName = normalizeComparableText(cleanName);
    if (clientState.has(normalizedName)) {
      matched += 1;
      continue;
    }

    const result = await client.query(
      `
        insert into clients (
          full_name,
          document_number,
          phone,
          email,
          notes,
          is_active
        )
        values ($1, '', '', '', $2, true)
        returning id, full_name, is_active
      `,
      [cleanName, "Importado desde Excel"]
    );

    clientState.set(normalizedName, {
      id: Number(result.rows[0].id),
      fullName: result.rows[0].full_name,
      isActive: Boolean(result.rows[0].is_active),
    });
    inserted += 1;
  }

  return { inserted, matched };
}

async function loadMovementKeys(client) {
  const result = await client.query(
    `
      select
        business_line,
        movement_date,
        movement_type,
        category,
        client_name,
        description,
        payment_status,
        payment_method,
        total_amount,
        paid_amount
      from movements
    `
  );

  return new Set(result.rows.map((row) => buildMovementKey({
    linea: row.business_line,
    fecha: normalizeDateOnly(row.movement_date),
    tipo: row.movement_type,
    categoria: row.category,
    cliente: row.client_name || "",
    descripcion: row.description,
    estadoPago: row.payment_status,
    medioPago: row.payment_method,
    valorTotal: Number(row.total_amount || 0),
    abono: Number(row.paid_amount || 0),
  })));
}

async function insertImportedMovements(
  client,
  movements,
  catalogState,
  clientState,
  movementKeys,
  warnings
) {
  let inserted = 0;
  let skipped = 0;

  for (const movement of movements) {
    const canonicalMovement = resolveImportedMovementAgainstCatalogs(
      movement,
      catalogState,
      clientState
    );
    const payload = normalizeMovementPayload(canonicalMovement);
    validateMovementPayload(payload);

    const movementKey = buildMovementKey(payload);
    if (movementKeys.has(movementKey)) {
      skipped += 1;
      continue;
    }

    await client.query(
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

    movementKeys.add(movementKey);
    inserted += 1;
  }

  if (!inserted && movements.length) {
    warnings.push(
      "Todos los movimientos detectados ya existían en la base o fueron omitidos por duplicado."
    );
  }

  return { inserted, skipped };
}

function resolveImportedMovementAgainstCatalogs(movement, catalogState, clientState) {
  const categoryGroup =
    movement.linea === "Gimnasio" ? "gimnasioCategorias" : "restauranteCategorias";
  const clientMatch = clientState.get(normalizeComparableText(movement.cliente || ""));

  return {
    ...movement,
    categoria: resolveCatalogValue(categoryGroup, movement.categoria, catalogState),
    tipo: resolveCatalogValue("tipos", movement.tipo, catalogState),
    medioPago: resolveCatalogValue("mediosPago", movement.medioPago || "Otro", catalogState),
    estadoPago: resolveCatalogValue("estadosPago", movement.estadoPago, catalogState),
    cliente: clientMatch?.fullName || cleanExcelText(movement.cliente),
  };
}

function resolveCatalogValue(group, rawValue, catalogState) {
  const groupMap = catalogState.get(group);
  const normalizedKey = normalizeComparableText(rawValue);
  if (!groupMap || !groupMap.has(normalizedKey)) {
    return cleanExcelText(rawValue);
  }

  return groupMap.get(normalizedKey).value;
}

function buildMovementKey(movement) {
  return [
    cleanExcelText(movement.linea),
    normalizeDateOnly(movement.fecha),
    cleanExcelText(movement.tipo),
    normalizeComparableText(movement.categoria),
    normalizeComparableText(movement.cliente),
    normalizeComparableText(movement.descripcion),
    cleanExcelText(movement.estadoPago),
    normalizeComparableText(movement.medioPago),
    Number(movement.valorTotal || 0).toFixed(2),
    Number(movement.abono || 0).toFixed(2),
  ].join("::");
}

function excelCellToIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return "";
    }

    return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const text = cleanExcelText(value);
  if (!text) {
    return "";
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function toPositiveAmount(value) {
  const amount = toAmount(value);
  return amount > 0 ? amount : 0;
}

function toAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleanValue = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=.*\.)/g, "")
    .replace(",", ".");

  const parsed = Number(cleanValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanExcelText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparableText(value) {
  return cleanExcelText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

async function listProgrammingMethods() {
  const result = await query(
    `
      select *
      from programming_methods
      order by sort_order asc, name asc
    `
  );

  return result.rows.map(mapProgrammingMethodRow);
}

async function listProgrammingExercises() {
  const result = await query(
    `
      select *
      from programming_exercises
      order by is_active desc, family asc, category asc, name asc
    `
  );

  return result.rows.map(mapProgrammingExerciseRow);
}

async function listClassPrograms(options = {}) {
  const programId = Number(options.programId || 0);
  const hasProgramId = Number.isInteger(programId) && programId > 0;
  const params = [];
  const whereClause = hasProgramId ? "where cp.id = $1" : "";

  if (hasProgramId) {
    params.push(programId);
  }

  const programResult = await query(
    `
      select
        cp.*,
        pm.name as method_name,
        coalesce(nullif(created_by_user.full_name, ''), created_by_user.username) as created_by_name,
        coalesce(nullif(updated_by_user.full_name, ''), updated_by_user.username) as updated_by_name
      from class_programs cp
      join programming_methods pm
        on pm.id = cp.method_id
      join app_users created_by_user
        on created_by_user.id = cp.created_by_user_id
      join app_users updated_by_user
        on updated_by_user.id = cp.updated_by_user_id
      ${whereClause}
      order by cp.is_active desc, cp.class_date asc, cp.updated_at desc, cp.id desc
    `,
    params
  );

  const programIds = programResult.rows.map((row) => Number(row.id));
  if (!programIds.length) {
    return [];
  }

  const itemsResult = await query(
    `
      select
        cpi.*,
        pe.name as exercise_name,
        pe.family as exercise_family,
        pe.category as exercise_category,
        pe.primary_muscle as exercise_primary_muscle,
        pe.movement_pattern as exercise_movement_pattern,
        pe.equipment as exercise_equipment,
        pm.name as method_name
      from class_program_items cpi
      join programming_exercises pe
        on pe.id = cpi.exercise_id
      left join programming_methods pm
        on pm.id = cpi.method_id
      where cpi.class_program_id = any($1::bigint[])
      order by cpi.class_program_id asc, cpi.sort_order asc, cpi.id asc
    `,
    [programIds]
  );

  const itemsByProgramId = new Map();
  itemsResult.rows.forEach((row) => {
    const currentProgramId = Number(row.class_program_id);
    const currentItems = itemsByProgramId.get(currentProgramId) || [];
    currentItems.push(mapClassProgramItemRow(row));
    itemsByProgramId.set(currentProgramId, currentItems);
  });

  return programResult.rows.map((row) =>
    mapClassProgramRow(row, itemsByProgramId.get(Number(row.id)) || [])
  );
}

async function readClassProgramById(programId) {
  const programs = await listClassPrograms({ programId });

  if (!programs.length) {
    throw httpError(404, "Programación no encontrada.");
  }

  return programs[0];
}

async function replaceClassProgramItems(client, programId, items) {
  await client.query(
    `
      delete from class_program_items
      where class_program_id = $1
    `,
    [programId]
  );

  for (const item of items) {
    await client.query(
      `
        insert into class_program_items (
          class_program_id,
          sort_order,
          block_name,
          exercise_id,
          method_id,
          prescription,
          repetition_text,
          weight_text,
          condition_notes,
          coach_notes
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        programId,
        item.sortOrder,
        item.blockName,
        item.exerciseId,
        item.methodId,
        item.prescription,
        item.repetitionText || "",
        item.weightText || "",
        item.conditionNotes,
        item.coachNotes,
      ]
    );
  }
}

async function assertProgrammingExerciseNameAvailable(name, options = {}) {
  const exerciseName = String(name || "").trim();
  const excludeId = Number(options.excludeId || 0);
  const hasExcludeId = Number.isInteger(excludeId) && excludeId > 0;

  const result = await query(
    `
      select id
      from programming_exercises
      where lower(name) = lower($1)
      ${hasExcludeId ? "and id <> $2" : ""}
      limit 1
    `,
    hasExcludeId ? [exerciseName, excludeId] : [exerciseName]
  );

  if (result.rows.length) {
    throw httpError(409, "Ya existe un ejercicio registrado con ese nombre.");
  }
}

async function assertProgrammingReferencesExist(payload) {
  const methodIds = [
    ...new Set(
      [
        payload.methodId,
        ...payload.items
          .map((item) => item.methodId)
          .filter((value) => Number.isInteger(value) && value > 0),
      ].filter((value) => Number.isInteger(value) && value > 0)
    ),
  ];

  if (methodIds.length) {
    const methodResult = await query(
      `
        select id
        from programming_methods
        where id = any($1::bigint[])
      `,
      [methodIds]
    );

    if (methodResult.rows.length !== methodIds.length) {
      throw httpError(
        400,
        "Uno de los métodos seleccionados ya no está disponible."
      );
    }
  }

  const exerciseIds = [
    ...new Set(
      payload.items
        .map((item) => item.exerciseId)
        .filter((value) => Number.isInteger(value) && value > 0)
    ),
  ];

  const exerciseResult = await query(
    `
      select id
      from programming_exercises
      where id = any($1::bigint[])
    `,
    [exerciseIds]
  );

  if (exerciseResult.rows.length !== exerciseIds.length) {
    throw httpError(
      400,
      "Uno de los ejercicios seleccionados ya no está disponible."
    );
  }
}

function mapProgrammingMethodRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    code: row.code,
    description: row.description || "",
    prescriptionGuide: row.prescription_guide || "",
    structureHint: row.structure_hint || "",
    sortOrder: Number(row.sort_order || 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapProgrammingExerciseRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    family: row.family,
    category: row.category,
    primaryMuscle: row.primary_muscle,
    movementPattern: row.movement_pattern || "",
    equipment: row.equipment || "",
    coachingNotes: row.coaching_notes || "",
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapClassProgramItemRow(row) {
  return {
    id: Number(row.id),
    classProgramId: Number(row.class_program_id),
    sortOrder: Number(row.sort_order || 0),
    blockName: row.block_name,
    exerciseId: Number(row.exercise_id),
    exerciseName: row.exercise_name,
    exerciseFamily: row.exercise_family,
    exerciseCategory: row.exercise_category,
    exercisePrimaryMuscle: row.exercise_primary_muscle,
    exerciseMovementPattern: row.exercise_movement_pattern || "",
    exerciseEquipment: row.exercise_equipment || "",
    methodId: row.method_id ? Number(row.method_id) : null,
    methodName: row.method_name || "",
    prescription: row.prescription || "",
    repetitionText: row.repetition_text || "",
    weightText: row.weight_text || "",
    conditionNotes: row.condition_notes || "",
    coachNotes: row.coach_notes || "",
    createdAt: row.created_at || null,
  };
}

function mapClassProgramRow(row, items = []) {
  return {
    id: Number(row.id),
    classDate: normalizeDateOnly(row.class_date),
    title: row.title,
    classGroup: row.class_group || "",
    focusArea: row.focus_area || "",
    methodId: Number(row.method_id),
    methodName: row.method_name || "",
    durationMinutes: Number(row.duration_minutes || 0),
    objective: row.objective || "",
    generalNotes: row.general_notes || "",
    isActive: Boolean(row.is_active),
    createdByUserId: Number(row.created_by_user_id || 0),
    updatedByUserId: Number(row.updated_by_user_id || 0),
    createdByName: row.created_by_name || "",
    updatedByName: row.updated_by_name || "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    items,
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

async function syncClientNameRename(client, previousValue, nextValue) {
  if (!previousValue || !nextValue || previousValue === nextValue) {
    return;
  }

  await client.query(
    `
      update movements
      set
        client_name = $2,
        updated_at = now()
      where lower(trim(client_name)) = lower(trim($1))
    `,
    [previousValue, nextValue]
  );
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

async function findClientByName(fullName, options = {}) {
  const excludeId = Number(options.excludeId || 0);
  const result = await query(
    `
      select *
      from clients
      where lower(full_name) = lower($1)
        and ($2::bigint <= 0 or id <> $2::bigint)
      limit 1
    `,
    [String(fullName || "").trim(), excludeId]
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

function requireProgrammingAccess(req, res, next) {
  if (!["administrador", "asistente_operativo"].includes(req.authUser?.role)) {
    return res.status(403).json({
      error: "Tu perfil no tiene acceso al módulo de programación.",
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
