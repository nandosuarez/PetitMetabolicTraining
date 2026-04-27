const emptyState = {
  lists: {
    gimnasioCategorias: [],
    restauranteCategorias: [],
    tipos: [],
    mediosPago: [],
    estadosPago: [],
  },
  movements: [],
  portfolioMovements: [],
  users: [],
  notes: {
    daily: {},
    weekly: {},
  },
};

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const APP_LOCALE = "es-CO";
const APP_TIME_ZONE = "America/Bogota";

let state = structuredClone(emptyState);
let activeView = "dashboard";
let authState = {
  authenticated: false,
  user: null,
};

const elements = {
  loginScreen: document.getElementById("login-screen"),
  passwordChangeScreen: document.getElementById("password-change-screen"),
  appShell: document.getElementById("app-shell"),
  loginForm: document.getElementById("login-form"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  loginFeedback: document.getElementById("login-feedback"),
  passwordChangeForm: document.getElementById("password-change-form"),
  passwordChangeUser: document.getElementById("password-change-user"),
  passwordChangeCurrent: document.getElementById("password-change-current"),
  passwordChangeNew: document.getElementById("password-change-new"),
  passwordChangeConfirm: document.getElementById("password-change-confirm"),
  passwordChangeFeedback: document.getElementById("password-change-feedback"),
  passwordChangeLogout: document.getElementById("password-change-logout"),
  navLinks: [...document.querySelectorAll(".nav-link")],
  views: {
    dashboard: document.getElementById("dashboard-view"),
    movimientos: document.getElementById("movimientos-view"),
    diario: document.getElementById("diario-view"),
    semanal: document.getElementById("semanal-view"),
    mensual: document.getElementById("mensual-view"),
    cartera: document.getElementById("cartera-view"),
    listas: document.getElementById("listas-view"),
    usuarios: document.getElementById("usuarios-view"),
  },
  adminOnly: [...document.querySelectorAll(".admin-only")],
  viewTitle: document.getElementById("view-title"),
  sidebarMetrics: document.getElementById("sidebar-metrics"),
  saveStatus: document.getElementById("save-status"),
  sessionUser: document.getElementById("session-user"),
  logoutButton: document.getElementById("logout-button"),
  quickMovement: document.getElementById("quick-movement"),
  refreshData: document.getElementById("reset-data"),
  dashboardSummary: document.getElementById("dashboard-summary"),
  dashboardAlerts: document.getElementById("dashboard-alerts"),
  dashboardRecent: document.getElementById("dashboard-recent"),
  dashboardMonthBars: document.getElementById("dashboard-month-bars"),
  movementForm: document.getElementById("movement-form"),
  movementFormTitle: document.getElementById("movement-form-title"),
  movementId: document.getElementById("movement-id"),
  movementFeedback: document.getElementById("movement-feedback"),
  cancelEdit: document.getElementById("cancel-edit"),
  linea: document.getElementById("linea"),
  fecha: document.getElementById("fecha"),
  tipo: document.getElementById("tipo"),
  categoria: document.getElementById("categoria"),
  cliente: document.getElementById("cliente"),
  descripcion: document.getElementById("descripcion"),
  estadoPago: document.getElementById("estadoPago"),
  medioPago: document.getElementById("medioPago"),
  valorTotal: document.getElementById("valorTotal"),
  abono: document.getElementById("abono"),
  observaciones: document.getElementById("observaciones"),
  filterLine: document.getElementById("filter-line"),
  filterStatus: document.getElementById("filter-status"),
  filterQuery: document.getElementById("filter-query"),
  movementMetrics: document.getElementById("movement-metrics"),
  movementTable: document.getElementById("movements-table"),
  dailyDate: document.getElementById("daily-date"),
  dailyMetrics: document.getElementById("daily-metrics"),
  dailyNotes: document.getElementById("daily-notes"),
  saveDailyNotes: document.getElementById("save-daily-notes"),
  weeklyStart: document.getElementById("weekly-start"),
  weeklyEnd: document.getElementById("weekly-end"),
  weeklyMetrics: document.getElementById("weekly-metrics"),
  weeklyNotes: document.getElementById("weekly-notes"),
  saveWeeklyNotes: document.getElementById("save-weekly-notes"),
  monthlyYear: document.getElementById("monthly-year"),
  monthlyAnnualCards: document.getElementById("monthly-annual-cards"),
  monthlyTable: document.getElementById("monthly-table"),
  portfolioSummary: document.getElementById("portfolio-summary"),
  portfolioTable: document.getElementById("portfolio-table"),
  userForm: document.getElementById("user-form"),
  userFullName: document.getElementById("user-full-name"),
  userUsername: document.getElementById("user-username"),
  userRole: document.getElementById("user-role"),
  userPassword: document.getElementById("user-password"),
  userFeedback: document.getElementById("user-feedback"),
  usersMetrics: document.getElementById("users-metrics"),
  usersTable: document.getElementById("users-table"),
};

init();

async function init() {
  hydrateDefaultDates();
  bindEvents();
  renderLoginFeedback("Ingresa tus credenciales para continuar.");
  await restoreSession();
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.passwordChangeForm.addEventListener(
    "submit",
    handlePasswordChangeSubmit
  );
  elements.passwordChangeLogout.addEventListener("click", handleLogout);
  elements.logoutButton.addEventListener("click", handleLogout);

  elements.navLinks.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  elements.quickMovement.addEventListener("click", () => {
    switchView("movimientos");
    elements.descripcion.focus();
  });

  elements.refreshData.addEventListener("click", async () => {
    await loadBootstrap();
  });

  elements.linea.addEventListener("change", syncCategoryOptions);
  elements.movementForm.addEventListener("submit", handleMovementSubmit);
  elements.cancelEdit.addEventListener("click", resetMovementForm);

  [elements.filterLine, elements.filterStatus, elements.filterQuery].forEach(
    (input) => input.addEventListener("input", renderMovementsView)
  );

  elements.dailyDate.addEventListener("input", renderDailyView);
  elements.weeklyStart.addEventListener("input", renderWeeklyView);
  elements.weeklyEnd.addEventListener("input", renderWeeklyView);
  elements.monthlyYear.addEventListener("input", renderMonthlyView);

  elements.saveDailyNotes.addEventListener("click", saveDailyNote);
  elements.saveWeeklyNotes.addEventListener("click", saveWeeklyNote);
  elements.movementTable.addEventListener("click", handleMovementTableClick);
  elements.userForm.addEventListener("submit", handleUserSubmit);
  elements.usersTable.addEventListener("click", handleUsersTableClick);

  document
    .querySelectorAll("[data-list-form]")
    .forEach((form) => form.addEventListener("submit", handleListSubmit));

  document
    .getElementById("listas-view")
    .addEventListener("click", handleListRemoval);
}

async function restoreSession() {
  try {
    const session = await apiRequest("/api/auth/session", {
      allowUnauthorized: true,
    });

    if (session.authenticated && session.user) {
      const hasFullAccess = setAuthenticatedUser(session.user);
      if (hasFullAccess) {
        await loadBootstrap();
      }
      return;
    }
  } catch (error) {
    console.error(error);
  }

  showLogin("Ingresa tus credenciales para continuar.");
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;

  if (!username || !password) {
    renderLoginFeedback("Debes escribir usuario y contraseña.", true);
    return;
  }

  renderLoginFeedback("Validando acceso...");

  try {
    const session = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
      }),
      allowUnauthorized: true,
    });

    if (!session.authenticated || !session.user) {
      throw new Error("No se pudo iniciar la sesión.");
    }

    elements.loginForm.reset();
    const hasFullAccess = setAuthenticatedUser(session.user);
    if (hasFullAccess) {
      await loadBootstrap();
    }
  } catch (error) {
    renderLoginFeedback(
      error.message || "No se pudo validar el acceso.",
      true
    );
  }
}

