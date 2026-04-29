const emptyState = {
  lists: {
    gimnasioCategorias: [],
    restauranteCategorias: [],
    tipos: [],
    mediosPago: [],
    estadosPago: [],
  },
  catalogItems: {
    gimnasioCategorias: [],
    restauranteCategorias: [],
    tipos: [],
    mediosPago: [],
    estadosPago: [],
  },
  movements: [],
  boxMovements: [],
  portfolioMovements: [],
  collections: [],
  boxTransfers: [],
  clients: [],
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
const CATALOG_KEYS = [
  "gimnasioCategorias",
  "restauranteCategorias",
  "tipos",
  "mediosPago",
  "estadosPago",
];
const PROTECTED_CATALOG_GROUPS = new Set([
  "tipos",
  "estadosPago",
]);

let state = structuredClone(emptyState);
let activeView = "dashboard";
let activeClientPanel = "base";
let activeBoxPanel = "resumen";
let selectedCollectionMovementId = null;
let isSidebarOpen = false;
const COMPACT_SIDEBAR_BREAKPOINT = 1180;
let lastImportReport = null;
let authState = {
  authenticated: false,
  user: null,
};

const elements = {
  loginScreen: document.getElementById("login-screen"),
  passwordChangeScreen: document.getElementById("password-change-screen"),
  appShell: document.getElementById("app-shell"),
  sidebar: document.querySelector(".sidebar"),
  sidebarBackdrop: document.getElementById("sidebar-backdrop"),
  sidebarToggle: document.getElementById("sidebar-toggle"),
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
    cajas: document.getElementById("cajas-view"),
    diario: document.getElementById("diario-view"),
    semanal: document.getElementById("semanal-view"),
    mensual: document.getElementById("mensual-view"),
    cartera: document.getElementById("cartera-view"),
    listas: document.getElementById("listas-view"),
    usuarios: document.getElementById("usuarios-view"),
    importar: document.getElementById("importar-view"),
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
  dailyBoxReport: document.getElementById("daily-box-report"),
  weeklyBoxReport: document.getElementById("weekly-box-report"),
  monthlyBoxReport: document.getElementById("monthly-box-report"),
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
  assistantEditJustificationShell: document.getElementById(
    "assistant-edit-justification-shell"
  ),
  editJustification: document.getElementById("edit-justification"),
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
  boxesSummary: document.getElementById("boxes-summary"),
  boxTransferForm: document.getElementById("box-transfer-form"),
  boxTransferDate: document.getElementById("box-transfer-date"),
  boxTransferSource: document.getElementById("box-transfer-source"),
  boxTransferTarget: document.getElementById("box-transfer-target"),
  boxTransferAmount: document.getElementById("box-transfer-amount"),
  boxTransferNotes: document.getElementById("box-transfer-notes"),
  boxTransferFeedback: document.getElementById("box-transfer-feedback"),
  boxInsights: document.getElementById("box-insights"),
  boxFilter: document.getElementById("box-filter"),
  boxQuery: document.getElementById("box-query"),
  boxFilterSummary: document.getElementById("box-filter-summary"),
  boxLedgerTable: document.getElementById("box-ledger-table"),
  boxMenuButtons: [...document.querySelectorAll("[data-box-panel]")],
  boxPanels: {
    resumen: document.getElementById("box-panel-resumen"),
    traslados: document.getElementById("box-panel-traslados"),
    movimientos: document.getElementById("box-panel-movimientos"),
  },
  clientForm: document.getElementById("client-form"),
  clientId: document.getElementById("client-id"),
  clientFormTitle: document.getElementById("client-form-title"),
  clientName: document.getElementById("client-name"),
  clientDocument: document.getElementById("client-document"),
  clientPhone: document.getElementById("client-phone"),
  clientEmail: document.getElementById("client-email"),
  clientNotes: document.getElementById("client-notes"),
  clientFeedback: document.getElementById("client-feedback"),
  cancelClientEdit: document.getElementById("cancel-client-edit"),
  clientsMetrics: document.getElementById("clients-metrics"),
  clientsTable: document.getElementById("clients-table"),
  portfolioQuery: document.getElementById("portfolio-query"),
  portfolioSummary: document.getElementById("portfolio-summary"),
  portfolioTable: document.getElementById("portfolio-table"),
  collectionForm: document.getElementById("collection-form"),
  collectionMovementId: document.getElementById("collection-movement-id"),
  collectionContext: document.getElementById("collection-context"),
  collectionBalance: document.getElementById("collection-balance"),
  collectionDate: document.getElementById("collection-date"),
  collectionAmount: document.getElementById("collection-amount"),
  collectionMethod: document.getElementById("collection-method"),
  collectionNotes: document.getElementById("collection-notes"),
  collectionFeedback: document.getElementById("collection-feedback"),
  collectionHistory: document.getElementById("collection-history"),
  cancelCollection: document.getElementById("cancel-collection"),
  clientMenuButtons: [...document.querySelectorAll("[data-client-panel]")],
  clientPanels: {
    base: document.getElementById("client-panel-base"),
    cobros: document.getElementById("client-panel-cobros"),
    cartera: document.getElementById("client-panel-cartera"),
  },
  userForm: document.getElementById("user-form"),
  userFullName: document.getElementById("user-full-name"),
  userUsername: document.getElementById("user-username"),
  userRole: document.getElementById("user-role"),
  userPassword: document.getElementById("user-password"),
  userFeedback: document.getElementById("user-feedback"),
  usersMetrics: document.getElementById("users-metrics"),
  usersTable: document.getElementById("users-table"),
  excelImportForm: document.getElementById("excel-import-form"),
  excelImportFile: document.getElementById("excel-import-file"),
  excelImportLists: document.getElementById("excel-import-lists"),
  excelImportMovements: document.getElementById("excel-import-movements"),
  excelImportClients: document.getElementById("excel-import-clients"),
  excelImportFeedback: document.getElementById("excel-import-feedback"),
  excelImportSummary: document.getElementById("excel-import-summary"),
};

init();

async function init() {
  hydrateDefaultDates();
  bindEvents();
  syncSidebarLayout();
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
  addListener(elements.sidebarToggle, "click", toggleSidebar);
  addListener(elements.sidebarBackdrop, "click", () => setSidebarOpen(false));
  window.addEventListener("resize", syncSidebarLayout);
  document.addEventListener("keydown", handleGlobalKeydown);

  elements.navLinks.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  elements.clientMenuButtons.forEach((button) => {
    button.addEventListener("click", () => setClientPanel(button.dataset.clientPanel));
  });

  elements.boxMenuButtons.forEach((button) => {
    button.addEventListener("click", () => setBoxPanel(button.dataset.boxPanel));
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
  addListener(elements.valorTotal, "input", syncComputedPaymentStatus);
  addListener(elements.abono, "input", syncComputedPaymentStatus);
  addListener(elements.boxTransferForm, "submit", handleBoxTransferSubmit);

  [elements.filterLine, elements.filterStatus, elements.filterQuery].forEach(
    (input) => input.addEventListener("input", renderMovementsView)
  );
  [elements.boxFilter, elements.boxQuery].forEach((input) =>
    addListener(input, "input", renderBoxesView)
  );

  elements.dailyDate.addEventListener("input", renderDailyView);
  elements.weeklyStart.addEventListener("input", renderWeeklyView);
  elements.weeklyEnd.addEventListener("input", renderWeeklyView);
  elements.monthlyYear.addEventListener("input", renderMonthlyView);

  elements.saveDailyNotes.addEventListener("click", saveDailyNote);
  elements.saveWeeklyNotes.addEventListener("click", saveWeeklyNote);
  addListener(elements.movementTable, "click", handleMovementTableClick);
  addListener(elements.clientForm, "submit", handleClientSubmit);
  addListener(elements.cancelClientEdit, "click", resetClientForm);
  addListener(elements.clientsTable, "click", handleClientsTableClick);
  addListener(elements.portfolioQuery, "input", renderPortfolioView);
  addListener(elements.portfolioTable, "click", handlePortfolioTableClick);
  addListener(elements.collectionForm, "submit", handleCollectionSubmit);
  addListener(elements.cancelCollection, "click", resetCollectionSelection);
  addListener(elements.userForm, "submit", handleUserSubmit);
  addListener(elements.usersTable, "click", handleUsersTableClick);
  addListener(elements.excelImportForm, "submit", handleExcelImportSubmit);

  document
    .querySelectorAll("[data-list-form]")
    .forEach((form) => form.addEventListener("submit", handleListSubmit));

  addListener(document.getElementById("listas-view"), "click", handleCatalogItemAction);
}

function addListener(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

function usesCompactSidebar() {
  return window.innerWidth <= COMPACT_SIDEBAR_BREAKPOINT;
}

function syncSidebarLayout() {
  const useCompactSidebar = usesCompactSidebar();

  if (!useCompactSidebar) {
    isSidebarOpen = false;
  }

  elements.appShell.classList.toggle("sidebar-drawer", useCompactSidebar);
  elements.appShell.classList.toggle(
    "sidebar-open",
    useCompactSidebar && isSidebarOpen
  );
  document.body.classList.toggle(
    "sidebar-open-lock",
    useCompactSidebar &&
      isSidebarOpen &&
      !elements.appShell.classList.contains("is-hidden")
  );

  if (elements.sidebarToggle) {
    elements.sidebarToggle.classList.toggle("is-hidden", !useCompactSidebar);
    elements.sidebarToggle.setAttribute(
      "aria-expanded",
      String(useCompactSidebar && isSidebarOpen)
    );
    elements.sidebarToggle.setAttribute(
      "aria-label",
      useCompactSidebar && isSidebarOpen
        ? "Cerrar menu lateral"
        : "Abrir menu lateral"
    );
  }
}

function setSidebarOpen(value) {
  isSidebarOpen = usesCompactSidebar() ? Boolean(value) : false;
  syncSidebarLayout();
}

function toggleSidebar() {
  setSidebarOpen(!isSidebarOpen);
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape") {
    setSidebarOpen(false);
  }
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
  selectedCollectionMovementId = null;
  elements.passwordChangeForm.reset();
  showLogin("Sesión cerrada. Ingresa de nuevo para continuar.");
}

async function loadBootstrap() {
  setStatus("Conectando a PostgreSQL...");

  try {
    const previousSelectedCollectionId = selectedCollectionMovementId;
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
      catalogItems: {
        ...structuredClone(emptyState).catalogItems,
        ...(data.catalogItems || {}),
      },
      portfolioMovements: normalizeMovements(data.portfolioMovements),
      boxMovements: normalizeMovements(data.boxMovements),
      collections: normalizeCollections(data.collections),
      boxTransfers: normalizeBoxTransfers(data.boxTransfers),
      clients: Array.isArray(data.clients) ? data.clients : [],
      users: Array.isArray(usersPayload?.users) ? usersPayload.users : [],
      notes: {
        daily: data.notes?.daily || {},
        weekly: data.notes?.weekly || {},
      },
      movements: normalizeMovements(data.movements),
    };

    selectedCollectionMovementId = state.portfolioMovements.some(
      (item) => String(item.id) === String(previousSelectedCollectionId)
    )
      ? String(previousSelectedCollectionId)
      : null;

    hydrateStaticOptions();
    if (!elements.movementId.value) {
      resetMovementForm();
    }
    resetClientForm();
    syncCollectionSelectionState();
    resetBoxTransferForm();
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
  setSidebarOpen(false);
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
  syncSidebarLayout();
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
  setSidebarOpen(false);
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
      "cajas",
      "diario",
      "semanal",
      "mensual",
      "cartera",
      "listas",
      "usuarios",
      "importar",
    ];
  }

  if (isAssistantUser()) {
    return ["movimientos", "cajas", "cartera"];
  }

  return [];
}

function defaultViewForCurrentUser() {
  return isAssistantUser() ? "movimientos" : "dashboard";
}

function defaultClientPanelForCurrentUser() {
  return isAssistantUser() ? "cartera" : "base";
}

function defaultBoxPanelForCurrentUser() {
  return "resumen";
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

function isCatalogGroupProtected(group) {
  return PROTECTED_CATALOG_GROUPS.has(String(group || ""));
}

function hydrateDefaultDates() {
  const today = getCurrentIsoDate();
  elements.fecha.value = today;
  elements.dailyDate.value = today;
  if (elements.collectionDate) {
    elements.collectionDate.value = today;
  }
  if (elements.boxTransferDate) {
    elements.boxTransferDate.value = today;
  }
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
  const previousCollectionMethod = elements.collectionMethod?.value || "";
  const previousTransferSource = elements.boxTransferSource?.value || "";
  const previousTransferTarget = elements.boxTransferTarget?.value || "";
  const previousBoxFilter = elements.boxFilter?.value || "Todas";
  const previousCategory = elements.categoria.value;

  fillSelect(elements.tipo, state.lists.tipos, {
    includeValue: previousType,
  });
  fillSelect(elements.estadoPago, state.lists.estadosPago, {
    includeValue: previousPaymentStatus,
  });
  fillSelect(elements.medioPago, state.lists.mediosPago, {
    includeValue: previousPaymentMethod,
  });
  if (elements.collectionMethod) {
    fillSelect(elements.collectionMethod, state.lists.mediosPago, {
      includeValue: previousCollectionMethod,
    });
  }
  if (elements.boxTransferSource) {
    fillSelect(elements.boxTransferSource, state.lists.mediosPago, {
      includeValue: previousTransferSource,
    });
  }
  if (elements.boxTransferTarget) {
    fillSelect(elements.boxTransferTarget, state.lists.mediosPago, {
      includeValue: previousTransferTarget,
    });
  }
  fillBoxFilterOptions(previousBoxFilter);
  fillSelect(elements.filterStatus, ["Todos", ...state.lists.estadosPago]);
  fillClientOptions();
  syncCategoryOptions({
    includeValue: previousCategory,
  });

  if (getAvailableSelectValues(elements.tipo).includes(previousType)) {
    elements.tipo.value = previousType;
  }

  if (getAvailableSelectValues(elements.estadoPago).includes(previousPaymentStatus)) {
    elements.estadoPago.value = previousPaymentStatus;
  }

  if (getAvailableSelectValues(elements.medioPago).includes(previousPaymentMethod)) {
    elements.medioPago.value = previousPaymentMethod;
  }

  if (
    elements.collectionMethod &&
    getAvailableSelectValues(elements.collectionMethod).includes(previousCollectionMethod)
  ) {
    elements.collectionMethod.value = previousCollectionMethod;
  }

  if (
    elements.boxTransferSource &&
    getAvailableSelectValues(elements.boxTransferSource).includes(previousTransferSource)
  ) {
    elements.boxTransferSource.value = previousTransferSource;
  }

  if (
    elements.boxTransferTarget &&
    getAvailableSelectValues(elements.boxTransferTarget).includes(previousTransferTarget)
  ) {
    elements.boxTransferTarget.value = previousTransferTarget;
  }

  if (["Todos", ...state.lists.estadosPago].includes(previousStatus)) {
    elements.filterStatus.value = previousStatus;
  }

  syncComputedPaymentStatus();
}

function switchView(view, options = {}) {
  if (!hasViewAccess(view)) {
    view = defaultViewForCurrentUser();
  }

  if (view === "cartera") {
    activeClientPanel = normalizeClientPanel(
      options.clientPanel || activeClientPanel || defaultClientPanelForCurrentUser()
    );
  }

  if (view === "cajas") {
    activeBoxPanel = normalizeBoxPanel(
      options.boxPanel || activeBoxPanel || defaultBoxPanelForCurrentUser()
    );
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
    cajas: "Cajas",
    diario: "Informe diario",
    semanal: "Informe semanal",
    mensual: "Resumen mensual",
    cartera: "Clientes",
    listas: "Listas maestras",
    usuarios: "Usuarios",
    importar: "Importar Excel",
  };

  elements.viewTitle.textContent = titles[view] || "Control administrativo";

  if (view === "cartera") {
    renderClientPanels();
  }

  if (view === "cajas") {
    renderBoxPanels();
  }

  setSidebarOpen(false);
}

function normalizeClientPanel(panel) {
  return ["base", "cobros", "cartera"].includes(panel)
    ? panel
    : defaultClientPanelForCurrentUser();
}

function setClientPanel(panel) {
  activeClientPanel = normalizeClientPanel(panel);

  if (activeView === "cartera") {
    renderClientPanels();
    return;
  }

  switchView("cartera", {
    clientPanel: activeClientPanel,
  });
}

function normalizeBoxPanel(panel) {
  return ["resumen", "traslados", "movimientos"].includes(panel)
    ? panel
    : defaultBoxPanelForCurrentUser();
}

function setBoxPanel(panel) {
  activeBoxPanel = normalizeBoxPanel(panel);

  if (activeView === "cajas") {
    renderBoxPanels();
    return;
  }

  switchView("cajas", {
    boxPanel: activeBoxPanel,
  });
}

function renderBoxPanels() {
  const normalizedPanel = normalizeBoxPanel(activeBoxPanel);
  activeBoxPanel = normalizedPanel;

  elements.boxMenuButtons.forEach((button) => {
    const isActive = button.dataset.boxPanel === normalizedPanel;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(elements.boxPanels).forEach(([key, panel]) => {
    if (!panel) {
      return;
    }

    panel.classList.toggle("active", key === normalizedPanel);
    panel.classList.toggle("is-hidden", key !== normalizedPanel);
  });
}

function renderClientPanels() {
  const normalizedPanel = normalizeClientPanel(activeClientPanel);
  activeClientPanel = normalizedPanel;

  elements.clientMenuButtons.forEach((button) => {
    const isActive = button.dataset.clientPanel === normalizedPanel;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(elements.clientPanels).forEach(([key, panel]) => {
    if (!panel) {
      return;
    }

    panel.classList.toggle("active", key === normalizedPanel);
    panel.classList.toggle("is-hidden", key !== normalizedPanel);
  });
}

function renderAll() {
  applyRoleVisibility();
  renderSidebar();
  renderDashboard();
  renderMovementsView();
  renderBoxesView();
  renderDailyView();
  renderWeeklyView();
  renderMonthlyView();
  renderPortfolioView();
  renderListsView();
  renderUsersView();
  renderImportView();
  applyStackTableLabels(elements.appShell);
}

function renderSidebar() {
  const metrics = getMetrics(state.movements);
  const portfolioMetrics = getMetrics(getPortfolioMovements());
  const boxSummaries = getPaymentBoxSummaries();

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
    <div class="sidebar-stat">
      <span>Disponible en cajas</span>
      <strong>${formatCurrency(sum(boxSummaries, "balance"))}</strong>
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
  const boxSummaries = getPaymentBoxSummaries();

  elements.dashboardSummary.innerHTML = [
    createStatCard(
      "Consolidado",
      formatCurrency(totalMetrics.flujoNeto),
      `${totalMetrics.registros} registros · Cartera ${formatCurrency(totalMetrics.saldoPendiente)}`
    ),
    createStatCard(
      "Gimnasio",
      formatCurrency(gymMetrics.flujoNeto),
      `Ingresos ${formatCurrency(gymMetrics.ingresosCobrados)} · Salidas ${formatCurrency(gymMetrics.gastosPagados)}`
    ),
    createStatCard(
      "Restaurante",
      formatCurrency(restaurantMetrics.flujoNeto),
      `Ingresos ${formatCurrency(restaurantMetrics.ingresosCobrados)} · Salidas ${formatCurrency(restaurantMetrics.gastosPagados)}`
    ),
    createStatCard(
      `Mes actual · ${monthNames[currentMonth - 1]}`,
      formatCurrency(monthMetrics.flujoNeto),
      `Ingresos ${formatCurrency(monthMetrics.ingresosCobrados)} · Salidas ${formatCurrency(monthMetrics.gastosPagados)}`
    ),
    createStatCard(
      "Disponible en cajas",
      formatCurrency(sum(boxSummaries, "balance")),
      `${boxSummaries.filter((item) => item.isActive).length} cajas activas`
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
      elements.movementId.value
        ? "Como asistente operativo puedes ajustar movimientos visibles de las ultimas 24 horas, pero debes justificar el cambio."
        : `Como asistente operativo estas viendo ${state.movements.length} movimientos registrados en las ultimas 24 horas.`;
  } else {
    elements.movementFeedback.textContent = elements.movementId.value
      ? "Estas editando un movimiento existente. Guarda para actualizarlo."
      : `Se cargaron ${state.movements.length} movimientos registrados en el sistema.`;
  }

  elements.movementMetrics.innerHTML = `
    <div class="mini-stat"><span>Registros</span><strong>${metrics.registros}</strong></div>
    <div class="mini-stat"><span>Ingresos cobrados</span><strong>${formatCurrency(metrics.ingresosCobrados)}</strong></div>
    <div class="mini-stat"><span>Salidas pagadas</span><strong>${formatCurrency(metrics.gastosPagados)}</strong></div>
    <div class="mini-stat"><span>Saldo pendiente</span><strong>${formatCurrency(metrics.saldoPendiente)}</strong></div>
  `;

  if (!filtered.length) {
    const emptyMessage = isAssistantUser()
      ? state.movements.length
        ? "No hay movimientos recientes que coincidan con los filtros seleccionados."
        : "No tienes movimientos registrados en las ultimas 24 horas para este perfil."
      : "No hay movimientos para los filtros seleccionados.";

    elements.movementTable.innerHTML = `
      <tr>
        <td colspan="13" class="empty-state">
          ${emptyMessage}
        </td>
      </tr>
    `;
    applyStackTableLabels(elements.appShell);
    return;
  }

  elements.movementTable.innerHTML = getSortedMovements(filtered)
    .map(
      (item) => `
        <tr>
          ${tableCell("Fecha", formatDate(item.fecha))}
          ${tableCell("Linea", `<span class="line-pill">${escapeHtml(item.linea)}</span>`)}
          ${tableCell(
            "Tipo",
            `<span class="type-pill ${item.tipo === "Ingreso" ? "type-ingreso" : "type-gasto"}">${escapeHtml(item.tipo)}</span>`
          )}
          ${tableCell("Categoria", escapeHtml(item.categoria))}
          ${tableCell(
            "Cliente",
            item.cliente
              ? escapeHtml(item.cliente)
              : "<span class='muted'>Sin cliente</span>"
          )}
          ${tableCell("Descripcion", escapeHtml(item.descripcion))}
          ${tableCell(
            "Estado",
            `<span class="status-pill ${statusClass(item.estadoPago)}">${escapeHtml(item.estadoPago)}</span>`
          )}
          ${tableCell("Caja", escapeHtml(item.medioPago))}
          ${tableCell("Total", formatCurrency(item.valorTotal))}
          ${tableCell("Abono", formatCurrency(item.abono))}
          ${tableCell("Saldo", formatCurrency(item.saldoPendiente))}
          ${tableCell(
            "Flujo",
            formatCurrency(item.flujoNeto),
            item.flujoNeto >= 0 ? "positive" : "negative"
          )}
          ${tableCell(
            "Acciones",
            `
            <div class="row-actions">
              <button
                class="table-button icon-button"
                type="button"
                data-edit-id="${item.id}"
                title="Editar movimiento"
                aria-label="Editar movimiento"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                  <path d="m12 6 4 4"></path>
                </svg>
              </button>
              <button
                class="table-button danger icon-button"
                type="button"
                data-delete-id="${item.id}"
                title="Eliminar movimiento"
                aria-label="Eliminar movimiento"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 7h16"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                  <path d="M6 7l1 12h10l1-12"></path>
                  <path d="M9 7V4h6v3"></path>
                </svg>
              </button>
            </div>
          `
          )}
        </tr>
      `
    )
    .join("");
  applyStackTableLabels(elements.appShell);
}

function renderBoxesView() {
  renderBoxPanels();

  const summaries = getPaymentBoxSummaries();
  const ledgerEntries = getFilteredBoxLedgerEntries();
  const totalBalance = sum(summaries, "balance");
  const totalInflows = sum(summaries, "inflows");
  const totalOutflows = sum(summaries, "outflows");
  const activeBoxes = summaries.filter((item) => item.isActive);

  elements.boxesSummary.innerHTML = summaries.length
    ? summaries
        .map((box) =>
          createStatCard(
            box.name,
            formatCurrency(box.balance),
            `${box.entriesCount} movimientos · Entradas ${formatCurrency(box.inflows)} · Salidas ${formatCurrency(box.outflows)}${box.isActive ? "" : " · Inactiva"}`
          )
        )
        .join("")
    : '<div class="empty-state">Aun no hay cajas disponibles para consultar.</div>';

  elements.boxInsights.innerHTML = `
    <div class="mini-stat"><span>Cajas activas</span><strong>${activeBoxes.length}</strong></div>
    <div class="mini-stat"><span>Saldo disponible</span><strong>${formatCurrency(totalBalance)}</strong></div>
    <div class="mini-stat"><span>Entradas acumuladas</span><strong>${formatCurrency(totalInflows)}</strong></div>
    <div class="mini-stat"><span>Salidas acumuladas</span><strong>${formatCurrency(totalOutflows)}</strong></div>
    <div class="mini-stat"><span>Traslados registrados</span><strong>${state.boxTransfers.length}</strong></div>
  `;

  const filteredBalance = ledgerEntries.reduce(
    (acc, entry) => acc + Number(entry.amount || 0),
    0
  );
  const filteredInflows = ledgerEntries.reduce(
    (acc, entry) => acc + Number(entry.inflow || 0),
    0
  );
  const filteredOutflows = ledgerEntries.reduce(
    (acc, entry) => acc + Number(entry.outflow || 0),
    0
  );

  elements.boxFilterSummary.innerHTML = `
    <div class="mini-stat"><span>Movimientos visibles</span><strong>${ledgerEntries.length}</strong></div>
    <div class="mini-stat"><span>Entradas</span><strong>${formatCurrency(filteredInflows)}</strong></div>
    <div class="mini-stat"><span>Salidas</span><strong>${formatCurrency(filteredOutflows)}</strong></div>
    <div class="mini-stat"><span>Impacto neto</span><strong>${formatCurrency(filteredBalance)}</strong></div>
  `;

  if (!ledgerEntries.length) {
    elements.boxLedgerTable.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          No hay movimientos de caja para los filtros seleccionados.
        </td>
      </tr>
    `;
    applyStackTableLabels(elements.appShell);
    return;
  }

  elements.boxLedgerTable.innerHTML = ledgerEntries
    .map(
      (entry) => `
        <tr>
          ${tableCell("Fecha", formatDate(entry.date))}
          ${tableCell("Caja", escapeHtml(entry.boxName))}
          ${tableCell("Tipo", escapeHtml(entry.entryType))}
          ${tableCell("Referencia", escapeHtml(entry.reference))}
          ${tableCell("Detalle", escapeHtml(entry.detail))}
          ${tableCell("Registrado por", escapeHtml(entry.registeredBy || "Sistema"))}
          ${tableCell(
            "Entrada",
            entry.inflow ? formatCurrency(entry.inflow) : "<span class='muted'>-</span>",
            "positive"
          )}
          ${tableCell(
            "Salida",
            entry.outflow ? formatCurrency(entry.outflow) : "<span class='muted'>-</span>",
            "negative"
          )}
        </tr>
      `
    )
    .join("");
  applyStackTableLabels(elements.appShell);
}

function renderBoxBalanceReport(container, entries, emptyMessage) {
  if (!container) {
    return;
  }

  const summaries = getPaymentBoxSummaries();
  const grouped = new Map();

  entries.forEach((entry) => {
    const current = grouped.get(entry.boxName) || {
      inflows: 0,
      outflows: 0,
      net: 0,
    };

    current.inflows += Number(entry.inflow || 0);
    current.outflows += Number(entry.outflow || 0);
    current.net += Number(entry.amount || 0);
    grouped.set(entry.boxName, current);
  });

  const relevant = summaries.filter(
    (summary) => summary.isActive || grouped.has(summary.name) || summary.balance !== 0
  );

  if (!relevant.length) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = relevant
    .map((summary) => {
      const period = grouped.get(summary.name) || {
        inflows: 0,
        outflows: 0,
        net: 0,
      };

      return createStatCard(
        summary.name,
        formatCurrency(summary.balance),
        `Periodo ${formatCurrency(period.net)} · Entradas ${formatCurrency(period.inflows)} · Salidas ${formatCurrency(period.outflows)}`
      );
    })
    .join("");
}

function renderDailyView() {
  const date = elements.dailyDate.value || getCurrentIsoDate();
  const movements = state.movements.filter((item) => item.fecha === date);

  elements.dailyMetrics.innerHTML = renderReportCards(movements);
  renderBoxBalanceReport(
    elements.dailyBoxReport,
    getBoxLedgerEntries().filter((entry) => entry.date === date),
    "No hubo movimientos de caja en la fecha seleccionada."
  );
  elements.dailyNotes.value = state.notes.daily[date] || "";
}

function renderWeeklyView() {
  const start = elements.weeklyStart.value;
  const end = elements.weeklyEnd.value;
  const movements = state.movements.filter((item) => isBetween(item.fecha, start, end));

  elements.weeklyMetrics.innerHTML = renderReportCards(movements);
  renderBoxBalanceReport(
    elements.weeklyBoxReport,
    getBoxLedgerEntries().filter((entry) => isBetween(entry.date, start, end)),
    "No hubo movimientos de caja en el rango semanal seleccionado."
  );
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
      `Salidas ${formatCurrency(totals.gastosGimnasio)}`
    ),
    createStatCard(
      "Ingresos anuales restaurante",
      formatCurrency(totals.ingresosRestaurante),
      `Salidas ${formatCurrency(totals.gastosRestaurante)}`
    ),
    createStatCard(
      "Utilidad anual total",
      formatCurrency(totals.utilidadTotal),
      `Ano analizado ${year}`
    ),
  ].join("");

  renderBoxBalanceReport(
    elements.monthlyBoxReport,
    getBoxLedgerEntries().filter((entry) => {
      const normalizedDate = normalizeDateOnly(entry.date);
      return normalizedDate.startsWith(`${year}-`);
    }),
    "No hubo movimientos de caja en el año consultado."
  );

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
  renderClientPanels();
  renderClientsAdmin();
  renderCollectionManager();

  const portfolio = getSortedMovements(getFilteredPortfolioMovements());
  const portfolioQuery = getPortfolioSearchQuery();
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
      portfolioQuery
        ? `${portfolio.length} coincidencias encontradas`
        : `Parciales ${portfolio.filter((item) => item.estadoPago === "Parcial").length} · Pendientes ${portfolio.filter((item) => item.estadoPago === "Pendiente").length}`
    ),
  ].join("");

  if (!portfolio.length) {
    elements.portfolioTable.innerHTML = `
      <tr>
        <td colspan="12" class="empty-state">
          ${
            portfolioQuery
              ? "No hay cuentas pendientes que coincidan con la busqueda."
              : "No hay clientes con saldo pendiente."
          }
        </td>
      </tr>
    `;
    applyStackTableLabels(elements.appShell);
    return;
  }

  elements.portfolioTable.innerHTML = portfolio
    .map(
      (item) => `
        <tr class="${
          String(item.id) === String(selectedCollectionMovementId)
            ? "portfolio-row-selected"
            : ""
        }">
          ${tableCell("Linea", escapeHtml(item.linea))}
          ${tableCell("Fecha", formatDate(item.fecha))}
          ${tableCell(
            "Cliente",
            item.cliente
              ? escapeHtml(item.cliente)
              : "<span class='muted'>Sin cliente</span>"
          )}
          ${tableCell("Categoria", escapeHtml(item.categoria))}
          ${tableCell("Descripcion", escapeHtml(item.descripcion))}
          ${tableCell(
            "Estado",
            `<span class="status-pill ${statusClass(item.estadoPago)}">${escapeHtml(item.estadoPago)}</span>`
          )}
          ${tableCell("Total", formatCurrency(item.valorTotal))}
          ${tableCell("Abono", formatCurrency(item.abono))}
          ${tableCell("Saldo", formatCurrency(item.saldoPendiente))}
          ${tableCell("Caja", escapeHtml(item.medioPago))}
          ${tableCell(
            "Observaciones",
            item.observaciones
              ? escapeHtml(item.observaciones)
              : "<span class='muted'>Sin observaciones</span>"
          )}
          ${tableCell(
            "Acciones",
            `
            ${
              item.tipo === "Ingreso"
                ? `
                  <button
                    class="table-button"
                    type="button"
                    data-collect-id="${item.id}"
                  >
                    Cobrar
                  </button>
                `
                : "<span class='muted'>No aplica</span>"
            }
          `
          )}
        </tr>
      `
    )
    .join("");
  applyStackTableLabels(elements.appShell);
}

function renderCollectionManager() {
  if (!elements.collectionForm) {
    return;
  }

  const selectedMovement = getSelectedCollectionMovement();
  const collectionHistory = selectedMovement
    ? getCollectionHistory(selectedMovement.id)
    : [];

  if (!selectedMovement) {
    elements.collectionMovementId.value = "";
    elements.collectionContext.innerHTML = `
      <strong>Sin selección activa</strong>
      <small>Elige una cuenta pendiente desde la tabla de cartera para registrar el cobro.</small>
    `;
    elements.collectionBalance.innerHTML = `
      <div class="empty-state collection-empty">
        Aquí verás el saldo pendiente, el total de la cuenta y el avance de pago.
      </div>
    `;
    elements.collectionHistory.innerHTML = `
      <div class="empty-state">
        Aquí aparecerán los cobros del movimiento que selecciones.
      </div>
    `;
    elements.collectionFeedback.textContent =
      "El cobro actualiza el saldo pendiente y guarda el historial del pago.";
    setCollectionFormEnabled(false);
    return;
  }

  elements.collectionMovementId.value = String(selectedMovement.id);
  elements.collectionContext.innerHTML = `
    <strong>${escapeHtml(selectedMovement.cliente || "Cliente sin nombre")}</strong>
    <small>${escapeHtml(selectedMovement.descripcion)} · ${escapeHtml(
      selectedMovement.categoria
    )}</small>
  `;
  elements.collectionBalance.innerHTML = `
    <div class="mini-stats compact-mini-stats">
      <div class="mini-stat"><span>Total cuenta</span><strong>${formatCurrency(
        selectedMovement.valorTotal
      )}</strong></div>
      <div class="mini-stat"><span>Cobrado acumulado</span><strong>${formatCurrency(
        selectedMovement.abono
      )}</strong></div>
      <div class="mini-stat"><span>Saldo pendiente</span><strong>${formatCurrency(
        selectedMovement.saldoPendiente
      )}</strong></div>
      <div class="mini-stat"><span>Último estado</span><strong>${escapeHtml(
        selectedMovement.estadoPago
      )}</strong></div>
    </div>
  `;
  elements.collectionHistory.innerHTML = collectionHistory.length
    ? collectionHistory
        .map(
          (item) => `
            <article class="list-item">
              <strong>${formatCurrency(item.amount)} · ${escapeHtml(
                item.paymentMethod
              )}</strong>
              <small>${formatDate(item.collectionDate)} · ${escapeHtml(
                item.registeredBy || "Sistema"
              )}</small>
              <small>${
                item.notes
                  ? escapeHtml(item.notes)
                  : "<span class='muted'>Sin observaciones</span>"
              }</small>
            </article>
          `
        )
        .join("")
    : `
      <div class="empty-state">
        Este movimiento todavía no tiene cobros registrados.
      </div>
    `;
  elements.collectionFeedback.textContent = `Registrarás un cobro sobre un saldo pendiente de ${formatCurrency(
    selectedMovement.saldoPendiente
  )}.`;
  setCollectionFormEnabled(true);
}

function renderClientsAdmin() {
  if (!elements.clientsMetrics || !elements.clientsTable) {
    return;
  }

  const clients = Array.isArray(state.clients) ? state.clients : [];
  const activeClients = clients.filter((item) => item.isActive);

  elements.clientsMetrics.innerHTML = `
    <div class="mini-stat"><span>Total clientes</span><strong>${clients.length}</strong></div>
    <div class="mini-stat"><span>Activos</span><strong>${activeClients.length}</strong></div>
    <div class="mini-stat"><span>Inactivos</span><strong>${Math.max(clients.length - activeClients.length, 0)}</strong></div>
    <div class="mini-stat"><span>Con saldo pendiente</span><strong>${getPortfolioMovements().filter((item) => item.cliente).length}</strong></div>
  `;

  if (!clients.length) {
    elements.clientsTable.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Aún no hay clientes registrados.
        </td>
      </tr>
    `;
    return;
  }

  elements.clientsTable.innerHTML = clients
    .map((client) => {
      const nextActive = client.isActive ? "false" : "true";
      const statusTitle = client.isActive ? "Inactivar cliente" : "Activar cliente";

      return `
        <tr>
          <td>${escapeHtml(client.fullName)}</td>
          <td>${client.documentNumber ? escapeHtml(client.documentNumber) : "<span class='muted'>Sin documento</span>"}</td>
          <td>${client.phone ? escapeHtml(client.phone) : "<span class='muted'>Sin teléfono</span>"}</td>
          <td>${client.email ? escapeHtml(client.email) : "<span class='muted'>Sin correo</span>"}</td>
          <td><span class="status-pill ${client.isActive ? "user-status-active" : "user-status-inactive"}">${client.isActive ? "Activo" : "Inactivo"}</span></td>
          <td>${formatDateTime(client.createdAt)}</td>
          <td>${client.notes ? escapeHtml(client.notes) : "<span class='muted'>Sin notas</span>"}</td>
          <td>
            <div class="row-actions">
              <button
                class="table-button icon-button"
                type="button"
                data-client-edit-id="${client.id}"
                title="Editar cliente"
                aria-label="Editar cliente"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                  <path d="m12 6 4 4"></path>
                </svg>
              </button>
              ${
                isAdminUser()
                  ? `
                    <button
                      class="table-button ${client.isActive ? "danger" : ""} icon-button"
                      type="button"
                      data-client-status-id="${client.id}"
                      data-client-next-active="${nextActive}"
                      title="${statusTitle}"
                      aria-label="${statusTitle}"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M12 3v7"></path>
                        <path d="M7.8 5.8A9 9 0 1 0 16.2 5.8"></path>
                      </svg>
                    </button>
                  `
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
  applyStackTableLabels(elements.appShell);
}

function renderListsView() {
  CATALOG_KEYS.forEach((key) => {
    const container = document.getElementById(`list-${key}`);
    const form = document.querySelector(`[data-list-form="${key}"]`);
    const items = state.catalogItems[key] || [];
    const isProtectedGroup = isCatalogGroupProtected(key);

    if (form) {
      [...form.elements].forEach((field) => {
        field.disabled = isProtectedGroup;
      });
    }

    container.classList.add("catalog-items");

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-state">
          ${
            isProtectedGroup
              ? "Este catalogo es administrado por el sistema."
              : "Aun no hay items registrados en esta lista."
          }
        </div>
      `;
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const nextActive = item.isActive ? "false" : "true";
        const statusLabel = item.isActive ? "Activo" : "Inactivo";
        const actionLabel = item.isActive ? "Inactivar" : "Activar";

        return `
          <article class="catalog-item ${item.isActive ? "" : "catalog-item-inactive"}">
            <div class="catalog-item-copy">
              <strong>${escapeHtml(item.value)}</strong>
              <small>${statusLabel}${isProtectedGroup ? " · Fijo del sistema" : ""}</small>
            </div>
            <div class="row-actions">
              ${
                isProtectedGroup
                  ? "<span class='muted'>Sin edicion manual</span>"
                  : `
                    <button
                      class="table-button icon-button"
                      type="button"
                      data-catalog-edit-id="${item.id}"
                      data-catalog-group="${key}"
                      data-catalog-value="${encodeURIComponent(item.value)}"
                      title="Editar item"
                      aria-label="Editar item"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                        <path d="m12 6 4 4"></path>
                      </svg>
                    </button>
                    <button
                      class="table-button ${item.isActive ? "danger" : ""} icon-button"
                      type="button"
                      data-catalog-toggle-id="${item.id}"
                      data-catalog-group="${key}"
                      data-catalog-next-active="${nextActive}"
                      title="${actionLabel} item"
                      aria-label="${actionLabel} item"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M12 3v7"></path>
                        <path d="M7.8 5.8A9 9 0 1 0 16.2 5.8"></path>
                      </svg>
                    </button>
                  `
              }
            </div>
          </article>
        `;
      })
      .join("");
  });
}

function renderUsersView() {
  if (!elements.usersMetrics || !elements.usersTable) {
    return;
  }

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
  applyStackTableLabels(elements.appShell);
}

function renderImportView() {
  if (!elements.excelImportSummary || !elements.excelImportFeedback) {
    return;
  }

  if (!isAdminUser()) {
    elements.excelImportSummary.innerHTML = `
      <div class="empty-state">
        Solo el perfil administrador puede usar la carga de Excel.
      </div>
    `;
    return;
  }

  if (!lastImportReport) {
    elements.excelImportSummary.innerHTML = `
      <div class="empty-state">
        Aquí verás cuántas listas, movimientos y clientes fueron importados o reutilizados.
      </div>
    `;
    return;
  }

  const warnings = Array.isArray(lastImportReport.warnings)
    ? lastImportReport.warnings
    : [];

  elements.excelImportSummary.innerHTML = `
    <article class="list-item">
      <strong>${escapeHtml(lastImportReport.fileName || "Archivo importado")}</strong>
      <small>${escapeHtml(lastImportReport.message || "Carga completada.")}</small>
    </article>
    <div class="mini-stats compact-mini-stats">
      <div class="mini-stat"><span>Listas nuevas</span><strong>${Number(lastImportReport.catalogInserted || 0)}</strong></div>
      <div class="mini-stat"><span>Listas reactivadas</span><strong>${Number(lastImportReport.catalogReactivated || 0)}</strong></div>
      <div class="mini-stat"><span>Movimientos importados</span><strong>${Number(lastImportReport.movementsInserted || 0)}</strong></div>
      <div class="mini-stat"><span>Movimientos omitidos</span><strong>${Number(lastImportReport.movementsSkipped || 0)}</strong></div>
      <div class="mini-stat"><span>Clientes nuevos</span><strong>${Number(lastImportReport.clientsInserted || 0)}</strong></div>
      <div class="mini-stat"><span>Clientes reutilizados</span><strong>${Number(lastImportReport.clientsMatched || 0)}</strong></div>
    </div>
    ${
      warnings.length
        ? `
          <div class="stack-list">
            ${warnings
              .map(
                (warning) => `
                  <article class="list-item">
                    <strong>Advertencia</strong>
                    <small>${escapeHtml(warning)}</small>
                  </article>
                `
              )
              .join("")}
          </div>
        `
        : ""
    }
  `;
}

async function handleExcelImportSubmit(event) {
  event.preventDefault();

  if (!isAdminUser()) {
    elements.excelImportFeedback.textContent =
      "Solo el perfil administrador puede ejecutar esta carga.";
    return;
  }

  const file = elements.excelImportFile?.files?.[0];
  if (!file) {
    elements.excelImportFeedback.textContent =
      "Selecciona un archivo Excel antes de importar.";
    return;
  }

  const importLists = Boolean(elements.excelImportLists?.checked);
  const importMovements = Boolean(elements.excelImportMovements?.checked);
  const importClients = Boolean(elements.excelImportClients?.checked);

  if (!importLists && !importMovements && !importClients) {
    elements.excelImportFeedback.textContent =
      "Activa al menos una opción de importación.";
    return;
  }

  elements.excelImportFeedback.textContent =
    "Leyendo archivo y preparando la carga del Excel...";

  try {
    const fileBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(fileBuffer);
    const result = await apiRequest("/api/import/excel", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        fileDataBase64: base64,
        importLists,
        importMovements,
        importClients,
      }),
    });

    lastImportReport = result;
    elements.excelImportForm.reset();
    if (elements.excelImportLists) {
      elements.excelImportLists.checked = true;
    }
    if (elements.excelImportMovements) {
      elements.excelImportMovements.checked = true;
    }
    if (elements.excelImportClients) {
      elements.excelImportClients.checked = true;
    }
    elements.excelImportFeedback.textContent =
      result.message || "La carga del Excel terminó correctamente.";

    await loadBootstrap();
    switchView("importar");
  } catch (error) {
    elements.excelImportFeedback.textContent =
      error.message || "No se pudo cargar el archivo Excel.";
  }
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
    medioPago: elements.medioPago.value,
    valorTotal: Number(elements.valorTotal.value || 0),
    abono: Number(elements.abono.value || 0),
    observaciones: elements.observaciones.value.trim(),
    justificacionEdicion: elements.editJustification.value.trim(),
  };
  payload.estadoPago = derivePaymentStatus(payload.valorTotal, payload.abono);

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

async function handleBoxTransferSubmit(event) {
  event.preventDefault();

  const payload = {
    transferDate: elements.boxTransferDate.value,
    sourcePaymentMethod: elements.boxTransferSource.value,
    targetPaymentMethod: elements.boxTransferTarget.value,
    amount: Number(elements.boxTransferAmount.value || 0),
    notes: elements.boxTransferNotes.value.trim(),
  };

  if (!payload.transferDate) {
    elements.boxTransferFeedback.textContent =
      "Selecciona la fecha del movimiento entre cajas.";
    return;
  }

  if (!payload.sourcePaymentMethod || !payload.targetPaymentMethod) {
    elements.boxTransferFeedback.textContent =
      "Selecciona la caja origen y la caja destino.";
    return;
  }

  if (payload.sourcePaymentMethod === payload.targetPaymentMethod) {
    elements.boxTransferFeedback.textContent =
      "La caja origen y la caja destino deben ser diferentes.";
    return;
  }

  if (!(payload.amount > 0)) {
    elements.boxTransferFeedback.textContent =
      "El valor a mover debe ser mayor que cero.";
    return;
  }

  try {
    await apiRequest("/api/box-transfers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadBootstrap();
    resetBoxTransferForm();
    switchView("cajas", {
      boxPanel: "movimientos",
    });
    elements.boxTransferFeedback.textContent =
      "Traslado entre cajas registrado correctamente.";
  } catch (error) {
    elements.boxTransferFeedback.textContent = error.message;
  }
}

async function handleClientSubmit(event) {
  event.preventDefault();

  const clientId = Number(elements.clientId.value || 0);
  const payload = {
    fullName: elements.clientName.value.trim(),
    documentNumber: elements.clientDocument.value.trim(),
    phone: elements.clientPhone.value.trim(),
    email: elements.clientEmail.value.trim(),
    notes: elements.clientNotes.value.trim(),
  };

  if (!payload.fullName) {
    elements.clientFeedback.textContent =
      "El nombre del cliente es obligatorio.";
    return;
  }

  try {
    if (clientId > 0) {
      await apiRequest(`/api/clients/${clientId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    resetClientForm();
    await loadBootstrap();
    switchView("cartera", {
      clientPanel: "base",
    });
    elements.clientFeedback.textContent =
      clientId > 0
        ? "Cliente actualizado correctamente."
        : "Cliente registrado correctamente.";
  } catch (error) {
    elements.clientFeedback.textContent = error.message;
  }
}

async function handleClientsTableClick(event) {
  const editButton = event.target.closest("[data-client-edit-id]");
  const statusButton = event.target.closest("[data-client-status-id]");
  const editClientId = editButton?.dataset.clientEditId;
  const clientId = statusButton?.dataset.clientStatusId;
  const nextActive = statusButton?.dataset.clientNextActive;

  if (editClientId) {
    const client = (state.clients || []).find(
      (item) => String(item.id) === String(editClientId)
    );

    if (!client) {
      elements.clientFeedback.textContent =
        "No encontré el cliente que quieres editar.";
      return;
    }

    elements.clientId.value = String(client.id);
    elements.clientFormTitle.textContent = "Editar cliente";
    elements.clientName.value = client.fullName || "";
    elements.clientDocument.value = client.documentNumber || "";
    elements.clientPhone.value = client.phone || "";
    elements.clientEmail.value = client.email || "";
    elements.clientNotes.value = client.notes || "";
    elements.clientFeedback.textContent =
      "Actualiza los datos del cliente y guarda para aplicar el cambio.";
    switchView("cartera", {
      clientPanel: "base",
    });
    elements.clientName.focus();
    return;
  }

  if (!clientId || !nextActive) {
    return;
  }

  const activate = nextActive === "true";
  const confirmed = window.confirm(
    activate
      ? "¿Deseas activar este cliente?"
      : "¿Deseas inactivar este cliente?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/clients/${clientId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("cartera", {
      clientPanel: "base",
    });
    elements.clientFeedback.textContent = activate
      ? "Cliente activado correctamente."
      : "Cliente inactivado correctamente.";
  } catch (error) {
    elements.clientFeedback.textContent = error.message;
  }
}

function handlePortfolioTableClick(event) {
  const collectButton = event.target.closest("[data-collect-id]");
  const movementId = collectButton?.dataset.collectId;

  if (!movementId) {
    return;
  }

  selectedCollectionMovementId = String(movementId);
  syncCollectionSelectionState();
  renderPortfolioView();
  switchView("cartera", {
    clientPanel: "cobros",
  });
  elements.collectionAmount.focus();
}

async function handleCollectionSubmit(event) {
  event.preventDefault();

  const payload = {
    collectionDate: elements.collectionDate.value,
    amount: Number(elements.collectionAmount.value || 0),
    paymentMethod: elements.collectionMethod.value,
    notes: elements.collectionNotes.value.trim(),
  };

  const movementId = Number(elements.collectionMovementId.value || 0);
  const selectedMovement = getSelectedCollectionMovement();

  if (!selectedMovement || !movementId) {
    elements.collectionFeedback.textContent =
      "Selecciona primero un movimiento pendiente desde la tabla de cartera.";
    return;
  }

  const validation = validateCollection(payload, selectedMovement);
  if (!validation.valid) {
    elements.collectionFeedback.textContent = validation.message;
    return;
  }

  try {
    await apiRequest(`/api/movements/${movementId}/collections`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const currentClientName = selectedMovement.cliente || "cliente";
    await loadBootstrap();
    switchView("cartera", {
      clientPanel: "cobros",
    });
    elements.collectionFeedback.textContent = `Cobro registrado correctamente para ${currentClientName}.`;
  } catch (error) {
    elements.collectionFeedback.textContent = error.message;
  }
}

async function handleMovementTableClick(event) {
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");
  const editId = editButton?.dataset.editId;
  const deleteId = deleteButton?.dataset.deleteId;

  if (editId) {
    const movement = state.movements.find((item) => String(item.id) === editId);
    if (!movement) {
      return;
    }

    elements.movementId.value = String(movement.id);
    elements.linea.value = movement.linea;
    syncCategoryOptions({
      includeValue: movement.categoria,
    });
    elements.fecha.value = movement.fecha;
    elements.tipo.value = movement.tipo;
    elements.categoria.value = movement.categoria;
    setClientSelection(movement.cliente);
    elements.descripcion.value = movement.descripcion;
    elements.medioPago.value = movement.medioPago;
    elements.valorTotal.value = String(movement.valorTotal);
    elements.abono.value = String(movement.abono);
    elements.observaciones.value = movement.observaciones;
    syncComputedPaymentStatus();
    if (isAssistantUser()) {
      elements.assistantEditJustificationShell.classList.remove("is-hidden");
      elements.editJustification.value = "";
    }
    elements.movementFormTitle.textContent = "Editar movimiento";
    elements.movementFeedback.textContent =
      isAssistantUser()
        ? "Estas editando un movimiento reciente. Debes justificar por que haces el ajuste."
        : "Estas editando un movimiento existente. Guarda para actualizarlo.";
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

  if (isCatalogGroupProtected(key)) {
    setStatus(
      "Este catalogo es estructural del sistema y no admite altas manuales."
    );
    return;
  }

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

async function handleCatalogItemAction(event) {
  const editButton = event.target.closest("[data-catalog-edit-id]");
  const toggleButton = event.target.closest("[data-catalog-toggle-id]");

  if (editButton) {
    const key = editButton.dataset.catalogGroup;
    const itemId = editButton.dataset.catalogEditId;
    const currentValue = decodeURIComponent(editButton.dataset.catalogValue || "");

    if (!key || !itemId) {
      return;
    }

    const nextValue = window.prompt(
      "Escribe el nuevo nombre para este item de lista.",
      currentValue
    );

    if (nextValue === null) {
      return;
    }

    const cleanValue = nextValue.trim();
    if (!cleanValue) {
      setStatus("El nombre del item no puede quedar vacio.");
      return;
    }

    if (cleanValue === currentValue) {
      return;
    }

    try {
      await apiRequest(`/api/catalogs/${key}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          value: cleanValue,
        }),
      });
      await loadBootstrap();
      switchView("listas");
      setStatus("Item de lista actualizado correctamente.");
    } catch (error) {
      setStatus(error.message);
    }
    return;
  }

  if (!toggleButton) {
    return;
  }

  const key = toggleButton.dataset.catalogGroup;
  const itemId = toggleButton.dataset.catalogToggleId;
  const nextActive = toggleButton.dataset.catalogNextActive;

  if (!key || !itemId || !nextActive) {
    return;
  }

  const activate = nextActive === "true";
  const confirmed = window.confirm(
    activate
      ? "Deseas reactivar este item de lista?"
      : "Deseas inactivar este item de lista?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/catalogs/${key}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("listas");
    setStatus(
      activate
        ? "Item de lista activado correctamente."
        : "Item de lista inactivado correctamente."
    );
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

function normalizeMovements(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(normalizeMovementRecord);
}

function normalizeMovementRecord(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  const fecha = normalizeDateOnly(item.fecha);
  const [ano, mesNumero] = fecha
    ? fecha.split("-").map(Number)
    : [Number(item.ano || 0), Number(item.mesNumero || 0)];

  return {
    ...item,
    fecha,
    ano: Number(item.ano || ano || 0),
    mesNumero: Number(item.mesNumero || mesNumero || 0),
    valorTotal: Number(item.valorTotal || 0),
    abono: Number(item.abono || 0),
    saldoPendiente: Number(item.saldoPendiente || 0),
    flujoNeto: Number(item.flujoNeto || 0),
  };
}

function normalizeCollections(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    movementId: String(item.movementId),
    collectionDate: normalizeDateOnly(item.collectionDate),
    amount: Number(item.amount || 0),
  }));
}

