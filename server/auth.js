const crypto = require("crypto");

const { query } = require("./db");

const AUTH_COOKIE_NAME = "petit_session";
const SESSION_TTL_DAYS = 10;
const PASSWORD_ITERATIONS = 210000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";
const USER_ROLES = ["administrador", "asistente_operativo", "contador"];

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function normalizeRole(role) {
  const cleanRole = String(role || "").trim().toLowerCase();
  return USER_ROLES.includes(cleanRole) ? cleanRole : "";
}

function createPasswordRecord(password) {
  const value = String(password || "");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(
      value,
      salt,
      PASSWORD_ITERATIONS,
      PASSWORD_KEY_LENGTH,
      PASSWORD_DIGEST
    )
    .toString("hex");

  return {
    salt,
    hash,
    iterations: PASSWORD_ITERATIONS,
  };
}

function verifyPassword(password, userRow) {
  const value = String(password || "");
  const salt = String(userRow.password_salt || "");
  const iterations = Number(userRow.password_iterations || PASSWORD_ITERATIONS);
  const expectedHash = String(userRow.password_hash || "");
  const derivedHash = crypto
    .pbkdf2Sync(value, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  return safeEqualHex(derivedHash, expectedHash);
}

async function findUserByUsername(username) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  const result = await query(
    `
      select
        id,
        username,
        full_name,
        role,
        password_hash,
        password_salt,
        password_iterations,
        must_change_password,
        is_active
      from app_users
      where username = $1
      limit 1
    `,
    [normalizedUsername]
  );

  return result.rows[0] || null;
}

async function getUserById(userId) {
  const result = await query(
    `
      select
        id,
        username,
        full_name,
        role,
        must_change_password,
        is_active,
        created_at,
        updated_at
      from app_users
      where id = $1
      limit 1
    `,
    [Number(userId)]
  );

  return result.rows[0] || null;
}

async function getUserAuthById(userId) {
  const result = await query(
    `
      select
        id,
        username,
        full_name,
        role,
        password_hash,
        password_salt,
        password_iterations,
        must_change_password,
        is_active
      from app_users
      where id = $1
      limit 1
    `,
    [Number(userId)]
  );

  return result.rows[0] || null;
}

async function createAppUser({
  username,
  password,
  fullName = "",
  role = "asistente_operativo",
  mustChangePassword = false,
}) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedRole = normalizeRole(role);
  const cleanFullName = String(fullName || "").trim();

  validateUserIdentity({
    username: normalizedUsername,
    password,
    role: normalizedRole,
  });

  const existingUser = await findUserByUsername(normalizedUsername);
  if (existingUser) {
    throw createDomainError(409, "Ya existe un usuario con ese nombre.");
  }

  const passwordRecord = createPasswordRecord(password);
  const result = await query(
    `
      insert into app_users (
        username,
        full_name,
        role,
        password_hash,
        password_salt,
        password_iterations,
        must_change_password,
        is_active
      )
      values ($1, $2, $3, $4, $5, $6, $7, true)
      returning id, username, full_name, role, must_change_password, is_active, created_at, updated_at
    `,
    [
      normalizedUsername,
      cleanFullName,
      normalizedRole,
      passwordRecord.hash,
      passwordRecord.salt,
      passwordRecord.iterations,
      Boolean(mustChangePassword),
    ]
  );

  return mapUserRow(result.rows[0]);
}

async function upsertAppUser({
  username,
  password,
  fullName = "",
  role = "administrador",
  mustChangePassword = false,
}) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedRole = normalizeRole(role);
  const cleanFullName = String(fullName || "").trim();

  validateUserIdentity({
    username: normalizedUsername,
    password,
    role: normalizedRole,
  });

  const passwordRecord = createPasswordRecord(password);
  const result = await query(
    `
      insert into app_users (
        username,
        full_name,
        role,
        password_hash,
        password_salt,
        password_iterations,
        must_change_password,
        is_active
      )
      values ($1, $2, $3, $4, $5, $6, $7, true)
      on conflict (username)
      do update set
        full_name = excluded.full_name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        password_iterations = excluded.password_iterations,
        must_change_password = excluded.must_change_password,
        password_changed_at = case
          when excluded.must_change_password then app_users.password_changed_at
          else now()
        end,
        is_active = true,
        updated_at = now()
      returning id, username, full_name, role, must_change_password, is_active, created_at, updated_at
    `,
    [
      normalizedUsername,
      cleanFullName,
      normalizedRole,
      passwordRecord.hash,
      passwordRecord.salt,
      passwordRecord.iterations,
      Boolean(mustChangePassword),
    ]
  );

  return mapUserRow(result.rows[0]);
}

async function listAppUsers() {
  const result = await query(
    `
      select
        id,
        username,
        full_name,
        role,
        must_change_password,
        is_active,
        created_at,
        updated_at
      from app_users
      order by
        case when role = 'administrador' then 0 else 1 end,
        is_active desc,
        username asc
    `
  );

  return result.rows.map(mapUserRow);
}

