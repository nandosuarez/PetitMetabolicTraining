require("dotenv").config();

const { createSession, deleteSession } = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `test:wodbuster-review:${Date.now()}`;
const externalKeys = [1, 2, 3, 4, 5, 6].map((index) => `${runId}:${index}`);
let token = "";
let adminToken = "";
let assistantToken = "";
let temporaryClientId = 0;
let temporaryAssistantId = 0;
let existingMovementId = 0;

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

  const assistantResult = await query(
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
      select
        $2,
        'Asistente temporal WodBuster',
        'asistente_operativo',
        password_hash,
        password_salt,
        password_iterations,
        false,
        true
      from app_users
      where id = $1
      returning id
    `,
    [adminId, `assistant-wodbuster-${Date.now()}`]
  );
  temporaryAssistantId = Number(assistantResult.rows[0]?.id || 0);
  assistantToken = (await createSession(temporaryAssistantId)).token;

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
      from unnest(
        $1::text[],
        array[
          'Pago total',
          'Pago parcial',
          'Pago pendiente',
          'Pago descartado',
          'Pago ya registrado',
          'Pago confirmado sin movimiento'
        ]
      )
        as item(external_key, concept)
      returning id, external_key
    `,
    [externalKeys, selectedClient.full_name, adminId]
  );
  const paymentIdByKey = new Map(
    inserted.rows.map((row) => [row.external_key, Number(row.id)])
  );
  const existingResult = await query(
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
        inventory_quantity,
        inventory_effect,
        year,
        month_number,
        month_name,
        notes,
        source_system,
        registered_by_user_id
      )
      values (
        'Gimnasio',
        (now() at time zone 'America/Bogota')::date,
        'Ingreso',
        $1,
        $2,
        $3,
        'Pagado',
        $4,
        10000,
        10000,
        0,
        10000,
        0,
        'ninguno',
        extract(year from (now() at time zone 'America/Bogota'))::int,
        extract(month from (now() at time zone 'America/Bogota'))::int,
        'Mes prueba',
        $3,
        'manual',
        $5
      )
      returning id
    `,
    [category, selectedClient.full_name, `Movimiento existente ${runId}`, paymentMethod, adminId]
  );
  existingMovementId = Number(existingResult.rows[0]?.id || 0);
  adminToken = (await createSession(adminId)).token;
  token = adminToken;
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
  const existingPayment = stagedRows.find(
    (payment) => payment.id === paymentIdByKey.get(externalKeys[4])
  );
  if (
    !existingPayment?.movementMatches?.some(
      (movement) => Number(movement.id) === existingMovementId
    )
  ) {
    throw new Error("La bandeja no sugirió la transacción existente para el cruce.");
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

  token = assistantToken;
  const assistantBootstrap = await api("/api/bootstrap", null, "GET");
  if (
    !(assistantBootstrap.wodbusterPayments || []).some(
      (payment) => Number(payment.id) === paymentIdByKey.get(externalKeys[4])
    )
  ) {
    throw new Error("El asistente operativo no pudo consultar la bandeja de WodBuster.");
  }
  let assistantConfirmationWasRejected = false;
  try {
    await api(
      `/api/integrations/wodbuster/payments/${paymentIdByKey.get(
        externalKeys[5]
      )}/confirm`,
      { notes: "El asistente no debe poder confirmar este pago" }
    );
  } catch (error) {
    assistantConfirmationWasRejected = String(error.message || "").startsWith(
      "403:"
    );
  }
  if (!assistantConfirmationWasRejected) {
    throw new Error(
      "El asistente operativo pudo confirmar un pago sin movimiento vinculado."
    );
  }
  await api(
    `/api/integrations/wodbuster/payments/${paymentIdByKey.get(
      externalKeys[4]
    )}/match`,
    {
      movementId: existingMovementId,
      notes: "Cruce confirmado por asistente en prueba automática",
    }
  );
  token = adminToken;
  await api(
    `/api/integrations/wodbuster/payments/${paymentIdByKey.get(
      externalKeys[5]
    )}/confirm`,
    { notes: "Confirmación administrativa de prueba" }
  );

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

  const managedBootstrap = await api("/api/bootstrap", null, "GET");
  const managedPayment = (managedBootstrap.wodbusterPayments || []).find(
    (payment) => Number(payment.id) === paymentIdByKey.get(externalKeys[4])
  );
  if (
    managedPayment?.status !== "imported" ||
    Number(managedPayment.movementId) !== existingMovementId ||
    !managedPayment.matchedExistingMovement ||
    !String(managedPayment.movementDescription || "").includes(runId)
  ) {
    throw new Error("El pago gestionado no conservó la transacción cruzada en la bandeja.");
  }
  const confirmedWithoutMovement = (managedBootstrap.wodbusterPayments || []).find(
    (payment) => Number(payment.id) === paymentIdByKey.get(externalKeys[5])
  );
  if (
    confirmedWithoutMovement?.status !== "imported" ||
    Number(confirmedWithoutMovement.movementId || 0) !== 0 ||
    !String(confirmedWithoutMovement.adminNotes || "").includes(
      "Confirmación administrativa"
    )
  ) {
    throw new Error(
      "La confirmación administrativa no permaneció visible sin movimiento vinculado."
    );
  }

  console.log(
    "Prueba WodBuster OK: gestión visible, cruce existente, confirmación administrativa y permisos."
  );
}

async function cleanup() {
  if (adminToken) {
    await deleteSession(adminToken);
  }
  if (assistantToken) {
    await deleteSession(assistantToken);
  }
  await query(
    "delete from wodbuster_payment_imports where external_key = any($1::text[])",
    [externalKeys]
  );
  await query(
    "delete from movements where source_system = 'wodbuster' and external_reference = any($1::text[])",
    [externalKeys]
  );
  if (existingMovementId) {
    await query("delete from movements where id = $1", [existingMovementId]);
  }
  if (temporaryClientId) {
    await query("delete from clients where id = $1", [temporaryClientId]);
  }
  if (temporaryAssistantId) {
    await query("delete from app_users where id = $1", [temporaryAssistantId]);
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
