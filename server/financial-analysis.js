const XLSX = require("xlsx");

const BUSINESS_LINES = ["Gimnasio", "Restaurante"];
const MOVEMENT_TYPES = ["Ingreso", "Costo", "Gasto"];

function normalizeFinancialAnalysisFilters(input = {}, currentDate) {
  const today = normalizeDateOnly(currentDate);
  const defaultFrom = `${today.slice(0, 8)}01`;
  const rawFrom = normalizeDateOnly(input.from || defaultFrom);
  const rawTo = normalizeDateOnly(input.to || today);
  const line = String(input.line || "").trim();

  if (!isValidDateOnly(rawFrom) || !isValidDateOnly(rawTo)) {
    throw createFilterError("Selecciona un rango de fechas válido.");
  }
  if (rawFrom > rawTo) {
    throw createFilterError("La fecha inicial no puede ser posterior a la fecha final.");
  }
  if (line && !BUSINESS_LINES.includes(line)) {
    throw createFilterError("La línea de negocio seleccionada no es válida.");
  }

  return { from: rawFrom, to: rawTo, line };
}

async function readFinancialAnalysis(query, filters) {
  const [movementResult, collectionResult, transferResult] = await Promise.all([
    query(
      `
        select
          m.*,
          bp.name as product_name,
          coalesce(collection_totals.total, 0) as collection_total,
          coalesce(nullif(u.full_name, ''), u.username) as registered_by_name
        from movements m
        left join business_products bp
          on bp.id = m.business_product_id
        left join app_users u
          on u.id = m.registered_by_user_id
        left join lateral (
          select coalesce(sum(mc.amount), 0) as total
          from movement_collections mc
          where mc.movement_id = m.id
        ) collection_totals on true
        where m.movement_date between $1::date and $2::date
          and ($3::text = '' or m.business_line = $3)
        order by m.movement_date asc, m.id asc
      `,
      [filters.from, filters.to, filters.line]
    ),
    query(
      `
        select
          mc.*,
          m.movement_date,
          m.business_line,
          m.movement_type,
          m.category,
          m.client_name,
          m.description,
          coalesce(nullif(u.full_name, ''), u.username) as registered_by_name
        from movement_collections mc
        join movements m
          on m.id = mc.movement_id
        left join app_users u
          on u.id = mc.registered_by_user_id
        where mc.collection_date between $1::date and $2::date
          and ($3::text = '' or m.business_line = $3)
        order by mc.collection_date asc, mc.id asc
      `,
      [filters.from, filters.to, filters.line]
    ),
    query(
      `
        select
          bt.*,
          coalesce(nullif(u.full_name, ''), u.username) as registered_by_name
        from box_transfers bt
        left join app_users u
          on u.id = bt.registered_by_user_id
        where bt.transfer_date between $1::date and $2::date
        order by bt.transfer_date asc, bt.id asc
      `,
      [filters.from, filters.to]
    ),
  ]);

  const movements = movementResult.rows.map(mapMovementSourceRow);
  const collections = collectionResult.rows.map(mapCollectionSourceRow);
  const transfers = transferResult.rows.map(mapTransferSourceRow);
  const lines = (filters.line ? [filters.line] : BUSINESS_LINES).map((line) => ({
    line,
    ...summarizeFinancialData(
      movements.filter((item) => item.line === line),
      collections.filter((item) => item.line === line)
    ),
  }));
  const summary = summarizeFinancialData(movements, collections);
  const categories = buildCategoryRows(movements);
  const monthly = buildMonthlyRows(filters, movements, collections);

  return {
    report: {
      filters: {
        ...filters,
        lineLabel: filters.line || "Todas las líneas",
      },
      summary,
      lines,
      monthly,
      categories,
      insights: buildInsights(lines, categories),
      generatedAt: new Date().toISOString(),
    },
    source: { movements, collections, transfers },
  };
}

