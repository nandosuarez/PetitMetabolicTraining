require("dotenv").config();

const {
  createAppUser,
  createSession,
  deleteSession,
} = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = Date.now();
let assistantId = 0;
let assistantToken = "";
let adminToken = "";
let movementId = 0;

async function deleteMovement(token, id) {
  const response = await fetch(`${baseUrl}/api/movements/${id}`, {
    method: "DELETE",
    headers: {
      Cookie: `petit_session=${encodeURIComponent(token)}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function movementExists(id) {
  const result = await query("select 1 from movements where id = $1", [id]);
  return result.rows.length > 0;
}

async function main() {
  const setupResult = await query(
    `
      select
        (select id from app_users
          where role = 'administrador' and is_active = true
          order by id limit 1) as admin_id,
        (select value from catalog_items
          where group_name = 'gimnasioCategorias' and is_active = true
          order by sort_order, id limit 1) as category,
        (select value from catalog_items
          where group_name = 'mediosPago' and is_active = true
          order by sort_order, id limit 1) as payment_method
    `
  );
  const setup = setupResult.rows[0] || {};
  if (!setup.admin_id || !setup.category || !setup.payment_method) {
    throw new Error("Faltan datos base para probar los permisos de eliminación.");
  }

  const assistant = await createAppUser({
    username: `codex_delete_${runId}`,
    password: `CodexDelete${runId}!`,
    fullName: "Asistente temporal de prueba",
    role: "asistente_operativo",
  });
  assistantId = Number(assistant.id);
  assistantToken = (await createSession(assistantId)).token;
  adminToken = (await createSession(Number(setup.admin_id))).token;

  const movementResult = await query(
    `
      insert into movements (
        business_line, movement_date, movement_type, category, client_name,
        description, payment_status, payment_method, total_amount, paid_amount,
        balance_due, cash_flow, year, month_number, month_name, notes, source_system
      )
      values (
        'Gimnasio', current_date, 'Ingreso', $1, 'Cliente de prueba', $2,
        'Pagado', $3, 100, 100, 0, 100,
        extract(year from current_date)::integer,
        extract(month from current_date)::integer,
        'Prueba', 'Movimiento temporal para validar permisos', 'test'
      )
      returning id
    `,
    [setup.category, `test:movement-delete:${runId}`, setup.payment_method]
  );
  movementId = Number(movementResult.rows[0].id);

  const assistantDelete = await deleteMovement(assistantToken, movementId);
  if (assistantDelete.response.status !== 403) {
    throw new Error("El asistente operativo pudo eliminar el movimiento.");
  }
  if (!(await movementExists(movementId))) {
    throw new Error("El movimiento desapareció tras el intento del asistente.");
  }

  const adminDelete = await deleteMovement(adminToken, movementId);
  if (adminDelete.response.status !== 204) {
    throw new Error(
      adminDelete.payload.error || "El administrador no pudo eliminar el movimiento."
    );
  }
  movementId = 0;

  console.log(
    "Prueba de eliminación OK: asistente bloqueado y administrador autorizado."
  );
}

async function cleanup() {
  if (movementId) {
    await query("delete from movements where id = $1", [movementId]);
  }
  if (assistantToken) {
    await deleteSession(assistantToken);
  }
  if (adminToken) {
    await deleteSession(adminToken);
  }
  if (assistantId) {
    await query("delete from app_users where id = $1", [assistantId]);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await closePool();
  });
