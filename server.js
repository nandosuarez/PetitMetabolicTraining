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

app.use(express.json({ limit: "25mb" }));
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

app.post("/api/clients", requireOperationalWriteAccess, asyncHandler(async (req, res) => {
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
        alias,
        document_number,
        phone,
        email,
        notes,
        is_active
      )
      values ($1, $2, $3, $4, $5, $6, true)
      returning *
    `,
    [
      payload.fullName,
      payload.alias,
      payload.documentNumber,
      payload.phone,
      payload.email,
      payload.notes,
    ]
  );

  res.status(201).json(mapClientRow(result.rows[0]));
}));

app.put("/api/clients/:id", requireOperationalWriteAccess, asyncHandler(async (req, res) => {
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
            alias = $3,
            document_number = $4,
            phone = $5,
            email = $6,
            notes = $7,
            updated_at = now()
          where id = $1
          returning *
        `,
        [
          clientId,
          payload.fullName,
          payload.alias,
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
  "/api/programming/athletes",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const payload = normalizeProgrammingAthletePayload(req.body);
    validateProgrammingAthletePayload(payload);
    await assertProgrammingAthleteIdentityAvailable(payload);

    const result = await query(
      `
        insert into athletes (
          full_name,
          document_number,
          birth_date,
          phone,
          email,
          emergency_contact_name,
          emergency_contact_phone,
          medical_notes,
          athlete_notes,
          is_active
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        returning *
      `,
      [
        payload.fullName,
        payload.documentNumber,
        payload.birthDate || null,
        payload.phone,
        payload.email,
        payload.emergencyContactName,
        payload.emergencyContactPhone,
        payload.medicalNotes,
        payload.athleteNotes,
      ]
    );

    res.status(201).json(mapProgrammingAthleteRow(result.rows[0]));
  })
);

app.put(
  "/api/programming/athletes/:id",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const athleteId = Number(req.params.id);
    const payload = normalizeProgrammingAthletePayload(req.body);
    validateProgrammingAthletePayload(payload);

    if (!Number.isInteger(athleteId) || athleteId <= 0) {
      return res.status(400).json({ error: "Atleta invalido." });
    }

    await assertProgrammingAthleteIdentityAvailable(payload, {
      excludeId: athleteId,
    });

    const result = await query(
      `
        update athletes
        set
          full_name = $2,
          document_number = $3,
          birth_date = $4,
          phone = $5,
          email = $6,
          emergency_contact_name = $7,
          emergency_contact_phone = $8,
          medical_notes = $9,
          athlete_notes = $10,
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        athleteId,
        payload.fullName,
        payload.documentNumber,
        payload.birthDate || null,
        payload.phone,
        payload.email,
        payload.emergencyContactName,
        payload.emergencyContactPhone,
        payload.medicalNotes,
        payload.athleteNotes,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Atleta no encontrado." });
    }

    res.json(mapProgrammingAthleteRow(result.rows[0]));
  })
);

app.patch(
  "/api/programming/athletes/:id/active",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const athleteId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (!Number.isInteger(athleteId) || athleteId <= 0) {
      return res.status(400).json({ error: "Atleta invalido." });
    }

    const result = await query(
      `
        update athletes
        set
          is_active = $2,
          updated_at = now()
        where id = $1
        returning *
      `,
      [athleteId, isActive]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Atleta no encontrado." });
    }

    res.json(mapProgrammingAthleteRow(result.rows[0]));
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

app.post(
  "/api/programming/programs/:id/enrollments",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const programId = Number(req.params.id);
    const payload = normalizeProgrammingEnrollmentPayload(req.body);
    validateProgrammingEnrollmentPayload(payload);

    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({ error: "Programación invalida." });
    }

    await assertClassProgramExists(programId);
    await assertAthleteExistsForProgramming(payload.athleteId);

    const userId = Number(req.authUser?.id || 0);

    const existingEnrollmentResult = await query(
      `
        select id
        from class_program_enrollments
        where class_program_id = $1
          and athlete_id = $2
        limit 1
      `,
      [programId, payload.athleteId]
    );

    if (existingEnrollmentResult.rows.length) {
      await query(
        `
          update class_program_enrollments
          set
            updated_by_user_id = $3,
            updated_at = now()
          where class_program_id = $1
            and athlete_id = $2
        `,
        [programId, payload.athleteId, userId]
      );
    } else {
      await query(
        `
          insert into class_program_enrollments (
            class_program_id,
            athlete_id,
            general_notes,
            created_by_user_id,
            updated_by_user_id
          )
          values ($1, $2, '', $3, $3)
        `,
        [programId, payload.athleteId, userId]
      );
    }

    const program = await readClassProgramById(programId);
    res.status(201).json(program);
  })
);

app.delete(
  "/api/programming/programs/:programId/enrollments/:enrollmentId",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const programId = Number(req.params.programId);
    const enrollmentId = Number(req.params.enrollmentId);

    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({ error: "Programación invalida." });
    }

    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
      return res.status(400).json({ error: "Inscripción invalida." });
    }

    const result = await query(
      `
        delete from class_program_enrollments
        where id = $1
          and class_program_id = $2
        returning id
      `,
      [enrollmentId, programId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Inscripción no encontrada." });
    }

    res.status(204).send();
  })
);

app.put(
  "/api/programming/programs/:programId/enrollments/:enrollmentId/results",
  requireProgrammingAccess,
  asyncHandler(async (req, res) => {
    const programId = Number(req.params.programId);
    const enrollmentId = Number(req.params.enrollmentId);
    const payload = normalizeProgrammingEnrollmentResultsPayload(req.body);
    validateProgrammingEnrollmentResultsPayload(payload);

    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({ error: "Programación invalida." });
    }

    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
      return res.status(400).json({ error: "Inscripción invalida." });
    }

    const userId = Number(req.authUser?.id || 0);

    await withClient(async (client) => {
      await client.query("begin");

      try {
        const enrollmentResult = await client.query(
          `
            select id
            from class_program_enrollments
            where id = $1
              and class_program_id = $2
            limit 1
          `,
          [enrollmentId, programId]
        );

        if (!enrollmentResult.rows.length) {
          throw httpError(404, "Inscripción no encontrada.");
        }

        const programItemsResult = await client.query(
          `
            select
              cpi.sort_order,
              pe.name as exercise_name
            from class_program_items cpi
            join programming_exercises pe
              on pe.id = cpi.exercise_id
            where cpi.class_program_id = $1
            order by cpi.sort_order asc, cpi.id asc
          `,
          [programId]
        );

        const itemsBySortOrder = new Map(
          programItemsResult.rows.map((row) => [
            Number(row.sort_order || 0),
            String(row.exercise_name || ""),
          ])
        );

        const invalidResult = payload.results.find(
          (item) => !itemsBySortOrder.has(Number(item.itemSortOrder || 0))
        );

        if (invalidResult) {
          throw httpError(
            400,
            "Uno de los resultados no coincide con un ejercicio vigente de la clase."
          );
        }

        await client.query(
          `
            update class_program_enrollments
            set
              general_notes = $2,
              updated_by_user_id = $3,
              updated_at = now()
            where id = $1
          `,
          [enrollmentId, payload.generalNotes, userId]
        );

        await replaceClassProgramEnrollmentResults(
          client,
          enrollmentId,
          payload.results.map((item) => ({
            ...item,
            exerciseNameSnapshot:
              itemsBySortOrder.get(Number(item.itemSortOrder || 0)) || "",
          })),
          userId
        );

        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    const program = await readClassProgramById(programId);
    res.json(program);
  })
);

app.get("/api/bootstrap", asyncHandler(async (req, res) => {
  const isAssistantOperative = req.authUser?.role === "asistente_operativo";
  const hasAccountingAccess = userHasAccountingAccess(req.authUser);
  const hasProgrammingAccess = req.authUser?.role === "administrador";
  const hasInventoryAccess = req.authUser?.role === "administrador";
  const hasInventoryProductLinkAccess =
    hasInventoryAccess || userHasOperationalWriteAccess(req.authUser);
  const hasBusinessProductAccess = hasInventoryProductLinkAccess;

  const [
    catalogResult,
    movementResult,
    boxMovementResult,
    portfolioResult,
    notesResult,
    clientResult,
    athleteResult,
    collectionResult,
    transferResult,
    programmingMethods,
    programmingExercises,
    classPrograms,
    accountingDocumentsResult,
    inventoryAssetsResult,
    inventoryProductsResult,
    inventoryStockMovementsResult,
    businessProductsResult,
    businessProductComponentsResult,
  ] =
    await Promise.all([
    query(
      `
        select id, group_name, value, default_amount, sort_order, is_active, created_at, updated_at
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
    hasProgrammingAccess
      ? query(
          `
            select *
            from athletes
            order by is_active desc, full_name asc, id asc
          `
        )
      : Promise.resolve({ rows: [] }),
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
    hasProgrammingAccess ? listProgrammingMethods() : Promise.resolve([]),
    hasProgrammingAccess ? listProgrammingExercises() : Promise.resolve([]),
    hasProgrammingAccess ? listClassPrograms() : Promise.resolve([]),
    hasAccountingAccess
      ? query(
          `
            select
              ad.*,
              coalesce(nullif(u.full_name, ''), u.username) as uploaded_by_name,
              u.username as uploaded_by_username,
              coalesce(download_counts.download_count, 0) as download_count,
              latest_download.created_at as last_downloaded_at,
              latest_download.downloaded_by_name as last_downloaded_by_name,
              latest_download.downloaded_by_username as last_downloaded_by_username
            from accounting_documents ad
            join app_users u
              on u.id = ad.uploaded_by_user_id
            left join lateral (
              select count(*)::int as download_count
              from accounting_document_downloads addl
              where addl.accounting_document_id = ad.id
            ) download_counts on true
            left join lateral (
              select
                addl.created_at,
                coalesce(nullif(du.full_name, ''), du.username) as downloaded_by_name,
                du.username as downloaded_by_username
              from accounting_document_downloads addl
              join app_users du
                on du.id = addl.downloaded_by_user_id
              where addl.accounting_document_id = ad.id
              order by addl.created_at desc, addl.id desc
              limit 1
            ) latest_download on true
            order by ad.accounting_date desc, ad.created_at desc, ad.id desc
          `
        )
      : Promise.resolve({ rows: [] }),
    hasInventoryAccess
      ? query(
          `
            select *
            from inventory_assets
            order by is_active desc, name asc, id asc
          `
        )
      : Promise.resolve({ rows: [] }),
    hasInventoryProductLinkAccess
      ? query(
          `
            select *
            from inventory_products
            order by is_active desc, name asc, id asc
          `
        )
      : Promise.resolve({ rows: [] }),
    hasInventoryAccess
      ? query(
          `
            select
              ism.*,
              ip.name as product_name,
              ip.area as product_area,
              ip.unit_name as product_unit_name,
              coalesce(nullif(u.full_name, ''), u.username) as registered_by_name,
              u.username as registered_by_username
            from inventory_stock_movements ism
            join inventory_products ip
              on ip.id = ism.inventory_product_id
            join app_users u
              on u.id = ism.registered_by_user_id
            order by ism.movement_date desc, ism.created_at desc, ism.id desc
          `
        )
      : Promise.resolve({ rows: [] }),
    hasBusinessProductAccess
      ? query(
          `
            select
              bp.*,
              ip.name as direct_inventory_product_name,
              ip.unit_name as direct_inventory_product_unit_name
            from business_products bp
            left join inventory_products ip
              on ip.id = bp.direct_inventory_product_id
            order by bp.is_active desc, bp.business_line asc, bp.item_type asc, bp.name asc, bp.id asc
          `
        )
      : Promise.resolve({ rows: [] }),
    hasBusinessProductAccess
      ? query(
          `
            select
              bpc.*,
              ip.name as inventory_product_name,
              ip.area as inventory_product_area,
              ip.unit_name as inventory_product_unit_name
            from business_product_components bpc
            join inventory_products ip
              on ip.id = bpc.inventory_product_id
            order by bpc.business_product_id asc, bpc.sort_order asc, bpc.id asc
          `
        )
      : Promise.resolve({ rows: [] }),
  ]);

  res.json({
    lists: mapCatalogRows(catalogResult.rows),
    catalogItems: mapCatalogItemRows(catalogResult.rows),
    movements: movementResult.rows.map(mapMovementRow),
    boxMovements: boxMovementResult.rows.map(mapMovementRow),
    portfolioMovements: portfolioResult.rows.map(mapMovementRow),
    clients: clientResult.rows.map(mapClientRow),
    athletes: athleteResult.rows.map(mapProgrammingAthleteRow),
    collections: collectionResult.rows.map(mapCollectionRow),
    boxTransfers: transferResult.rows.map(mapBoxTransferRow),
    programmingMethods,
    programmingExercises,
    classPrograms,
    accountingDocuments: accountingDocumentsResult.rows.map(mapAccountingDocumentRow),
    inventoryAssets: inventoryAssetsResult.rows.map(mapInventoryAssetRow),
    inventoryProducts: inventoryProductsResult.rows.map(mapInventoryProductRow),
    inventoryStockMovements:
      inventoryStockMovementsResult.rows.map(mapInventoryStockMovementRow),
    businessProducts: businessProductsResult.rows.map(mapBusinessProductRow),
    businessProductComponents:
      businessProductComponentsResult.rows.map(mapBusinessProductComponentRow),
    notes: mapNotesRows(notesResult.rows),
  });
}));