function summarizeFinancialData(movements, collections) {
  const sales = movements.filter((item) => item.type === "Ingreso");
  const costs = movements.filter((item) => item.type === "Costo");
  const expenses = movements.filter((item) => item.type === "Gasto");
  const salesTotal = sum(sales, "total");
  const costsTotal = sum(costs, "total");
  const expensesTotal = sum(expenses, "total");
  const collected = cashAmountByType(movements, collections, "Ingreso");
  const costsPaid = cashAmountByType(movements, collections, "Costo");
  const expensesPaid = cashAmountByType(movements, collections, "Gasto");
  const cashOutflow = costsPaid + expensesPaid;
  const operatingResult = salesTotal - costsTotal - expensesTotal;

  return {
    movementCount: movements.length,
    collectionCount: collections.filter((item) => item.type === "Ingreso").length,
    salesCount: sales.length,
    salesTotal,
    collected,
    accountsReceivable: sum(sales, "balance"),
    costsTotal,
    costsPaid,
    expensesTotal,
    expensesPaid,
    accountsPayable: sum([...costs, ...expenses], "balance"),
    accruedOutflows: costsTotal + expensesTotal,
    cashOutflow,
    operatingResult,
    operatingMargin: salesTotal > 0 ? (operatingResult / salesTotal) * 100 : null,
    costRatio: salesTotal > 0 ? (costsTotal / salesTotal) * 100 : null,
    expenseRatio: salesTotal > 0 ? (expensesTotal / salesTotal) * 100 : null,
    cashNet: collected - cashOutflow,
  };
}

function cashAmountByType(movements, collections, type) {
  return (
    sum(
      movements.filter((item) => item.type === type),
      "directPayment"
    ) +
    sum(
      collections.filter((item) => item.type === type),
      "amount"
    )
  );
}

function buildMonthlyRows(filters, movements, collections) {
  const rows = monthKeysBetween(filters.from, filters.to).map((month) => ({
    month,
    label: formatMonthLabel(month),
    salesTotal: 0,
    collected: 0,
    costsTotal: 0,
    costsPaid: 0,
    expensesTotal: 0,
    expensesPaid: 0,
    operatingResult: 0,
    cashNet: 0,
  }));
  const byMonth = new Map(rows.map((row) => [row.month, row]));

  movements.forEach((item) => {
    const row = byMonth.get(item.date.slice(0, 7));
    if (!row) return;
    if (item.type === "Ingreso") {
      row.salesTotal += item.total;
      row.collected += item.directPayment;
    } else if (item.type === "Costo") {
      row.costsTotal += item.total;
      row.costsPaid += item.directPayment;
    } else if (item.type === "Gasto") {
      row.expensesTotal += item.total;
      row.expensesPaid += item.directPayment;
    }
  });

  collections.forEach((item) => {
    const row = byMonth.get(item.date.slice(0, 7));
    if (!row) return;
    if (item.type === "Ingreso") row.collected += item.amount;
    if (item.type === "Costo") row.costsPaid += item.amount;
    if (item.type === "Gasto") row.expensesPaid += item.amount;
  });

  rows.forEach((row) => {
    row.operatingResult = row.salesTotal - row.costsTotal - row.expensesTotal;
    row.cashNet = row.collected - row.costsPaid - row.expensesPaid;
  });
  return rows;
}

function buildCategoryRows(movements) {
  const grouped = new Map();
  movements.forEach((item) => {
    const key = `${item.line}::${item.type}::${item.category}`;
    const row = grouped.get(key) || {
      line: item.line,
      type: item.type,
      category: item.category || "Sin categoría",
      movementCount: 0,
      total: 0,
      paid: 0,
      balance: 0,
    };
    row.movementCount += 1;
    row.total += item.total;
    row.paid += item.paid;
    row.balance += item.balance;
    grouped.set(key, row);
  });

  const typeTotals = new Map();
  grouped.forEach((row) => {
    const key = `${row.line}::${row.type}`;
    typeTotals.set(key, Number(typeTotals.get(key) || 0) + row.total);
  });

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      percentageOfType:
        Number(typeTotals.get(`${row.line}::${row.type}`) || 0) > 0
          ? (row.total /
              Number(typeTotals.get(`${row.line}::${row.type}`))) *
            100
          : 0,
    }))
    .sort((a, b) => {
      const lineOrder = BUSINESS_LINES.indexOf(a.line) - BUSINESS_LINES.indexOf(b.line);
      if (lineOrder !== 0) return lineOrder;
      const typeOrder = MOVEMENT_TYPES.indexOf(a.type) - MOVEMENT_TYPES.indexOf(b.type);
      return typeOrder !== 0 ? typeOrder : b.total - a.total;
    });
}

