require("dotenv").config();

const { createSession, deleteSession } = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `test:inactive-product:${Date.now()}`;
let token = "";
let movementId = 0;
const productIds = [];

async function requestMovement(path, method, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `petit_session=${encodeURIComponent(token)}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function createTestProduct(setup, suffix, isActive) {
  const result = await query(
    `
      insert into business_products (
        name,
        business_line,
        item_type,
        category,
        default_amount,
        direct_inventory_quantity,
        notes,
        is_active
      )
      values ($1, 'Gimnasio', 'Servicio', $2, 100, 0, $3, $4)
      returning id
    `,
    [`${runId}:${suffix}`, setup.category, runId, isActive]
  );
  const productId = Number(result.rows[0].id);
  productIds.push(productId);
  return productId;
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
          order by sort_order, id limit 1) as payment_method,
        (select full_name from clients
          where is_active = true and is_client = true and trim(full_name) <> ''
          order by id limit 1) as client_name,
        to_char(current_date, 'YYYY-MM-DD') as movement_date
    `
  );
  const setup = setupResult.rows[0] || {};
  if (!setup.admin_id || !setup.category || !setup.payment_method || !setup.client_name) {
    throw new Error("Faltan datos base para probar productos inactivos.");
  }

  token = (await createSession(Number(setup.admin_id))).token;
  const inactiveProductId = await createTestProduct(setup, "inactive", false);
  const activeProductId = await createTestProduct(setup, "active", true);
  const basePayload = {
    linea: "Gimnasio",
    fecha: setup.movement_date,
    tipo: "Ingreso",
    categoria: setup.category,
    cliente: setup.client_name,
    descripcion: runId,
    medioPago: setup.payment_method,
    valorTotal: 100,
    abono: 100,
    observaciones: "Prueba temporal de producto inactivo",
    businessProductId: inactiveProductId,
    inventoryProductId: 0,
    inventoryQuantity: 0,
    inventoryEffect: "ninguno",
  };

  const rejectedCreate = await requestMovement(
    "/api/movements",
    "POST",
    basePayload
  );
  if (
    rejectedCreate.response.status !== 400 ||
    !/inactivo/i.test(rejectedCreate.payload.error || "")
  ) {
    throw new Error("La API permitio registrar una venta con producto inactivo.");
  }

  const acceptedCreate = await requestMovement("/api/movements", "POST", {
    ...basePayload,
    businessProductId: activeProductId,
  });
  if (!acceptedCreate.response.ok || !Number(acceptedCreate.payload.id || 0)) {
    throw new Error(
      acceptedCreate.payload.error || "No se pudo crear el movimiento de prueba."
    );
  }
  movementId = Number(acceptedCreate.payload.id);

  await query("update business_products set is_active = false where id = $1", [
    activeProductId,
  ]);

  const acceptedHistoricalEdit = await requestMovement(
    `/api/movements/${movementId}`,
    "PUT",
    {
      ...basePayload,
      businessProductId: activeProductId,
      observaciones: "Edicion historica valida",
    }
  );
  if (!acceptedHistoricalEdit.response.ok) {
    throw new Error(
      acceptedHistoricalEdit.payload.error ||
        "No se pudo conservar el producto historico al editar el movimiento."
    );
  }

  const rejectedReplacement = await requestMovement(
    `/api/movements/${movementId}`,
    "PUT",
    {
      ...basePayload,
      businessProductId: inactiveProductId,
      observaciones: "Cambio inactivo invalido",
    }
  );
  if (
    rejectedReplacement.response.status !== 400 ||
    !/inactivo/i.test(rejectedReplacement.payload.error || "")
  ) {
    throw new Error(
      "La API permitio reemplazar el producto historico por otro producto inactivo."
    );
  }

  console.log(
    "Prueba de productos inactivos OK: la API bloquea ventas nuevas y protege la referencia historica."
  );
}

async function cleanup() {
  if (movementId) {
    await query("delete from movements where id = $1", [movementId]);
  }
  if (productIds.length) {
    await query("delete from business_products where id = any($1::bigint[])", [
      productIds,
    ]);
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