app.post(
  "/api/accounting-documents",
  requireAccountingAccess,
  asyncHandler(async (req, res) => {
    const payload = normalizeAccountingDocumentPayload(req.body);
    validateAccountingDocumentPayload(payload);

    const fileBuffer = decodeBase64FileData(payload.fileDataBase64);
    if (!fileBuffer.length) {
      return res.status(400).json({
        error: "No se pudo leer el archivo adjunto.",
      });
    }

    const result = await query(
      `
        insert into accounting_documents (
          accounting_date,
          business_line,
          document_area,
          document_type,
          reference,
          notes,
          original_name,
          mime_type,
          file_size,
          file_content,
          uploaded_by_user_id,
          updated_by_user_id
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning *,
          $13::text as uploaded_by_name,
          $14::text as uploaded_by_username
      `,
      [
        payload.accountingDate,
        payload.businessLine,
        payload.documentArea,
        payload.documentType,
        payload.reference,
        payload.notes,
        payload.originalName,
        payload.mimeType,
        payload.fileSize,
        fileBuffer,
        Number(req.authUser.id),
        Number(req.authUser.id),
        req.authUser.fullName || req.authUser.username || "Sistema",
        req.authUser.username || "",
      ]
    );

    res.status(201).json(mapAccountingDocumentRow(result.rows[0]));
  })
);

app.put(
  "/api/accounting-documents/:id",
  requireAccountingAccess,
  asyncHandler(async (req, res) => {
    const documentId = Number(req.params.id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ error: "Documento inválido." });
    }

    const payload = normalizeAccountingDocumentPayload(req.body);
    validateAccountingDocumentMetadataPayload(payload);

    const existingResult = await query(
      `
        select *
        from accounting_documents
        where id = $1
        limit 1
      `,
      [documentId]
    );

    if (!existingResult.rows.length) {
      return res.status(404).json({ error: "Documento no encontrado." });
    }

    const existing = existingResult.rows[0];
    const hasReplacementFile = Boolean(payload.fileDataBase64);
    const fileBuffer = hasReplacementFile
      ? decodeBase64FileData(payload.fileDataBase64)
      : Buffer.alloc(0);

    if (hasReplacementFile && !fileBuffer.length) {
      return res.status(400).json({
        error: "No se pudo leer el archivo adjunto para reemplazar el soporte.",
      });
    }

    const result = await query(
      `
        update accounting_documents
        set
          accounting_date = $1,
          business_line = $2,
          document_area = $3,
          document_type = $4,
          reference = $5,
          notes = $6,
          original_name = $7,
          mime_type = $8,
          file_size = $9,
          file_content = $10,
          updated_by_user_id = $11,
          updated_at = now()
        where id = $12
        returning *,
          $13::text as uploaded_by_name,
          $14::text as uploaded_by_username
      `,
      [
        payload.accountingDate,
        payload.businessLine,
        payload.documentArea,
        payload.documentType,
        payload.reference,
        payload.notes,
        hasReplacementFile ? payload.originalName : existing.original_name,
        hasReplacementFile ? payload.mimeType : existing.mime_type,
        hasReplacementFile ? payload.fileSize : existing.file_size,
        hasReplacementFile ? fileBuffer : existing.file_content,
        Number(req.authUser.id),
        documentId,
        req.authUser.fullName || req.authUser.username || "Sistema",
        req.authUser.username || "",
      ]
    );

    res.json(mapAccountingDocumentRow(result.rows[0]));
  })
);

