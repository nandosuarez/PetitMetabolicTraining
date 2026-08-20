const crypto = require("crypto");

const BOGOTA_TIME_ZONE = "America/Bogota";
const DEFAULT_TIMEOUT_MS = 30000;

function getWodBusterConfigStatus() {
  const rawBaseUrl = String(process.env.WODBUSTER_BASE_URL || "").trim();
  const username = String(process.env.WODBUSTER_API_USERNAME || "").trim();
  const password = String(process.env.WODBUSTER_API_PASSWORD || "");
  let host = "";
  let validBaseUrl = false;

  if (rawBaseUrl) {
    try {
      const parsed = validateWodBusterBaseUrl(rawBaseUrl);
      host = parsed.host;
      validBaseUrl = true;
    } catch (_error) {
      validBaseUrl = false;
    }
  }

  return {
    configured: validBaseUrl && Boolean(username) && Boolean(password),
    host,
    hasBaseUrl: Boolean(rawBaseUrl),
    hasUsername: Boolean(username),
    hasPassword: Boolean(password),
    validBaseUrl,
  };
}

async function fetchWodBusterPayments({ fromDate, toDate }) {
  const config = readWodBusterConfig();
  const desde = dateBoundaryToEpoch(fromDate, false);
  const hasta = dateBoundaryToEpoch(toDate, true);
  const endpoint = new URL("/api/box/Pagos", config.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(
          `${config.username}:${config.password}`,
          "utf8"
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({
        Desde: String(desde),
        Hasta: String(hasta),
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    if (!response.ok) {
      const error = new Error(
        response.status === 401 || response.status === 403
          ? "WodBuster rechazo las credenciales configuradas."
          : `WodBuster respondio con estado ${response.status}.`
      );
      error.status = 502;
      throw error;
    }

    let payload;
    try {
      payload = responseText ? JSON.parse(responseText) : [];
    } catch (_error) {
      const error = new Error("WodBuster devolvio una respuesta que no es JSON valido.");
      error.status = 502;
      throw error;
    }

    return {
      endpointHost: endpoint.host,
      payments: normalizeWodBusterResponse(payload),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("WodBuster no respondio dentro del tiempo esperado.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    if (!error?.status) {
      const connectionError = new Error(
        "No fue posible conectar con WodBuster. Verifica el dominio configurado."
      );
      connectionError.status = 502;
      throw connectionError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeWodBusterResponse(payload) {
  return extractPaymentRows(payload).map((row) => normalizeWodBusterPayment(row));
}

function normalizeWodBusterPayment(rawRow) {
  const row = isPlainObject(rawRow) ? rawRow : { value: rawRow };
  const nestedPerson = pickObject(row, [
    "atleta",
    "usuario",
    "cliente",
    "user",
    "customer",
  ]);
  const sources = nestedPerson ? [nestedPerson, row] : [row];
  const externalId = cleanText(
    pickFromSources([row], [
      "idpago",
      "pagoid",
      "paymentid",
      "idtransaccion",
      "transactionid",
      "referencia",
      "reference",
      "id",
    ])
  );
  const paidAtValue = pickFromSources([row], [
    "fechadepago",
    "fechapago",
    "paymentdate",
    "paidat",
    "fecha",
    "createdat",
  ]);
  const paidAt = parseWodBusterDate(paidAtValue);
  const amount = parseWodBusterAmount(
    pickFromSources([row], [
      "importeconimpuestos",
      "importetotal",
      "totalconimpuestos",
      "preciototalconimpuestos",
      "importe",
      "amount",
      "total",
      "precio",
    ])
  );
  const paymentMethod = cleanText(
    pickFromSources([row], [
      "formadepago",
      "formapago",
      "paymentmethod",
      "metododepago",
      "metodopago",
    ])
  );
  const documentNumber = cleanText(
    pickFromSources(sources, [
      "dni",
      "dnifacturacion",
      "documento",
      "documentnumber",
      "cedula",
      "identificacion",
    ])
  );
  const email = cleanText(
    pickFromSources(sources, ["email", "correo", "mail"])
  ).toLowerCase();
  const phone = cleanText(
    pickFromSources(sources, ["telefono", "phone", "movil", "celular"])
  );
  const displayName = cleanText(
    pickFromSources(sources, [
      "nombreparamostrar",
      "displayname",
      "nombrecompleto",
      "razonsocial",
    ])
  );
  const firstName = cleanText(
    pickFromSources(sources, ["nombre", "firstname", "nombres"])
  );
  const firstSurname = cleanText(
    pickFromSources(sources, ["primerapellido", "apellido", "lastname"])
  );
  const secondSurname = cleanText(
    pickFromSources(sources, ["segundoapellido", "secondlastname"])
  );
  const fullName = [firstName, firstSurname, secondSurname]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const concept = readConceptText(row);
  const conceptType = cleanText(
    pickFromSources([row], ["tipo", "tipoconcepto", "concepttype"])
  );
  const conceptTypeId = cleanText(
    pickFromSources([row], ["idtipo", "tipoconceptoid", "concepttypeid"])
  );
  const invoiceNumber = cleanText(
    pickFromSources([row], [
      "facturanumero",
      "numerofactura",
      "invoicenumber",
      "factura",
    ])
  );
  const clientName = fullName || displayName || email || documentNumber;
  const canonicalReference = {
    paidAt: paidAt ? paidAt.toISOString() : cleanText(paidAtValue),
    amount,
    paymentMethod,
    documentNumber,
    email,
    displayName,
    concept,
    conceptTypeId,
    invoiceNumber,
  };
  const externalKey = externalId
    ? `id:${externalId}`
    : `sha256:${crypto
        .createHash("sha256")
        .update(stableStringify(canonicalReference))
        .digest("hex")}`;
  let issue = "";

  if (!paidAt) {
    issue = "El pago no contiene una fecha valida.";
  } else if (!Number.isFinite(amount) || amount === 0) {
    issue = "El pago no contiene un importe valido.";
  } else if (amount < 0) {
    issue = "Es una reversion y requiere revision administrativa.";
  }

  return {
    externalKey,
    externalId,
    paidAt: paidAt ? paidAt.toISOString() : "",
    paymentDate: paidAt ? formatDateInBogota(paidAt) : "",
    amount,
    paymentMethod,
    clientName,
    fullName,
    displayName,
    documentNumber,
    email,
    phone,
    concept,
    conceptType,
    conceptTypeId,
    invoiceNumber,
    importable: !issue,
    issue,
    raw: row,
  };
}

function sanitizeWodBusterPayment(payment) {
  return {
    externalKey: payment.externalKey,
    externalId: payment.externalId,
    paidAt: payment.paidAt,
    paymentDate: payment.paymentDate,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    clientName: payment.clientName,
    fullName: payment.fullName,
    displayName: payment.displayName,
    documentNumber: payment.documentNumber,
    email: payment.email,
    phone: payment.phone,
    concept: payment.concept,
    conceptType: payment.conceptType,
    conceptTypeId: payment.conceptTypeId,
    invoiceNumber: payment.invoiceNumber,
    importable: payment.importable,
    issue: payment.issue,
  };
}

function readWodBusterConfig() {
  const baseUrl = validateWodBusterBaseUrl(
    String(process.env.WODBUSTER_BASE_URL || "").trim()
  );
  const username = String(process.env.WODBUSTER_API_USERNAME || "").trim();
  const password = String(process.env.WODBUSTER_API_PASSWORD || "");

  if (!username || !password) {
    const error = new Error(
      "Configura WODBUSTER_API_USERNAME y WODBUSTER_API_PASSWORD en Render."
    );
    error.status = 503;
    throw error;
  }

  return { baseUrl, username, password };
}

function validateWodBusterBaseUrl(value) {
  if (!value) {
    const error = new Error("Configura WODBUSTER_BASE_URL en Render.");
    error.status = 503;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch (_error) {
    const error = new Error("WODBUSTER_BASE_URL no contiene una URL valida.");
    error.status = 503;
    throw error;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    parsed.protocol !== "https:" ||
    !(hostname === "wodbuster.com" || hostname.endsWith(".wodbuster.com"))
  ) {
    const error = new Error(
      "WODBUSTER_BASE_URL debe usar HTTPS y pertenecer a wodbuster.com."
    );
    error.status = 503;
    throw error;
  }

  return new URL(parsed.origin);
}

function dateBoundaryToEpoch(value, endOfDay) {
  const cleanValue = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
    const error = new Error("Selecciona un rango de fechas valido.");
    error.status = 400;
    throw error;
  }

  const suffix = endOfDay ? "T23:59:59-05:00" : "T00:00:00-05:00";
  const parsed = new Date(`${cleanValue}${suffix}`);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error("Selecciona un rango de fechas valido.");
    error.status = 400;
    throw error;
  }

  return Math.floor(parsed.getTime() / 1000);
}

function parseWodBusterDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 100000000000 ? value * 1000 : value;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const text = cleanText(value);
  if (!text) {
    return null;
  }

  const dotNetMatch = text.match(/\/Date\((-?\d+)(?:[+-]\d+)?\)\//i);
  if (dotNetMatch) {
    const parsed = new Date(Number(dotNetMatch[1]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^-?\d{9,13}$/.test(text)) {
    return parseWodBusterDate(Number(text));
  }

  const numericDateMatch = text.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (numericDateMatch) {
    const [, first, second, rawYear, hour = "0", minute = "0", seconds = "0"] =
      numericDateMatch;
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);

    // WodBuster exports M/D/YY. If the first value cannot be a month,
    // accept D/M/YYYY as a safe fallback for localized API responses.
    const month = firstNumber > 12 ? secondNumber : firstNumber;
    const day = firstNumber > 12 ? firstNumber : secondNumber;
    const parsed = new Date(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}-05:00`
    );

    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getUTCFullYear() === year &&
      Number(formatDateInBogota(parsed).slice(5, 7)) === month &&
      Number(formatDateInBogota(parsed).slice(8, 10)) === day
    ) {
      return parsed;
    }
    return null;
  }

  const normalized = text.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseWodBusterAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  }

  let text = cleanText(value).replace(/[^\d,.-]/g, "");
  if (!text) {
    return 0;
  }

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > lastDot) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma >= 0) {
    text = text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimalDigits = text.length - lastComma - 1;
    text =
      decimalDigits === 2
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const dotCount = (text.match(/\./g) || []).length;
    const decimalDigits = text.length - lastDot - 1;
    if (dotCount > 1 || decimalDigits === 3) {
      text = text.replace(/\./g, "");
    }
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function extractPaymentRows(payload) {
  if (typeof payload === "string") {
    try {
      return extractPaymentRows(JSON.parse(payload));
    } catch (_error) {
      return [];
    }
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isPlainObject(payload)) {
    return [];
  }

  const preferredKeys = [
    "pagos",
    "payments",
    "data",
    "result",
    "results",
    "items",
    "d",
  ];
  const normalizedEntries = Object.entries(payload).map(([key, value]) => [
    normalizeFieldName(key),
    value,
  ]);

  for (const preferredKey of preferredKeys) {
    const match = normalizedEntries.find(([key]) => key === preferredKey);
    if (match) {
      const rows = extractPaymentRows(match[1]);
      if (rows.length || Array.isArray(match[1])) {
        return rows;
      }
    }
  }

  const firstArray = Object.values(payload).find(Array.isArray);
  return firstArray || [payload];
}

function readConceptText(row) {
  const value = pickFromSources([row], [
    "conceptos",
    "concepto",
    "descripcion",
    "description",
    "detalle",
  ]);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!isPlainObject(item)) {
          return cleanText(item);
        }
        return cleanText(
          pickFromSources([item], [
            "descripcion",
            "description",
            "concepto",
            "nombre",
          ])
        );
      })
      .filter(Boolean)
      .join(" | ");
  }

  if (isPlainObject(value)) {
    return cleanText(
      pickFromSources([value], [
        "descripcion",
        "description",
        "concepto",
        "nombre",
      ])
    );
  }

  return cleanText(value);
}

function pickFromSources(sources, candidates) {
  for (const source of sources) {
    if (!isPlainObject(source)) {
      continue;
    }
    const entries = new Map(
      Object.entries(source).map(([key, value]) => [normalizeFieldName(key), value])
    );
    for (const candidate of candidates) {
      const value = entries.get(normalizeFieldName(candidate));
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return "";
}

function pickObject(source, candidates) {
  const value = pickFromSources([source], candidates);
  return isPlainObject(value) ? value : null;
}

function normalizeFieldName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function formatDateInBogota(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
  fetchWodBusterPayments,
  getWodBusterConfigStatus,
  normalizeWodBusterPayment,
  normalizeWodBusterResponse,
  parseWodBusterAmount,
  sanitizeWodBusterPayment,
};
