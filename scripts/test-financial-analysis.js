require("dotenv").config();

const XLSX = require("xlsx");
const { createSession, deleteSession } = require("../server/auth");
const { query, closePool } = require("../server/db");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `test:analysis:${Date.now()}`;
let token = "";
const movementIds = [];

async function request(path) {
  return fetch(`${baseUrl}${path}`, {
    headers: { Cookie: `petit_session=${encodeURIComponent(token)}` },
  });
}

async function readJson(path) {
  const response = await request(path);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Falló la consulta ${path}.`);
  }
  return payload;
}

function delta(after, before, key) {
  return Number(after[key] || 0) - Number(before[key] || 0);
}

function assertAmount(actual, expected, message) {
  if (Math.abs(Number(actual) - Number(expected)) > 0.001) {
    throw new Error(`${message} Esperado ${expected}, recibido ${actual}.`);
  }
}

async function insertMovement(setup, options) {
  const result = await query(
    `
      insert into movements (
        business_line, movement_date, movement_type, category,
        client_name, description, payment_status, payment_method,
        total_amount, paid_amount, balance_due, cash_flow,
        inventory_quantity, inventory_effect, year, month_number,
        month_name, notes, source_system, registered_by_user_id
      )
      values (
        'Restaurante', $1, $2, 'Prueba análisis',
        'Cliente prueba análisis', $3, $4, $5,
        $6, $7, $8, $9,
        0, 'ninguno', $10, $11, $12, $13, 'test', $14
      )
      returning id
    `,
    [
      setup.current_date,
      options.type,
      `${runId} ${options.type}`,
      options.status,
      setup.payment_method,
      options.total,
      options.paid,
      options.balance,
      options.type === "Ingreso" ? options.paid : options.paid * -1,
      Number(setup.current_date.slice(0, 4)),
      Number(setup.current_date.slice(5, 7)),
      setup.month_name,
      runId,
      Number(setup.admin_id),
    ]
  );
  const id = Number(result.rows[0].id);
  movementIds.push(id);
  return id;
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
      (select id from app_users
        where role = 'contador' and is_active = true
        order by id limit 1) as accountant_id,
      (select id from app_users
        where role = 'asistente_operativo' and is_active = true
        order by id limit 1) as assistant_id,
      to_char(current_date, 'YYYY-MM-DD') as current_date,
      case extract(month from current_date)::int
        when 1 then 'Enero' when 2 then 'Febrero' when 3 then 'Marzo'
        when 4 then 'Abril' when 5 then 'Mayo' when 6 then 'Junio'
        when 7 then 'Julio' when 8 then 'Agosto' when 9 then 'Septiembre'
        when 10 then 'Octubre' when 11 then 'Noviembre' else 'Diciembre'
      end as month_name
  `);
  const setup = setupResult.rows[0] || {};
  if (!setup.admin_id || !setup.payment_method) {
    throw new Error("Faltan un administrador o una caja activa para probar el análisis.");
  }

  token = (await createSession(Number(setup.admin_id))).token;
  const queryString = `from=${setup.current_date}&to=${setup.current_date}&line=Restaurante`;
  const before = await readJson(`/api/analysis?${queryString}`);

  const incomeId = await insertMovement(setup, {
    type: "Ingreso",
    total: 100000,
    paid: 60000,
    balance: 40000,
    status: "Parcial",
  });
  await insertMovement(setup, {
    type: "Costo",
    total: 70000,
    paid: 50000,
    balance: 20000,
    status: "Parcial",
  });
  await insertMovement(setup, {
    type: "Gasto",
    total: 10000,
    paid: 10000,
    balance: 0,
    status: "Pagado",
  });
  await query(
    `
      insert into movement_collections (
        movement_id, collection_date, amount, payment_method,
        notes, registered_by_user_id
      )
      values ($1, $2, 20000, $3, $4, $5)
    `,
    [incomeId, setup.current_date, setup.payment_method, runId, setup.admin_id]
  );

  const after = await readJson(`/api/analysis?${queryString}`);
  assertAmount(delta(after.summary, before.summary, "salesTotal"), 100000, "Ventas incorrectas.");
  assertAmount(delta(after.summary, before.summary, "collected"), 60000, "Cobros incorrectos.");
  assertAmount(delta(after.summary, before.summary, "costsTotal"), 70000, "Costos incorrectos.");
  assertAmount(delta(after.summary, before.summary, "costsPaid"), 50000, "Costos pagados incorrectos.");
  assertAmount(delta(after.summary, before.summary, "expensesTotal"), 10000, "Gastos incorrectos.");
  assertAmount(delta(after.summary, before.summary, "expensesPaid"), 10000, "Gastos pagados incorrectos.");
  assertAmount(delta(after.summary, before.summary, "accountsReceivable"), 40000, "Cartera incorrecta.");
  assertAmount(delta(after.summary, before.summary, "accountsPayable"), 20000, "Cuentas por pagar incorrectas.");
  assertAmount(delta(after.summary, before.summary, "operatingResult"), 20000, "Resultado operativo incorrecto.");
  assertAmount(delta(after.summary, before.summary, "cashNet"), 0, "Flujo neto incorrecto.");

  const invalidResponse = await request(
    `/api/analysis?from=${setup.current_date}&to=${setup.current_date}&line=Invalida`
  );
  if (invalidResponse.status !== 400) {
    throw new Error("La API aceptó una línea de negocio inválida.");
  }

  if (setup.accountant_id) {
    const adminToken = token;
    token = (await createSession(Number(setup.accountant_id))).token;
    const accountantResponse = await request(`/api/analysis?${queryString}`);
    await deleteSession(token);
    token = adminToken;
    if (!accountantResponse.ok) {
      throw new Error("El perfil contador no pudo consultar el análisis.");
    }
  }

  if (setup.assistant_id) {
    const adminToken = token;
    token = (await createSession(Number(setup.assistant_id))).token;
    const assistantResponse = await request(`/api/analysis?${queryString}`);
    await deleteSession(token);
    token = adminToken;
    if (assistantResponse.status !== 403) {
      throw new Error("El perfil asistente obtuvo acceso al análisis financiero.");
    }
  }

  const exportResponse = await request(`/api/analysis/export?${queryString}`);
  if (
    !exportResponse.ok ||
    !String(exportResponse.headers.get("content-type") || "").includes(
      "spreadsheetml.sheet"
    )
  ) {
    throw new Error("La exportación no devolvió un archivo Excel válido.");
  }
  const workbook = XLSX.read(Buffer.from(await exportResponse.arrayBuffer()), {
    type: "buffer",
  });
  const expectedSheets = [
    "Resumen",
    "Por línea",
    "Mensual",
    "Categorías",
    "Movimientos",
    "Cobros",
    "Flujo de caja",
    "Traslados",
  ];
  expectedSheets.forEach((name) => {
    if (!workbook.Sheets[name]) {
      throw new Error(`La exportación no incluyó la hoja ${name}.`);
    }
  });
  const movementRows = XLSX.utils.sheet_to_json(workbook.Sheets.Movimientos);
  const collectionRows = XLSX.utils.sheet_to_json(workbook.Sheets.Cobros);
  if (!movementRows.some((row) => String(row.Descripción || "").includes(runId))) {
    throw new Error("El Excel no incluyó los movimientos del período.");
  }
  if (!collectionRows.some((row) => String(row.Observaciones || "").includes(runId))) {
    throw new Error("El Excel no incluyó los cobros del período.");
  }

  console.log(
    "Prueba de análisis OK: ventas, cobros, costos, gastos, flujo y Excel verificados."
  );
}

async function cleanup() {
  if (movementIds.length) {
    await query("delete from movements where id = any($1::bigint[])", [movementIds]);
  }
  if (token) await deleteSession(token);
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