app.get(
  "/api/accounting-documents/:id/file",
  requireAccountingAccess,
  asyncHandler(async (req, res) => {
    const documentId = Number(req.params.id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({ error: "Documento inválido." });
    }

    const result = await query(
      `
        select id, original_name, mime_type, file_content
        from accounting_documents
        where id = $1
        limit 1
      `,
      [documentId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Documento no encontrado." });
    }

    const row = result.rows[0];
    await query(
      `
        insert into accounting_document_downloads (
          accounting_document_id,
          downloaded_by_user_id
        )
        values ($1, $2)
      `,
      [documentId, Number(req.authUser.id)]
    );
    const safeName = sanitizeDownloadName(row.original_name || `soporte-${documentId}`);
    res.setHeader("Content-Type", row.mime_type || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );
    res.send(row.file_content);
  })
);

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

app.post("/api/movements", requireOperationalWriteAccess, asyncHandler(async (req, res) => {
  const payload = normalizeMovementPayload(req.body);
  validateMovementPayload(payload);

  const movement = await withClient(async (client) => {
    await client.query("begin");

    try {
      const result = await client.query(
        `
          insert into movements (
            business_line,
            movement_date,
            movement_type,
            category,
            business_product_id,
            client_name,
            description,
            payment_status,
            payment_method,
            total_amount,
            paid_amount,
            balance_due,
            cash_flow,
            inventory_product_id,
            inventory_quantity,
            inventory_effect,
            year,
            month_number,
            month_name,
            notes
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          )
          returning *
        `,
        [
          payload.linea,
          payload.fecha,
          payload.tipo,
          payload.categoria,
          payload.businessProductId || null,
          payload.cliente,
          payload.descripcion,
          payload.estadoPago,
          payload.medioPago,
          payload.valorTotal,
          payload.abono,
          payload.saldoPendiente,
          payload.flujoNeto,
          payload.inventoryEffect === "ninguno" ? null : payload.inventoryProductId,
          payload.inventoryEffect === "ninguno" ? 0 : payload.inventoryQuantity,
          payload.inventoryEffect,
          payload.ano,
          payload.mesNumero,
          payload.mesNombre,
          payload.observaciones,
        ]
      );

      const movementRow = result.rows[0];
      await applyMovementInventoryLink(
        client,
        Number(movementRow.id),
        payload,
        Number(req.authUser.id)
      );

      await client.query("commit");
      return movementRow;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });

  res.status(201).json(mapMovementRow(movement));
}));

app.put("/api/movements/:id", requireOperationalWriteAccess, asyncHandler(async (req, res) => {
  const movementId = Number(req.params.id);
  await assertMovementMutationAllowed(req.authUser, movementId);

  const payload = normalizeMovementPayload(req.body);
  validateMovementPayload(payload, {
    requireEditJustification:
      req.authUser?.role === "asistente_operativo",
    requireObservationMinOnEdit: true,
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

  const updatedMovementRow = await withClient(async (client) => {
    await client.query("begin");

    try {
      await revertMovementInventoryLink(client, movementId);

      const result = await client.query(
        `
          update movements
          set
            business_line = $2,
            movement_date = $3,
            movement_type = $4,
            category = $5,
            business_product_id = $6,
            client_name = $7,
            description = $8,
            payment_status = $9,
            payment_method = $10,
            total_amount = $11,
            paid_amount = $12,
            balance_due = $13,
            cash_flow = $14,
            inventory_product_id = $15,
            inventory_quantity = $16,
            inventory_effect = $17,
            year = $18,
            month_number = $19,
            month_name = $20,
            notes = $21,
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
          payload.businessProductId || null,
          payload.cliente,
          payload.descripcion,
          payload.estadoPago,
          payload.medioPago,
          payload.valorTotal,
          payload.abono,
          payload.saldoPendiente,
          payload.flujoNeto,
          payload.inventoryEffect === "ninguno" ? null : payload.inventoryProductId,
          payload.inventoryEffect === "ninguno" ? 0 : payload.inventoryQuantity,
          payload.inventoryEffect,
          payload.ano,
          payload.mesNumero,
          payload.mesNombre,
          payload.observaciones,
        ]
      );

      if (!result.rows.length) {
        throw httpError(404, "Movimiento no encontrado.");
      }

      await applyMovementInventoryLink(
        client,
        movementId,
        payload,
        Number(req.authUser.id)
      );

      await client.query("commit");
      return result.rows[0];
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });

  const updatedMovement = mapMovementRow(updatedMovementRow);

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

app.delete("/api/movements/:id", requireOperationalWriteAccess, asyncHandler(async (req, res) => {
  const movementId = Number(req.params.id);
  await assertMovementMutationAllowed(req.authUser, movementId);

  const deletedId = await withClient(async (client) => {
    await client.query("begin");

    try {
      await revertMovementInventoryLink(client, movementId);

      const result = await client.query(
        "delete from movements where id = $1 returning id",
        [movementId]
      );

      if (!result.rows.length) {
        throw httpError(404, "Movimiento no encontrado.");
      }

      await client.query("commit");
      return Number(result.rows[0].id);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });

  if (!deletedId) {
    return res.status(404).json({ error: "Movimiento no encontrado." });
  }

  res.status(204).send();
}));

app.post("/api/movements/:id/collections", requireOperationalWriteAccess, asyncHandler(async (req, res) => {
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

app.post("/api/box-transfers", requireOperationalWriteAccess, asyncHandler(async (req, res) => {
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
  const defaultAmount = Math.max(Number(req.body.defaultAmount || 0), 0);

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
      insert into catalog_items (
        group_name,
        value,
        default_amount,
        sort_order,
        is_active,
        updated_at
      )
      values (
        $1,
        $2,
        $3,
        coalesce((select max(sort_order) + 1 from catalog_items where group_name = $1), 1),
        true,
        now()
      )
      on conflict (group_name, value)
      do update set
        is_active = true,
        default_amount = $3,
        updated_at = now()
      returning *
    `,
    [group, value, defaultAmount]
  );

  res.status(201).json(mapCatalogItemRow(result.rows[0]));
}));

app.patch("/api/catalogs/:group/items/:id", requireAdmin, asyncHandler(async (req, res) => {
  const group = String(req.params.group || "");
  const itemId = Number(req.params.id);
  const hasValue = Object.prototype.hasOwnProperty.call(req.body || {}, "value");
  const hasActive = Object.prototype.hasOwnProperty.call(req.body || {}, "isActive");
  const hasDefaultAmount = Object.prototype.hasOwnProperty.call(
    req.body || {},
    "defaultAmount"
  );
  const nextValue = hasValue ? String(req.body.value || "").trim() : null;
  const nextActive = hasActive ? Boolean(req.body.isActive) : null;
  const nextDefaultAmount = hasDefaultAmount
    ? Math.max(Number(req.body.defaultAmount || 0), 0)
    : null;

  if (!catalogGroups.has(group)) {
    return res.status(400).json({ error: "Grupo de catalogo invalido." });
  }

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ error: "Item de catalogo invalido." });
  }

  if (!hasValue && !hasActive && !hasDefaultAmount) {
    return res.status(400).json({
      error: "Debes enviar un nuevo nombre, valor sugerido o un cambio de estado.",
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
        const finalDefaultAmount = hasDefaultAmount
          ? nextDefaultAmount
          : Number(currentRow.default_amount || 0);

        const result = await client.query(
          `
            update catalog_items
            set
              value = $3,
              is_active = $4,
              default_amount = $5,
              updated_at = now()
            where id = $1 and group_name = $2
            returning *
          `,
          [itemId, group, finalValue, finalActive, finalDefaultAmount]
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

app.post(
  "/api/inventory/assets",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = normalizeInventoryAssetPayload(req.body);
    validateInventoryAssetPayload(payload);

    const result = await query(
      `
        insert into inventory_assets (
          name,
          category,
          location,
          condition_status,
          brand_model,
          serial_number,
          purchase_date,
          purchase_value,
          notes,
          is_active
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        returning *
      `,
      [
        payload.name,
        payload.category,
        payload.location,
        payload.conditionStatus,
        payload.brandModel,
        payload.serialNumber,
        payload.purchaseDate || null,
        payload.purchaseValue,
        payload.notes,
      ]
    );

    res.status(201).json(mapInventoryAssetRow(result.rows[0]));
  })
);

app.put(
  "/api/inventory/assets/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const assetId = Number(req.params.id);
    const payload = normalizeInventoryAssetPayload(req.body);
    validateInventoryAssetPayload(payload);

    if (!Number.isInteger(assetId) || assetId <= 0) {
      return res.status(400).json({ error: "Activo invalido." });
    }

    const result = await query(
      `
        update inventory_assets
        set
          name = $2,
          category = $3,
          location = $4,
          condition_status = $5,
          brand_model = $6,
          serial_number = $7,
          purchase_date = $8,
          purchase_value = $9,
          notes = $10,
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        assetId,
        payload.name,
        payload.category,
        payload.location,
        payload.conditionStatus,
        payload.brandModel,
        payload.serialNumber,
        payload.purchaseDate || null,
        payload.purchaseValue,
        payload.notes,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Activo no encontrado." });
    }

    res.json(mapInventoryAssetRow(result.rows[0]));
  })
);

app.patch(
  "/api/inventory/assets/:id/active",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const assetId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (!Number.isInteger(assetId) || assetId <= 0) {
      return res.status(400).json({ error: "Activo invalido." });
    }

    const result = await query(
      `
        update inventory_assets
        set
          is_active = $2,
          updated_at = now()
        where id = $1
        returning *
      `,
      [assetId, isActive]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Activo no encontrado." });
    }

    res.json(mapInventoryAssetRow(result.rows[0]));
  })
);

app.post(
  "/api/inventory/products",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = normalizeInventoryProductPayload(req.body);
    validateInventoryProductPayload(payload);

    const product = await withClient(async (client) => {
      await client.query("begin");

      try {
        const result = await client.query(
          `
            insert into inventory_products (
              name,
              area,
              category,
              unit_name,
              current_stock,
              minimum_stock,
              cost_price,
              sale_price,
              notes,
              is_active
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
            returning *
          `,
          [
            payload.name,
            payload.area,
            payload.category,
            payload.unitName,
            payload.currentStock,
            payload.minimumStock,
            payload.costPrice,
            payload.salePrice,
            payload.notes,
          ]
        );

        const productRow = result.rows[0];

        if (payload.currentStock > 0) {
          await client.query(
            `
              insert into inventory_stock_movements (
                inventory_product_id,
                movement_date,
                movement_type,
                quantity,
                unit_cost,
                stock_before,
                stock_after,
                reference,
                notes,
                registered_by_user_id
              )
              values ($1, $2, 'entrada', $3, $4, 0, $3, $5, $6, $7)
            `,
            [
              productRow.id,
              getCurrentIsoDateInBogota(),
              payload.currentStock,
              payload.costPrice,
              "Saldo inicial",
              payload.notes,
              Number(req.authUser.id),
            ]
          );
        }

        await client.query("commit");
        return productRow;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    res.status(201).json(mapInventoryProductRow(product));
  })
);

app.put(
  "/api/inventory/products/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const payload = normalizeInventoryProductPayload(req.body);
    validateInventoryProductPayload(payload);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "Producto invalido." });
    }

    const product = await withClient(async (client) => {
      await client.query("begin");

      try {
        const currentResult = await client.query(
          `
            select *
            from inventory_products
            where id = $1
            limit 1
            for update
          `,
          [productId]
        );

        if (!currentResult.rows.length) {
          throw httpError(404, "Producto no encontrado.");
        }

        const currentRow = currentResult.rows[0];
        const currentStock = Number(currentRow.current_stock || 0);
        const nextStock = payload.currentStock;
        const delta = Number((nextStock - currentStock).toFixed(2));

        const result = await client.query(
          `
            update inventory_products
            set
              name = $2,
              area = $3,
              category = $4,
              unit_name = $5,
              current_stock = $6,
              minimum_stock = $7,
              cost_price = $8,
              sale_price = $9,
              notes = $10,
              updated_at = now()
            where id = $1
            returning *
          `,
          [
            productId,
            payload.name,
            payload.area,
            payload.category,
            payload.unitName,
            nextStock,
            payload.minimumStock,
            payload.costPrice,
            payload.salePrice,
            payload.notes,
          ]
        );

        if (delta !== 0) {
          await client.query(
            `
              insert into inventory_stock_movements (
                inventory_product_id,
                movement_date,
                movement_type,
                quantity,
                unit_cost,
                stock_before,
                stock_after,
                reference,
                notes,
                registered_by_user_id
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `,
            [
              productId,
              getCurrentIsoDateInBogota(),
              delta > 0 ? "ajuste_positivo" : "ajuste_negativo",
              Math.abs(delta),
              payload.costPrice,
              currentStock,
              nextStock,
              "Ajuste manual desde ficha del producto",
              payload.notes,
              Number(req.authUser.id),
            ]
          );
        }

        await client.query("commit");
        return result.rows[0];
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    res.json(mapInventoryProductRow(product));
  })
);

app.patch(
  "/api/inventory/products/:id/active",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "Producto invalido." });
    }

    const result = await query(
      `
        update inventory_products
        set
          is_active = $2,
          updated_at = now()
        where id = $1
        returning *
      `,
      [productId, isActive]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    res.json(mapInventoryProductRow(result.rows[0]));
  })
);

app.post(
  "/api/inventory/products/:id/movements",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const payload = normalizeInventoryStockMovementPayload(req.body);
    validateInventoryStockMovementPayload(payload);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "Producto invalido." });
    }

    const movement = await withClient(async (client) => {
      await client.query("begin");

      try {
        const productResult = await client.query(
          `
            select *
            from inventory_products
            where id = $1
            limit 1
            for update
          `,
          [productId]
        );

        if (!productResult.rows.length) {
          throw httpError(404, "Producto no encontrado.");
        }

        const productRow = productResult.rows[0];
        const stockBefore = Number(productRow.current_stock || 0);
        const delta = getInventoryStockDelta(payload.movementType, payload.quantity);
        const stockAfter = Number((stockBefore + delta).toFixed(2));

        if (stockAfter < 0) {
          throw httpError(
            400,
            `El producto ${productRow.name} no tiene stock suficiente para esa salida o ajuste.`
          );
        }

        const movementResult = await client.query(
          `
            insert into inventory_stock_movements (
              inventory_product_id,
              movement_date,
              movement_type,
              quantity,
              unit_cost,
              stock_before,
              stock_after,
              reference,
              notes,
              registered_by_user_id
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            returning *
          `,
          [
            productId,
            payload.movementDate,
            payload.movementType,
            payload.quantity,
            payload.unitCost,
            stockBefore,
            stockAfter,
            payload.reference,
            payload.notes,
            Number(req.authUser.id),
          ]
        );

        await client.query(
          `
            update inventory_products
            set
              current_stock = $2,
              updated_at = now()
            where id = $1
          `,
          [productId, stockAfter]
        );

        await client.query("commit");

        return {
          ...movementResult.rows[0],
          product_name: productRow.name,
          product_area: productRow.area,
          product_unit_name: productRow.unit_name,
          registered_by_name:
            req.authUser.fullName || req.authUser.username || "Sistema",
          registered_by_username: req.authUser.username || "",
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    res.status(201).json(mapInventoryStockMovementRow(movement));
  })
);

app.post(
  "/api/business-products",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = normalizeBusinessProductPayload(req.body);
    validateBusinessProductPayload(payload);

    const result = await query(
      `
        insert into business_products (
          name,
          business_line,
          item_type,
          category,
          default_amount,
          direct_inventory_product_id,
          direct_inventory_quantity,
          notes,
          is_active
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, true)
        returning *
      `,
      [
        payload.name,
        payload.businessLine,
        payload.itemType,
        payload.category,
        payload.defaultAmount,
        payload.directInventoryProductId || null,
        payload.directInventoryProductId ? payload.directInventoryQuantity : 0,
        payload.notes,
      ]
    );

    res.status(201).json(mapBusinessProductRow(result.rows[0]));
  })
);

app.put(
  "/api/business-products/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const payload = normalizeBusinessProductPayload(req.body);
    validateBusinessProductPayload(payload);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "Producto o servicio invalido." });
    }

    const result = await query(
      `
        update business_products
        set
          name = $2,
          business_line = $3,
          item_type = $4,
          category = $5,
          default_amount = $6,
          direct_inventory_product_id = $7,
          direct_inventory_quantity = $8,
          notes = $9,
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        productId,
        payload.name,
        payload.businessLine,
        payload.itemType,
        payload.category,
        payload.defaultAmount,
        payload.directInventoryProductId || null,
        payload.directInventoryProductId ? payload.directInventoryQuantity : 0,
        payload.notes,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Producto o servicio no encontrado." });
    }

    res.json(mapBusinessProductRow(result.rows[0]));
  })
);

app.patch(
  "/api/business-products/:id/active",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "Producto o servicio invalido." });
    }

    const result = await query(
      `
        update business_products
        set
          is_active = $2,
          updated_at = now()
        where id = $1
        returning *
      `,
      [productId, isActive]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Producto o servicio no encontrado." });
    }

    res.json(mapBusinessProductRow(result.rows[0]));
  })
);

app.post(
  "/api/business-products/:id/components",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const businessProductId = Number(req.params.id);
    const payload = normalizeBusinessProductComponentPayload(req.body);
    validateBusinessProductComponentPayload(payload);

    if (!Number.isInteger(businessProductId) || businessProductId <= 0) {
      return res.status(400).json({ error: "Producto o servicio invalido." });
    }

    const result = await withClient(async (client) => {
      await client.query("begin");

      try {
        const productResult = await client.query(
          `
            select id
            from business_products
            where id = $1
            limit 1
            for update
          `,
          [businessProductId]
        );

        if (!productResult.rows.length) {
          throw httpError(404, "Producto o servicio no encontrado.");
        }

        const duplicateResult = await client.query(
          `
            select id
            from business_product_components
            where business_product_id = $1
              and inventory_product_id = $2
            limit 1
          `,
          [businessProductId, payload.inventoryProductId]
        );

        if (duplicateResult.rows.length) {
          throw httpError(
            400,
            "Ese insumo ya hace parte de la receta. Edita el existente o elimínalo primero."
          );
        }

        const insertResult = await client.query(
          `
            insert into business_product_components (
              business_product_id,
              inventory_product_id,
              quantity,
              notes,
              sort_order
            )
            values (
              $1,
              $2,
              $3,
              $4,
              coalesce(
                (select max(sort_order) + 1 from business_product_components where business_product_id = $1),
                1
              )
            )
            returning *
          `,
          [
            businessProductId,
            payload.inventoryProductId,
            payload.quantity,
            payload.notes,
          ]
        );

        await client.query("commit");
        return insertResult.rows[0];
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    const hydrated = await query(
      `
        select
          bpc.*,
          ip.name as inventory_product_name,
          ip.area as inventory_product_area,
          ip.unit_name as inventory_product_unit_name
        from business_product_components bpc
        join inventory_products ip
          on ip.id = bpc.inventory_product_id
        where bpc.id = $1
        limit 1
      `,
      [Number(result.id)]
    );

    res.status(201).json(mapBusinessProductComponentRow(hydrated.rows[0]));
  })
);

app.delete(
  "/api/business-products/:productId/components/:componentId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const businessProductId = Number(req.params.productId);
    const componentId = Number(req.params.componentId);

    if (
      !Number.isInteger(businessProductId) ||
      businessProductId <= 0 ||
      !Number.isInteger(componentId) ||
      componentId <= 0
    ) {
      return res.status(400).json({ error: "Componente de receta invalido." });
    }

    const result = await query(
      `
        delete from business_product_components
        where id = $1
          and business_product_id = $2
        returning id
      `,
      [componentId, businessProductId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Componente de receta no encontrado." });
    }

    res.status(204).send();
  })
);

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
    alias: String(body.alias || "").trim(),
    documentNumber: String(body.documentNumber || "").trim(),
    phone: String(body.phone || "").trim(),
    email: String(body.email || "").trim(),
    notes: String(body.notes || "").trim(),
  };
}

function normalizeInventoryAssetPayload(body) {
  return {
    name: String(body.name || "").trim(),
    category: String(body.category || "").trim(),
    location: String(body.location || "").trim(),
    conditionStatus: String(body.conditionStatus || "").trim(),
    brandModel: String(body.brandModel || "").trim(),
    serialNumber: String(body.serialNumber || "").trim(),
    purchaseDate: normalizeDateOnly(body.purchaseDate),
    purchaseValue: Math.max(Number(body.purchaseValue || 0), 0),
    notes: String(body.notes || "").trim(),
  };
}

function normalizeInventoryProductPayload(body) {
  return {
    name: String(body.name || "").trim(),
    area: String(body.area || "").trim(),
    category: String(body.category || "").trim(),
    unitName: String(body.unitName || "").trim(),
    currentStock: Math.max(Number(body.currentStock || 0), 0),
    minimumStock: Math.max(Number(body.minimumStock || 0), 0),
    costPrice: Math.max(Number(body.costPrice || 0), 0),
    salePrice: Math.max(Number(body.salePrice || 0), 0),
    notes: String(body.notes || "").trim(),
  };
}

function normalizeInventoryStockMovementPayload(body) {
  return {
    movementDate: normalizeDateOnly(body.movementDate),
    movementType: String(body.movementType || "").trim(),
    quantity: Number(body.quantity || 0),
    unitCost: Math.max(Number(body.unitCost || 0), 0),
    reference: String(body.reference || "").trim(),
    notes: String(body.notes || "").trim(),
  };
}

function normalizeBusinessProductPayload(body) {
  const directInventoryProductId = Number(body.directInventoryProductId || 0);
  const category = String(body.category || "").trim();
  const itemType = String(body.itemType || "").trim();

  return {
    name: String(body.name || "").trim(),
    businessLine: String(body.businessLine || "").trim(),
    itemType: itemType || category || "Producto",
    category,
    defaultAmount: Math.max(Number(body.defaultAmount || 0), 0),
    directInventoryProductId: Number.isInteger(directInventoryProductId)
      ? directInventoryProductId
      : 0,
    directInventoryQuantity: Math.max(Number(body.directInventoryQuantity || 0), 0),
    notes: String(body.notes || "").trim(),
  };
}

function normalizeBusinessProductComponentPayload(body) {
  const inventoryProductId = Number(body.inventoryProductId || 0);

  return {
    inventoryProductId: Number.isInteger(inventoryProductId)
      ? inventoryProductId
      : 0,
    quantity: Number(body.quantity || 0),
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

function validateInventoryAssetPayload(payload) {
  if (!payload.name) {
    throw httpError(400, "El nombre del activo es obligatorio.");
  }

  if (!payload.category) {
    throw httpError(400, "La categoria del activo es obligatoria.");
  }

  if (
    payload.conditionStatus &&
    !["Operativo", "En mantenimiento", "Fuera de servicio"].includes(
      payload.conditionStatus
    )
  ) {
    throw httpError(400, "El estado del activo no es valido.");
  }
}

function validateInventoryProductPayload(payload) {
  if (!payload.name) {
    throw httpError(400, "El nombre del producto es obligatorio.");
  }

  if (
    !["Gimnasio", "Restaurante", "Tienda", "Suplementos", "General"].includes(
      payload.area
    )
  ) {
    throw httpError(400, "El area del producto no es valida.");
  }

  if (!payload.category) {
    throw httpError(400, "La categoria del producto es obligatoria.");
  }

  if (!payload.unitName) {
    throw httpError(400, "La unidad del producto es obligatoria.");
  }
}

function validateInventoryStockMovementPayload(payload) {
  if (!payload.movementDate) {
    throw httpError(400, "La fecha del movimiento es obligatoria.");
  }

  if (
    !["entrada", "salida", "ajuste_positivo", "ajuste_negativo"].includes(
      payload.movementType
    )
  ) {
    throw httpError(400, "El tipo de movimiento de stock no es valido.");
  }

  if (!Number.isFinite(payload.quantity) || !(payload.quantity > 0)) {
    throw httpError(400, "La cantidad del movimiento debe ser mayor que cero.");
  }
}

function validateBusinessProductPayload(payload) {
  if (!payload.name) {
    throw httpError(400, "El nombre del producto o servicio es obligatorio.");
  }

  if (!["Gimnasio", "Restaurante"].includes(payload.businessLine)) {
    throw httpError(400, "La linea del producto o servicio no es valida.");
  }

  if (!payload.category) {
    throw httpError(400, "La categoria o familia comercial es obligatoria.");
  }

  if (!(payload.defaultAmount >= 0)) {
    throw httpError(400, "El valor sugerido del producto o servicio no es valido.");
  }

  if (payload.directInventoryProductId > 0 && !(payload.directInventoryQuantity > 0)) {
    throw httpError(
      400,
      "Si enlazas un insumo o producto directo, la cantidad por venta debe ser mayor que cero."
    );
  }
}

function validateBusinessProductComponentPayload(payload) {
  if (!(payload.inventoryProductId > 0)) {
    throw httpError(400, "Selecciona el insumo del inventario que hace parte de la receta.");
  }

  if (!Number.isFinite(payload.quantity) || !(payload.quantity > 0)) {
    throw httpError(400, "La cantidad del insumo debe ser mayor que cero.");
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
  const inventoryProductId = Number(body.inventoryProductId || 0);
  const inventoryQuantity = Math.max(Number(body.inventoryQuantity || 0), 0);
  const businessProductId = Number(body.businessProductId || 0);
  const inventoryEffect =
    String(body.inventoryEffect || "ninguno").trim() || "ninguno";

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
    businessProductId: Number.isInteger(businessProductId)
      ? businessProductId
      : 0,
    inventoryProductId: Number.isInteger(inventoryProductId)
      ? inventoryProductId
      : 0,
    inventoryQuantity,
    inventoryEffect,
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

function normalizeAccountingDocumentPayload(body) {
  return {
    accountingDate: String(body.accountingDate || "").trim(),
    businessLine: String(body.businessLine || "").trim(),
    documentArea: String(body.documentArea || "").trim(),
    documentType: String(body.documentType || "").trim(),
    reference: String(body.reference || "").trim(),
    notes: String(body.notes || "").trim(),
    originalName: String(body.originalName || "").trim(),
    mimeType: String(body.mimeType || "").trim(),
    fileSize: Number(body.fileSize || 0),
    fileDataBase64: String(body.fileDataBase64 || "").trim(),
  };
}

function normalizeProgrammingAthletePayload(body) {
  return {
    fullName: String(body.fullName || "").trim(),
    documentNumber: String(body.documentNumber || "").trim(),
    birthDate: normalizeDateOnly(body.birthDate),
    phone: String(body.phone || "").trim(),
    email: String(body.email || "").trim(),
    emergencyContactName: String(body.emergencyContactName || "").trim(),
    emergencyContactPhone: String(body.emergencyContactPhone || "").trim(),
    medicalNotes: String(body.medicalNotes || "").trim(),
    athleteNotes: String(body.athleteNotes || "").trim(),
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

function normalizeProgrammingEnrollmentPayload(body) {
  return {
    athleteId: Number(body.athleteId || 0),
  };
}

function normalizeProgrammingEnrollmentResultsPayload(body) {
  const rawResults = Array.isArray(body.results) ? body.results : [];

  return {
    generalNotes: String(body.generalNotes || "").trim(),
    results: rawResults.map((item) => ({
      itemSortOrder: Number(item?.itemSortOrder || 0),
      resultWeightText: String(item?.resultWeightText || "").trim(),
      resultTimeText: String(item?.resultTimeText || "").trim(),
      resultNotes: String(item?.resultNotes || "").trim(),
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

function validateProgrammingAthletePayload(payload) {
  if (!payload.fullName) {
    throw httpError(400, "El nombre del atleta es obligatorio.");
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw httpError(400, "El correo del atleta no es valido.");
  }
}

function validateProgrammingEnrollmentPayload(payload) {
  if (!Number.isInteger(payload.athleteId) || payload.athleteId <= 0) {
    throw httpError(400, "Selecciona un atleta válido para inscribir.");
  }
}

function validateProgrammingEnrollmentResultsPayload(payload) {
  if (!Array.isArray(payload.results)) {
    throw httpError(400, "Los resultados de la clase no tienen un formato válido.");
  }

  payload.results.forEach((item, index) => {
    if (!Number.isInteger(item.itemSortOrder) || item.itemSortOrder <= 0) {
      throw httpError(
        400,
        `La fila de resultado ${index + 1} no está asociada a un ejercicio válido.`
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

  if (!payload.medioPago) {
    throw httpError(400, "El medio de pago es obligatorio.");
  }

  if (!(payload.valorTotal > 0)) {
    throw httpError(400, "El valor total debe ser mayor a cero.");
  }

  if (payload.businessProductId < 0) {
    throw httpError(400, "El producto o servicio relacionado no es valido.");
  }

  if (payload.abono < 0) {
    throw httpError(400, "El abono no puede ser negativo.");
  }

  if (payload.abono > payload.valorTotal) {
    throw httpError(400, "El abono no puede ser mayor que el valor total.");
  }

  if (!["ninguno", "entrada", "salida"].includes(payload.inventoryEffect)) {
    throw httpError(400, "El impacto de inventario no es valido.");
  }

  if (payload.inventoryProductId > 0 && payload.inventoryEffect === "ninguno") {
    throw httpError(
      400,
      "Selecciona si el producto relacionado entra o sale del inventario."
    );
  }

  if (payload.inventoryEffect !== "ninguno") {
    if (!Number.isInteger(payload.inventoryProductId) || payload.inventoryProductId <= 0) {
      throw httpError(
        400,
        "Selecciona el producto de inventario relacionado con este movimiento."
      );
    }

    if (!(payload.inventoryQuantity > 0)) {
      throw httpError(
        400,
        "La cantidad de inventario debe ser mayor que cero cuando enlazas stock."
      );
    }
  }

  const expectedStatus = derivePaymentStatus(payload.valorTotal, payload.abono);
  if (!["Pagado", "Parcial", "Pendiente"].includes(expectedStatus)) {
    throw httpError(400, "No se pudo calcular el estado de pago del movimiento.");
  }

  if (
    options.requireObservationMinOnEdit &&
    String(payload.observaciones || "").trim().length < 4
  ) {
    throw httpError(
      400,
      "Cuando editas un movimiento, la observacion debe tener al menos 4 caracteres."
    );
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

function validateAccountingDocumentPayload(payload) {
  if (!payload.accountingDate) {
    throw httpError(400, "La fecha contable es obligatoria.");
  }

  if (!["Gimnasio", "Restaurante", "General"].includes(payload.businessLine)) {
    throw httpError(400, "La línea del documento no es válida.");
  }

  if (
    !["Venta", "Compra", "Gasto", "Impuesto", "Nomina", "Soporte", "Otro"].includes(
      payload.documentArea
    )
  ) {
    throw httpError(400, "El área del documento no es válida.");
  }

  if (!payload.documentType) {
    throw httpError(400, "El tipo de documento es obligatorio.");
  }

  if (!payload.originalName) {
    throw httpError(400, "Debes seleccionar un archivo.");
  }

  if (!payload.mimeType) {
    throw httpError(400, "El archivo no tiene un formato válido.");
  }

  if (!payload.fileDataBase64) {
    throw httpError(400, "El contenido del archivo es obligatorio.");
  }

  if (!Number.isFinite(payload.fileSize) || !(payload.fileSize > 0)) {
    throw httpError(400, "El tamaño del archivo no es válido.");
  }

  if (payload.fileSize > 8 * 1024 * 1024) {
    throw httpError(400, "El archivo supera el límite de 8 MB.");
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
    defaultAmount: Number(row.default_amount || 0),
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

  const [itemsResult, enrollmentsResult] = await Promise.all([
    query(
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
    ),
    query(
      `
        select
          cpe.*,
          a.full_name as athlete_full_name,
          a.document_number as athlete_document_number,
          a.birth_date as athlete_birth_date,
          a.phone as athlete_phone,
          a.email as athlete_email,
          a.emergency_contact_name as athlete_emergency_contact_name,
          a.emergency_contact_phone as athlete_emergency_contact_phone,
          a.medical_notes as athlete_medical_notes,
          a.athlete_notes as athlete_notes
        from class_program_enrollments cpe
        join athletes a
          on a.id = cpe.athlete_id
        where cpe.class_program_id = any($1::bigint[])
        order by cpe.class_program_id asc, lower(a.full_name) asc, cpe.id asc
      `,
      [programIds]
    ),
  ]);

  const itemsByProgramId = new Map();
  itemsResult.rows.forEach((row) => {
    const currentProgramId = Number(row.class_program_id);
    const currentItems = itemsByProgramId.get(currentProgramId) || [];
    currentItems.push(mapClassProgramItemRow(row));
    itemsByProgramId.set(currentProgramId, currentItems);
  });

  const enrollmentIds = enrollmentsResult.rows.map((row) => Number(row.id));
  const enrollmentResultsResult = enrollmentIds.length
    ? await query(
        `
          select
            cper.*,
            cpe.class_program_id
          from class_program_enrollment_results cper
          join class_program_enrollments cpe
            on cpe.id = cper.enrollment_id
          where cper.enrollment_id = any($1::bigint[])
          order by cpe.class_program_id asc, cper.enrollment_id asc, cper.item_sort_order asc, cper.id asc
        `,
        [enrollmentIds]
      )
    : { rows: [] };

  const resultsByEnrollmentId = new Map();
  enrollmentResultsResult.rows.forEach((row) => {
    const currentEnrollmentId = Number(row.enrollment_id);
    const currentResults = resultsByEnrollmentId.get(currentEnrollmentId) || [];
    currentResults.push(mapClassProgramEnrollmentResultRow(row));
    resultsByEnrollmentId.set(currentEnrollmentId, currentResults);
  });

  const enrollmentsByProgramId = new Map();
  enrollmentsResult.rows.forEach((row) => {
    const currentProgramId = Number(row.class_program_id);
    const currentEnrollments = enrollmentsByProgramId.get(currentProgramId) || [];
    currentEnrollments.push(
      mapClassProgramEnrollmentRow(
        row,
        resultsByEnrollmentId.get(Number(row.id)) || []
      )
    );
    enrollmentsByProgramId.set(currentProgramId, currentEnrollments);
  });

  return programResult.rows.map((row) =>
    mapClassProgramRow(
      row,
      itemsByProgramId.get(Number(row.id)) || [],
      enrollmentsByProgramId.get(Number(row.id)) || []
    )
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

  await syncClassProgramEnrollmentResultSnapshots(client, programId, items);
}

async function replaceClassProgramEnrollmentResults(
  client,
  enrollmentId,
  results,
  userId
) {
  await client.query(
    `
      delete from class_program_enrollment_results
      where enrollment_id = $1
    `,
    [enrollmentId]
  );

  const normalizedResults = Array.isArray(results) ? results : [];
  for (const item of normalizedResults) {
    const hasUsefulData = Boolean(
      String(item.resultWeightText || "").trim() ||
        String(item.resultTimeText || "").trim() ||
        String(item.resultNotes || "").trim()
    );

    if (!hasUsefulData) {
      continue;
    }

    await client.query(
      `
        insert into class_program_enrollment_results (
          enrollment_id,
          item_sort_order,
          exercise_name_snapshot,
          result_weight_text,
          result_time_text,
          result_notes,
          updated_by_user_id
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        enrollmentId,
        item.itemSortOrder,
        item.exerciseNameSnapshot || "",
        item.resultWeightText || "",
        item.resultTimeText || "",
        item.resultNotes || "",
        userId,
      ]
    );
  }
}

async function syncClassProgramEnrollmentResultSnapshots(client, programId, items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const itemRowsResult = normalizedItems.length
    ? await client.query(
        `
          select
            cpi.sort_order,
            pe.name as exercise_name
          from class_program_items cpi
          join programming_exercises pe
            on pe.id = cpi.exercise_id
          where cpi.class_program_id = $1
          order by cpi.sort_order asc, cpi.id asc
        `,
        [programId]
      )
    : { rows: [] };
  const validSortOrders = itemRowsResult.rows
    .map((row) => Number(row.sort_order || 0))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!validSortOrders.length) {
    await client.query(
      `
        delete from class_program_enrollment_results
        where enrollment_id in (
          select id
          from class_program_enrollments
          where class_program_id = $1
        )
      `,
      [programId]
    );
    return;
  }

  await client.query(
    `
      delete from class_program_enrollment_results
      where enrollment_id in (
        select id
        from class_program_enrollments
        where class_program_id = $1
      )
      and not (item_sort_order = any($2::integer[]))
    `,
    [programId, validSortOrders]
  );

  for (const row of itemRowsResult.rows) {
    await client.query(
      `
        update class_program_enrollment_results
        set
          exercise_name_snapshot = $3,
          updated_at = now()
        where enrollment_id in (
          select id
          from class_program_enrollments
          where class_program_id = $1
        )
        and item_sort_order = $2
      `,
      [programId, Number(row.sort_order || 0), String(row.exercise_name || "")]
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

async function assertClassProgramExists(programId) {
  const result = await query(
    `
      select id
      from class_programs
      where id = $1
      limit 1
    `,
    [programId]
  );

  if (!result.rows.length) {
    throw httpError(404, "Programación no encontrada.");
  }
}

async function assertAthleteExistsForProgramming(athleteId) {
  const result = await query(
    `
      select id
      from athletes
      where id = $1
        and is_active = true
      limit 1
    `,
    [athleteId]
  );

  if (!result.rows.length) {
    throw httpError(404, "El atleta seleccionado no existe o está inactivo.");
  }
}

async function assertProgrammingAthleteIdentityAvailable(payload, options = {}) {
  const excludeId = Number(options.excludeId || 0);

  if (payload.documentNumber) {
    const documentResult = await query(
      `
        select id
        from athletes
        where document_number = $1
          and ($2::bigint <= 0 or id <> $2::bigint)
        limit 1
      `,
      [payload.documentNumber, excludeId]
    );

    if (documentResult.rows.length) {
      throw httpError(409, "Ya existe un atleta registrado con ese documento.");
    }
  }

  const nameResult = await query(
    `
      select id
      from athletes
      where lower(full_name) = lower($1)
        and ($2::bigint <= 0 or id <> $2::bigint)
      limit 1
    `,
    [payload.fullName, excludeId]
  );

  if (nameResult.rows.length) {
    throw httpError(409, "Ya existe un atleta registrado con ese nombre.");
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

function mapProgrammingAthleteRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    documentNumber: row.document_number || "",
    birthDate: normalizeDateOnly(row.birth_date),
    phone: row.phone || "",
    email: row.email || "",
    emergencyContactName: row.emergency_contact_name || "",
    emergencyContactPhone: row.emergency_contact_phone || "",
    medicalNotes: row.medical_notes || "",
    athleteNotes: row.athlete_notes || "",
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

function mapClassProgramEnrollmentResultRow(row) {
  return {
    id: Number(row.id),
    enrollmentId: Number(row.enrollment_id),
    itemSortOrder: Number(row.item_sort_order || 0),
    exerciseNameSnapshot: row.exercise_name_snapshot || "",
    resultWeightText: row.result_weight_text || "",
    resultTimeText: row.result_time_text || "",
    resultNotes: row.result_notes || "",
    updatedByUserId: Number(row.updated_by_user_id || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapClassProgramEnrollmentRow(row, results = []) {
  return {
    id: Number(row.id),
    classProgramId: Number(row.class_program_id),
    athleteId: Number(row.athlete_id || 0),
    athleteFullName: row.athlete_full_name || "",
    athleteDocumentNumber: row.athlete_document_number || "",
    athleteBirthDate: normalizeDateOnly(row.athlete_birth_date),
    athletePhone: row.athlete_phone || "",
    athleteEmail: row.athlete_email || "",
    athleteEmergencyContactName: row.athlete_emergency_contact_name || "",
    athleteEmergencyContactPhone: row.athlete_emergency_contact_phone || "",
    athleteMedicalNotes: row.athlete_medical_notes || "",
    athleteNotes: row.athlete_notes || "",
    generalNotes: row.general_notes || "",
    createdByUserId: Number(row.created_by_user_id || 0),
    updatedByUserId: Number(row.updated_by_user_id || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    results,
  };
}

function mapClassProgramRow(row, items = [], enrollments = []) {
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
    enrollments,
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

function getCurrentIsoDateInBogota() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function getInventoryStockDelta(movementType, quantity) {
  const normalizedQuantity = Number(quantity || 0);

  if (!normalizedQuantity) {
    return 0;
  }

  if (movementType === "entrada" || movementType === "ajuste_positivo") {
    return normalizedQuantity;
  }

  if (movementType === "salida" || movementType === "ajuste_negativo") {
    return normalizedQuantity * -1;
  }

  return 0;
}

function normalizeMovementInventoryEffect(effect) {
  const normalizedEffect = String(effect || "ninguno").trim().toLowerCase();
  return ["entrada", "salida"].includes(normalizedEffect)
    ? normalizedEffect
    : "ninguno";
}

function movementInventoryEffectToStockType(effect) {
  return normalizeMovementInventoryEffect(effect) === "salida"
    ? "salida"
    : "entrada";
}

function resolveInventoryUnitCostFromMovement(payload, productRow) {
  const quantity = Number(payload.inventoryQuantity || 0);
  if (!(quantity > 0)) {
    return 0;
  }

  if (normalizeMovementInventoryEffect(payload.inventoryEffect) === "entrada") {
    return Number((Number(payload.valorTotal || 0) / quantity).toFixed(2));
  }

  return Number(productRow?.cost_price || 0);
}

async function lockInventoryProductForMovement(client, productId) {
  const result = await client.query(
    `
      select *
      from inventory_products
      where id = $1
      limit 1
      for update
    `,
    [productId]
  );

  if (!result.rows.length) {
    throw httpError(404, "Producto de inventario no encontrado.");
  }

  return result.rows[0];
}

async function getBusinessProductInventoryProfile(client, businessProductId, businessLine) {
  if (!(Number(businessProductId) > 0)) {
    return null;
  }

  const productResult = await client.query(
    `
      select
        bp.*,
        ip.name as direct_inventory_product_name
      from business_products bp
      left join inventory_products ip
        on ip.id = bp.direct_inventory_product_id
      where bp.id = $1
      limit 1
    `,
    [businessProductId]
  );

  if (!productResult.rows.length) {
    throw httpError(404, "El producto o servicio relacionado no existe.");
  }

  const productRow = productResult.rows[0];
  if (businessLine && productRow.business_line !== businessLine) {
    throw httpError(
      400,
      "El producto o servicio seleccionado no corresponde a la línea del movimiento."
    );
  }

  const componentsResult = await client.query(
    `
      select
        bpc.*,
        ip.name as inventory_product_name
      from business_product_components bpc
      join inventory_products ip
        on ip.id = bpc.inventory_product_id
      where bpc.business_product_id = $1
      order by bpc.sort_order asc, bpc.id asc
    `,
    [businessProductId]
  );

  return {
    product: productRow,
    components: componentsResult.rows,
  };
}

async function revertMovementInventoryLink(client, movementId) {
  const linkResult = await client.query(
    `
      select
        ism.*,
        ip.name as product_name,
        ip.current_stock,
        ip.cost_price
      from inventory_stock_movements ism
      join inventory_products ip
        on ip.id = ism.inventory_product_id
      where ism.source_movement_id = $1
      limit 1
      for update of ism, ip
    `,
    [movementId]
  );

  if (!linkResult.rows.length) {
    return null;
  }

  const linkRow = linkResult.rows[0];
  const delta = Number(
    (
      Number(linkRow.stock_after || 0) - Number(linkRow.stock_before || 0)
    ).toFixed(2)
  );
  const currentStock = Number(linkRow.current_stock || 0);
  const revertedStock = Number((currentStock - delta).toFixed(2));

  if (revertedStock < 0) {
    throw httpError(
      400,
      `No se puede modificar este movimiento porque el inventario de ${linkRow.product_name} ya fue consumido y quedaria negativo.`
    );
  }

  await client.query(
    `
      update inventory_products
      set
        current_stock = $2,
        updated_at = now()
      where id = $1
    `,
    [Number(linkRow.inventory_product_id), revertedStock]
  );

  await client.query(
    `
      delete from inventory_stock_movements
      where id = $1
    `,
    [Number(linkRow.id)]
  );

  return linkRow;
}

async function applyMovementInventoryLink(client, movementId, payload, authUserId) {
  if (normalizeMovementInventoryEffect(payload.inventoryEffect) === "ninguno") {
    return null;
  }

  const productRow = await lockInventoryProductForMovement(
    client,
    payload.inventoryProductId
  );
  const movementType = movementInventoryEffectToStockType(payload.inventoryEffect);
  const stockBefore = Number(productRow.current_stock || 0);
  const delta = getInventoryStockDelta(movementType, payload.inventoryQuantity);
  const stockAfter = Number((stockBefore + delta).toFixed(2));

  if (stockAfter < 0) {
    throw httpError(
      400,
      `El producto ${productRow.name} no tiene stock suficiente para registrar esa salida.`
    );
  }

  const unitCost = resolveInventoryUnitCostFromMovement(payload, productRow);
  const reference = [
    `Movimiento #${movementId}`,
    payload.tipo,
    payload.categoria,
  ]
    .filter(Boolean)
    .join(" · ");

  await client.query(
    `
      insert into inventory_stock_movements (
        inventory_product_id,
        source_movement_id,
        movement_date,
        movement_type,
        quantity,
        unit_cost,
        stock_before,
        stock_after,
        reference,
        notes,
        registered_by_user_id
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      payload.inventoryProductId,
      movementId,
      payload.fecha,
      movementType,
      payload.inventoryQuantity,
      unitCost,
      stockBefore,
      stockAfter,
      reference,
      payload.observaciones || payload.descripcion || "",
      Number(authUserId),
    ]
  );

  await client.query(
    `
      update inventory_products
      set
        current_stock = $2,
        cost_price = case
          when $3 > 0 and $4 = 'entrada' then $3
          else cost_price
        end,
        updated_at = now()
      where id = $1
    `,
    [
      payload.inventoryProductId,
      stockAfter,
      unitCost,
      movementType,
    ]
  );

  return {
    inventoryProductId: Number(payload.inventoryProductId),
    inventoryQuantity: Number(payload.inventoryQuantity),
    inventoryEffect: normalizeMovementInventoryEffect(payload.inventoryEffect),
  };
}

function buildInventoryLinksFromMovementPayload(payload, businessProductProfile = null) {
  const links = [];

  if (normalizeMovementInventoryEffect(payload.inventoryEffect) !== "ninguno") {
    links.push({
      inventoryProductId: Number(payload.inventoryProductId),
      quantity: Number(payload.inventoryQuantity || 0),
      effect: normalizeMovementInventoryEffect(payload.inventoryEffect),
      referenceParts: [payload.tipo, payload.categoria, "Manual"],
      notes: payload.observaciones || payload.descripcion || "",
      sourceType: "manual",
    });
  }

  if (!businessProductProfile) {
    return links;
  }

  const { product, components } = businessProductProfile;
  const hasAutomaticInventory =
    Number(product.direct_inventory_product_id || 0) > 0 || components.length > 0;

  if (hasAutomaticInventory && links.length) {
    throw httpError(
      400,
      "Si seleccionas un producto o servicio con receta o stock directo, no combines un enlace manual de inventario en el mismo movimiento."
    );
  }

  if ((Number(product.direct_inventory_product_id || 0) > 0) && payload.tipo !== "Ingreso") {
    throw httpError(
      400,
      "Los productos o servicios con impacto de inventario automático solo se pueden usar en movimientos de ingreso."
    );
  }

  if (components.length && payload.tipo !== "Ingreso") {
    throw httpError(
      400,
      "Las recetas solo se descuentan automáticamente cuando registras una venta o ingreso."
    );
  }

  if (Number(product.direct_inventory_product_id || 0) > 0) {
    links.push({
      inventoryProductId: Number(product.direct_inventory_product_id),
      quantity: Number(product.direct_inventory_quantity || 0) || 1,
      effect: "salida",
      referenceParts: [payload.tipo, product.name, "Venta directa"],
      notes: payload.observaciones || payload.descripcion || product.notes || "",
      sourceType: "business-product-direct",
    });
  }

  components.forEach((component) => {
    links.push({
      inventoryProductId: Number(component.inventory_product_id),
      quantity: Number(component.quantity || 0),
      effect: "salida",
      referenceParts: [payload.tipo, product.name, "Receta"],
      notes:
        payload.observaciones ||
        payload.descripcion ||
        component.notes ||
        product.notes ||
        "",
      sourceType: "business-product-component",
    });
  });

  return links;
}

async function revertMovementInventoryLink(client, movementId) {
  const linkResult = await client.query(
    `
      select
        ism.*,
        ip.name as product_name,
        ip.current_stock,
        ip.cost_price
      from inventory_stock_movements ism
      join inventory_products ip
        on ip.id = ism.inventory_product_id
      where ism.source_movement_id = $1
      order by ism.id desc
      for update of ism, ip
    `,
    [movementId]
  );

  if (!linkResult.rows.length) {
    return [];
  }

  const currentStocks = new Map();

  for (const linkRow of linkResult.rows) {
    const productId = Number(linkRow.inventory_product_id || 0);
    const delta = Number(
      (
        Number(linkRow.stock_after || 0) - Number(linkRow.stock_before || 0)
      ).toFixed(2)
    );
    const currentStock = currentStocks.has(productId)
      ? Number(currentStocks.get(productId) || 0)
      : Number(linkRow.current_stock || 0);
    const revertedStock = Number((currentStock - delta).toFixed(2));

    if (revertedStock < 0) {
      throw httpError(
        400,
        `No se puede modificar este movimiento porque el inventario de ${linkRow.product_name} ya fue consumido y quedaria negativo.`
      );
    }

    await client.query(
      `
        update inventory_products
        set
          current_stock = $2,
          updated_at = now()
        where id = $1
      `,
      [productId, revertedStock]
    );

    currentStocks.set(productId, revertedStock);
  }

  await client.query(
    `
      delete from inventory_stock_movements
      where source_movement_id = $1
    `,
    [movementId]
  );

  return linkResult.rows;
}

async function applyMovementInventoryLink(client, movementId, payload, authUserId) {
  const businessProductProfile = payload.businessProductId
    ? await getBusinessProductInventoryProfile(
        client,
        payload.businessProductId,
        payload.linea
      )
    : null;
  const links = buildInventoryLinksFromMovementPayload(payload, businessProductProfile);

  if (!links.length) {
    return [];
  }

  const appliedLinks = [];

  for (const link of links) {
    if (!(link.inventoryProductId > 0) || !(link.quantity > 0)) {
      continue;
    }

    const productRow = await lockInventoryProductForMovement(
      client,
      link.inventoryProductId
    );
    const movementType = movementInventoryEffectToStockType(link.effect);
    const stockBefore = Number(productRow.current_stock || 0);
    const delta = getInventoryStockDelta(movementType, link.quantity);
    const stockAfter = Number((stockBefore + delta).toFixed(2));

    if (stockAfter < 0) {
      throw httpError(
        400,
        `El producto ${productRow.name} no tiene stock suficiente para registrar esa salida.`
      );
    }

    const unitCost =
      movementType === "entrada"
        ? resolveInventoryUnitCostFromMovement(
            {
              ...payload,
              inventoryQuantity: link.quantity,
              inventoryEffect: link.effect,
            },
            productRow
          )
        : Number(productRow.cost_price || 0);
    const reference = [
      `Movimiento #${movementId}`,
      ...link.referenceParts,
    ]
      .filter(Boolean)
      .join(" · ");

    await client.query(
      `
        insert into inventory_stock_movements (
          inventory_product_id,
          source_movement_id,
          movement_date,
          movement_type,
          quantity,
          unit_cost,
          stock_before,
          stock_after,
          reference,
          notes,
          registered_by_user_id
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        link.inventoryProductId,
        movementId,
        payload.fecha,
        movementType,
        link.quantity,
        unitCost,
        stockBefore,
        stockAfter,
        reference,
        link.notes || "",
        Number(authUserId),
      ]
    );

    await client.query(
      `
        update inventory_products
        set
          current_stock = $2,
          cost_price = case
            when $3 > 0 and $4 = 'entrada' then $3
            else cost_price
          end,
          updated_at = now()
        where id = $1
      `,
      [
        link.inventoryProductId,
        stockAfter,
        unitCost,
        movementType,
      ]
    );

    appliedLinks.push({
      inventoryProductId: Number(link.inventoryProductId),
      inventoryQuantity: Number(link.quantity),
      inventoryEffect: normalizeMovementInventoryEffect(link.effect),
      sourceType: link.sourceType,
    });
  }

  return appliedLinks;
}

function mapInventoryAssetRow(row) {
  return {
    id: Number(row.id || 0),
    name: row.name || "",
    category: row.category || "",
    location: row.location || "",
    conditionStatus: row.condition_status || "Operativo",
    brandModel: row.brand_model || "",
    serialNumber: row.serial_number || "",
    purchaseDate: normalizeDateOnly(row.purchase_date),
    purchaseValue: Number(row.purchase_value || 0),
    notes: row.notes || "",
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapInventoryProductRow(row) {
  return {
    id: Number(row.id || 0),
    name: row.name || "",
    area: row.area || "",
    category: row.category || "",
    unitName: row.unit_name || "",
    currentStock: Number(row.current_stock || 0),
    minimumStock: Number(row.minimum_stock || 0),
    costPrice: Number(row.cost_price || 0),
    salePrice: Number(row.sale_price || 0),
    notes: row.notes || "",
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapBusinessProductRow(row) {
  return {
    id: Number(row.id || 0),
    name: row.name || "",
    businessLine: row.business_line || "",
    itemType: row.item_type || "Producto",
    category: row.category || "",
    defaultAmount: Number(row.default_amount || 0),
    directInventoryProductId: Number(row.direct_inventory_product_id || 0),
    directInventoryProductName: row.direct_inventory_product_name || "",
    directInventoryProductUnitName: row.direct_inventory_product_unit_name || "",
    directInventoryQuantity: Number(row.direct_inventory_quantity || 0),
    notes: row.notes || "",
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapBusinessProductComponentRow(row) {
  return {
    id: Number(row.id || 0),
    businessProductId: Number(row.business_product_id || 0),
    inventoryProductId: Number(row.inventory_product_id || 0),
    inventoryProductName: row.inventory_product_name || "",
    inventoryProductArea: row.inventory_product_area || "",
    inventoryProductUnitName: row.inventory_product_unit_name || "",
    quantity: Number(row.quantity || 0),
    notes: row.notes || "",
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapInventoryStockMovementRow(row) {
  return {
    id: Number(row.id || 0),
    inventoryProductId: Number(row.inventory_product_id || 0),
    sourceMovementId: Number(row.source_movement_id || 0),
    productName: row.product_name || "",
    productArea: row.product_area || "",
    productUnitName: row.product_unit_name || "",
    movementDate: normalizeDateOnly(row.movement_date),
    movementType: row.movement_type || "",
    quantity: Number(row.quantity || 0),
    unitCost: Number(row.unit_cost || 0),
    stockBefore: Number(row.stock_before || 0),
    stockAfter: Number(row.stock_after || 0),
    reference: row.reference || "",
    notes: row.notes || "",
    registeredBy:
      row.registered_by_name || row.registered_by_username || "Sistema",
    createdAt: row.created_at || null,
  };
}

function mapClientRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    alias: row.alias || "",
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
    businessProductId: Number(row.business_product_id || 0),
    cliente: row.client_name || "",
    descripcion: row.description,
    estadoPago: row.payment_status,
    medioPago: row.payment_method,
    valorTotal: Number(row.total_amount),
    abono: Number(row.paid_amount),
    saldoPendiente: Number(row.balance_due),
    flujoNeto: Number(row.cash_flow),
    inventoryProductId: Number(row.inventory_product_id || 0),
    inventoryQuantity: Number(row.inventory_quantity || 0),
    inventoryEffect: row.inventory_effect || "ninguno",
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

function mapAccountingDocumentRow(row) {
  return {
    id: row.id,
    accountingDate: normalizeDateOnly(row.accounting_date),
    businessLine: row.business_line,
    documentArea: row.document_area,
    documentType: row.document_type,
    reference: row.reference || "",
    notes: row.notes || "",
    originalName: row.original_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size || 0),
    uploadedBy:
      row.uploaded_by_name ||
      row.uploaded_by_username ||
      "Sistema",
    createdAt: row.created_at || null,
    fileUrl: `/api/accounting-documents/${row.id}/file`,
  };
}

function validateAccountingDocumentPayload(payload) {
  validateAccountingDocumentMetadataPayload(payload);

  if (!payload.originalName) {
    throw httpError(400, "Debes seleccionar un archivo.");
  }

  if (!payload.mimeType) {
    throw httpError(400, "El archivo no tiene un formato válido.");
  }

  if (!payload.fileDataBase64) {
    throw httpError(400, "El contenido del archivo es obligatorio.");
  }

  if (!Number.isFinite(payload.fileSize) || !(payload.fileSize > 0)) {
    throw httpError(400, "El tamaño del archivo no es válido.");
  }
}

function validateAccountingDocumentMetadataPayload(payload) {
  if (!payload.accountingDate) {
    throw httpError(400, "La fecha contable es obligatoria.");
  }

  if (!["Gimnasio", "Restaurante", "General"].includes(payload.businessLine)) {
    throw httpError(400, "La línea del documento no es válida.");
  }

  if (
    !["Venta", "Compra", "Gasto", "Impuesto", "Nomina", "Soporte", "Otro"].includes(
      payload.documentArea
    )
  ) {
    throw httpError(400, "El área del documento no es válida.");
  }

  if (!payload.documentType) {
    throw httpError(400, "El tipo de documento es obligatorio.");
  }
}

function mapAccountingDocumentRow(row) {
  return {
    id: row.id,
    accountingDate: normalizeDateOnly(row.accounting_date),
    businessLine: row.business_line,
    documentArea: row.document_area,
    documentType: row.document_type,
    reference: row.reference || "",
    notes: row.notes || "",
    originalName: row.original_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size || 0),
    uploadedBy:
      row.uploaded_by_name ||
      row.uploaded_by_username ||
      "Sistema",
    downloadCount: Number(row.download_count || 0),
    lastDownloadedAt: row.last_downloaded_at || null,
    lastDownloadedBy:
      row.last_downloaded_by_name ||
      row.last_downloaded_by_username ||
      "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || row.created_at || null,
    fileUrl: `/api/accounting-documents/${row.id}/file`,
  };
}

function decodeBase64FileData(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return Buffer.alloc(0);
  }

  const cleanValue = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  return Buffer.from(cleanValue, "base64");
}

function sanitizeDownloadName(value) {
  return String(value || "")
    .replace(/[^\w\s.\-()]/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "soporte-contable";
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

function userHasAccountingAccess(user) {
  return ["administrador", "contador"].includes(user?.role);
}

function userHasOperationalWriteAccess(user) {
  return ["administrador", "asistente_operativo"].includes(user?.role);
}

function requireAccountingAccess(req, res, next) {
  if (!userHasAccountingAccess(req.authUser)) {
    return res.status(403).json({
      error: "Tu perfil no tiene acceso al módulo de contabilidad.",
    });
  }

  next();
}

function requireOperationalWriteAccess(req, res, next) {
  if (!userHasOperationalWriteAccess(req.authUser)) {
    return res.status(403).json({
      error: "Tu perfil no tiene permisos para modificar la operación.",
    });
  }

  next();
}

function requireProgrammingAccess(req, res, next) {
  if (req.authUser?.role !== "administrador") {
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