async function handlePasswordChangeSubmit(event) {
  event.preventDefault();

  const currentPassword = elements.passwordChangeCurrent.value;
  const newPassword = elements.passwordChangeNew.value;
  const confirmPassword = elements.passwordChangeConfirm.value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    renderPasswordChangeFeedback(
      "Completa los tres campos para actualizar la contraseña.",
      true
    );
    return;
  }

  if (newPassword.length < 10) {
    renderPasswordChangeFeedback(
      "La nueva contraseña debe tener al menos 10 caracteres.",
      true
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    renderPasswordChangeFeedback(
      "La confirmación no coincide con la nueva contraseña.",
      true
    );
    return;
  }

  if (newPassword === currentPassword) {
    renderPasswordChangeFeedback(
      "La nueva contraseña debe ser diferente a la temporal o actual.",
      true
    );
    return;
  }

  renderPasswordChangeFeedback("Actualizando contraseña...");

  try {
    const session = await apiRequest("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    if (!session.authenticated || !session.user) {
      throw new Error("No se pudo actualizar la contraseña.");
    }

    elements.passwordChangeForm.reset();
    const hasFullAccess = setAuthenticatedUser(session.user);
    if (hasFullAccess) {
      await loadBootstrap();
      setStatus(
        `Contraseña actualizada · ${formatClockTime(new Date())}`
      );
    }
  } catch (error) {
    renderPasswordChangeFeedback(
      error.message || "No se pudo actualizar la contraseña.",
      true
    );
  }
}

async function handleLogout() {
  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
      allowUnauthorized: true,
    });
  } catch (error) {
    console.error(error);
  }

  authState = {
    authenticated: false,
    user: null,
  };
  state = structuredClone(emptyState);
  elements.passwordChangeForm.reset();
  showLogin("Sesión cerrada. Ingresa de nuevo para continuar.");
}

async function loadBootstrap() {
  setStatus("Conectando a PostgreSQL...");

  try {
    const [data, usersPayload] = await Promise.all([
      apiRequest("/api/bootstrap"),
      isAdminUser()
        ? apiRequest("/api/users")
        : Promise.resolve({ users: [] }),
    ]);
    state = {
      ...structuredClone(emptyState),
      ...data,
      lists: {
        ...structuredClone(emptyState).lists,
        ...(data.lists || {}),
      },
      portfolioMovements: Array.isArray(data.portfolioMovements)
        ? data.portfolioMovements
        : [],
      users: Array.isArray(usersPayload?.users) ? usersPayload.users : [],
      notes: {
        daily: data.notes?.daily || {},
        weekly: data.notes?.weekly || {},
      },
      movements: Array.isArray(data.movements) ? data.movements : [],
    };

    hydrateStaticOptions();
    if (!elements.movementId.value) {
      resetMovementForm();
    }
    resetUserForm();
    renderAll();
    setStatus(`PostgreSQL conectado · ${formatClockTime(new Date())}`);
  } catch (error) {
    console.error(error);
    setStatus("Sin conexion a PostgreSQL");
    elements.movementFeedback.textContent =
      error.message || "No se pudo cargar la informacion desde la API.";
  }
}

function setAuthenticatedUser(user) {
  authState = {
    authenticated: true,
    user,
  };

  elements.sessionUser.textContent = `${user.fullName || user.username} · ${
    user.roleLabel || roleLabel(user.role)
  }`;
  elements.sessionUser.classList.remove("is-hidden");
  applyRoleVisibility();
  renderLoginFeedback("Acceso concedido.");

  if (user.mustChangePassword) {
    showPasswordChange(
      "Debes reemplazar la contraseña temporal antes de ingresar al panel."
    );
    return false;
  }

  showApp();
  return true;
}

function showLogin(message) {
  elements.loginScreen.classList.remove("is-hidden");
  elements.passwordChangeScreen.classList.add("is-hidden");
  elements.appShell.classList.add("is-hidden");
  elements.sessionUser.classList.add("is-hidden");
  elements.loginPassword.value = "";
  applyRoleVisibility();

  if (message) {
    renderLoginFeedback(message);
  }

  window.requestAnimationFrame(() => {
    elements.loginUsername.focus();
  });
}

