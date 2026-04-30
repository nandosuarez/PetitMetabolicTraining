require("dotenv").config();

const { Pool } = require("pg");
const { URL } = require("url");

function buildPool(connectionString) {
  if (!connectionString) {
    throw new Error("Falta la cadena de conexión a PostgreSQL.");
  }

  const sslMode = readSslModeFromConnectionString(connectionString);
  const useSsl =
    String(process.env.DATABASE_SSL || "").toLowerCase() === "true" ||
    String(process.env.PGSSLMODE || "").toLowerCase() === "require" ||
    sslMode === "require";

  return new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
}

function readSslModeFromConnectionString(connectionString) {
  try {
    const url = new URL(String(connectionString || ""));
    return String(url.searchParams.get("sslmode") || "").toLowerCase();
  } catch (_error) {
    return "";
  }
}

function normalizeComparableText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mergeText(primaryValue, fallbackValue) {
  const primary = String(primaryValue || "").trim();
  if (primary) {
    return primary;
  }

  return String(fallbackValue || "").trim();
}

function mergeNotes(sourceNotes, targetNotes) {
  const left = String(sourceNotes || "").trim();
  const right = String(targetNotes || "").trim();

  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  if (left === right || right.includes(left)) {
    return right;
  }

  if (left.includes(right)) {
    return left;
  }

  return `${right} | ${left}`;
}

async function listSourceClients(pool) {
  const result = await pool.query(`
    select
      id,
      full_name,
      document_number,
      phone,
      email,
      notes,
      is_active
    from clients
    order by id asc
  `);

  return result.rows.map((row) => ({
    id: Number(row.id),
    fullName: row.full_name,
    documentNumber: row.document_number || "",
    phone: row.phone || "",
    email: row.email || "",
    notes: row.notes || "",
    isActive: Boolean(row.is_active),
  }));
}

async function loadTargetState(client) {
  const result = await client.query(`
    select
      id,
      full_name,
      document_number,
      phone,
      email,
      notes,
      is_active
    from clients
    order by id asc
  `);

  const byId = new Map();
  const byName = new Map();
  const byDocument = new Map();

  result.rows.forEach((row) => {
    const normalized = {
      id: Number(row.id),
      fullName: row.full_name,
      documentNumber: row.document_number || "",
      phone: row.phone || "",
      email: row.email || "",
      notes: row.notes || "",
      isActive: Boolean(row.is_active),
    };

    byId.set(normalized.id, normalized);

    const normalizedName = normalizeComparableText(normalized.fullName);
    const normalizedDocument = normalizeComparableText(
      normalized.documentNumber
    );

    if (normalizedName) {
      byName.set(normalizedName, normalized.id);
    }

    if (normalizedDocument) {
      byDocument.set(normalizedDocument, normalized.id);
    }
  });

  return { byId, byName, byDocument };
}

async function syncClients(sourceClients, targetPool) {
  const targetClient = await targetPool.connect();

  try {
    await targetClient.query("begin");

    const targetState = await loadTargetState(targetClient);
    const report = {
      processed: sourceClients.length,
      inserted: 0,
      updated: 0,
      matchedByDocument: 0,
      matchedByName: 0,
    };

    for (const sourceClient of sourceClients) {
      const normalizedName = normalizeComparableText(sourceClient.fullName);
      const normalizedDocument = normalizeComparableText(
        sourceClient.documentNumber
      );

      let targetId = null;
      if (normalizedDocument && targetState.byDocument.has(normalizedDocument)) {
        targetId = targetState.byDocument.get(normalizedDocument);
        report.matchedByDocument += 1;
      } else if (normalizedName && targetState.byName.has(normalizedName)) {
        targetId = targetState.byName.get(normalizedName);
        report.matchedByName += 1;
      }

      if (targetId) {
        const current = targetState.byId.get(targetId);
        const updatedResult = await targetClient.query(
          `
            update clients
            set
              full_name = $2,
              document_number = $3,
              phone = $4,
              email = $5,
              notes = $6,
              is_active = $7,
              updated_at = now()
            where id = $1
            returning id, full_name, document_number, phone, email, notes, is_active
          `,
          [
            targetId,
            sourceClient.fullName,
            mergeText(sourceClient.documentNumber, current.documentNumber),
            mergeText(sourceClient.phone, current.phone),
            mergeText(sourceClient.email, current.email),
            mergeNotes(sourceClient.notes, current.notes),
            sourceClient.isActive,
          ]
        );

        const updated = updatedResult.rows[0];
        const normalizedUpdated = {
          id: Number(updated.id),
          fullName: updated.full_name,
          documentNumber: updated.document_number || "",
          phone: updated.phone || "",
          email: updated.email || "",
          notes: updated.notes || "",
          isActive: Boolean(updated.is_active),
        };

        targetState.byId.set(normalizedUpdated.id, normalizedUpdated);
        targetState.byName.set(
          normalizeComparableText(normalizedUpdated.fullName),
          normalizedUpdated.id
        );

        if (normalizeComparableText(normalizedUpdated.documentNumber)) {
          targetState.byDocument.set(
            normalizeComparableText(normalizedUpdated.documentNumber),
            normalizedUpdated.id
          );
        }

        report.updated += 1;
        continue;
      }

      const insertedResult = await targetClient.query(
        `
          insert into clients (
            full_name,
            document_number,
            phone,
            email,
            notes,
            is_active
          )
          values ($1, $2, $3, $4, $5, $6)
          returning id, full_name, document_number, phone, email, notes, is_active
        `,
        [
          sourceClient.fullName,
          sourceClient.documentNumber,
          sourceClient.phone,
          sourceClient.email,
          sourceClient.notes,
          sourceClient.isActive,
        ]
      );

      const inserted = insertedResult.rows[0];
      const normalizedInserted = {
        id: Number(inserted.id),
        fullName: inserted.full_name,
        documentNumber: inserted.document_number || "",
        phone: inserted.phone || "",
        email: inserted.email || "",
        notes: inserted.notes || "",
        isActive: Boolean(inserted.is_active),
      };

      targetState.byId.set(normalizedInserted.id, normalizedInserted);
      targetState.byName.set(
        normalizeComparableText(normalizedInserted.fullName),
        normalizedInserted.id
      );

      if (normalizeComparableText(normalizedInserted.documentNumber)) {
        targetState.byDocument.set(
          normalizeComparableText(normalizedInserted.documentNumber),
          normalizedInserted.id
        );
      }

      report.inserted += 1;
    }

    const totalResult = await targetClient.query(
      "select count(*)::int as total from clients"
    );
    report.totalClients = totalResult.rows[0].total;

    await targetClient.query("commit");
    return report;
  } catch (error) {
    await targetClient.query("rollback");
    throw error;
  } finally {
    targetClient.release();
  }
}

async function main() {
  const sourceUrl =
    process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL || "";
  const targetUrl =
    process.env.TARGET_DATABASE_URL || process.argv[2] || "";

  if (!targetUrl) {
    throw new Error(
      "Falta TARGET_DATABASE_URL. Pásalo como variable de entorno o como primer argumento."
    );
  }

  const sourcePool = buildPool(sourceUrl);
  const targetPool = buildPool(targetUrl);

  try {
    const sourceClients = await listSourceClients(sourcePool);
    const report = await syncClients(sourceClients, targetPool);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch((error) => {
  console.error(
    error && error.message ? error.message : "No se pudo sincronizar clientes."
  );
  process.exitCode = 1;
});