function normalizeBoxTransfers(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    transferDate: normalizeDateOnly(item.transferDate),
    amount: Number(item.amount || 0),
  }));
}

function getPortfolioMovements() {
  if (Array.isArray(state.portfolioMovements) && state.portfolioMovements.length) {
    return state.portfolioMovements.filter((item) => item.saldoPendiente > 0);
  }

  return state.movements.filter((item) => item.saldoPendiente > 0);
}

function getFilteredPortfolioMovements() {
  const query = getPortfolioSearchQuery();
  const portfolio = getPortfolioMovements();

  if (!query) {
    return portfolio;
  }

  return portfolio.filter((item) =>
    normalizeSearchValue(
      [
        item.linea,
        item.fecha,
        item.cliente,
        item.categoria,
        item.descripcion,
        item.estadoPago,
        item.medioPago,
        item.observaciones,
        item.valorTotal,
        item.abono,
        item.saldoPendiente,
      ].join(" ")
    ).includes(query)
  );
}

function getSelectedCollectionMovement() {
  if (!selectedCollectionMovementId) {
    return null;
  }

  return (
    getPortfolioMovements().find(
      (item) => String(item.id) === String(selectedCollectionMovementId)
    ) || null
  );
}

function getCollectionHistory(movementId) {
  return [...(state.collections || [])]
    .filter((item) => String(item.movementId) === String(movementId))
    .sort((a, b) => {
      if (a.collectionDate === b.collectionDate) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      }

      return String(b.collectionDate).localeCompare(String(a.collectionDate));
    });
}

