require("dotenv").config();

const { createSession, deleteSession } = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `test:promotion:${Date.now()}`;
let token = "";
let clientId = 0;
let registrationId = 0;
let movementId = 0;

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: `petit_session=${encodeURIComponent(token)}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function main() {
  const setupResult = await query(`
    select
      (select id from app_users
        where role = 'administrador' and is_active = true
        order by id limit 1) as admin_id,
      (select value from catalog_items
        where group_name = 'mediosPago' and is_active = true
        order by sort_order, id limit 1) as payment_method,
      to_char(current_date, 'YYYY-MM-DD') as payment_date
  `);
  const setup = setupResult.rows[0] || {};
  if (!setup.admin_id || !setup.payment_method) {
    throw new Error("Faltan un administrador o una caja activa para ejecutar la prueba.");
  }

  const clientResult = await query(
    `
      insert into clients (
        full_name, alias, document_number, phone, email, notes,
        is_active, is_client, is_supplier
      )
      values ($1, 'Promo test', $2, '', '', $3, true, true, false)
      returning id
    `,
    [`Cliente promoción ${Date.now()}`, `PROMO-${Date.now()}`, runId]
  );
  clientId = Number(clientResult.rows[0].id);
  token = (await createSession(Number(setup.admin_id))).token;

  const before = await api("/api/promotions/december-2026");
  if (!before.response.ok || Number(before.payload.campaign?.capacity) !== 100) {
    throw new Error(before.payload.error || "La campaña de 100 cupos no está disponible.");
  }

  const created = await api("/api/promotions/december-2026/registrations", {
    method: "POST",
    body: JSON.stringify({
      clientId,
      paymentDate: setup.payment_date,
      paymentMethod: setup.payment_method,
      notes: runId,
    }),
  });
  if (!created.response.ok) {
    throw new Error(created.payload.error || "No se pudo registrar el cupo promocional.");
  }
  registrationId = Number(created.payload.registration?.id || 0);
  movementId = Number(created.payload.registration?.movementId || 0);
  if (
    !registrationId ||
    !movementId ||
    Number(created.payload.registration?.amountPaid) !== 66000 ||
    created.payload.registration?.status !== "pending_activation"
  ) {
    throw new Error("El cupo no conservó el valor o estado esperado.");
  }

  const movementResult = await query(
    `
      select *
      from movements
      where id = $1
    `,
    [movementId]
  );
  const movement = movementResult.rows[0];
  if (
    !movement ||
    movement.movement_type !== "Ingreso" ||
    movement.category !== "Promoción diciembre" ||
    movement.payment_method !== setup.payment_method ||
    Number(movement.total_amount) !== 66000 ||
    Number(movement.paid_amount) !== 66000 ||
    Number(movement.cash_flow) !== 66000 ||
    Number(movement.registered_by_user_id) !== Number(setup.admin_id)
  ) {
    throw new Error("El movimiento financiero promocional quedó incompleto.");
  }

  const after = await api("/api/promotions/december-2026");
  if (
    Number(after.payload.campaign?.registeredCount) !==
      Number(before.payload.campaign.registeredCount) + 1 ||
    Number(after.payload.campaign?.availableSlots) !==
      Number(before.payload.campaign.availableSlots) - 1
  ) {
    throw new Error("El contador de cupos no se actualizó correctamente.");
  }

  const duplicate = await api("/api/promotions/december-2026/registrations", {
    method: "POST",
    body: JSON.stringify({
      clientId,
      paymentDate: setup.payment_date,
      paymentMethod: setup.payment_method,
      notes: runId,
    }),
  });
  if (duplicate.response.status !== 409) {
    throw new Error("La API permitió registrar dos cupos para el mismo cliente.");
  }

  const activation = await api(
    `/api/promotions/december-2026/registrations/${registrationId}/activate`,
    { method: "PATCH", body: "{}" }
  );
  if (after.payload.campaign.activationOpen) {
    if (!activation.response.ok || activation.payload.registration?.status !== "activated") {
      throw new Error("No se pudo activar una mensualidad dentro de la fecha permitida.");
    }
  } else if (activation.response.status !== 400) {
    throw new Error("La API permitió activar una mensualidad antes del 15 de noviembre.");
  }

  console.log(
    "Prueba de promoción OK: cupo único, ingreso en caja y activación controlada."
  );
}

async function cleanup() {
  if (clientId) {
    const linkedResult = await query(
      `
        select movement_id
        from promotion_registrations
        where client_id = $1
      `,
      [clientId]
    );
    movementId = movementId || Number(linkedResult.rows[0]?.movement_id || 0);
    await query("delete from promotion_registrations where client_id = $1", [clientId]);
  }
  if (movementId) {
    await query("delete from movements where id = $1", [movementId]);
  }
  if (clientId) {
    await query("delete from clients where id = $1", [clientId]);
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