function buildInsights(lines, categories) {
  const insights = [];
  lines.forEach((line) => {
    if (!line.movementCount && !line.collectionCount) {
      insights.push({
        severity: "neutral",
        title: `${line.line}: sin actividad`,
        message: "No hay movimientos en el período seleccionado.",
      });
      return;
    }

    if (line.salesTotal <= 0 && line.accruedOutflows > 0) {
      insights.push({
        severity: "danger",
        title: `${line.line}: salidas sin ventas`,
        message: `Se registraron ${formatNumber(line.accruedOutflows)} en costos y gastos sin ventas asociadas en el período.`,
      });
    } else if (line.operatingResult < 0) {
      insights.push({
        severity: "danger",
        title: `${line.line}: resultado negativo`,
        message: `Los costos y gastos superan las ventas en ${formatNumber(Math.abs(line.operatingResult))}.`,
      });
    } else if (line.operatingMargin !== null && line.operatingMargin < 15) {
      insights.push({
        severity: "warning",
        title: `${line.line}: margen bajo`,
        message: `El margen operativo es ${formatPercent(line.operatingMargin)}; conviene revisar precios y salidas.`,
      });
    } else if (line.salesTotal > 0) {
      insights.push({
        severity: "positive",
        title: `${line.line}: operación positiva`,
        message: `El resultado operativo es ${formatNumber(line.operatingResult)} con margen de ${formatPercent(line.operatingMargin)}.`,
      });
    }

    if (line.cashNet < 0) {
      insights.push({
        severity: "warning",
        title: `${line.line}: flujo de caja negativo`,
        message: `En el período salieron ${formatNumber(Math.abs(line.cashNet))} más de los que ingresaron.`,
      });
    }
    if (line.accountsReceivable > 0) {
      insights.push({
        severity: "neutral",
        title: `${line.line}: cartera por recuperar`,
        message: `Las ventas del período mantienen ${formatNumber(line.accountsReceivable)} pendientes de cobro.`,
      });
    }

    const largestOutflow = categories
      .filter(
        (item) =>
          item.line === line.line && ["Costo", "Gasto"].includes(item.type)
      )
      .sort((a, b) => b.total - a.total)[0];
    if (largestOutflow) {
      insights.push({
        severity: "neutral",
        title: `${line.line}: principal salida`,
        message: `${largestOutflow.category} concentra ${formatNumber(largestOutflow.total)} en ${largestOutflow.type.toLowerCase()}s.`,
      });
    }
  });
  return insights;
}

