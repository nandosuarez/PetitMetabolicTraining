(function financialAnalysisModule() {
  const analysisElements = {
    form: document.getElementById("analysis-form"),
    dateFrom: document.getElementById("analysis-date-from"),
    dateTo: document.getElementById("analysis-date-to"),
    line: document.getElementById("analysis-line"),
    exportButton: document.getElementById("analysis-export"),
    feedback: document.getElementById("analysis-feedback"),
    summary: document.getElementById("analysis-summary"),
    lines: document.getElementById("analysis-lines"),
    insights: document.getElementById("analysis-insights"),
    monthly: document.getElementById("analysis-monthly"),
    categoryType: document.getElementById("analysis-category-type"),
    categories: document.getElementById("analysis-categories"),
    heroResult: document.getElementById("analysis-hero-result"),
    heroPeriod: document.getElementById("analysis-hero-period"),
  };

  if (!analysisElements.form) return;

  const analysisState = {
    report: null,
    loadedKey: "",
    loading: false,
  };

  function initializeAnalysisDates() {
    const today = getCurrentIsoDate();
    if (!analysisElements.dateFrom.value) {
      analysisElements.dateFrom.value = `${today.slice(0, 8)}01`;
    }
    if (!analysisElements.dateTo.value) {
      analysisElements.dateTo.value = today;
    }
  }

  function getAnalysisFilters() {
    return {
      from: analysisElements.dateFrom.value,
      to: analysisElements.dateTo.value,
      line: analysisElements.line.value,
    };
  }

  function getAnalysisFilterKey() {
    const filters = getAnalysisFilters();
    return `${filters.from}|${filters.to}|${filters.line}`;
  }

  function buildAnalysisQuery() {
    const params = new URLSearchParams(getAnalysisFilters());
    return params.toString();
  }

  function setAnalysisLoading(loading) {
    analysisState.loading = loading;
    const submitButton = analysisElements.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = loading;
      submitButton.textContent = loading ? "Analizando..." : "Analizar período";
    }
    analysisElements.exportButton.disabled = loading;
  }

  async function loadFinancialAnalysis(options = {}) {
    const key = getAnalysisFilterKey();
    if (!options.force && analysisState.report && analysisState.loadedKey === key) {
      renderFinancialAnalysis();
      return;
    }

    setAnalysisLoading(true);
    analysisElements.feedback.textContent =
      "Calculando ventas, cobros, costos y gastos del período...";
    try {
      analysisState.report = await apiRequest(`/api/analysis?${buildAnalysisQuery()}`);
      analysisState.loadedKey = key;
      renderFinancialAnalysis();
      analysisElements.feedback.textContent =
        "Análisis actualizado. Los cobros posteriores se asignaron a su fecha real de ingreso o salida.";
    } catch (error) {
      analysisElements.feedback.textContent = error.message;
      renderAnalysisError(error.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  function renderFinancialAnalysis() {
    const report = analysisState.report;
    if (!report) {
      renderAnalysisEmpty();
      return;
    }

    renderAnalysisSummary(report);
    renderAnalysisLines(report.lines || []);
    renderAnalysisInsights(report.insights || []);
    renderAnalysisMonthly(report.monthly || []);
    renderAnalysisCategories(report.categories || []);
  }

  function renderAnalysisSummary(report) {
    const summary = report.summary || {};
    const resultClass = Number(summary.operatingResult || 0) >= 0
      ? "positive"
      : "negative";
    analysisElements.heroResult.textContent = formatCurrency(summary.operatingResult);
    analysisElements.heroResult.classList.toggle("is-negative", resultClass === "negative");
    analysisElements.heroPeriod.textContent = `${formatDate(
      report.filters.from
    )} a ${formatDate(report.filters.to)} · ${report.filters.lineLabel}`;

    analysisElements.summary.innerHTML = [
      createStatCard(
        "Ventas registradas",
        formatCurrency(summary.salesTotal),
        `${summary.salesCount || 0} venta(s) en el período`
      ),
      createStatCard(
        "Ingresos recibidos",
        formatCurrency(summary.collected),
        "Pagos directos y cobros recibidos en el período"
      ),
      createStatCard(
        "Costos",
        formatCurrency(summary.costsTotal),
        `Pagados en el período ${formatCurrency(summary.costsPaid)}`
      ),
      createStatCard(
        "Gastos",
        formatCurrency(summary.expensesTotal),
        `Pagados en el período ${formatCurrency(summary.expensesPaid)}`
      ),
      createStatCard(
        "Resultado operativo",
        `<span class="${resultClass}">${formatCurrency(summary.operatingResult)}</span>`,
        `Margen ${formatAnalysisPercent(summary.operatingMargin)}`
      ),
      createStatCard(
        "Flujo neto",
        `<span class="${Number(summary.cashNet || 0) >= 0 ? "positive" : "negative"}">${formatCurrency(summary.cashNet)}</span>`,
        `Entró ${formatCurrency(summary.collected)} · Salió ${formatCurrency(summary.cashOutflow)}`
      ),
      createStatCard(
        "Cartera del período",
        formatCurrency(summary.accountsReceivable),
        "Saldo actual pendiente de las ventas registradas"
      ),
      createStatCard(
        "Cuentas por pagar",
        formatCurrency(summary.accountsPayable),
        "Saldo de costos y gastos registrados en el período"
      ),
    ].join("");
  }

  function renderAnalysisLines(lines) {
    analysisElements.lines.innerHTML = lines.length
      ? lines
          .map((line) => {
            const negative = Number(line.operatingResult || 0) < 0;
            const costRatio = Number(line.costRatio || 0);
            const expenseRatio = Number(line.expenseRatio || 0);
            return `
              <article class="analysis-line-card ${negative ? "is-negative" : "is-positive"}">
                <div class="analysis-line-card-head">
                  <div>
                    <span>${escapeHtml(line.line)}</span>
                    <strong>${formatCurrency(line.operatingResult)}</strong>
                  </div>
                  <span class="analysis-margin-pill ${negative ? "is-negative" : ""}">
                    Margen ${formatAnalysisPercent(line.operatingMargin)}
                  </span>
                </div>
                <div class="analysis-line-metrics">
                  <span><small>Ventas</small><strong>${formatCurrency(line.salesTotal)}</strong></span>
                  <span><small>Costos + gastos</small><strong>${formatCurrency(line.accruedOutflows)}</strong></span>
                  <span><small>Dinero recibido</small><strong>${formatCurrency(line.collected)}</strong></span>
                  <span><small>Flujo neto</small><strong class="${Number(line.cashNet || 0) >= 0 ? "positive" : "negative"}">${formatCurrency(line.cashNet)}</strong></span>
                </div>
                <div class="analysis-ratio-block">
                  ${renderAnalysisRatio("Costos / ventas", costRatio, "cost")}
                  ${renderAnalysisRatio("Gastos / ventas", expenseRatio, "expense")}
                </div>
              </article>
            `;
          })
          .join("")
      : '<div class="empty-state">No hay líneas disponibles para este período.</div>';
  }

  function renderAnalysisRatio(label, value, type) {
    const width = Math.min(Math.max(Number(value || 0), 0), 100);
    return `
      <div class="analysis-ratio-row">
        <div><span>${label}</span><strong>${formatAnalysisPercent(value)}</strong></div>
        <div class="analysis-ratio-track">
          <span class="analysis-ratio-fill is-${type} ${Number(value || 0) > 100 ? "is-over" : ""}" style="width:${width}%"></span>
        </div>
      </div>
    `;
  }

  function renderAnalysisInsights(insights) {
    analysisElements.insights.innerHTML = insights.length
      ? insights
          .map(
            (item) => `
              <article class="analysis-insight is-${escapeHtml(item.severity || "neutral")}">
                <span class="analysis-insight-mark"></span>
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.message)}</p>
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty-state">No se generaron hallazgos para este período.</div>';
  }

  function renderAnalysisMonthly(monthly) {
    if (!monthly.length) {
      analysisElements.monthly.innerHTML =
        '<div class="empty-state">No hay comportamiento mensual para mostrar.</div>';
      return;
    }
    const maximum = Math.max(
      1,
      ...monthly.flatMap((item) => [
        Number(item.salesTotal || 0),
        Number(item.costsTotal || 0),
        Number(item.expensesTotal || 0),
      ])
    );

    analysisElements.monthly.innerHTML = monthly
      .map(
        (item) => `
          <article class="analysis-month-row">
            <div class="analysis-month-label">
              <strong>${escapeHtml(item.label)}</strong>
              <small class="${Number(item.operatingResult || 0) >= 0 ? "positive" : "negative"}">
                Resultado ${formatCurrency(item.operatingResult)}
              </small>
            </div>
            <div class="analysis-month-bars">
              ${renderAnalysisMonthBar("Ventas", item.salesTotal, maximum, "sales")}
              ${renderAnalysisMonthBar("Costos", item.costsTotal, maximum, "cost")}
              ${renderAnalysisMonthBar("Gastos", item.expensesTotal, maximum, "expense")}
            </div>
            <div class="analysis-month-cash">
              <span>Cobrado ${formatCurrency(item.collected)}</span>
              <strong class="${Number(item.cashNet || 0) >= 0 ? "positive" : "negative"}">
                Flujo ${formatCurrency(item.cashNet)}
              </strong>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderAnalysisMonthBar(label, value, maximum, type) {
    const width = Math.max((Number(value || 0) / maximum) * 100, value > 0 ? 1 : 0);
    return `
      <div class="analysis-month-bar">
        <span>${label}</span>
        <div><i class="is-${type}" style="width:${width}%"></i></div>
        <strong>${formatCurrency(value)}</strong>
      </div>
    `;
  }

  function renderAnalysisCategories(categories) {
    const type = analysisElements.categoryType.value;
    const visible = type
      ? categories.filter((item) => item.type === type)
      : categories;
    analysisElements.categories.innerHTML = visible.length
      ? visible
          .map(
            (item) => `
              <tr>
                ${tableCell("Línea", escapeHtml(item.line))}
                ${tableCell("Tipo", `<span class="analysis-type-badge is-${item.type.toLowerCase()}">${escapeHtml(item.type)}</span>`)}
                ${tableCell("Categoría", `<strong>${escapeHtml(item.category)}</strong>`)}
                ${tableCell("Movimientos", String(item.movementCount))}
                ${tableCell("Total", formatCurrency(item.total), "numeric-cell")}
                ${tableCell("Pagado", formatCurrency(item.paid), "numeric-cell")}
                ${tableCell("Saldo", formatCurrency(item.balance), "numeric-cell")}
                ${tableCell("Participación", formatAnalysisPercent(item.percentageOfType), "numeric-cell")}
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="8" class="empty-state">No hay categorías para el filtro seleccionado.</td>
          </tr>
        `;
    applyStackTableLabels(elements.appShell);
  }

  function renderAnalysisEmpty() {
    analysisElements.summary.innerHTML = "";
    analysisElements.lines.innerHTML =
      '<div class="empty-state">Selecciona el período que quieres analizar.</div>';
    analysisElements.insights.innerHTML = "";
    analysisElements.monthly.innerHTML = "";
    analysisElements.categories.innerHTML = "";
  }

  function renderAnalysisError(message) {
    analysisElements.summary.innerHTML = "";
    analysisElements.lines.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
    analysisElements.insights.innerHTML = "";
    analysisElements.monthly.innerHTML = "";
    analysisElements.categories.innerHTML = "";
  }

  function formatAnalysisPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return "Sin base";
    }
    return `${new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(Number(value))}%`;
  }

  async function exportFinancialAnalysis() {
    setAnalysisLoading(true);
    analysisElements.feedback.textContent = "Preparando archivo Excel...";
    try {
      const response = await fetch(`/api/analysis/export?${buildAnalysisQuery()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "No se pudo generar el archivo Excel.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filters = getAnalysisFilters();
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `analisis-petit-${filters.from}-a-${filters.to}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      analysisElements.feedback.textContent =
        "Excel descargado con resumen, movimientos, cobros, flujo de caja y traslados.";
    } catch (error) {
      analysisElements.feedback.textContent = error.message;
    } finally {
      setAnalysisLoading(false);
    }
  }

  analysisElements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadFinancialAnalysis({ force: true });
  });
  analysisElements.exportButton.addEventListener("click", exportFinancialAnalysis);
  analysisElements.categoryType.addEventListener("change", () => {
    renderAnalysisCategories(analysisState.report?.categories || []);
  });

  const originalSwitchView = window.switchView || switchView;
  window.switchView = function analysisSwitchView(view, options = {}) {
    originalSwitchView(view, options);
    if (view === "analisis" && hasAccountingAccess()) {
      initializeAnalysisDates();
      loadFinancialAnalysis();
    }
  };

  initializeAnalysisDates();
  renderAnalysisEmpty();
})();
