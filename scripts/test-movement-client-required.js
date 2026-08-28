require("dotenv").config();

const { createSession, deleteSession } = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `test:movement-client:${Date.now()}`;
let token = "";
let movementId = 0;

async function postMovement(body) {
  const response = await fetch(`${baseUrl}/api/movements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `petit_session=${encodeURIComponent(token)}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function getBootstrap() {
  const response = await fetch(`${baseUrl}/api/bootstrap`, {
    headers: {
      Cookie: `petit_session=${encodeURIComponent(token)}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo consultar la información de prueba.");
  }
  return payload;
}

async function main() {
  const setupResult = await query(
    `
      select
        (select id from app_users
          where role = 'administrador' and is_active = true
          order by id limit 1) as admin_id,
        (select coalesce(nullif(full_name, ''), username) from app_users
          where role = 'administrador' and is_active = true
          order by id limit 1) as admin_name,
        (select value from catalog_items
          where group_name = 'gimnasioCategorias' and is_active = true
          order by sort_order, id limit 1) as category,
        (select value from catalog_items
          where group_name = 'mediosPago' and is_active = true
          order by sort_order, id limit 1) as payment_method,
        (select full_name from clients
          where is_active = true and is_client = true and trim(full_name) <> ''
          order by id limit 1) as client_name,
        to_char(current_date, 'YYYY-MM-DD') as movement_date
    `
  );
  const setup = setupResult.rows[0] || {};
  if (!setup.admin_id || !setup.category || !setup.payment_method || !setup.client_name) {
    throw new Error("Faltan datos base para probar el cliente obligatorio.");
  }

  token = (await createSession(Number(setup.admin_id))).token;
  const basePayload = {
    linea: "Gimnasio",
    fecha: setup.movement_date,
    tipo: "Ingreso",
    categoria: setup.category,
    cliente: "",
    descripcion: runId,
    medioPago: setup.payment_method,
    valorTotal: 100,
    abono: 100,
    observaciones: "Prueba temporal de cliente obligatorio",
    businessProductId: 0,
    inventoryProductId: 0,
    inventoryQuantity: 0,
    inventoryEffect: "ninguno",
  };

  const rejected = await postMovement(basePayload);
  if (rejected.response.status !== 400 || !/cliente/i.test(rejected.payload.error || "")) {
    throw new Error("La API permitió registrar una venta sin cliente.");
  }

  const accepted = await postMovement({
    ...basePayload,
    cliente: setup.client_name,
  });
  if (!accepted.response.ok || !Number(accepted.payload.id || 0)) {
    throw new Error(accepted.payload.error || "No se guardó la venta con cliente.");
  }
  movementId = Number(accepted.payload.id);

  if (
    Number(accepted.payload.registeredByUserId || 0) !== Number(setup.admin_id) ||
    accepted.payload.registeredBy !== setup.admin_name
  ) {
    throw new Error("El movimiento no devolvió el usuario que hizo el registro.");
  }

  const bootstrap = await getBootstrap();
  const savedMovement = (bootstrap.movements || []).find(
    (movement) => Number(movement.id) === movementId
  );
  if (
    !savedMovement ||
    Number(savedMovement.registeredByUserId || 0) !== Number(setup.admin_id) ||
    savedMovement.registeredBy !== setup.admin_name
  ) {
    throw new Error("La consulta de movimientos no conservó el usuario de registro.");
  }

  console.log(
    "Prueba de movimientos OK: cliente obligatorio y usuario de registro conservados."
  );
}

async function cleanup() {
  if (movementId) {
    await query("delete from movements where id = $1", [movementId]);
  }
  if (token) {
    await deleteSession(token);
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