function createFinancialAnalysisWorkbook(analysis) {
  const { report, source } = analysis;
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "Análisis financiero Petit Metabolic Training",
    Subject: `${report.filters.from} a ${report.filters.to}`,
    Author: "Petit Metabolic Training",
    CreatedDate: new Date(),
  };

  appendSheet(workbook, "Resumen", buildSummarySheetRows(report));
  appendSheet(
    workbook,
    "Por línea",
    report.lines.map((item) => lineSummaryToExcel(item))
  );
  appendSheet(
    workbook,
    "Mensual",
    report.monthly.map((item) => ({
      Mes: item.label,
      Ventas: item.salesTotal,
      "Ingresos recibidos": item.collected,
      Costos: item.costsTotal,
      "Costos pagados": item.costsPaid,
      Gastos: item.expensesTotal,
      "Gastos pagados": item.expensesPaid,
      "Resultado operativo": item.operatingResult,
      "Flujo neto": item.cashNet,
    }))
  );
  appendSheet(
    workbook,
    "Categorías",
    report.categories.map((item) => ({
      Línea: item.line,
      Tipo: item.type,
      Categoría: item.category,
      Movimientos: item.movementCount,
      "Valor total": item.total,
      "Pagado acumulado": item.paid,
      "Saldo actual": item.balance,
      "Participación %": round(item.percentageOfType),
    }))
  );
  appendSheet(
    workbook,
    "Movimientos",
    source.movements.map((item) => ({
      ID: item.id,
      Fecha: item.date,
      Línea: item.line,
      Tipo: item.type,
      Categoría: item.category,
      "Producto / servicio": item.productName,
      Cliente: item.client,
      Descripción: item.description,
      Estado: item.paymentStatus,
      Caja: item.paymentMethod,
      "Valor total": item.total,
      "Pago directo": item.directPayment,
      "Cobros posteriores acumulados": item.collectionTotal,
      "Pagado acumulado": item.paid,
      "Saldo actual": item.balance,
      Observaciones: item.notes,
      Origen: item.sourceSystem,
      "Registrado por": item.registeredBy,
    }))
  );
  appendSheet(
    workbook,
    "Cobros",
    source.collections.map((item) => ({
      ID: item.id,
      "Fecha cobro / pago": item.date,
      "ID movimiento": item.movementId,
      "Fecha movimiento": item.movementDate,
      Línea: item.line,
      Tipo: item.type,
      Categoría: item.category,
      Cliente: item.client,
      Descripción: item.description,
      Valor: item.amount,
      Caja: item.paymentMethod,
      Observaciones: item.notes,
      "Registrado por": item.registeredBy,
    }))
  );
  appendSheet(workbook, "Flujo de caja", buildCashFlowRows(source));
  appendSheet(
    workbook,
    "Traslados",
    source.transfers.map((item) => ({
      ID: item.id,
      Fecha: item.date,
      "Caja origen": item.sourcePaymentMethod,
      "Caja destino": item.targetPaymentMethod,
      Valor: item.amount,
      Observaciones: item.notes,
      "Registrado por": item.registeredBy,
    }))
  );

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function buildSummarySheetRows(report) {
  const summary = report.summary;
  return [
    { Indicador: "Período desde", Valor: report.filters.from },
    { Indicador: "Período hasta", Valor: report.filters.to },
    { Indicador: "Línea", Valor: report.filters.lineLabel },
    { Indicador: "Ventas", Valor: summary.salesTotal },
    { Indicador: "Ingresos recibidos", Valor: summary.collected },
    { Indicador: "Cartera de ventas del período", Valor: summary.accountsReceivable },
    { Indicador: "Costos", Valor: summary.costsTotal },
    { Indicador: "Costos pagados", Valor: summary.costsPaid },
    { Indicador: "Gastos", Valor: summary.expensesTotal },
    { Indicador: "Gastos pagados", Valor: summary.expensesPaid },
    { Indicador: "Cuentas por pagar del período", Valor: summary.accountsPayable },
    { Indicador: "Resultado operativo", Valor: summary.operatingResult },
    { Indicador: "Margen operativo %", Valor: round(summary.operatingMargin) },
    { Indicador: "Flujo neto", Valor: summary.cashNet },
  ];
}

function lineSummaryToExcel(item) {
  return {
    Línea: item.line,
    Ventas: item.salesTotal,
    "Ingresos recibidos": item.collected,
    Cartera: item.accountsReceivable,
    Costos: item.costsTotal,
    Gastos: item.expensesTotal,
    "Costos y gastos": item.accruedOutflows,
    "Cuentas por pagar": item.accountsPayable,
    "Resultado operativo": item.operatingResult,
    "Margen %": round(item.operatingMargin),
    "Flujo neto": item.cashNet,
  };
}