function showApp() {
  elements.loginScreen.classList.add("is-hidden");
  elements.passwordChangeScreen.classList.add("is-hidden");
  elements.appShell.classList.remove("is-hidden");
  applyRoleVisibility();
}

function renderLoginFeedback(message, isError = false) {
  elements.loginFeedback.textContent = message;
  elements.loginFeedback.classList.toggle("error", isError);
}

function showPasswordChange(message) {
  elements.loginScreen.classList.add("is-hidden");
  elements.appShell.classList.add("is-hidden");
  elements.passwordChangeScreen.classList.remove("is-hidden");
  elements.passwordChangeUser.textContent = `Usuario: ${
    authState.user?.fullName || authState.user?.username || "Sin sesión"
  }`;
  renderPasswordChangeFeedback(
    message ||
      "Debes cambiar la contraseña temporal para continuar en la plataforma."
  );

  window.requestAnimationFrame(() => {
    elements.passwordChangeCurrent.focus();
  });
}

function renderPasswordChangeFeedback(message, isError = false) {
  elements.passwordChangeFeedback.textContent = message;
  elements.passwordChangeFeedback.classList.toggle("error", isError);
}

function isAdminUser() {
  return authState.user?.role === "administrador";
}

function isAssistantUser() {
  return authState.user?.role === "asistente_operativo";
}

function getAllowedViews() {
  if (isAdminUser()) {
    return [
      "dashboard",
      "movimientos",
      "diario",
      "semanal",
      "mensual",
      "cartera",
      "listas",
      "usuarios",
    ];
  }

  if (isAssistantUser()) {
    return ["movimientos", "cartera"];
  }

  return [];
}

function defaultViewForCurrentUser() {
  return isAssistantUser() ? "movimientos" : "dashboard";
}

function hasViewAccess(view) {
  return getAllowedViews().includes(view);
}

function applyRoleVisibility() {
  const allowedViews = new Set(getAllowedViews());

  elements.navLinks.forEach((button) => {
    button.classList.toggle("is-hidden", !allowedViews.has(button.dataset.view));
  });

  elements.adminOnly.forEach((element) => {
    element.classList.toggle("is-hidden", !isAdminUser());
  });

  if (!hasViewAccess(activeView)) {
    switchView(defaultViewForCurrentUser());
  }
}

function roleLabel(role) {
  return {
    administrador: "Administrador",
    asistente_operativo: "Asistente operativo",
  }[role] || "Sin perfil";
}

function hydrateDefaultDates() {
  const today = getCurrentIsoDate();
  elements.fecha.value = today;
  elements.dailyDate.value = today;
  elements.monthlyYear.value = String(getCurrentDateParts().year);

  const start = addDays(getCurrentTimeZoneDate(), -6);
  elements.weeklyStart.value = toIsoDate(start);
  elements.weeklyEnd.value = today;
}

function hydrateStaticOptions() {
  const previousStatus = elements.filterStatus.value || "Todos";
  const previousType = elements.tipo.value;
  const previousPaymentStatus = elements.estadoPago.value;
  const previousPaymentMethod = elements.medioPago.value;

  fillSelect(elements.tipo, state.lists.tipos);
  fillSelect(elements.estadoPago, state.lists.estadosPago);
  fillSelect(elements.medioPago, state.lists.mediosPago);
  fillSelect(elements.filterStatus, ["Todos", ...state.lists.estadosPago]);
  syncCategoryOptions();

  if (state.lists.tipos.includes(previousType)) {
    elements.tipo.value = previousType;
  }

  if (state.lists.estadosPago.includes(previousPaymentStatus)) {
    elements.estadoPago.value = previousPaymentStatus;
  }

  if (state.lists.mediosPago.includes(previousPaymentMethod)) {
    elements.medioPago.value = previousPaymentMethod;
  }

  if (["Todos", ...state.lists.estadosPago].includes(previousStatus)) {
    elements.filterStatus.value = previousStatus;
  }
}

function switchView(view) {
  if (!hasViewAccess(view)) {
    view = defaultViewForCurrentUser();
  }

  activeView = view;

  Object.entries(elements.views).forEach(([key, section]) => {
    section.classList.toggle("active", key === view);
  });

  elements.navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const titles = {
    dashboard: "Panel gerencial",
    movimientos: "Movimientos",
    diario: "Informe diario",
    semanal: "Informe semanal",
    mensual: "Resumen mensual",
    cartera: "Cartera clientes",
    listas: "Listas maestras",
    usuarios: "Usuarios",
  };

  elements.viewTitle.textContent = titles[view] || "Control administrativo";
}

function renderAll() {
  applyRoleVisibility();
  renderSidebar();
  renderDashboard();
  renderMovementsView();
  renderDailyView();
  renderWeeklyView();
  renderMonthlyView();
  renderPortfolioView();
  renderListsView();
  renderUsersView();
}

function renderSidebar() {
  const metrics = getMetrics(state.movements);
  const portfolioMetrics = getMetrics(getPortfolioMovements());

  elements.sidebarMetrics.innerHTML = `
    <div class="sidebar-stat">
      <span>Movimientos registrados</span>
      <strong>${metrics.registros}</strong>
    </div>
    <div class="sidebar-stat">
      <span>Caja neta</span>
      <strong>${formatCurrency(metrics.flujoNeto)}</strong>
    </div>
    <div class="sidebar-stat">
      <span>Cartera activa</span>
      <strong>${formatCurrency(portfolioMetrics.saldoPendiente)}</strong>
    </div>
  `;
}

