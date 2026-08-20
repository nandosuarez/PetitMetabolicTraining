require("dotenv").config();

const { createSession, deleteSession } = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `test:wodbuster-review:${Date.now()}`;
const externalKeys = [1, 2, 3, 4].map((index) => `${runId}:${index}`);
let token = "";
let temporaryClientId = 0;

async function api(path, body, method = "POST") {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `petit_session=${encodeURIComponent(token)}`,
    },
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status}: ${payload.error || "Error de API"}`);
  }
  return payload;
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
    throw new Error("No hay un administrador activo disponible para la prueba.");
  }

  let clientResult = await query(
    `
      select id, full_name
      from clients
      where is_active = true
        and is_client = true
      order by id
      limit 1
    `
  );
  if (!clientResult.rows[0]) {
    clientResult = await query(
      `
        insert into clients (full_name, is_client, is_supplier, is_active)
        values ($1, true, false, true)
        returning id, full_name
      `,
      [`Cliente temporal ${runId}`]
    );
    temporaryClientId = Number(clientResult.rows[0].id);
  }
  const selectedClient = clientResult.rows[0];

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
  const methodResult = await query(
    `
      select value
      from catalog_items
      where group_name = 'mediosPago'
        and is_active = true
      order by sort_order, id
      limit 1
    `
  );
  const category = categoryResult.rows[0]?.value || "";
  const paymentMethod = methodResult.rows[0]?.value || "";
  if (!category || !paymentMethod) {
    throw new Error("La prueba requiere una categoría y una caja activas.");
  }

  const inserted = await query(
    `
      insert into wodbuster_payment_imports (
        external_key,
        status,
        paid_at,
        amount,
        payment_method_raw,
        client_name_raw,
        concept_raw,
        raw_payload,
        fetched_by_user_id
      )
      select
        item.external_key,
        'pending_review',
        now(),
        10000,
        'Tarjeta',
        $2,
        item.concept,
        '{}'::jsonb,
        $3
      from unnest($1::text[], array['Pago total', 'Pago parcial', 'Pago pendiente', 'Pago descartado'])
        as item(external_key, concept)
      returning id, external_key
    `,
    [externalKeys, selectedClient.full_name, adminId]
  );
  const paymentIdByKey = new Map(
    inserted.rows.map((row) => [row.external_key, Number(row.id)])
  );
  token = (await createSession(adminId)).token;
  const bootstrap = await api("/api/bootstrap", null, "GET");
  const stagedIds = new Set(inserted.rows.map((row) => Number(row.id)));
  const stagedRows = (bootstrap.wodbusterPayments || []).filter((payment) =>
    stagedIds.has(Number(payment.id))
  );
  if (
    stagedRows.length !== externalKeys.length ||
    stagedRows.some(
      (payment) => Number(payment.matchedClientId) !== Number(selectedClient.id)
    )
  ) {
    throw new Error("La bandeja no mostró o no cruzó correctamente los pagos de prueba.");
  }

  let missingClientWasRejected = false;
  try {
    await api(
      `/api/integrations/wodbuster/payments/${paymentIdByKey.get(
        externalKeys[3]
      )}/register`,
      {
        clientId: 0,
        clientName: "",
        category,
        paidAmount: 0,
        paymentMethod,
        description: "Debe quedar pendiente",
      }
    );
  } catch (error) {
    missingClientWasRejected = String(error.message || "").startsWith("400:");
  }
  if (!missingClientWasRejected) {
    throw new Error("Se permitió dejar un saldo pendiente sin cliente.");
  }

  const paidAmounts = [10000, 4000, 0];
  for (let index = 0; index < paidAmounts.length; index += 1) {
    await api(
      `/api/integrations/wodbuster/payments/${paymentIdByKey.get(
        externalKeys[index]
      )}/register`,
      {
        clientId: Number(selectedClient.id),
        clientName: selectedClient.full_name,
        category,
        paidAmount: paidAmounts[index],
        paymentMethod,
        description: `Prueba ${index + 1}`,
        notes: "Prueba automática de revisión",
      }
    );
  }

  const dismissedId = paymentIdByKey.get(externalKeys[3]);
  await api(`/api/integrations/wodbuster/payments/${dismissedId}/dismiss`, {
    reason: "Prueba de descarte",
  });
  await api(`/api/integrations/wodbuster/payments/${dismissedId}/reopen`, {});

  const result = await query(
    `
      select
        m.external_reference,
        m.payment_status,
        m.paid_amount,
        m.balance_due,
        m.cash_flow,
        wp.status as review_status
      from movements m
      join wodbuster_payment_imports wp
        on wp.movement_id = m.id
      where m.external_reference = any($1::text[])
      order by m.external_reference
    `,
    [externalKeys]
  );
  const expected = [
    ["Pagado", 10000, 0, 10000],
    ["Parcial", 4000, 6000, 4000],
    ["Pendiente", 0, 10000, 0],
  ];
  if (result.rows.length !== expected.length) {
    throw new Error("No se crearon los tres movimientos esperados.");
  }
  result.rows.forEach((row, index) => {
    const values = [
      row.payment_status,
      Number(row.paid_amount),
      Number(row.balance_due),
      Number(row.cash_flow),
    ];
    if (JSON.stringify(values) !== JSON.stringify(expected[index])) {
      throw new Error(`Resultado inesperado para ${row.external_reference}.`);
    }
    if (row.review_status !== "imported") {
      throw new Error("La bandeja no quedó enlazada al movimiento creado.");
    }
  });

  const reopenedResult = await query(
    "select status from wodbuster_payment_imports where id = $1",
    [dismissedId]
  );
  if (reopenedResult.rows[0]?.status !== "pending_review") {
    throw new Error("El pago descartado no volvió correctamente a revisión.");
  }

  console.log("Prueba WodBuster OK: Pagado, Parcial, Pendiente y reapertura.");
}

async function cleanup() {
  if (token) {
    await deleteSession(token);
  }
  await query(
    "delete from wodbuster_payment_imports where external_key = any($1::text[])",
    [externalKeys]
  );
  await query(
    "delete from movements where source_system = 'wodbuster' and external_reference = any($1::text[])",
    [externalKeys]
  );
  if (temporaryClientId) {
    await query("delete from clients where id = $1", [temporaryClientId]);
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
