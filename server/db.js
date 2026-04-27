const { Pool } = require("pg");
const { URL } = require("url");

let pool;

function buildConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no esta definido. Crea un archivo .env con tu conexion PostgreSQL."
    );
  }

  const sslModeFromUrl = readSslModeFromConnectionString(connectionString);
  const useSsl =
    String(process.env.DATABASE_SSL || "").toLowerCase() === "true" ||
    String(process.env.PGSSLMODE || "").toLowerCase() === "require" ||
    sslModeFromUrl === "require";

  return {
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  };
}

function getPool() {
  if (!pool) {
    pool = new Pool(buildConfig());
  }

  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

async function withClient(callback) {
  const client = await getPool().connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

async function checkConnection() {
  const result = await query("select now() as now");
  return result.rows[0];
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

function readSslModeFromConnectionString(connectionString) {
  try {
    const url = new URL(String(connectionString || ""));
    return String(url.searchParams.get("sslmode") || "").toLowerCase();
  } catch (_error) {
    return "";
  }
}

module.exports = {
  query,
  withClient,
  checkConnection,
  closePool,
};