function renderDashboard() {
  const { year: currentYear, month: currentMonth } = getCurrentDateParts();
  const monthMovements = state.movements.filter(
    (item) => item.ano === currentYear && item.mesNumero === currentMonth
  );
  const totalMetrics = getMetrics(state.movements);
  const gymMetrics = getMetrics(
    state.movements.filter((item) => item.linea === "Gimnasio")
  );
  const restaurantMetrics = getMetrics(
    state.movements.filter((item) => item.linea === "Restaurante")
  );
  const monthMetrics = getMetrics(monthMovements);

  elements.dashboardSummary.innerHTML = [
    createStatCard(
      "Consolidado",
      formatCurrency(totalMetrics.flujoNeto),
      `${totalMetrics.registros} registros · Cartera ${formatCurrency(totalMetrics.saldoPendiente)}`
    ),
    createStatCard(
      "Gimnasio",
      formatCurrency(gymMetrics.flujoNeto),
      `Ingresos ${formatCurrency(gymMetrics.ingresosCobrados)} · Gastos ${formatCurrency(gymMetrics.gastosPagados)}`
    ),
    createStatCard(
      "Restaurante",
      formatCurrency(restaurantMetrics.flujoNeto),
      `Ingresos ${formatCurrency(restaurantMetrics.ingresosCobrados)} · Gastos ${formatCurrency(restaurantMetrics.gastosPagados)}`
    ),
    createStatCard(
      `Mes actual · ${monthNames[currentMonth - 1]}`,
      formatCurrency(monthMetrics.flujoNeto),
      `Ingresos ${formatCurrency(monthMetrics.ingresosCobrados)} · Gastos ${formatCurrency(monthMetrics.gastosPagados)}`
    ),
  ].join("");

  const alerts = getSortedMovements(
    state.movements.filter((item) => item.saldoPendiente > 0)
  )
    .sort((a, b) => b.saldoPendiente - a.saldoPendiente)
    .slice(0, 5);

  elements.dashboardAlerts.innerHTML = alerts.length
    ? alerts
        .map(
          (item) => `
            <article class="list-item">
              <strong>${escapeHtml(item.cliente || "Sin cliente")} · ${formatCurrency(item.saldoPendiente)}</strong>
              <small>${escapeHtml(item.linea)} · ${escapeHtml(item.categoria)} · ${escapeHtml(item.descripcion)}</small>
            </article>
          `
        )
        .join("")
    : '<div class="empty-state">Aun no hay cartera pendiente.</div>';

  const recent = getSortedMovements(state.movements).slice(0, 5);
  elements.dashboardRecent.innerHTML = recent.length
    ? recent
        .map(
          (item) => `
            <article class="list-item">
              <strong>${escapeHtml(item.descripcion)}</strong>
              <small>${formatDate(item.fecha)} · ${escapeHtml(item.linea)} · ${escapeHtml(item.tipo)} · ${formatCurrency(item.abono)}</small>
            </article>
          `
        )
        .join("")
    : '<div class="empty-state">Todavia no hay movimientos registrados.</div>';

  const monthlyRows = buildMonthlyRows(currentYear);
  const maxValue = Math.max(
    1,
    ...monthlyRows.map((row) => Math.abs(row.utilidadTotal))
  );

  elements.dashboardMonthBars.innerHTML = monthlyRows
    .map((row) => {
      const width = `${Math.max(6, (Math.abs(row.utilidadTotal) / maxValue) * 100)}%`;
      return `
        <div class="month-bar">
          <strong>${row.mes}</strong>
          <div class="month-bar-track">
            <div class="month-bar-fill" style="width:${width}"></div>
          </div>
          <span class="${row.utilidadTotal >= 0 ? "positive" : "negative"}">${formatCurrency(row.utilidadTotal)}</span>
        </div>
      `;
    })
    .join("");
}

