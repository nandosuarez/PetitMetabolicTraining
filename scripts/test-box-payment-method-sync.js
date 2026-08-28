require("dotenv").config();

const { createSession, deleteSession } = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `test:box-sync:${Date.now()}`;
const movementIds = [];
let token = "";
let adminUserId = 0;

async function api(path, body, method = "POST") {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `petit_session=${encodeURIComponent(token)}`,
    },
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status}: ${payload.error || "Error de API"}`);
  }
  return payload;
}

async function createMovement({
  category,
  paymentMethod,
  paidAmount = 0,
  totalAmount = 100000,
}) {
  const balanceDue = totalAmount - paidAmount;
  const paymentStatus =
    paidAmount <= 0 ? "Pendiente" : paidAmount >= totalAmount ? "Pagado" : "Parcial";
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
        notes,
        source_system,
        registered_by_user_id
      )
      values (
        'Gimnasio', current_date, 'Ingreso', $1, $2, $3, $4, $5,
        $6, $7, $8, $7, extract(year from current_date)::integer,
        extract(month from current_date)::integer, 'Prueba', $9, 'test', $10
      )
      returning id, to_char(movement_date, 'YYYY-MM-DD') as movement_date
    `,
    [
      category,
      `Cliente ${runId}`,
      runId,
      paymentStatus,
      paymentMethod,
      totalAmount,
      paidAmount,
      balanceDue,
      "Movimiento temporal para validar sincronización de cajas",
      adminUserId,
    ]
  );
  const movementId = Number(result.rows[0].id);
  movementIds.push(movementId);
  return {
    id: movementId,
    date: String(result.rows[0].movement_date).slice(0, 10),
    totalAmount,
  };
}

async function assertPaymentMethods(movementId, expectedMovement, expectedCollection) {
  const result = await query(
    `
      select
        m.payment_method as movement_method,
        array_agg(mc.payment_method order by mc.id) filter (where mc.id is not null) as collection_methods
      from movements m
      left join movement_collections mc on mc.movement_id = m.id
      where m.id = $1
      group by m.id
    `,
    [movementId]
  );
  const row = result.rows[0];
  if (!row || row.movement_method !== expectedMovement) {
    throw new Error(`El movimiento ${movementId} no quedó en ${expectedMovement}.`);
  }
  if (
    expectedCollection &&
    (!Array.isArray(row.collection_methods) ||
      row.collection_methods.some((method) => method !== expectedCollection))
  ) {
    throw new Error(`Los cobros de ${movementId} no quedaron en ${expectedCollection}.`);
  }
}

async function main() {
  const adminResult = await query(
    `
      select id
      from app_users
      where role = 'administrador'
        and is_active = true
        and must_change_password = false
      order by id
      limit 1
    `
  );
  adminUserId = Number(adminResult.rows[0]?.id || 0);
  if (!adminUserId) {
    throw new Error("No hay un administrador activo para ejecutar la prueba.");
  }

  const methodsResult = await query(
    `
      select value
      from catalog_items
      where group_name = 'mediosPago'
        and is_active = true
      order by sort_order, id
      limit 2
    `
  );
  const methods = methodsResult.rows.map((row) => row.value);
  if (methods.length < 2) {
    throw new Error("La prueba requiere al menos dos cajas activas.");
  }

  const categoryResult = await query(
    `
      select value
      from catalog_items
      where group_name = 'gimnasioCategorias'
        and is_active = true
      order by sort_order, id
      limit 1
    `
  );
  const category = categoryResult.rows[0]?.value || "";
  if (!category) {
    throw new Error("La prueba requiere una categoría de gimnasio activa.");
  }

  token = (await createSession(adminUserId)).token;
  const pendingMovement = await createMovement({
    category,
    paymentMethod: methods[0],
  });
  const collectionPayload = await api(
    `/api/movements/${pendingMovement.id}/collections`,
    {
      collectionDate: pendingMovement.date,
      amount: pendingMovement.totalAmount,
      paymentMethod: methods[0],
      notes: "Cobro de prueba para sincronización",
    }
  );
  const collectionId = Number(collectionPayload.collection?.id || 0);
  if (!collectionId) {
    throw new Error("No se creó el cobro de prueba.");
  }
  await assertPaymentMethods(pendingMovement.id, methods[0], methods[0]);

  const splitMovement = await createMovement({
    category,
    paymentMethod: methods[0],
    paidAmount: 30000,
    totalAmount: 80000,
  });
  await api(
    `/api/movements/${splitMovement.id}/collections`,
    {
      collectionDate: splitMovement.date,
      amount: 50000,
      paymentMethod: methods[1],
      notes: "Segundo pago de prueba en una caja diferente",
    }
  );
  await assertPaymentMethods(splitMovement.id, methods[0], methods[1]);

  const splitResult = await query(
    `
      select
        m.paid_amount - coalesce(sum(mc.amount), 0) as direct_amount,
        coalesce(sum(mc.amount), 0) as collected_amount,
        m.registered_by_user_id
      from movements m
      left join movement_collections mc on mc.movement_id = m.id
      where m.id = $1
      group by m.id
    `,
    [splitMovement.id]
  );
  if (
    Number(splitResult.rows[0]?.direct_amount || 0) !== 30000 ||
    Number(splitResult.rows[0]?.collected_amount || 0) !== 50000 ||
    Number(splitResult.rows[0]?.registered_by_user_id || 0) !== adminUserId
  ) {
    throw new Error("El pago dividido no conservó sus valores o el usuario de registro.");
  }

  await api(
    `/api/movements/${pendingMovement.id}`,
    {
      linea: "Gimnasio",
      fecha: pendingMovement.date,
      tipo: "Ingreso",
      categoria: category,
      cliente: `Cliente ${runId}`,
      descripcion: runId,
      medioPago: methods[1],
      valorTotal: pendingMovement.totalAmount,
      abono: pendingMovement.totalAmount,
      observaciones: "Corrección de caja desde el movimiento",
    },
    "PUT"
  );
  await assertPaymentMethods(pendingMovement.id, methods[1], methods[1]);

  await api(
    `/api/box-entries/collection/${collectionId}/payment-method`,
    {
      paymentMethod: methods[0],
      justification: "Corrección automática desde el libro de cajas",
    },
    "PATCH"
  );
  await assertPaymentMethods(pendingMovement.id, methods[0], methods[0]);

  const directMovement = await createMovement({
    category,
    paymentMethod: methods[0],
    paidAmount: 100000,
  });
  await api(
    `/api/box-entries/movement/${directMovement.id}/payment-method`,
    {
      paymentMethod: methods[1],
      justification: "Corrección automática del ingreso directo en caja",
    },
    "PATCH"
  );
  await assertPaymentMethods(directMovement.id, methods[1], null);

  const auditsResult = await query(
    `
      select count(*)::integer as total
      from box_payment_method_edit_audits
      where movement_id = any($1::bigint[])
    `,
    [movementIds]
  );
  if (Number(auditsResult.rows[0]?.total || 0) !== 3) {
    throw new Error("No se guardó la trazabilidad esperada de las tres correcciones.");
  }

  console.log(
    "Prueba de cajas OK: pago dividido, cobro, caja inversa y auditoría sincronizados."
  );
}

async function cleanup() {
  if (token) {
    await deleteSession(token);
  }
  if (movementIds.length) {
    await query("delete from movements where id = any($1::bigint[])", [movementIds]);
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