function syncCollectionSelectionState() {
  const selectedMovement = getSelectedCollectionMovement();

  if (!selectedMovement) {
    selectedCollectionMovementId = null;
    resetCollectionForm(false);
    setCollectionFormEnabled(false);
    return;
  }

  elements.collectionMovementId.value = String(selectedMovement.id);
  elements.collectionDate.value = getCurrentIsoDate();
  elements.collectionAmount.value = "";
  elements.collectionNotes.value = "";
  if ((state.lists.mediosPago || []).length) {
    elements.collectionMethod.value = state.lists.mediosPago[0];
  }
  setCollectionFormEnabled(true);
}

function getMetrics(movements) {
  const ingresos = movements.filter((item) => item.tipo === "Ingreso");
  const gastos = movements.filter((item) =>
    ["Gasto", "Costo"].includes(item.tipo)
  );

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

function getPaymentMethodCatalogItems() {
  return Array.isArray(state.catalogItems?.mediosPago)
    ? state.catalogItems.mediosPago
    : [];
}

function getCollectionTotalsByMovement() {
  const totals = new Map();

  (state.collections || []).forEach((item) => {
    const movementId = String(item.movementId);
    totals.set(
      movementId,
      Number(totals.get(movementId) || 0) + Number(item.amount || 0)
    );
  });

  return totals;
}

function getDirectMovementPaymentAmount(movement, collectionTotals) {
  const paidAmount = Number(movement.abono || 0);

  if (movement.tipo === "Ingreso") {
    return Math.max(
      paidAmount - Number(collectionTotals.get(String(movement.id)) || 0),
      0
    );
  }

  return Math.max(paidAmount, 0);
}

function getBoxLedgerEntries() {
  const collectionTotals = getCollectionTotalsByMovement();
  const movementsById = new Map(
    (state.boxMovements || []).map((item) => [String(item.id), item])
  );
  const entries = [];

  (state.boxMovements || []).forEach((movement) => {
    const boxName = String(movement.medioPago || "").trim();
    const directAmount = getDirectMovementPaymentAmount(movement, collectionTotals);

    if (!boxName || !(directAmount > 0)) {
      return;
    }

    const isIncome = movement.tipo === "Ingreso";
    const outflowLabel =
      movement.tipo === "Costo" ? "Costo operativo" : "Gasto operativo";
    entries.push({
      id: `movement-${movement.id}`,
      date: movement.fecha,
      createdAt: movement.actualizadoEn || movement.creadoEn || movement.fecha,
      boxName,
      entryType: isIncome ? "Ingreso operativo" : outflowLabel,
      reference: `Movimiento #${movement.id}`,
      detail: [
        movement.linea,
        movement.categoria,
        movement.cliente || "",
        movement.descripcion,
      ]
        .filter(Boolean)
        .join(" · "),
      registeredBy: "Sistema",
      inflow: isIncome ? directAmount : 0,
      outflow: isIncome ? 0 : directAmount,
      amount: isIncome ? directAmount : directAmount * -1,
      searchText: [
        boxName,
        movement.linea,
        movement.categoria,
        movement.cliente,
        movement.descripcion,
        movement.tipo,
      ].join(" "),
    });
  });

  (state.collections || []).forEach((collection) => {
    const movement = movementsById.get(String(collection.movementId));
    entries.push({
      id: `collection-${collection.id}`,
      date: collection.collectionDate,
      createdAt: collection.createdAt || collection.collectionDate,
      boxName: collection.paymentMethod,
      entryType: "Cobro de cartera",
      reference: `Cobro #${collection.id}`,
      detail: [
        movement?.cliente || "Sin cliente",
        movement?.descripcion || "Cobro aplicado a cartera",
      ]
        .filter(Boolean)
        .join(" · "),
      registeredBy: collection.registeredBy || "Sistema",
      inflow: Number(collection.amount || 0),
      outflow: 0,
      amount: Number(collection.amount || 0),
      searchText: [
        collection.paymentMethod,
        collection.registeredBy,
        movement?.cliente,
        movement?.descripcion,
        "cobro cartera",
      ].join(" "),
    });
  });

  (state.boxTransfers || []).forEach((transfer) => {
    const amount = Number(transfer.amount || 0);

    entries.push({
      id: `transfer-out-${transfer.id}`,
      date: transfer.transferDate,
      createdAt: transfer.createdAt || transfer.transferDate,
      boxName: transfer.sourcePaymentMethod,
      entryType: "Transferencia salida",
      reference: `Traslado #${transfer.id}`,
      detail: `Traslado hacia ${transfer.targetPaymentMethod}${
        transfer.notes ? ` · ${transfer.notes}` : ""
      }`,
      registeredBy: transfer.registeredBy || "Sistema",
      inflow: 0,
      outflow: amount,
      amount: amount * -1,
      searchText: [
        transfer.sourcePaymentMethod,
        transfer.targetPaymentMethod,
        transfer.notes,
        transfer.registeredBy,
        "transferencia salida",
      ].join(" "),
    });

    entries.push({
      id: `transfer-in-${transfer.id}`,
      date: transfer.transferDate,
      createdAt: transfer.createdAt || transfer.transferDate,
      boxName: transfer.targetPaymentMethod,
      entryType: "Transferencia entrada",
      reference: `Traslado #${transfer.id}`,
      detail: `Traslado desde ${transfer.sourcePaymentMethod}${
        transfer.notes ? ` · ${transfer.notes}` : ""
      }`,
      registeredBy: transfer.registeredBy || "Sistema",
      inflow: amount,
      outflow: 0,
      amount,
      searchText: [
        transfer.sourcePaymentMethod,
        transfer.targetPaymentMethod,
        transfer.notes,
        transfer.registeredBy,
        "transferencia entrada",
      ].join(" "),
    });
  });

  return entries.sort((a, b) => {
    const dateA = normalizeDateOnly(a.date);
    const dateB = normalizeDateOnly(b.date);

    if (dateA === dateB) {
      const createdAtCompare = String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      );
      if (createdAtCompare !== 0) {
        return createdAtCompare;
      }

      return String(b.id).localeCompare(String(a.id));
    }

    return String(dateB).localeCompare(String(dateA));
  });
}