function renderMovementsView() {
  const filtered = getFilteredMovements();
  const metrics = getMetrics(filtered);

  if (isAssistantUser()) {
    elements.movementFeedback.textContent =
      "Como asistente operativo solo ves movimientos registrados en las ultimas 24 horas.";
  }

  elements.movementMetrics.innerHTML = `
    <div class="mini-stat"><span>Registros</span><strong>${metrics.registros}</strong></div>
    <div class="mini-stat"><span>Ingresos cobrados</span><strong>${formatCurrency(metrics.ingresosCobrados)}</strong></div>
    <div class="mini-stat"><span>Gastos pagados</span><strong>${formatCurrency(metrics.gastosPagados)}</strong></div>
    <div class="mini-stat"><span>Saldo pendiente</span><strong>${formatCurrency(metrics.saldoPendiente)}</strong></div>
  `;

  if (!filtered.length) {
    elements.movementTable.innerHTML = `
      <tr>
        <td colspan="13" class="empty-state">
          No hay movimientos para los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  elements.movementTable.innerHTML = getSortedMovements(filtered)
    .map(
      (item) => `
        <tr>
          <td>${formatDate(item.fecha)}</td>
          <td><span class="line-pill">${escapeHtml(item.linea)}</span></td>
          <td><span class="type-pill ${item.tipo === "Ingreso" ? "type-ingreso" : "type-gasto"}">${escapeHtml(item.tipo)}</span></td>
          <td>${escapeHtml(item.categoria)}</td>
          <td>${item.cliente ? escapeHtml(item.cliente) : "<span class='muted'>Sin cliente</span>"}</td>
          <td>${escapeHtml(item.descripcion)}</td>
          <td><span class="status-pill ${statusClass(item.estadoPago)}">${escapeHtml(item.estadoPago)}</span></td>
          <td>${escapeHtml(item.medioPago)}</td>
          <td>${formatCurrency(item.valorTotal)}</td>
          <td>${formatCurrency(item.abono)}</td>
          <td>${formatCurrency(item.saldoPendiente)}</td>
          <td class="${item.flujoNeto >= 0 ? "positive" : "negative"}">${formatCurrency(item.flujoNeto)}</td>
          <td>
            <div class="row-actions">
              <button class="table-button" type="button" data-edit-id="${item.id}">Editar</button>
              <button class="table-button danger" type="button" data-delete-id="${item.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderDailyView() {
  const date = elements.dailyDate.value || getCurrentIsoDate();
  const movements = state.movements.filter((item) => item.fecha === date);

  elements.dailyMetrics.innerHTML = renderReportCards(movements);
  elements.dailyNotes.value = state.notes.daily[date] || "";
}

function renderWeeklyView() {
  const start = elements.weeklyStart.value;
  const end = elements.weeklyEnd.value;
  const movements = state.movements.filter((item) => isBetween(item.fecha, start, end));

  elements.weeklyMetrics.innerHTML = renderReportCards(movements);
  elements.weeklyNotes.value = state.notes.weekly[weeklyKey(start, end)] || "";
}

function renderMonthlyView() {
  const year = Number(elements.monthlyYear.value) || getCurrentDateParts().year;
  const rows = buildMonthlyRows(year);
  const totals = rows.reduce(
    (acc, row) => {
      acc.ingresosGimnasio += row.ingresosGimnasio;
      acc.gastosGimnasio += row.gastosGimnasio;
      acc.ingresosRestaurante += row.ingresosRestaurante;
      acc.gastosRestaurante += row.gastosRestaurante;
      acc.utilidadTotal += row.utilidadTotal;
      return acc;
    },
    {
      ingresosGimnasio: 0,
      gastosGimnasio: 0,
      ingresosRestaurante: 0,
      gastosRestaurante: 0,
      utilidadTotal: 0,
    }
  );

  elements.monthlyAnnualCards.innerHTML = [
    createStatCard(
      "Ingresos anuales gimnasio",
      formatCurrency(totals.ingresosGimnasio),
      `Gastos ${formatCurrency(totals.gastosGimnasio)}`
    ),
    createStatCard(
      "Ingresos anuales restaurante",
      formatCurrency(totals.ingresosRestaurante),
      `Gastos ${formatCurrency(totals.gastosRestaurante)}`
    ),
    createStatCard(
      "Utilidad anual total",
      formatCurrency(totals.utilidadTotal),
      `Ano analizado ${year}`
    ),
  ].join("");

  elements.monthlyTable.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.mes}</td>
          <td>${formatCurrency(row.ingresosGimnasio)}</td>
          <td>${formatCurrency(row.gastosGimnasio)}</td>
          <td class="${row.utilidadGimnasio >= 0 ? "positive" : "negative"}">${formatCurrency(row.utilidadGimnasio)}</td>
          <td>${formatCurrency(row.ingresosRestaurante)}</td>
          <td>${formatCurrency(row.gastosRestaurante)}</td>
          <td class="${row.utilidadRestaurante >= 0 ? "positive" : "negative"}">${formatCurrency(row.utilidadRestaurante)}</td>
          <td>${formatCurrency(row.ingresosTotales)}</td>
          <td>${formatCurrency(row.gastosTotales)}</td>
          <td class="${row.utilidadTotal >= 0 ? "positive" : "negative"}">${formatCurrency(row.utilidadTotal)}</td>
        </tr>
      `
    )
    .join("");
}

function renderPortfolioView() {
  const portfolio = getSortedMovements(getPortfolioMovements());
  const gym = portfolio.filter((item) => item.linea === "Gimnasio");
  const restaurant = portfolio.filter((item) => item.linea === "Restaurante");

  elements.portfolioSummary.innerHTML = [
    createStatCard(
      "Cartera gimnasio",
      formatCurrency(sum(gym, "saldoPendiente")),
      `${gym.length} registros con saldo`
    ),
    createStatCard(
      "Cartera restaurante",
      formatCurrency(sum(restaurant, "saldoPendiente")),
      `${restaurant.length} registros con saldo`
    ),
    createStatCard(
      "Cartera total",
      formatCurrency(sum(portfolio, "saldoPendiente")),
      `Parciales ${portfolio.filter((item) => item.estadoPago === "Parcial").length} · Pendientes ${portfolio.filter((item) => item.estadoPago === "Pendiente").length}`
    ),
  ].join("");

  if (!portfolio.length) {
    elements.portfolioTable.innerHTML = `
      <tr>
        <td colspan="11" class="empty-state">
          No hay clientes con saldo pendiente.
        </td>
      </tr>
    `;
    return;
  }

  elements.portfolioTable.innerHTML = portfolio
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.linea)}</td>
          <td>${formatDate(item.fecha)}</td>
          <td>${item.cliente ? escapeHtml(item.cliente) : "<span class='muted'>Sin cliente</span>"}</td>
          <td>${escapeHtml(item.categoria)}</td>
          <td>${escapeHtml(item.descripcion)}</td>
          <td><span class="status-pill ${statusClass(item.estadoPago)}">${escapeHtml(item.estadoPago)}</span></td>
          <td>${formatCurrency(item.valorTotal)}</td>
          <td>${formatCurrency(item.abono)}</td>
          <td>${formatCurrency(item.saldoPendiente)}</td>
          <td>${escapeHtml(item.medioPago)}</td>
          <td>${item.observaciones ? escapeHtml(item.observaciones) : "<span class='muted'>Sin observaciones</span>"}</td>
        </tr>
      `
    )
    .join("");
}

function renderListsView() {
  [
    "gimnasioCategorias",
    "restauranteCategorias",
    "mediosPago",
    "estadosPago",
    "tipos",
  ].forEach((key) => {
    const container = document.getElementById(`list-${key}`);
    const items = state.lists[key] || [];

    container.innerHTML = items
      .map(
        (item) => `
          <span class="chip">
            ${escapeHtml(item)}
            <button type="button" data-remove-list="${key}" data-remove-value="${encodeURIComponent(item)}">x</button>
          </span>
        `
      )
      .join("");
  });
}

