require("dotenv").config();

const { createSession, deleteSession } = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `test:box-sync:${Date.now()}`;
const movementIds = [];
let token = "";

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

async function createMovement({ category, paymentMethod, paidAmount = 0 }) {
  const totalAmount = 100000;
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
        source_system
      )
      values (
        'Gimnasio', current_date, 'Ingreso', $1, $2, $3, $4, $5,
        $6, $7, $8, $7, extract(year from current_date)::integer,
        extract(month from current_date)::integer, 'Prueba', $9, 'test'
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
  const adminId = Number(adminResult.rows[0]?.id || 0);
  if (!adminId) {
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

  token = (await createSession(adminId)).token;
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
    "Prueba de cajas OK: cobro, movimiento, caja inversa y auditoría sincronizados."
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