function getPaymentBoxSummaries() {
  const ledger = getBoxLedgerEntries();
  const summaries = new Map();

  getPaymentMethodCatalogItems().forEach((item) => {
    summaries.set(item.value, {
      name: item.value,
      isActive: Boolean(item.isActive),
      balance: 0,
      inflows: 0,
      outflows: 0,
      entriesCount: 0,
      lastDate: "",
    });
  });

  ledger.forEach((entry) => {
    const current = summaries.get(entry.boxName) || {
      name: entry.boxName,
      isActive: false,
      balance: 0,
      inflows: 0,
      outflows: 0,
      entriesCount: 0,
      lastDate: "",
    };

    current.balance += Number(entry.amount || 0);
    current.inflows += Number(entry.inflow || 0);
    current.outflows += Number(entry.outflow || 0);
    current.entriesCount += 1;
    current.lastDate =
      !current.lastDate || String(entry.date) > String(current.lastDate)
        ? entry.date
        : current.lastDate;

    summaries.set(entry.boxName, current);
  });

  return [...summaries.values()]
    .filter((item) => item.isActive || item.entriesCount > 0 || item.balance !== 0)
    .sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }

      return String(a.name).localeCompare(String(b.name), APP_LOCALE);
    });
}

function getFilteredBoxLedgerEntries() {
  const boxFilter = elements.boxFilter?.value || "Todas";
  const query = normalizeSearchValue(elements.boxQuery?.value || "");

  return getBoxLedgerEntries().filter((entry) => {
    if (boxFilter !== "Todas" && entry.boxName !== boxFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalizeSearchValue(entry.searchText).includes(query);
  });
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

  if (!derivePaymentStatus(payload.valorTotal, payload.abono)) {
    return {
      valid: false,
      message: "No se pudo calcular el estado de pago del movimiento.",
    };
  }

  if (shouldRequireAssistantEditJustification()) {
    if ((payload.justificacionEdicion || "").length < 10) {
      return {
        valid: false,
        message:
          "Debes escribir una justificacion de al menos 10 caracteres para editar esta transaccion.",
      };
    }
  }

  return { valid: true };
}

function validateCollection(payload, movement) {
  if (!payload.collectionDate) {
    return {
      valid: false,
      message: "Selecciona la fecha en la que estás registrando el cobro.",
    };
  }

  if (!(payload.amount > 0)) {
    return {
      valid: false,
      message: "El valor del cobro debe ser mayor que cero.",
    };
  }

  if (!payload.paymentMethod) {
    return {
      valid: false,
      message: "Selecciona el medio de pago con el que ingresó el cobro.",
    };
  }

  if (!movement) {
    return {
      valid: false,
      message: "Selecciona un movimiento pendiente antes de registrar el cobro.",
    };
  }

  if (payload.amount > Number(movement.saldoPendiente || 0)) {
    return {
      valid: false,
      message: "El cobro no puede superar el saldo pendiente de esa cuenta.",
    };
  }

  return { valid: true };
}

function syncCategoryOptions(options = {}) {
  const key =
    elements.linea.value === "Gimnasio"
      ? "gimnasioCategorias"
      : "restauranteCategorias";
  const previous = options.includeValue ?? elements.categoria.value;

  fillSelect(elements.categoria, state.lists[key] || [], {
    includeValue: previous,
  });

  if (getAvailableSelectValues(elements.categoria).includes(previous)) {
    elements.categoria.value = previous;
  }
}

function syncComputedPaymentStatus() {
  if (!elements.estadoPago) {
    return;
  }

  const computedStatus = derivePaymentStatus(
    Number(elements.valorTotal?.value || 0),
    Number(elements.abono?.value || 0)
  );
  const availableStatuses = [
    ...(state.lists.estadosPago || []),
    "Pendiente",
    "Parcial",
    "Pagado",
  ];

  fillSelect(elements.estadoPago, [...new Set(availableStatuses)], {
    includeValue: computedStatus || "Pendiente",
  });
  elements.estadoPago.value = computedStatus || "Pendiente";
  elements.estadoPago.disabled = true;
}

function derivePaymentStatus(valorTotal, abono) {
  const total = Number(valorTotal || 0);
  const paid = Number(abono || 0);

  if (!(total > 0)) {
    return "";
  }

  if (paid <= 0) {
    return "Pendiente";
  }

  if (paid >= total) {
    return "Pagado";
  }

  return "Parcial";
}

function fillSelect(select, values, options = {}) {
  const includeValue = String(options.includeValue || "").trim();
  const normalizedValues = [...new Set((values || []).filter(Boolean))];
  const optionValues = [...normalizedValues];

  if (includeValue && !optionValues.includes(includeValue)) {
    optionValues.push(includeValue);
  }

  select.innerHTML = optionValues
    .map((item) => {
      const isInactiveOption = includeValue === item && !normalizedValues.includes(item);
      const optionLabel = isInactiveOption ? `${item} (inactivo)` : item;

      return `<option value="${escapeHtml(item)}">${escapeHtml(optionLabel)}</option>`;
    })
    .join("");
}

function fillBoxFilterOptions(selectedValue = "Todas") {
  if (!elements.boxFilter) {
    return;
  }

  const options = [
    "Todas",
    ...getPaymentBoxSummaries().map((item) => item.name),
  ];

  elements.boxFilter.innerHTML = [...new Set(options)]
    .map(
      (item) =>
        `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`
    )
    .join("");

  if ([...new Set(options)].includes(selectedValue)) {
    elements.boxFilter.value = selectedValue;
  }
}

function getAvailableSelectValues(select) {
  return [...(select?.options || [])].map((option) => option.value);
}

function fillClientOptions(selectedValue = elements.cliente?.value || "") {
  if (!elements.cliente) {
    return;
  }

  const currentValue = String(selectedValue || "").trim();

  if (elements.cliente.tagName !== "SELECT") {
    elements.cliente.value = currentValue;
    return;
  }

  const activeClients = (state.clients || []).filter((item) => item.isActive);
  const activeNames = activeClients.map((item) => item.fullName);
  const emptyLabel = activeClients.length
    ? "Sin cliente"
    : "Sin cliente · crea clientes en Cartera";
  const options = [
    `<option value="">${escapeHtml(emptyLabel)}</option>`,
  ];

  activeNames.forEach((fullName) => {
    options.push(
      `<option value="${escapeHtml(fullName)}">${escapeHtml(fullName)}</option>`
    );
  });

  if (currentValue && !activeNames.includes(currentValue)) {
    options.push(
      `<option value="${escapeHtml(currentValue)}">${escapeHtml(
        `${currentValue} (histórico)`
      )}</option>`
    );
  }

  elements.cliente.innerHTML = options.join("");
  elements.cliente.value = currentValue;
  if (elements.cliente.value !== currentValue) {
    elements.cliente.value = "";
  }
}

function setClientSelection(value) {
  const cleanValue = String(value || "").trim();
  fillClientOptions(cleanValue);
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

function tableCell(label, content, extraClass = "") {
  const safeLabel = escapeHtml(label);
  const className = extraClass ? ` class="${extraClass}"` : "";
  return `<td data-label="${safeLabel}"${className}>${content}</td>`;
}

function applyStackTableLabels(root = document) {
  root.querySelectorAll("table.stack-table").forEach((table) => {
    const headers = [...table.querySelectorAll("thead th")].map((header) =>
      header.textContent.trim()
    );

    table.querySelectorAll("tbody tr").forEach((row) => {
      [...row.children].forEach((cell, index) => {
        if (
          cell.tagName !== "TD" ||
          cell.colSpan > 1 ||
          cell.classList.contains("empty-state")
        ) {
          cell.removeAttribute("data-label");
          return;
        }

        cell.setAttribute("data-label", headers[index] || "Dato");
      });
    });
  });
}

function createReportCard(title, metrics) {
  return `
    <article class="report-card">
      <h4>${title}</h4>
      <div class="metric-list">
        ${createMetricRow("Ingresos cobrados", formatCurrency(metrics.ingresosCobrados))}
        ${createMetricRow("Salidas pagadas", formatCurrency(metrics.gastosPagados))}
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
  setClientSelection("");
  syncCategoryOptions();
  if ((state.lists.tipos || []).length) {
    elements.tipo.value = state.lists.tipos[0];
  }
  if ((state.lists.mediosPago || []).length) {
    elements.medioPago.value = state.lists.mediosPago[0];
  }
  syncComputedPaymentStatus();
  elements.editJustification.value = "";
  elements.assistantEditJustificationShell.classList.add("is-hidden");
  elements.movementFeedback.textContent = isAssistantUser()
    ? "Como asistente operativo solo ves movimientos registrados en las ultimas 24 horas."
    : "El estado de pago se calcula automaticamente segun el valor total y el abono.";
}

function resetBoxTransferForm() {
  if (!elements.boxTransferForm) {
    return;
  }

  elements.boxTransferForm.reset();
  elements.boxTransferDate.value = getCurrentIsoDate();

  const activeBoxes = (state.lists.mediosPago || []).filter(Boolean);
  if (activeBoxes.length) {
    elements.boxTransferSource.value = activeBoxes[0];
    elements.boxTransferTarget.value =
      activeBoxes.find((item) => item !== activeBoxes[0]) || activeBoxes[0];
  }

  elements.boxTransferFeedback.textContent =
    "Este movimiento resta saldo de la caja origen, suma a la caja destino y queda trazado en el historial.";
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

function resetClientForm() {
  if (!elements.clientForm) {
    return;
  }

  elements.clientForm.reset();
  elements.clientId.value = "";
  elements.clientFormTitle.textContent = "Crear cliente";
  elements.clientFeedback.textContent =
    "Aqui puedes registrar y actualizar la base de clientes para luego usarla en movimientos y cartera.";
}

function resetCollectionSelection() {
  selectedCollectionMovementId = null;
  resetCollectionForm(true);
  renderPortfolioView();
}

function resetCollectionForm(resetFeedback = false) {
  if (!elements.collectionForm) {
    return;
  }

  elements.collectionForm.reset();
  elements.collectionMovementId.value = "";
  elements.collectionDate.value = getCurrentIsoDate();
  if ((state.lists.mediosPago || []).length) {
    elements.collectionMethod.value = state.lists.mediosPago[0];
  }

  if (resetFeedback) {
    elements.collectionFeedback.textContent =
      "El cobro actualiza el saldo pendiente y guarda el historial del pago.";
  }
}

function setCollectionFormEnabled(isEnabled) {
  if (!elements.collectionForm) {
    return;
  }

  [
    elements.collectionDate,
    elements.collectionAmount,
    elements.collectionMethod,
    elements.collectionNotes,
    elements.cancelCollection,
  ].forEach((field) => {
    if (field) {
      field.disabled = !isEnabled;
    }
  });

  const submitButton = elements.collectionForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = !isEnabled;
  }
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
    const fechaA = normalizeDateOnly(a.fecha);
    const fechaB = normalizeDateOnly(b.fecha);

    if (fechaA === fechaB) {
      return String(b.actualizadoEn).localeCompare(String(a.actualizadoEn));
    }

    return String(fechaB).localeCompare(String(fechaA));
  });
}

function shouldRequireAssistantEditJustification() {
  return isAssistantUser() && Boolean(elements.movementId.value);
}

function isBetween(date, start, end) {
  const normalizedDate = normalizeDateOnly(date);
  const normalizedStart = normalizeDateOnly(start);
  const normalizedEnd = normalizeDateOnly(end);

  if (!normalizedStart || !normalizedEnd) {
    return true;
  }

  return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}

function weeklyKey(start, end) {
  return `${start || "sin-inicio"}__${end || "sin-fin"}`;
}

function formatCurrency(value) {
  const numericValue = Number(value || 0);
  const hasDecimals = Math.round(Math.abs(numericValue) * 100) % 100 !== 0;

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function getPortfolioSearchQuery() {
  return normalizeSearchValue(elements.portfolioQuery?.value || "");
}

function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(APP_LOCALE)
    .trim();
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = parseIsoDateAtMidday(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

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
  const normalized = normalizeDateOnly(value);
  const [year, month, day] = normalized.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function normalizeDateOnly(value) {
  if (!value) {
    return "";
  }

  const rawValue = String(value).trim();
  const rawMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (rawMatch) {
    return rawMatch[1];
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }

  return parsed.toISOString().slice(0, 10);
}

function formatClockTime(date) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
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