function renderUsersView() {
  if (!isAdminUser()) {
    elements.usersMetrics.innerHTML = "";
    elements.usersTable.innerHTML = "";
    return;
  }

  const users = Array.isArray(state.users) ? state.users : [];
  const activeUsers = users.filter((item) => item.isActive);
  const admins = users.filter((item) => item.role === "administrador");
  const assistants = users.filter(
    (item) => item.role === "asistente_operativo"
  );

  elements.usersMetrics.innerHTML = `
    <div class="mini-stat"><span>Total usuarios</span><strong>${users.length}</strong></div>
    <div class="mini-stat"><span>Activos</span><strong>${activeUsers.length}</strong></div>
    <div class="mini-stat"><span>Administradores</span><strong>${admins.length}</strong></div>
    <div class="mini-stat"><span>Asistentes operativos</span><strong>${assistants.length}</strong></div>
  `;

  if (!users.length) {
    elements.usersTable.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          Aún no hay usuarios registrados.
        </td>
      </tr>
    `;
    return;
  }

  elements.usersTable.innerHTML = users
    .map((user) => {
      const isCurrentUser = Number(user.id) === Number(authState.user?.id);
      const nextActive = user.isActive ? "false" : "true";
      const buttonLabel = user.isActive ? "Inactivar" : "Activar";
      const temporaryButtonDisabled = !user.isActive ? "disabled" : "";

      return `
        <tr>
          <td>${escapeHtml(user.username)}</td>
          <td>${user.fullName ? escapeHtml(user.fullName) : "<span class='muted'>Sin nombre</span>"}</td>
          <td><span class="role-pill">${escapeHtml(user.roleLabel || roleLabel(user.role))}</span></td>
          <td>
            <span class="status-pill ${user.isActive ? "user-status-active" : "user-status-inactive"}">${user.isActive ? "Activo" : "Inactivo"}</span>
            ${
              user.mustChangePassword
                ? '<div class="inline-hint">Cambio de contraseña pendiente</div>'
                : ""
            }
          </td>
          <td>${formatDateTime(user.createdAt)}</td>
          <td>${formatDateTime(user.updatedAt)}</td>
          <td>
            <div class="row-actions">
              <button
                class="table-button ${user.isActive ? "danger" : ""}"
                type="button"
                data-user-status-id="${user.id}"
                data-next-active="${nextActive}"
              >
                ${buttonLabel}
              </button>
              <button
                class="table-button"
                type="button"
                data-user-temp-password-id="${user.id}"
                data-user-temp-password-name="${escapeHtml(
                  user.fullName || user.username
                )}"
                ${temporaryButtonDisabled}
              >
                Temporal
              </button>
              ${
                isCurrentUser
                  ? "<span class='muted'>Sesión actual</span>"
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderReportCards(movements) {
  const gym = movements.filter((item) => item.linea === "Gimnasio");
  const restaurant = movements.filter((item) => item.linea === "Restaurante");

  return [
    createReportCard("Gimnasio", getMetrics(gym)),
    createReportCard("Restaurante", getMetrics(restaurant)),
    createReportCard("Consolidado", getMetrics(movements)),
  ].join("");
}

async function handleUserSubmit(event) {
  event.preventDefault();

  const payload = {
    fullName: elements.userFullName.value.trim(),
    username: elements.userUsername.value.trim(),
    role: elements.userRole.value,
    password: elements.userPassword.value,
  };

  if (!payload.username) {
    elements.userFeedback.textContent = "El usuario es obligatorio.";
    return;
  }

  if (!payload.role) {
    elements.userFeedback.textContent = "Selecciona un perfil para el usuario.";
    return;
  }

  if ((payload.password || "").length < 10) {
    elements.userFeedback.textContent =
      "La contraseña debe tener al menos 10 caracteres.";
    return;
  }

  try {
    await apiRequest("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    resetUserForm();
    await loadBootstrap();
    switchView("usuarios");
    elements.userFeedback.textContent =
      "Usuario creado correctamente. Debe cambiar la contraseña temporal en su primer ingreso.";
  } catch (error) {
    elements.userFeedback.textContent = error.message;
  }
}

async function handleUsersTableClick(event) {
  const temporaryUserId = event.target.dataset.userTempPasswordId;
  const temporaryUserName = decodeHtml(
    event.target.dataset.userTempPasswordName || ""
  );
  const userId = event.target.dataset.userStatusId;
  const nextActive = event.target.dataset.nextActive;

  if (temporaryUserId) {
    const suggestedPassword = generateTemporaryPassword();
    const temporaryPassword = window.prompt(
      `Escribe la contraseña temporal para ${
        temporaryUserName || "este usuario"
      }. Debe tener al menos 10 caracteres.`,
      suggestedPassword
    );

    if (temporaryPassword === null) {
      return;
    }

    if (temporaryPassword.trim().length < 10) {
      elements.userFeedback.textContent =
        "La contraseña temporal debe tener al menos 10 caracteres.";
      return;
    }

    try {
      await apiRequest(`/api/users/${temporaryUserId}/temporary-password`, {
        method: "POST",
        body: JSON.stringify({
          temporaryPassword: temporaryPassword.trim(),
        }),
      });
      await loadBootstrap();
      switchView("usuarios");
      elements.userFeedback.textContent = `Contraseña temporal asignada correctamente. Comparte esta clave con el usuario: ${temporaryPassword.trim()}`;
    } catch (error) {
      elements.userFeedback.textContent = error.message;
    }
    return;
  }

  if (!userId || !nextActive) {
    return;
  }

  const activate = nextActive === "true";
  const confirmed = window.confirm(
    activate
      ? "¿Deseas activar este usuario?"
      : "¿Deseas inactivar este usuario?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("usuarios");
    elements.userFeedback.textContent = activate
      ? "Usuario activado correctamente."
      : "Usuario inactivado correctamente.";
  } catch (error) {
    elements.userFeedback.textContent = error.message;
  }
}

async function handleMovementSubmit(event) {
  event.preventDefault();

  const payload = {
    linea: elements.linea.value,
    fecha: elements.fecha.value,
    tipo: elements.tipo.value,
    categoria: elements.categoria.value,
    cliente: elements.cliente.value.trim(),
    descripcion: elements.descripcion.value.trim(),
    estadoPago: elements.estadoPago.value,
    medioPago: elements.medioPago.value,
    valorTotal: Number(elements.valorTotal.value || 0),
    abono: Number(elements.abono.value || 0),
    observaciones: elements.observaciones.value.trim(),
  };

  const validation = validateMovement(payload);
  if (!validation.valid) {
    elements.movementFeedback.textContent = validation.message;
    return;
  }

  try {
    if (elements.movementId.value) {
      await apiRequest(`/api/movements/${elements.movementId.value}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest("/api/movements", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    resetMovementForm();
    await loadBootstrap();
    switchView("movimientos");
  } catch (error) {
    elements.movementFeedback.textContent = error.message;
  }
}

async function handleMovementTableClick(event) {
  const editId = event.target.dataset.editId;
  const deleteId = event.target.dataset.deleteId;

  if (editId) {
    const movement = state.movements.find((item) => String(item.id) === editId);
    if (!movement) {
      return;
    }

    elements.movementId.value = String(movement.id);
    elements.linea.value = movement.linea;
    syncCategoryOptions();
    elements.fecha.value = movement.fecha;
    elements.tipo.value = movement.tipo;
    elements.categoria.value = movement.categoria;
    elements.cliente.value = movement.cliente;
    elements.descripcion.value = movement.descripcion;
    elements.estadoPago.value = movement.estadoPago;
    elements.medioPago.value = movement.medioPago;
    elements.valorTotal.value = String(movement.valorTotal);
    elements.abono.value = String(movement.abono);
    elements.observaciones.value = movement.observaciones;
    elements.movementFormTitle.textContent = "Editar movimiento";
    elements.movementFeedback.textContent =
      "Estas editando un movimiento existente. Guarda para actualizarlo.";
    switchView("movimientos");
    elements.descripcion.focus();
    return;
  }

  if (deleteId) {
    const confirmed = window.confirm("Deseas eliminar este movimiento?");
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/api/movements/${deleteId}`, {
        method: "DELETE",
      });
      await loadBootstrap();
    } catch (error) {
      elements.movementFeedback.textContent = error.message;
    }
  }
}

async function handleListSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const key = form.dataset.listForm;
  const value = form.elements.value.value.trim();

  if (!value) {
    return;
  }

  try {
    await apiRequest(`/api/catalogs/${key}/items`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
    form.reset();
    await loadBootstrap();
  } catch (error) {
    setStatus(error.message);
  }
}

async function handleListRemoval(event) {
  const key = event.target.dataset.removeList;
  const value = event.target.dataset.removeValue;

  if (!key || !value) {
    return;
  }

  try {
    await apiRequest(
      `/api/catalogs/${key}/items?value=${encodeURIComponent(decodeURIComponent(value))}`,
      {
        method: "DELETE",
      }
    );
    await loadBootstrap();
  } catch (error) {
    setStatus(error.message);
  }
}

async function saveDailyNote() {
  const noteKey = elements.dailyDate.value || getCurrentIsoDate();

  try {
    await apiRequest("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        noteType: "daily",
        noteKey,
        content: elements.dailyNotes.value.trim(),
      }),
    });

    state.notes.daily[noteKey] = elements.dailyNotes.value.trim();
    setStatus("Observacion diaria guardada");
  } catch (error) {
    setStatus(error.message);
  }
}