function buildCashFlowRows(source) {
  const rows = [];
  source.movements.forEach((item) => {
    if (!(item.directPayment > 0)) return;
    rows.push(cashFlowRow(item.date, item, item.directPayment, "Pago directo"));
  });
  source.collections.forEach((item) => {
    rows.push(cashFlowRow(item.date, item, item.amount, "Cobro / pago posterior"));
  });
  return rows.sort((a, b) => String(a.Fecha).localeCompare(String(b.Fecha)));
}

function cashFlowRow(date, item, amount, origin) {
  const isIncome = item.type === "Ingreso";
  return {
    Fecha: date,
    Línea: item.line,
    Tipo: item.type,
    Origen: origin,
    Caja: item.paymentMethod,
    Referencia: item.description,
    Entrada: isIncome ? amount : 0,
    Salida: isIncome ? 0 : amount,
    "Flujo neto": isIncome ? amount : amount * -1,
    "Registrado por": item.registeredBy,
  };
}

function appendSheet(workbook, name, rows) {
  const safeRows = rows.length ? rows : [{ Información: "Sin registros para el período" }];
  const sheet = XLSX.utils.json_to_sheet(safeRows);
  const headers = Object.keys(safeRows[0]);
  sheet["!cols"] = headers.map((header) => ({
    wch: Math.min(
      42,
      Math.max(
        header.length + 2,
        ...safeRows.map((row) => String(row[header] ?? "").length + 2)
      )
    ),
  }));
  if (sheet["!ref"]) {
    sheet["!autofilter"] = { ref: sheet["!ref"] };
  }
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function mapMovementSourceRow(row) {
  const collectionTotal = number(row.collection_total);
  const paid = number(row.paid_amount);
  return {
    id: Number(row.id),
    date: normalizeDateOnly(row.movement_date),
    line: row.business_line,
    type: row.movement_type,
    category: row.category || "Sin categoría",
    productName: row.product_name || "",
    client: row.client_name || "",
    description: row.description || "",
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    total: number(row.total_amount),
    paid,
    balance: number(row.balance_due),
    collectionTotal,
    directPayment: Math.max(paid - collectionTotal, 0),
    notes: row.notes || "",
    sourceSystem: row.source_system || "manual",
    registeredBy: row.registered_by_name || "Sistema / histórico",
  };
}

function mapCollectionSourceRow(row) {
  return {
    id: Number(row.id),
    movementId: Number(row.movement_id),
    date: normalizeDateOnly(row.collection_date),
    movementDate: normalizeDateOnly(row.movement_date),
    line: row.business_line,
    type: row.movement_type,
    category: row.category || "Sin categoría",
    client: row.client_name || "",
    description: row.description || "",
    amount: number(row.amount),
    paymentMethod: row.payment_method,
    notes: row.notes || "",
    registeredBy: row.registered_by_name || "Sistema",
  };
}

function mapTransferSourceRow(row) {
  return {
    id: Number(row.id),
    date: normalizeDateOnly(row.transfer_date),
    sourcePaymentMethod: row.source_payment_method,
    targetPaymentMethod: row.target_payment_method,
    amount: number(row.amount),
    notes: row.notes || "",
    registeredBy: row.registered_by_name || "Sistema",
  };
}

function monthKeysBetween(from, to) {
  const [startYear, startMonth] = from.split("-").map(Number);
  const [endYear, endMonth] = to.split("-").map(Number);
  const keys = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const names = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return `${names[month - 1]} ${year}`;
}

function normalizeDateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value || "").trim().slice(0, 10);
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

function createFilterError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function number(value) {
  return Number(value || 0);
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + number(row[key]), 0);
}

function round(value) {
  return value === null || value === undefined
    ? null
    : Number(Number(value).toFixed(2));
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(number(value));
}

function formatPercent(value) {
  return `${round(value) ?? 0}%`;
}

module.exports = {
  createFinancialAnalysisWorkbook,
  normalizeFinancialAnalysisFilters,
  readFinancialAnalysis,
};