async function setAppUserActiveStatus(userId, isActive) {
  const result = await query(
    `
      update app_users
      set
        is_active = $2,
        updated_at = now()
      where id = $1
      returning id, username, full_name, role, must_change_password, is_active, created_at, updated_at
    `,
    [Number(userId), Boolean(isActive)]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

async function setAppUserPassword(userId, password, options = {}) {
  const {
    mustChangePassword = false,
    passwordChangedAt = mustChangePassword ? null : new Date(),
  } = options;
  const passwordRecord = createPasswordRecord(password);
  const result = await query(
    `
      update app_users
      set
        password_hash = $2,
        password_salt = $3,
        password_iterations = $4,
        must_change_password = $5,
        password_changed_at = $6,
        updated_at = now()
      where id = $1
      returning id, username, full_name, role, must_change_password, is_active, created_at, updated_at
    `,
    [
      Number(userId),
      passwordRecord.hash,
      passwordRecord.salt,
      passwordRecord.iterations,
      Boolean(mustChangePassword),
      passwordChangedAt ? new Date(passwordChangedAt).toISOString() : null,
    ]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

async function setTemporaryAppUserPassword(userId, password) {
  return setAppUserPassword(userId, password, {
    mustChangePassword: true,
    passwordChangedAt: null,
  });
}

async function countActiveAdminUsers() {
  const result = await query(
    `
      select count(*)::integer as total
      from app_users
      where role = 'administrador'
        and is_active = true
    `
  );

  return Number(result.rows[0]?.total || 0);
}

async function createSession(userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await query(
    `
      insert into app_sessions (user_id, token_hash, expires_at)
      values ($1, $2, $3)
    `,
    [Number(userId), tokenHash, expiresAt.toISOString()]
  );

  return {
    token: rawToken,
    expiresAt,
  };
}

async function getSessionUserFromToken(token) {
  const rawToken = String(token || "").trim();

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const result = await query(
    `
      select
        s.id as session_id,
        s.user_id,
        s.expires_at,
        u.username,
        u.full_name,
        u.role,
        u.must_change_password,
        u.is_active
      from app_sessions s
      inner join app_users u
        on u.id = s.user_id
      where s.token_hash = $1
        and s.expires_at > now()
        and u.is_active = true
      limit 1
    `,
    [tokenHash]
  );

  if (!result.rows.length) {
    return null;
  }

  await query(
    `
      update app_sessions
      set last_seen_at = now()
      where token_hash = $1
    `,
    [tokenHash]
  );

  return mapUserRow(result.rows[0]);
}

async function deleteSession(token) {
  const rawToken = String(token || "").trim();

  if (!rawToken) {
    return;
  }

  await query("delete from app_sessions where token_hash = $1", [
    hashToken(rawToken),
  ]);
}

async function deleteSessionsForUser(userId) {
  await query("delete from app_sessions where user_id = $1", [Number(userId)]);
}

function getSessionTokenFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[AUTH_COOKIE_NAME] || "";
}

function setSessionCookie(res, token, expiresAt) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(AUTH_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: shouldUseSecureCookies(),
      maxAge: Math.max(
        1,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      ),
    })
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(AUTH_COOKIE_NAME, "", {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: shouldUseSecureCookies(),
      maxAge: 0,
    })
  );
}

function mapUserRow(row) {
  return {
    id: Number(row.user_id || row.id),
    username: row.username,
    fullName: row.full_name || "",
    role: normalizeRole(row.role) || "asistente_operativo",
    mustChangePassword: Boolean(row.must_change_password),
    isActive:
      row.is_active === undefined ? true : Boolean(row.is_active),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function roleLabel(role) {
  return {
    administrador: "Administrador",
    asistente_operativo: "Asistente operativo",
    contador: "Contador",
  }[normalizeRole(role)] || "Sin perfil";
}

function validateUserIdentity({ username, password, role }) {
  if (!username) {
    throw createDomainError(400, "El usuario es obligatorio.");
  }

  if (!role) {
    throw createDomainError(400, "El perfil del usuario es obligatorio.");
  }

  if (String(password || "").length < 10) {
    throw createDomainError(
      400,
      "La contraseña debe tener al menos 10 caracteres."
    );
  }
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function safeEqualHex(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "hex");
  const rightBuffer = Buffer.from(String(right || ""), "hex");

  if (leftBuffer.length !== rightBuffer.length || !leftBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Number(options.maxAge)}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function createDomainError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function shouldUseSecureCookies() {
  return (
    String(process.env.SESSION_COOKIE_SECURE || "").toLowerCase() === "true" ||
    String(process.env.NODE_ENV || "").toLowerCase() === "production"
  );
}

module.exports = {
  USER_ROLES,
  clearSessionCookie,
  countActiveAdminUsers,
  createAppUser,
  createPasswordRecord,
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
  normalizeUsername,
  roleLabel,
  setAppUserPassword,
  setAppUserActiveStatus,
  setSessionCookie,
  setTemporaryAppUserPassword,
  upsertAppUser,
  verifyPassword,
};