async function saveWeeklyNote() {
  const noteKey = weeklyKey(elements.weeklyStart.value, elements.weeklyEnd.value);

  try {
    await apiRequest("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        noteType: "weekly",
        noteKey,
        content: elements.weeklyNotes.value.trim(),
      }),
    });

    state.notes.weekly[noteKey] = elements.weeklyNotes.value.trim();
    setStatus("Observacion semanal guardada");
  } catch (error) {
    setStatus(error.message);
  }
}

function getFilteredMovements() {
  const line = elements.filterLine.value;
  const status = elements.filterStatus.value;
  const query = elements.filterQuery.value.trim().toLowerCase();

  return state.movements.filter((item) => {
    const lineMatches = line === "Todas" || item.linea === line;
    const statusMatches = status === "Todos" || item.estadoPago === status;
    const queryMatches =
      !query ||
      [
        item.linea,
        item.tipo,
        item.categoria,
        item.cliente,
        item.descripcion,
        item.estadoPago,
        item.medioPago,
        item.observaciones,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return lineMatches && statusMatches && queryMatches;
  });
}

function getPortfolioMovements() {
  if (Array.isArray(state.portfolioMovements) && state.portfolioMovements.length) {
    return state.portfolioMovements.filter((item) => item.saldoPendiente > 0);
  }

  return state.movements.filter((item) => item.saldoPendiente > 0);
}

function getMetrics(movements) {
  const ingresos = movements.filter((item) => item.tipo === "Ingreso");
  const gastos = movements.filter((item) => item.tipo === "Gasto");

  return {
    registros: movements.length,
    ingresosCobrados: sum(ingresos, "abono"),
    gastosPagados: sum(gastos, "abono"),
    flujoNeto: sum(movements, "flujoNeto"),
    pagosCompletos: movements.filter((item) => item.estadoPago === "Pagado").length,
    pagosParciales: movements.filter((item) => item.estadoPago === "Parcial").length,
    pagosPendientes: movements.filter((item) => item.estadoPago === "Pendiente").length,
    saldoPendiente: sum(movements, "saldoPendiente"),
  };
}

function validateMovement(payload) {
  if (!payload.fecha) {
    return { valid: false, message: "Selecciona una fecha para el movimiento." };
  }

  if (!payload.descripcion) {
    return { valid: false, message: "La descripcion es obligatoria." };
  }

  if (payload.valorTotal <= 0) {
    return { valid: false, message: "El valor total debe ser mayor que cero." };
  }

  if (payload.abono < 0) {
    return { valid: false, message: "El abono no puede ser negativo." };
  }

  if (payload.abono > payload.valorTotal) {
    return {
      valid: false,
      message: "El abono no puede ser mayor que el valor total.",
    };
  }

  const rules = {
    Pagado: payload.abono === payload.valorTotal,
    Parcial: payload.abono > 0 && payload.abono < payload.valorTotal,
    Pendiente: payload.abono === 0,
  };

  if (!rules[payload.estadoPago]) {
    return {
      valid: false,
      message:
        "El estado de pago no coincide con el valor total y el abono.",
    };
  }

  return { valid: true };
}

function syncCategoryOptions() {
  const key =
    elements.linea.value === "Gimnasio"
      ? "gimnasioCategorias"
      : "restauranteCategorias";
  const previous = elements.categoria.value;

  fillSelect(elements.categoria, state.lists[key] || []);

  if ((state.lists[key] || []).includes(previous)) {
    elements.categoria.value = previous;
  }
}

function fillSelect(select, values) {
  select.innerHTML = values
    .map(
      (item) =>
        `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`
    )
    .join("");
}

function buildMonthlyRows(year) {
  return monthNames.map((mes, index) => {
    const monthMovements = state.movements.filter(
      (item) => item.ano === year && item.mesNumero === index + 1
    );
    const gym = monthMovements.filter((item) => item.linea === "Gimnasio");
    const restaurant = monthMovements.filter(
      (item) => item.linea === "Restaurante"
    );
    const gymMetrics = getMetrics(gym);
    const restaurantMetrics = getMetrics(restaurant);

    return {
      mes,
      ingresosGimnasio: gymMetrics.ingresosCobrados,
      gastosGimnasio: gymMetrics.gastosPagados,
      utilidadGimnasio: gymMetrics.flujoNeto,
      ingresosRestaurante: restaurantMetrics.ingresosCobrados,
      gastosRestaurante: restaurantMetrics.gastosPagados,
      utilidadRestaurante: restaurantMetrics.flujoNeto,
      ingresosTotales:
        gymMetrics.ingresosCobrados + restaurantMetrics.ingresosCobrados,
      gastosTotales:
        gymMetrics.gastosPagados + restaurantMetrics.gastosPagados,
      utilidadTotal: gymMetrics.flujoNeto + restaurantMetrics.flujoNeto,
    };
  });
}

function createStatCard(label, value, meta) {
  return `
    <article class="stat-card">
      <span class="label">${label}</span>
      <strong class="value">${value}</strong>
      <div class="meta">${meta}</div>
    </article>
  `;
}

function createReportCard(title, metrics) {
  return `
    <article class="report-card">
      <h4>${title}</h4>
      <div class="metric-list">
        ${createMetricRow("Ingresos cobrados", formatCurrency(metrics.ingresosCobrados))}
        ${createMetricRow("Gastos pagados", formatCurrency(metrics.gastosPagados))}
        ${createMetricRow("Flujo neto", formatCurrency(metrics.flujoNeto), metrics.flujoNeto >= 0 ? "positive" : "negative")}
        ${createMetricRow("Pagos completos", metrics.pagosCompletos)}
        ${createMetricRow("Pagos parciales", metrics.pagosParciales)}
        ${createMetricRow("Pagos pendientes", metrics.pagosPendientes)}
        ${createMetricRow("Saldo pendiente", formatCurrency(metrics.saldoPendiente))}
      </div>
    </article>
  `;
}

function createMetricRow(label, value, extraClass = "") {
  return `
    <div class="metric-row">
      <span>${label}</span>
      <strong class="${extraClass}">${value}</strong>
    </div>
  `;
}

function resetMovementForm() {
  elements.movementForm.reset();
  elements.movementId.value = "";
  elements.movementFormTitle.textContent = "Registrar movimiento";
  elements.fecha.value = getCurrentIsoDate();
  elements.linea.value = "Gimnasio";
  syncCategoryOptions();
  if ((state.lists.tipos || []).length) {
    elements.tipo.value = state.lists.tipos[0];
  }
  if ((state.lists.estadosPago || []).length) {
    elements.estadoPago.value = state.lists.estadosPago[0];
  }
  if ((state.lists.mediosPago || []).length) {
    elements.medioPago.value = state.lists.mediosPago[0];
  }
  elements.movementFeedback.textContent = isAssistantUser()
    ? "Como asistente operativo solo ves movimientos registrados en las ultimas 24 horas."
    : "El estado de pago se valida contra valor total y abono.";
}

function resetUserForm() {
  if (!elements.userForm) {
    return;
  }

  elements.userForm.reset();
  elements.userRole.value = "asistente_operativo";
  elements.userFeedback.textContent =
    "Solo el perfil administrador puede crear, inactivar y reasignar contraseñas temporales.";
}

function statusClass(status) {
  return {
    Pagado: "status-pagado",
    Parcial: "status-parcial",
    Pendiente: "status-pendiente",
  }[status];
}

function getSortedMovements(items) {
  return [...items].sort((a, b) => {
    if (a.fecha === b.fecha) {
      return String(b.actualizadoEn).localeCompare(String(a.actualizadoEn));
    }

    return String(b.fecha).localeCompare(String(a.fecha));
  });
}

function isBetween(date, start, end) {
  if (!start || !end) {
    return true;
  }

  return date >= start && date <= end;
}

function weeklyKey(start, end) {
  return `${start || "sin-inicio"}__${end || "sin-fin"}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = parseIsoDateAtMidday(value);

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toIsoDate(date) {
  const { year, month, day } = getTimeZoneDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCurrentIsoDate() {
  return toIsoDate(new Date());
}

function getCurrentDateParts() {
  return getTimeZoneDateParts(new Date());
}

function getCurrentTimeZoneDate() {
  const { year, month, day } = getCurrentDateParts();
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function getTimeZoneDateParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = Number(part.value);
    }
    return acc;
  }, {});

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function parseIsoDateAtMidday(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatClockTime(date) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function setStatus(message) {
  elements.saveStatus.textContent = message;
}

async function apiRequest(url, options = {}) {
  const {
    allowUnauthorized = false,
    headers = {},
    ...requestOptions
  } = options;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...requestOptions,
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !allowUnauthorized) {
      authState = {
        authenticated: false,
        user: null,
      };
      showLogin("Tu sesión expiró. Ingresa de nuevo para continuar.");
    }

    if (response.status === 403 && payload.mustChangePassword) {
      authState = {
        authenticated: true,
        user: {
          ...(authState.user || {}),
          mustChangePassword: true,
        },
      };
      showPasswordChange(
        payload.error ||
          "Debes cambiar la contraseña temporal para continuar."
      );
    }

    throw new Error(payload.error || "La solicitud al servidor fallo.");
  }

  return payload;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtml(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function generateTemporaryPassword() {
  const chunk = Math.random().toString(36).slice(2, 8);
  const digits = String(Math.floor(100 + Math.random() * 900));
  return `PetitTemp#${digits}${chunk.toUpperCase()}`;
}
