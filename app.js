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
  athletes: [],
  users: [],
  inventoryAssets: [],
  inventoryProducts: [],
  inventoryStockMovements: [],
  businessProducts: [],
  businessProductComponents: [],
  accountingDocuments: [],
  programmingMethods: [],
  programmingExercises: [],
  classPrograms: [],
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
let activeProgrammingPanel = "clases";
let activeInventoryPanel = "activos";
let selectedCollectionMovementId = null;
let selectedCollectionClientKey = null;
let selectedCollectionMovementIds = [];
const expandedMovementDetailIds = new Set();
const expandedPortfolioDetailIds = new Set();
const expandedCollectionAccountIds = new Set();
let isSidebarOpen = false;
const COMPACT_SIDEBAR_BREAKPOINT = 1180;
let lastImportReport = null;
let lastUsersClientsImportReport = null;
let programDraftItems = [];
let selectedProgramRosterId = null;
let selectedProgramEnrollmentId = null;
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
    contabilidad: document.getElementById("contabilidad-view"),
    cartera: document.getElementById("cartera-view"),
    programacion: document.getElementById("programacion-view"),
    inventario: document.getElementById("inventario-view"),
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
  accountingDateFrom: document.getElementById("accounting-date-from"),
  accountingDateTo: document.getElementById("accounting-date-to"),
  accountingLine: document.getElementById("accounting-line"),
  accountingType: document.getElementById("accounting-type"),
  accountingQuery: document.getElementById("accounting-query"),
  accountingSummary: document.getElementById("accounting-summary"),
  accountingTable: document.getElementById("accounting-table"),
  accountingDocumentForm: document.getElementById("accounting-document-form"),
  accountingDocumentId: document.getElementById("accounting-document-id"),
  accountingDocumentDate: document.getElementById("accounting-document-date"),
  accountingDocumentLine: document.getElementById("accounting-document-line"),
  accountingDocumentArea: document.getElementById("accounting-document-area"),
  accountingDocumentType: document.getElementById("accounting-document-type"),
  accountingDocumentReference: document.getElementById("accounting-document-reference"),
  accountingDocumentFile: document.getElementById("accounting-document-file"),
  accountingDocumentNotes: document.getElementById("accounting-document-notes"),
  accountingDocumentCancelEdit: document.getElementById(
    "accounting-document-cancel-edit"
  ),
  accountingDocumentFeedback: document.getElementById("accounting-document-feedback"),
  accountingDocumentsSummary: document.getElementById("accounting-documents-summary"),
  accountingDocumentsTable: document.getElementById("accounting-documents-table"),
  accountingDocumentsDownloadsHead: document.getElementById(
    "accounting-documents-downloads-head"
  ),
  movementForm: document.getElementById("movement-form"),
  movementFormTitle: document.getElementById("movement-form-title"),
  movementId: document.getElementById("movement-id"),
  movementFeedback: document.getElementById("movement-feedback"),
  cancelEdit: document.getElementById("cancel-edit"),
  linea: document.getElementById("linea"),
  fecha: document.getElementById("fecha"),
  tipo: document.getElementById("tipo"),
  categoria: document.getElementById("categoria"),
  movementBusinessProductId: document.getElementById("movement-business-product-id"),
  movementBusinessProductFeedback: document.getElementById(
    "movement-business-product-feedback"
  ),
  clienteSearch: document.getElementById("cliente-search"),
  clienteSuggestions: document.getElementById("cliente-suggestions"),
  cliente: document.getElementById("cliente"),
  descripcion: document.getElementById("descripcion"),
  estadoPago: document.getElementById("estadoPago"),
  medioPago: document.getElementById("medioPago"),
  movementInventoryProductId: document.getElementById(
    "movement-inventory-product-id"
  ),
  movementInventoryEffect: document.getElementById("movement-inventory-effect"),
  movementInventoryQuantity: document.getElementById(
    "movement-inventory-quantity"
  ),
  movementInventoryFeedback: document.getElementById(
    "movement-inventory-feedback"
  ),
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
  movementRecordsQuery: document.getElementById("movement-records-query"),
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
  boxPendingBreakdown: document.getElementById("box-pending-breakdown"),
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
  clientAlias: document.getElementById("client-alias"),
  clientDocument: document.getElementById("client-document"),
  clientPhone: document.getElementById("client-phone"),
  clientEmail: document.getElementById("client-email"),
  clientNotes: document.getElementById("client-notes"),
  clientFeedback: document.getElementById("client-feedback"),
  cancelClientEdit: document.getElementById("cancel-client-edit"),
  clientsMetrics: document.getElementById("clients-metrics"),
  clientsTable: document.getElementById("clients-table"),
  clientsQuery: document.getElementById("clients-query"),
  portfolioQuery: document.getElementById("portfolio-query"),
  portfolioSummary: document.getElementById("portfolio-summary"),
  portfolioTable: document.getElementById("portfolio-table"),
  collectionForm: document.getElementById("collection-form"),
  collectionMovementId: document.getElementById("collection-movement-id"),
  collectionContext: document.getElementById("collection-context"),
  collectionBalance: document.getElementById("collection-balance"),
  collectionMovementList: document.getElementById("collection-movement-list"),
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
  programmingSummary: document.getElementById("programming-summary"),
  programmingMenuButtons: [...document.querySelectorAll("[data-programming-panel]")],
  programmingPanels: {
    clases: document.getElementById("programming-panel-clases"),
    atletas: document.getElementById("programming-panel-atletas"),
    biblioteca: document.getElementById("programming-panel-biblioteca"),
    metodos: document.getElementById("programming-panel-metodos"),
  },
  inventoryMenuButtons: [...document.querySelectorAll("[data-inventory-panel]")],
  inventoryPanels: {
    activos: document.getElementById("inventory-panel-activos"),
    productos: document.getElementById("inventory-panel-productos"),
    comercial: document.getElementById("inventory-panel-comercial"),
    movimientos: document.getElementById("inventory-panel-movimientos"),
  },
  inventorySummary: document.getElementById("inventory-summary"),
  inventoryAssetForm: document.getElementById("inventory-asset-form"),
  inventoryAssetId: document.getElementById("inventory-asset-id"),
  inventoryAssetName: document.getElementById("inventory-asset-name"),
  inventoryAssetCategory: document.getElementById("inventory-asset-category"),
  inventoryAssetLocation: document.getElementById("inventory-asset-location"),
  inventoryAssetCondition: document.getElementById("inventory-asset-condition"),
  inventoryAssetBrandModel: document.getElementById("inventory-asset-brand-model"),
  inventoryAssetSerial: document.getElementById("inventory-asset-serial"),
  inventoryAssetPurchaseDate: document.getElementById("inventory-asset-purchase-date"),
  inventoryAssetPurchaseValue: document.getElementById("inventory-asset-purchase-value"),
  inventoryAssetNotes: document.getElementById("inventory-asset-notes"),
  inventoryAssetFeedback: document.getElementById("inventory-asset-feedback"),
  inventoryAssetCancelEdit: document.getElementById("inventory-asset-cancel-edit"),
  inventoryAssetQuery: document.getElementById("inventory-asset-query"),
  inventoryAssetsMetrics: document.getElementById("inventory-assets-metrics"),
  inventoryAssetsTable: document.getElementById("inventory-assets-table"),
  inventoryProductForm: document.getElementById("inventory-product-form"),
  inventoryProductId: document.getElementById("inventory-product-id"),
  inventoryProductBusinessProductId: document.getElementById(
    "inventory-product-business-product-id"
  ),
  inventoryProductName: document.getElementById("inventory-product-name"),
  inventoryProductArea: document.getElementById("inventory-product-area"),
  inventoryProductOfferType: document.getElementById("inventory-product-offer-type"),
  inventoryProductKind: document.getElementById("inventory-product-kind"),
  inventoryProductIsSellable: document.getElementById("inventory-product-is-sellable"),
  inventoryProductTracksStock: document.getElementById("inventory-product-tracks-stock"),
  inventoryProductIsIngredient: document.getElementById("inventory-product-is-ingredient"),
  inventoryProductIsDirectSale: document.getElementById("inventory-product-is-direct-sale"),
  inventoryProductCategory: document.getElementById("inventory-product-category"),
  inventoryProductBusinessLine: document.getElementById(
    "inventory-product-business-line"
  ),
  inventoryProductBusinessCategory: document.getElementById(
    "inventory-product-business-category"
  ),
  inventoryProductBusinessDetail: document.getElementById(
    "inventory-product-business-detail"
  ),
  inventoryProductUnit: document.getElementById("inventory-product-unit"),
  inventoryProductCurrentStock: document.getElementById("inventory-product-current-stock"),
  inventoryProductMinimumStock: document.getElementById("inventory-product-minimum-stock"),
  inventoryProductCostPrice: document.getElementById("inventory-product-cost-price"),
  inventoryProductSalePrice: document.getElementById("inventory-product-sale-price"),
  inventoryProductBusinessAmount: document.getElementById(
    "inventory-product-business-amount"
  ),
  inventoryProductDirectQuantity: document.getElementById(
    "inventory-product-direct-quantity"
  ),
  inventoryProductNotes: document.getElementById("inventory-product-notes"),
  inventoryProductFeedback: document.getElementById("inventory-product-feedback"),
  inventoryProductCancelEdit: document.getElementById("inventory-product-cancel-edit"),
  inventoryProductQuery: document.getElementById("inventory-product-query"),
  inventoryProductsMetrics: document.getElementById("inventory-products-metrics"),
  inventoryProductsTable: document.getElementById("inventory-products-table"),
  inventoryBusinessProductForm: document.getElementById(
    "inventory-business-product-form"
  ),
  inventoryBusinessProductId: document.getElementById("inventory-business-product-id"),
  inventoryBusinessProductName: document.getElementById(
    "inventory-business-product-name"
  ),
  inventoryBusinessProductLine: document.getElementById(
    "inventory-business-product-line"
  ),
  inventoryBusinessProductType: document.getElementById(
    "inventory-business-product-type"
  ),
  inventoryBusinessProductCategory: document.getElementById(
    "inventory-business-product-category"
  ),
  inventoryBusinessProductAmount: document.getElementById(
    "inventory-business-product-amount"
  ),
  inventoryBusinessProductDirectProductId: document.getElementById(
    "inventory-business-product-direct-product-id"
  ),
  inventoryBusinessProductDirectQuantity: document.getElementById(
    "inventory-business-product-direct-quantity"
  ),
  inventoryBusinessProductNotes: document.getElementById(
    "inventory-business-product-notes"
  ),
  inventoryBusinessProductFeedback: document.getElementById(
    "inventory-business-product-feedback"
  ),
  inventoryBusinessProductCancelEdit: document.getElementById(
    "inventory-business-product-cancel-edit"
  ),
  inventoryBusinessProductQuery: document.getElementById(
    "inventory-business-product-query"
  ),
  inventoryBusinessProductsMetrics: document.getElementById(
    "inventory-business-products-metrics"
  ),
  inventoryBusinessProductsTable: document.getElementById(
    "inventory-business-products-table"
  ),
  inventoryBusinessProductRecipeTitle: document.getElementById(
    "inventory-business-product-recipe-title"
  ),
  inventoryBusinessProductRecipeContext: document.getElementById(
    "inventory-business-product-recipe-context"
  ),
  inventoryBusinessComponentForm: document.getElementById(
    "inventory-business-component-form"
  ),
  inventoryBusinessComponentProductId: document.getElementById(
    "inventory-business-component-product-id"
  ),
  inventoryBusinessComponentQuantity: document.getElementById(
    "inventory-business-component-quantity"
  ),
  inventoryBusinessComponentNotes: document.getElementById(
    "inventory-business-component-notes"
  ),
  inventoryBusinessComponentFeedback: document.getElementById(
    "inventory-business-component-feedback"
  ),
  inventoryBusinessComponentsList: document.getElementById(
    "inventory-business-components-list"
  ),
  inventoryMovementForm: document.getElementById("inventory-movement-form"),
  inventoryMovementProductId: document.getElementById("inventory-movement-product-id"),
  inventoryMovementDate: document.getElementById("inventory-movement-date"),
  inventoryMovementType: document.getElementById("inventory-movement-type"),
  inventoryMovementQuantity: document.getElementById("inventory-movement-quantity"),
  inventoryMovementUnitCost: document.getElementById("inventory-movement-unit-cost"),
  inventoryMovementReference: document.getElementById("inventory-movement-reference"),
  inventoryMovementNotes: document.getElementById("inventory-movement-notes"),
  inventoryMovementFeedback: document.getElementById("inventory-movement-feedback"),
  inventoryMovementQuery: document.getElementById("inventory-movement-query"),
  inventoryMovementsMetrics: document.getElementById("inventory-movements-metrics"),
  inventoryMovementsTable: document.getElementById("inventory-movements-table"),
  programForm: document.getElementById("program-form"),
  programFormTitle: document.getElementById("program-form-title"),
  programId: document.getElementById("program-id"),
  programDate: document.getElementById("program-date"),
  programTitle: document.getElementById("program-title"),
  programClassGroup: document.getElementById("program-class-group"),
  programMethod: document.getElementById("program-method"),
  programDuration: document.getElementById("program-duration"),
  programFocus: document.getElementById("program-focus"),
  programObjective: document.getElementById("program-objective"),
  programNotes: document.getElementById("program-notes"),
  programFeedback: document.getElementById("program-feedback"),
  cancelProgramEdit: document.getElementById("cancel-program-edit"),
  programItemDraftIndex: document.getElementById("program-item-draft-index"),
  programItemFormTitle: document.getElementById("program-item-form-title"),
  programItemFamily: document.getElementById("program-item-family"),
  programItemBlock: document.getElementById("program-item-block"),
  programItemExerciseSearch: document.getElementById("program-item-exercise-search"),
  programItemExerciseSuggestions: document.getElementById(
    "program-item-exercise-suggestions"
  ),
  programItemExercise: document.getElementById("program-item-exercise"),
  programItemMethod: document.getElementById("program-item-method"),
  programItemPrescription: document.getElementById("program-item-prescription"),
  programItemReps: document.getElementById("program-item-reps"),
  programItemWeight: document.getElementById("program-item-weight"),
  programItemCondition: document.getElementById("program-item-condition"),
  programItemNotes: document.getElementById("program-item-notes"),
  addProgramItem: document.getElementById("add-program-item"),
  cancelProgramItemEdit: document.getElementById("cancel-program-item-edit"),
  programItemFeedback: document.getElementById("program-item-feedback"),
  programMethodGuide: document.getElementById("program-method-guide"),
  programDraftSummary: document.getElementById("program-draft-summary"),
  programDraftItems: document.getElementById("program-draft-items"),
  programFilterDate: document.getElementById("program-filter-date"),
  programFilterMethod: document.getElementById("program-filter-method"),
  programFilterQuery: document.getElementById("program-filter-query"),
  programsMetrics: document.getElementById("programs-metrics"),
  programsTable: document.getElementById("programs-table"),
  programWeekBoard: document.getElementById("program-week-board"),
  programAthleteForm: document.getElementById("program-athlete-form"),
  programAthleteFormTitle: document.getElementById("program-athlete-form-title"),
  programAthleteFormId: document.getElementById("program-athlete-form-id"),
  programAthleteFullName: document.getElementById("program-athlete-full-name"),
  programAthleteDocument: document.getElementById("program-athlete-document"),
  programAthleteBirthDate: document.getElementById("program-athlete-birth-date"),
  programAthletePhone: document.getElementById("program-athlete-phone"),
  programAthleteEmail: document.getElementById("program-athlete-email"),
  programAthleteEmergencyName: document.getElementById("program-athlete-emergency-name"),
  programAthleteEmergencyPhone: document.getElementById("program-athlete-emergency-phone"),
  programAthleteMedicalNotes: document.getElementById("program-athlete-medical-notes"),
  programAthleteNotes: document.getElementById("program-athlete-notes"),
  programAthleteFormFeedback: document.getElementById("program-athlete-form-feedback"),
  cancelProgramAthleteEdit: document.getElementById("cancel-program-athlete-edit"),
  programAthletesMetrics: document.getElementById("program-athletes-metrics"),
  programAthletesQuery: document.getElementById("program-athletes-query"),
  programAthletesTable: document.getElementById("program-athletes-table"),
  programExerciseForm: document.getElementById("program-exercise-form"),
  programExerciseFormTitle: document.getElementById("program-exercise-form-title"),
  programExerciseId: document.getElementById("program-exercise-id"),
  programExerciseName: document.getElementById("program-exercise-name"),
  programExerciseFamily: document.getElementById("program-exercise-family"),
  programExerciseCategory: document.getElementById("program-exercise-category"),
  programExerciseMuscle: document.getElementById("program-exercise-muscle"),
  programExercisePattern: document.getElementById("program-exercise-pattern"),
  programExerciseEquipment: document.getElementById("program-exercise-equipment"),
  programExerciseNotes: document.getElementById("program-exercise-notes"),
  programExerciseFeedback: document.getElementById("program-exercise-feedback"),
  cancelProgramExerciseEdit: document.getElementById("cancel-program-exercise-edit"),
  programExerciseFilterFamily: document.getElementById("program-exercise-filter-family"),
  programExerciseQuery: document.getElementById("program-exercise-query"),
  programExercisesMetrics: document.getElementById("program-exercises-metrics"),
  programExercisesTable: document.getElementById("program-exercises-table"),
  programmingMethodsGrid: document.getElementById("programming-methods-grid"),
  programRosterClassSummary: document.getElementById("program-roster-class-summary"),
  programAthleteSearch: document.getElementById("program-athlete-search"),
  programAthleteSuggestions: document.getElementById("program-athlete-suggestions"),
  programAthleteId: document.getElementById("program-athlete-id"),
  programAthleteAdd: document.getElementById("program-athlete-add"),
  programAthleteFeedback: document.getElementById("program-athlete-feedback"),
  programAthleteSummary: document.getElementById("program-athlete-summary"),
  programAthleteList: document.getElementById("program-athlete-list"),
  programAthleteResultsForm: document.getElementById("program-athlete-results-form"),
  programAthleteResultsTitle: document.getElementById("program-athlete-results-title"),
  programAthleteResults: document.getElementById("program-athlete-results"),
  programAthleteGeneralNotes: document.getElementById("program-athlete-general-notes"),
  programAthleteResultsFeedback: document.getElementById("program-athlete-results-feedback"),
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
  usersClientsImportForm: document.getElementById("users-clients-import-form"),
  usersClientsImportFile: document.getElementById("users-clients-import-file"),
  usersClientsImportPassword: document.getElementById(
    "users-clients-import-password"
  ),
  usersClientsImportFeedback: document.getElementById(
    "users-clients-import-feedback"
  ),
  usersClientsImportSummary: document.getElementById(
    "users-clients-import-summary"
  ),
};

init();

async function init() {
  hydrateDefaultDates();
  initProgrammingSimplifiedUi();
  bindEvents();
  syncSidebarLayout();
  renderLoginFeedback("Ingresa tus credenciales para continuar.");
  await restoreSession();
}

function initProgrammingSimplifiedUi() {
  const programmingClassesPanel = document.getElementById("programming-panel-clases");
  if (!programmingClassesPanel) {
    return;
  }

  if (!elements.programItemFamily && elements.programItemExercise) {
    const exerciseLabel = elements.programItemExercise.closest("label");
    if (exerciseLabel?.parentElement) {
      const familyLabel = document.createElement("label");
      familyLabel.innerHTML = `
        Tipo
        <select id="program-item-family" name="itemFamily"></select>
      `;
      exerciseLabel.parentElement.insertBefore(familyLabel, exerciseLabel);
      elements.programItemFamily = document.getElementById("program-item-family");
    }
  }

  if (!elements.programWeekBoard) {
    const metrics = elements.programsMetrics;
    const tableWrap = elements.programsTable?.closest(".table-wrap");
    if (metrics?.parentElement) {
      const weekBoard = document.createElement("div");
      weekBoard.id = "program-week-board";
      weekBoard.className = "program-week-board";
      metrics.parentElement.insertBefore(weekBoard, tableWrap || null);
      elements.programWeekBoard = weekBoard;
    }
  }

  elements.programsTable?.closest(".table-wrap")?.classList.add("is-hidden");
  const orphanConditionLabel = [...programmingClassesPanel.querySelectorAll("label")].find(
    (label) =>
      /condici/i.test(label.textContent || "") &&
      !label.querySelector("input, textarea, select")
  );
  orphanConditionLabel?.remove();

  setProgrammingFieldLabel(elements.programFocus, "Encabezado del workout");
  setProgrammingFieldLabel(elements.programNotes, "Notas del coach");
  setProgrammingFieldLabel(elements.programItemReps, "Reps / volumen");
  setProgrammingFieldLabel(elements.programItemWeight, "Peso / carga");
  setProgrammingFieldLabel(elements.programItemCondition, "Condición");
  setProgrammingFieldLabel(elements.programItemPrescription, "Línea visible");
  if (elements.programItemPrescription?.nextElementSibling?.classList.contains("inline-hint")) {
    elements.programItemPrescription.nextElementSibling.textContent =
      "Si escribes la línea completa, se mostrará tal cual en la tarjeta.";
  }

  setProgrammingFieldLabel(elements.programFilterDate, "Semana de referencia");
  if (elements.programTitle) {
    elements.programTitle.placeholder = "Ej. HYROX Foundation";
  }
  if (elements.programFocus) {
    elements.programFocus.placeholder = "Ej. 25 min AMRAP o 3 rondas fuertes";
  }
  if (elements.programNotes) {
    elements.programNotes.placeholder =
      "Notas cortas del coach, ajustes y recordatorios clave.";
  }
  if (elements.programItemReps) {
    elements.programItemReps.placeholder = "Ej. 10, 12-10-8, 250 m o 20 cal";
  }
  if (elements.programItemWeight) {
    elements.programItemWeight.placeholder = "Ej. 20 kg, 2 mancuernas de 15 lb";
  }
  if (elements.programItemPrescription) {
    elements.programItemPrescription.placeholder =
      "Si quieres, escribe la lÃ­nea exacta; si no, usamos el nombre del ejercicio.";
  }

  const classesHeadings = programmingClassesPanel.querySelectorAll(".panel-head h3");
  const classesKickers = programmingClassesPanel.querySelectorAll(".panel-head .section-kicker");
  if (classesKickers[0]) {
    classesKickers[0].textContent = "Programación rápida";
  }
  if (classesHeadings[0]) {
    classesHeadings[0].textContent = "Armar clase";
  }
  if (classesKickers[1]) {
    classesKickers[1].textContent = "Vista previa";
  }
  if (classesHeadings[1]) {
    classesHeadings[1].textContent = "Así se verá la clase";
  }
  if (classesKickers[2]) {
    classesKickers[2].textContent = "Vista semanal";
  }
  if (classesHeadings[2]) {
    classesHeadings[2].textContent = "Programación de la semana";
  }
  if (classesKickers[3]) {
    classesKickers[3].textContent = "Carga rápida";
  }
  if (classesHeadings[3]) {
    classesHeadings[3].textContent = "Agregar línea del workout";
  }

  hideProgrammingField(elements.programClassGroup);
  hideProgrammingField(elements.programDuration);
  hideProgrammingField(elements.programObjective);
  hideProgrammingField(elements.programItemBlock);
  hideProgrammingField(elements.programItemMethod);
  hideProgrammingField(elements.programItemPrescription);
  hideProgrammingField(elements.programItemNotes);

  if (elements.programDuration) {
    elements.programDuration.value = "60";
  }
  if (elements.programItemBlock) {
    elements.programItemBlock.value = "Workout";
  }
  if (elements.programFilterDate && !elements.programFilterDate.value) {
    elements.programFilterDate.value = getCurrentIsoDate();
  }
}

function hideProgrammingField(field) {
  const shell = field?.closest("label") || field;
  if (shell) {
    shell.classList.add("is-hidden");
  }
}

function setProgrammingFieldLabel(field, label) {
  const shell = field?.closest("label");
  if (!shell) {
    return;
  }

  const textNode = [...shell.childNodes].find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
  );

  if (textNode) {
    textNode.textContent = `\n                  ${label}\n                  `;
  }
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

  elements.programmingMenuButtons.forEach((button) => {
    button.addEventListener("click", () =>
      setProgrammingPanel(button.dataset.programmingPanel)
    );
  });

  elements.boxMenuButtons.forEach((button) => {
    button.addEventListener("click", () => setBoxPanel(button.dataset.boxPanel));
  });

  elements.inventoryMenuButtons.forEach((button) => {
    button.addEventListener("click", () =>
      setInventoryPanel(button.dataset.inventoryPanel)
    );
  });

  elements.quickMovement.addEventListener("click", () => {
    switchView("movimientos");
    elements.descripcion.focus();
  });

  elements.refreshData.addEventListener("click", async () => {
    await loadBootstrap();
  });

  elements.linea.addEventListener("change", () =>
    syncCategoryOptions({ applySuggestedAmount: true })
  );
  addListener(elements.linea, "change", () =>
    syncMovementBusinessProductSelection({ preserveCategoryValue: false })
  );
  addListener(
    elements.movementBusinessProductId,
    "change",
    syncMovementBusinessProductSelection
  );
  addListener(elements.linea, "change", syncMovementInventoryFields);
  addListener(elements.tipo, "change", syncMovementInventoryFields);
  addListener(elements.categoria, "change", syncCategorySuggestedAmount);
  addListener(
    elements.movementInventoryProductId,
    "change",
    syncMovementInventoryFields
  );
  addListener(
    elements.movementInventoryEffect,
    "change",
    syncMovementInventoryFields
  );
  elements.movementForm.addEventListener("submit", handleMovementSubmit);
  elements.cancelEdit.addEventListener("click", resetMovementForm);
  addListener(elements.valorTotal, "input", syncComputedPaymentStatus);
  addListener(elements.abono, "input", syncComputedPaymentStatus);
  addListener(elements.boxTransferForm, "submit", handleBoxTransferSubmit);

  [
    elements.filterLine,
    elements.filterStatus,
    elements.filterQuery,
    elements.movementRecordsQuery,
  ].forEach(
    (input) => input.addEventListener("input", renderMovementsView)
  );
  [elements.boxFilter, elements.boxQuery].forEach((input) =>
    addListener(input, "input", renderBoxesView)
  );
  addListener(elements.boxesSummary, "click", handleBoxSummaryClick);

  elements.dailyDate.addEventListener("input", renderDailyView);
  elements.weeklyStart.addEventListener("input", renderWeeklyView);
  elements.weeklyEnd.addEventListener("input", renderWeeklyView);
  elements.monthlyYear.addEventListener("input", renderMonthlyView);
  [
    elements.accountingDateFrom,
    elements.accountingDateTo,
    elements.accountingLine,
    elements.accountingType,
    elements.accountingQuery,
  ].forEach(
    (input) => {
      addListener(input, "input", renderAccountingView);
      addListener(input, "change", renderAccountingView);
    }
  );

  elements.saveDailyNotes.addEventListener("click", saveDailyNote);
  elements.saveWeeklyNotes.addEventListener("click", saveWeeklyNote);
  addListener(
    elements.accountingDocumentForm,
    "submit",
    handleAccountingDocumentSubmit
  );
  addListener(
    elements.accountingDocumentCancelEdit,
    "click",
    resetAccountingDocumentForm
  );
  addListener(
    elements.accountingDocumentsTable,
    "click",
    handleAccountingDocumentsTableClick
  );
  addListener(elements.movementTable, "click", handleMovementTableClick);
  addListener(elements.clienteSearch, "input", handleMovementClientSearchInput);
  addListener(elements.clienteSearch, "focus", () =>
    renderMovementClientSuggestions(elements.clienteSearch?.value || "", {
      forceOpen: true,
    })
  );
  addListener(elements.clienteSearch, "click", () =>
    renderMovementClientSuggestions(elements.clienteSearch?.value || "", {
      forceOpen: true,
    })
  );
  addListener(elements.clienteSearch, "keydown", (event) =>
    handleMovementClientSearchKeydown(event)
  );
  addListener(elements.clienteSearch, "blur", () => {
    window.setTimeout(hideMovementClientSuggestions, 120);
  });
  addListener(elements.clienteSearch, "change", () =>
    syncMovementClientSelectionFromSearch({
      allowClosestMatch: true,
      allowSingleMatch: true,
    })
  );
  addListener(
    elements.clienteSuggestions,
    "click",
    handleMovementClientSuggestionClick
  );
  addListener(elements.clientForm, "submit", handleClientSubmit);
  addListener(elements.cancelClientEdit, "click", resetClientForm);
  addListener(elements.clientsTable, "click", handleClientsTableClick);
  addListener(elements.clientsQuery, "input", renderClientsAdmin);
  addListener(elements.portfolioQuery, "input", renderPortfolioView);
  addListener(elements.portfolioTable, "click", handlePortfolioTableClick);
  addListener(
    elements.collectionMovementList,
    "click",
    handleCollectionMovementListClick
  );
  addListener(elements.collectionForm, "submit", handleCollectionSubmit);
  addListener(elements.cancelCollection, "click", resetCollectionSelection);
  addListener(elements.programForm, "submit", handleProgramSubmit);
  addListener(elements.cancelProgramEdit, "click", resetProgramForm);
  addListener(elements.addProgramItem, "click", handleProgramItemAdd);
  addListener(elements.cancelProgramItemEdit, "click", resetProgramItemForm);
  addListener(elements.programItemFamily, "change", () => {
    fillProgrammingExerciseSelect({
      selectedValue: "",
      familyValue: elements.programItemFamily?.value || "",
    });
    if (
      elements.programItemPrescription &&
      (!elements.programItemPrescription.value.trim() ||
        elements.programItemPrescription.value.trim() ===
          String(elements.programItemPrescription.dataset.autoSource || "").trim())
    ) {
      elements.programItemPrescription.value = "";
      elements.programItemPrescription.dataset.autoSource = "";
    }
  });
  addListener(elements.programItemExerciseSearch, "input", () =>
    handleProgramExerciseSearchInput()
  );
  addListener(elements.programItemExerciseSearch, "focus", () =>
    renderProgramExerciseSuggestions(
      elements.programItemExerciseSearch?.value || "",
      { forceOpen: true }
    )
  );
  addListener(elements.programItemExerciseSearch, "click", () =>
    renderProgramExerciseSuggestions(
      elements.programItemExerciseSearch?.value || "",
      { forceOpen: true }
    )
  );
  addListener(elements.programItemExerciseSearch, "keydown", (event) =>
    handleProgramExerciseSearchKeydown(event)
  );
  addListener(elements.programItemExerciseSearch, "blur", () => {
    window.setTimeout(hideProgramExerciseSuggestions, 120);
  });
  addListener(elements.programItemExerciseSearch, "change", () =>
    syncProgramExerciseSelectionFromSearch({
      allowClosestMatch: true,
    })
  );
  addListener(
    elements.programItemExerciseSuggestions,
    "click",
    handleProgramExerciseSuggestionClick
  );
  addListener(elements.programItemExercise, "change", () =>
    syncProgramItemVisibleLine()
  );
  [elements.programItemReps, elements.programItemWeight].forEach((input) => {
    addListener(input, "input", () => {
      syncProgramItemVisibleLine(true);
      renderProgramDraftState();
    });
    addListener(input, "change", () => {
      syncProgramItemVisibleLine(true);
      renderProgramDraftState();
    });
  });
  addListener(elements.programItemCondition, "input", renderProgramDraftState);
  addListener(elements.programItemCondition, "change", renderProgramDraftState);
  [
    elements.programDate,
    elements.programTitle,
    elements.programMethod,
    elements.programDuration,
    elements.programFocus,
    elements.programNotes,
  ].forEach((input) => {
    addListener(input, "input", renderProgramDraftState);
    addListener(input, "change", renderProgramDraftState);
  });
  [elements.programFilterDate, elements.programFilterMethod, elements.programFilterQuery].forEach(
    (input) => {
      addListener(input, "input", renderProgrammingPrograms);
      addListener(input, "change", renderProgrammingPrograms);
    }
  );
  addListener(elements.programsTable, "click", handleProgramsTableClick);
  addListener(elements.programWeekBoard, "click", handleProgramsTableClick);
  addListener(elements.programDraftItems, "click", handleProgramDraftItemsClick);
  addListener(elements.programAthleteAdd, "click", handleProgramAthleteAdd);
  addListener(elements.programAthleteSearch, "input", handleProgramAthleteSearchInput);
  addListener(elements.programAthleteSearch, "focus", () =>
    renderProgramAthleteSuggestions(elements.programAthleteSearch?.value || "", {
      forceOpen: true,
    })
  );
  addListener(elements.programAthleteSearch, "click", () =>
    renderProgramAthleteSuggestions(elements.programAthleteSearch?.value || "", {
      forceOpen: true,
    })
  );
  addListener(elements.programAthleteSearch, "keydown", (event) =>
    handleProgramAthleteSearchKeydown(event)
  );
  addListener(elements.programAthleteSearch, "blur", () => {
    window.setTimeout(hideProgramAthleteSuggestions, 120);
  });
  addListener(elements.programAthleteSearch, "change", () =>
    syncProgramAthleteSelectionFromSearch({
      allowClosestMatch: true,
      allowSingleMatch: true,
    })
  );
  addListener(
    elements.programAthleteSuggestions,
    "click",
    handleProgramAthleteSuggestionClick
  );
  addListener(elements.programAthleteList, "click", handleProgramAthleteListClick);
  addListener(
    elements.programAthleteResultsForm,
    "submit",
    handleProgramAthleteResultsSubmit
  );
  addListener(elements.programAthleteForm, "submit", handleProgrammingAthleteSubmit);
  addListener(
    elements.cancelProgramAthleteEdit,
    "click",
    resetProgrammingAthleteForm
  );
  addListener(
    elements.programAthletesTable,
    "click",
    handleProgrammingAthletesTableClick
  );
  addListener(
    elements.programAthletesQuery,
    "input",
    renderProgrammingAthletesAdmin
  );
  addListener(elements.programExerciseForm, "submit", handleProgramExerciseSubmit);
  addListener(
    elements.cancelProgramExerciseEdit,
    "click",
    resetProgramExerciseForm
  );
  [elements.programExerciseFilterFamily, elements.programExerciseQuery].forEach((input) => {
    addListener(input, "input", renderProgrammingExercisesLibrary);
    addListener(input, "change", renderProgrammingExercisesLibrary);
  });
  addListener(
    elements.programExercisesTable,
    "click",
    handleProgramExercisesTableClick
  );
  addListener(elements.userForm, "submit", handleUserSubmit);
  addListener(elements.usersTable, "click", handleUsersTableClick);
  addListener(elements.excelImportForm, "submit", handleExcelImportSubmit);
  addListener(
    elements.usersClientsImportForm,
    "submit",
    handleUsersClientsImportSubmit
  );

  document
    .querySelectorAll("[data-list-form]")
    .forEach((form) => form.addEventListener("submit", handleListSubmit));

  document
    .querySelectorAll("[data-list-cancel]")
    .forEach((button) =>
      button.addEventListener("click", handleListEditCancelClick)
    );

  addListener(document.getElementById("listas-view"), "click", handleCatalogItemAction);
  addListener(elements.inventoryAssetForm, "submit", handleInventoryAssetSubmit);
  addListener(
    elements.inventoryAssetCancelEdit,
    "click",
    resetInventoryAssetForm
  );
  addListener(elements.inventoryAssetsTable, "click", handleInventoryAssetsTableClick);
  addListener(elements.inventoryAssetQuery, "input", renderInventoryView);
  addListener(elements.inventoryProductForm, "submit", handleInventoryProductSubmit);
  addListener(
    elements.inventoryProductCancelEdit,
    "click",
    resetInventoryProductForm
  );
  addListener(
    elements.inventoryProductsTable,
    "click",
    handleInventoryProductsTableClick
  );
  addListener(
    elements.inventoryProductKind,
    "change",
    syncInventoryProductKindFields
  );
  addListener(
    elements.inventoryProductOfferType,
    "change",
    syncUnifiedInventorySaleFields
  );
  addListener(
    elements.inventoryProductIsSellable,
    "change",
    syncUnifiedInventorySaleFields
  );
  addListener(
    elements.inventoryProductTracksStock,
    "change",
    syncUnifiedInventorySaleFields
  );
  addListener(
    elements.inventoryProductIsIngredient,
    "change",
    syncUnifiedInventorySaleFields
  );
  addListener(
    elements.inventoryProductIsDirectSale,
    "change",
    syncUnifiedInventorySaleFields
  );
  addListener(
    elements.inventoryProductBusinessLine,
    "change",
    syncUnifiedInventorySaleFields
  );
  addListener(elements.inventoryProductQuery, "input", renderInventoryView);
  addListener(
    elements.inventoryBusinessProductForm,
    "submit",
    handleInventoryBusinessProductSubmit
  );
  addListener(
    elements.inventoryBusinessProductLine,
    "change",
    syncInventoryBusinessProductCategoryOptions
  );
  addListener(
    elements.inventoryBusinessProductCancelEdit,
    "click",
    resetInventoryBusinessProductForm
  );
  addListener(
    elements.inventoryBusinessProductsTable,
    "click",
    handleInventoryBusinessProductsTableClick
  );
  addListener(elements.inventoryBusinessProductQuery, "input", renderInventoryView);
  addListener(
    elements.inventoryBusinessComponentForm,
    "submit",
    handleInventoryBusinessComponentSubmit
  );
  addListener(
    elements.inventoryBusinessComponentsList,
    "click",
    handleInventoryBusinessComponentsListClick
  );
  addListener(
    elements.inventoryMovementForm,
    "submit",
    handleInventoryStockMovementSubmit
  );
  addListener(elements.inventoryMovementQuery, "input", renderInventoryView);
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
  selectedCollectionClientKey = null;
  selectedCollectionMovementIds = [];
  elements.passwordChangeForm.reset();
  showLogin("Sesión cerrada. Ingresa de nuevo para continuar.");
}

async function loadBootstrap() {
  setStatus("Conectando a PostgreSQL...");

  try {
    const previousSelectedCollectionId = selectedCollectionMovementId;
    const previousSelectedCollectionClientKey = selectedCollectionClientKey;
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
      accountingDocuments: Array.isArray(data.accountingDocuments)
        ? data.accountingDocuments
        : [],
      inventoryAssets: normalizeInventoryAssets(data.inventoryAssets),
      inventoryProducts: normalizeInventoryProducts(data.inventoryProducts),
      inventoryStockMovements: normalizeInventoryStockMovements(
        data.inventoryStockMovements
      ),
      businessProducts: normalizeBusinessProducts(data.businessProducts),
      businessProductComponents: normalizeBusinessProductComponents(
        data.businessProductComponents
      ),
      clients: Array.isArray(data.clients) ? data.clients : [],
      athletes: normalizeProgrammingAthletes(data.athletes),
      users: Array.isArray(usersPayload?.users) ? usersPayload.users : [],
      notes: {
        daily: data.notes?.daily || {},
        weekly: data.notes?.weekly || {},
      },
      movements: normalizeMovements(data.movements),
      programmingMethods: normalizeProgrammingMethods(data.programmingMethods),
      programmingExercises: normalizeProgrammingExercises(data.programmingExercises),
      classPrograms: normalizeClassPrograms(data.classPrograms),
    };

    const previousSelectedMovement = state.portfolioMovements.find(
      (item) => String(item.id) === String(previousSelectedCollectionId)
    );
    if (previousSelectedMovement) {
      selectedCollectionClientKey = getCollectionClientKey(
        previousSelectedMovement.cliente
      );
      selectedCollectionMovementId = String(previousSelectedMovement.id);
    } else if (
      previousSelectedCollectionClientKey &&
      getPortfolioMovementsByClientKey(
        previousSelectedCollectionClientKey,
        state.portfolioMovements
      ).length
    ) {
      const fallbackMovement = getPortfolioMovementsByClientKey(
        previousSelectedCollectionClientKey,
        state.portfolioMovements
      )[0];
      selectedCollectionClientKey = previousSelectedCollectionClientKey;
      selectedCollectionMovementId = fallbackMovement
        ? String(fallbackMovement.id)
        : null;
    } else {
      selectedCollectionClientKey = null;
      selectedCollectionMovementId = null;
    }

    hydrateStaticOptions();
    if (!elements.movementId.value) {
      resetMovementForm();
    }
    resetClientForm();
    syncCollectionSelectionState();
    resetBoxTransferForm();
    resetUserForm();
    resetProgramExerciseForm();
    resetProgramForm();
    resetInventoryAssetForm();
    resetInventoryProductForm();
    resetInventoryMovementForm();
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

function isAccountantUser() {
  return authState.user?.role === "contador";
}

function hasAccountingAccess() {
  return isAdminUser() || isAccountantUser();
}

function canWriteOperations() {
  return isAdminUser() || isAssistantUser();
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
      "contabilidad",
      "cartera",
      "programacion",
      "inventario",
      "listas",
      "usuarios",
      "importar",
    ];
  }

  if (isAssistantUser()) {
    return ["movimientos", "cajas", "cartera"];
  }

  if (isAccountantUser()) {
    return ["dashboard", "diario", "semanal", "mensual", "contabilidad"];
  }

  return [];
}

function defaultViewForCurrentUser() {
  if (isAssistantUser()) {
    return "movimientos";
  }

  if (isAccountantUser()) {
    return "contabilidad";
  }

  return "dashboard";
}

function defaultClientPanelForCurrentUser() {
  return isAssistantUser() ? "cartera" : "base";
}

function defaultBoxPanelForCurrentUser() {
  return "resumen";
}

function defaultProgrammingPanelForCurrentUser() {
  return "clases";
}

function defaultInventoryPanelForCurrentUser() {
  return "activos";
}

function defaultAccountingDateForCurrentUser() {
  return getCurrentIsoDate();
}

function getAccountingDefaultDateRange() {
  const today = defaultAccountingDateForCurrentUser();
  return {
    from: today,
    to: today,
  };
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

  if (elements.quickMovement) {
    elements.quickMovement.classList.toggle("is-hidden", !canWriteOperations());
  }

  if (!hasViewAccess(activeView)) {
    switchView(defaultViewForCurrentUser());
  }
}

function roleLabel(role) {
  return {
    administrador: "Administrador",
    asistente_operativo: "Asistente operativo",
    contador: "Contador",
  }[role] || "Sin perfil";
}

function isCatalogGroupProtected(group) {
  return PROTECTED_CATALOG_GROUPS.has(String(group || ""));
}

function hydrateDefaultDates() {
  const today = getCurrentIsoDate();
  elements.fecha.value = today;
  elements.dailyDate.value = today;
  if (elements.programDate) {
    elements.programDate.value = today;
  }
  if (elements.collectionDate) {
    elements.collectionDate.value = today;
  }
  if (elements.accountingDateFrom && elements.accountingDateTo) {
    const { from, to } = getAccountingDefaultDateRange();
    elements.accountingDateFrom.value = from;
    elements.accountingDateTo.value = to;
  }
  if (elements.accountingDocumentDate) {
    elements.accountingDocumentDate.value = today;
  }
  if (elements.boxTransferDate) {
    elements.boxTransferDate.value = today;
  }
  if (elements.inventoryMovementDate) {
    elements.inventoryMovementDate.value = today;
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
  const previousBusinessProductId =
    elements.movementBusinessProductId?.value || "";
  const previousInventoryProductId =
    elements.movementInventoryProductId?.value || "";
  const previousInventoryEffect =
    elements.movementInventoryEffect?.value || "ninguno";
  const previousInventoryQuantity =
    elements.movementInventoryQuantity?.value || "";
  const previousCollectionMethod = elements.collectionMethod?.value || "";
  const previousTransferSource = elements.boxTransferSource?.value || "";
  const previousTransferTarget = elements.boxTransferTarget?.value || "";
  const previousBoxFilter = elements.boxFilter?.value || "Todas";
  const previousCategory = elements.categoria.value;
  const previousProgramMethod = elements.programMethod?.value || "";
  const previousProgramItemExercise = elements.programItemExercise?.value || "";
  const previousProgramItemMethod = elements.programItemMethod?.value || "";
  const previousProgramItemFamily = elements.programItemFamily?.value || "";
  const previousProgramFilterMethod = elements.programFilterMethod?.value || "";
  const previousProgramExerciseFamily =
    elements.programExerciseFilterFamily?.value || "Todas";
  const previousProgramExerciseFormFamily =
    elements.programExerciseFamily?.value || "";

  fillSelect(elements.tipo, state.lists.tipos, {
    includeValue: previousType,
  });
  fillSelect(elements.estadoPago, state.lists.estadosPago, {
    includeValue: previousPaymentStatus,
  });
  fillSelect(elements.medioPago, state.lists.mediosPago, {
    includeValue: previousPaymentMethod,
  });
  fillMovementBusinessProductOptions(previousBusinessProductId);
  fillMovementInventoryProductOptions({
    selectedValue: previousInventoryProductId,
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
  syncMovementBusinessProductSelection({
    selectedValue: previousBusinessProductId,
    preserveValue: true,
  });
  fillProgrammingMethodSelects({
    programMethod: previousProgramMethod,
    itemMethod: previousProgramItemMethod,
    programFilterMethod: previousProgramFilterMethod,
  });
  fillProgrammingExerciseSelect({
    selectedValue: previousProgramItemExercise,
    familyValue: previousProgramItemFamily,
  });
  fillProgrammingFamilySelects({
    formValue: previousProgramExerciseFormFamily,
    filterValue: previousProgramExerciseFamily,
    itemValue: previousProgramItemFamily,
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
    elements.movementInventoryEffect &&
    ["ninguno", "entrada", "salida"].includes(previousInventoryEffect)
  ) {
    elements.movementInventoryEffect.value = previousInventoryEffect;
  }

  if (elements.movementInventoryQuantity) {
    elements.movementInventoryQuantity.value = previousInventoryQuantity;
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
  syncMovementInventoryFields({
    preserveQuantity: true,
    preserveEffect: true,
  });
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

  if (view === "programacion") {
    activeProgrammingPanel = normalizeProgrammingPanel(
      options.programmingPanel ||
        activeProgrammingPanel ||
        defaultProgrammingPanelForCurrentUser()
    );
  }

  if (view === "cajas") {
    activeBoxPanel = normalizeBoxPanel(
      options.boxPanel || activeBoxPanel || defaultBoxPanelForCurrentUser()
    );
  }

  if (view === "inventario") {
    activeInventoryPanel = normalizeInventoryPanel(
      options.inventoryPanel ||
        activeInventoryPanel ||
        defaultInventoryPanelForCurrentUser()
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
    contabilidad: "Contabilidad",
    cartera: "Clientes",
    programacion: "Programación",
    listas: "Listas maestras",
    usuarios: "Usuarios",
    importar: "Importar Excel",
  };
  titles.inventario = "Inventario";

  elements.viewTitle.textContent = titles[view] || "Control administrativo";

  if (view === "cartera") {
    renderClientPanels();
  }

  if (view === "programacion") {
    renderProgrammingPanels();
  }

  if (view === "cajas") {
    renderBoxPanels();
  }

  if (view === "inventario") {
    renderInventoryPanels();
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

function normalizeProgrammingPanel(panel) {
  return ["clases", "atletas", "biblioteca", "metodos"].includes(panel)
    ? panel
    : defaultProgrammingPanelForCurrentUser();
}

function setProgrammingPanel(panel) {
  activeProgrammingPanel = normalizeProgrammingPanel(panel);

  if (activeView === "programacion") {
    renderProgrammingPanels();
    return;
  }

  switchView("programacion", {
    programmingPanel: activeProgrammingPanel,
  });
}

function normalizeBoxPanel(panel) {
  return ["resumen", "traslados", "movimientos"].includes(panel)
    ? panel
    : defaultBoxPanelForCurrentUser();
}

function normalizeInventoryPanel(panel) {
  if (panel === "comercial") {
    return "productos";
  }

  return ["activos", "productos", "movimientos"].includes(panel)
    ? panel
    : defaultInventoryPanelForCurrentUser();
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

function setInventoryPanel(panel) {
  activeInventoryPanel = normalizeInventoryPanel(panel);

  if (activeView === "inventario") {
    renderInventoryPanels();
    return;
  }

  switchView("inventario", {
    inventoryPanel: activeInventoryPanel,
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

function renderInventoryPanels() {
  const normalizedPanel = normalizeInventoryPanel(activeInventoryPanel);
  activeInventoryPanel = normalizedPanel;

  elements.inventoryMenuButtons.forEach((button) => {
    const isActive = button.dataset.inventoryPanel === normalizedPanel;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(elements.inventoryPanels).forEach(([key, panel]) => {
    if (!panel) {
      return;
    }

    const shouldShow =
      key === normalizedPanel ||
      (normalizedPanel === "productos" && key === "comercial");
    panel.classList.toggle("active", shouldShow);
    panel.classList.toggle("is-hidden", !shouldShow);
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

function renderProgrammingPanels() {
  const normalizedPanel = normalizeProgrammingPanel(activeProgrammingPanel);
  activeProgrammingPanel = normalizedPanel;

  elements.programmingMenuButtons.forEach((button) => {
    const isActive = button.dataset.programmingPanel === normalizedPanel;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(elements.programmingPanels).forEach(([key, panel]) => {
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
  renderAccountingView();
  renderPortfolioView();
  renderProgrammingView();
  renderInventoryView();
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
              <small>${escapeHtml(item.linea)} · ${escapeHtml(item.categoria)} · ${escapeHtml(item.descripcion || "Sin descripcion")}</small>
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
              <strong>${escapeHtml(item.descripcion || "Sin descripcion")}</strong>
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

function createDetailToggleButton(attributeName, id, isExpanded, label) {
  return `
    <button
      class="table-button icon-button detail-toggle-button ${isExpanded ? "is-open" : ""}"
      type="button"
      ${attributeName}="${escapeHtml(String(id))}"
      title="${escapeHtml(label)}"
      aria-label="${escapeHtml(label)}"
      aria-expanded="${isExpanded ? "true" : "false"}"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    </button>
  `;
}

function createDetailItem(label, value, extraClass = "") {
  return `
    <article class="detail-item ${extraClass}">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderMovementSummary(item, isExpanded) {
  const summaryTitle = item.cliente || "Sin cliente";
  const summaryMeta = [
    item.categoria || item.descripcion || "Movimiento registrado",
    item.linea,
    item.tipo,
    item.medioPago,
  ]
    .filter(Boolean)
    .map((value) => escapeHtml(String(value)))
    .join(" · ");

  return `
    <div class="compact-summary">
      <div class="compact-summary-head">
        <div class="compact-summary-copy">
          <strong>${escapeHtml(summaryTitle)}</strong>
          <span class="compact-summary-date">${formatDate(item.fecha)}</span>
        </div>
        ${createDetailToggleButton(
          "data-movement-detail-id",
          item.id,
          isExpanded,
          isExpanded ? "Ocultar detalle del movimiento" : "Ver detalle del movimiento"
        )}
      </div>
      <small class="compact-summary-meta">${summaryMeta}</small>
    </div>
  `;
}

function renderMovementDetail(item) {
  const inventoryProduct = getInventoryProductById(item.inventoryProductId);
  const inventoryProductLabel = inventoryProduct
    ? `${inventoryProduct.name} · ${inventoryProduct.area}`
    : item.inventoryProductId
      ? `Producto #${item.inventoryProductId}`
      : "";

  return `
    <div class="detail-panel">
      <div class="detail-grid">
        ${createDetailItem("Caja", escapeHtml(item.medioPago))}
        ${createDetailItem("Abono", formatCurrency(item.abono))}
        ${createDetailItem(
          "Flujo neto",
          `<span class="${item.flujoNeto >= 0 ? "positive" : "negative"}">${formatCurrency(
            item.flujoNeto
          )}</span>`
        )}
        ${createDetailItem(
          "Resumen",
            item.descripcion
              ? escapeHtml(item.descripcion)
              : "<span class='muted'>Sin resumen</span>",
          "detail-item--wide"
        )}
        ${
          item.inventoryEffect !== "ninguno" && inventoryProductLabel
            ? createDetailItem(
                "Inventario",
                `${escapeHtml(inventoryProductLabel)}<br /><span class="muted">${escapeHtml(
                  `${item.inventoryEffect === "entrada" ? "Entrada" : "Salida"} · ${formatInventoryQuantity(
                    item.inventoryQuantity,
                    inventoryProduct?.unitName || ""
                  )}`
                )}</span>`,
                "detail-item--wide"
              )
            : ""
        }
        ${createDetailItem(
          "Observaciones",
          item.observaciones
            ? escapeHtml(item.observaciones)
            : "<span class='muted'>Sin observaciones</span>",
          "detail-item--wide"
        )}
      </div>
    </div>
  `;
}

function renderPortfolioSummary(item, isExpanded) {
  const summaryText = item.descripcion || item.categoria || "Cuenta pendiente";
  const summaryMeta = [summaryText, formatDate(item.fecha), item.linea, item.categoria]
    .filter(Boolean)
    .map((value) => escapeHtml(String(value)))
    .join(" · ");

  return `
    <div class="compact-summary">
      <div class="compact-summary-head">
        <div class="compact-summary-copy">
          ${
            item.cliente
              ? `<button
                  class="table-link-button compact-client-button"
                  type="button"
                  data-collect-client="${escapeHtml(item.cliente)}"
                  data-collect-id="${item.id}"
                >${escapeHtml(item.cliente)}</button>`
              : "<strong>Sin cliente</strong>"
          }
        </div>
        ${createDetailToggleButton(
          "data-portfolio-detail-id",
          item.id,
          isExpanded,
          isExpanded ? "Ocultar detalle de la cuenta" : "Ver detalle de la cuenta"
        )}
      </div>
      <small class="compact-summary-meta">${summaryMeta}</small>
    </div>
  `;
}

function renderPortfolioDetail(item) {
  return `
    <div class="detail-panel">
      <div class="detail-grid">
        ${createDetailItem("Total", formatCurrency(item.valorTotal))}
        ${createDetailItem("Abono", formatCurrency(item.abono))}
        ${createDetailItem("Caja", escapeHtml(item.medioPago))}
        ${createDetailItem("Línea", escapeHtml(item.linea))}
        ${createDetailItem(
          "Observaciones",
          item.observaciones
            ? escapeHtml(item.observaciones)
            : "<span class='muted'>Sin observaciones</span>",
          "detail-item--wide"
        )}
      </div>
    </div>
  `;
}

function renderCollectionAccountDetail(item) {
  return `
    <div class="detail-panel detail-panel--collection">
      <div class="detail-grid">
        ${createDetailItem("Fecha", formatDate(item.fecha))}
        ${createDetailItem("Categoría", escapeHtml(item.categoria))}
        ${createDetailItem("Línea", escapeHtml(item.linea))}
        ${createDetailItem("Caja", escapeHtml(item.medioPago))}
        ${createDetailItem("Total", formatCurrency(item.valorTotal))}
        ${createDetailItem("Abono", formatCurrency(item.abono))}
        ${createDetailItem(
          "Observaciones",
          item.observaciones
            ? escapeHtml(item.observaciones)
            : "<span class='muted'>Sin observaciones</span>",
          "detail-item--wide"
        )}
      </div>
    </div>
  `;
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
        <td colspan="5" class="empty-state">
          ${emptyMessage}
        </td>
      </tr>
    `;
    applyStackTableLabels(elements.appShell);
    return;
  }

  elements.movementTable.innerHTML = getSortedMovements(filtered)
    .map(
      (item) => {
        const isExpanded = expandedMovementDetailIds.has(String(item.id));
        return `
          <tr class="accordion-summary-row ${isExpanded ? "is-expanded" : ""}">
            ${tableCell("Resumen", renderMovementSummary(item, isExpanded), "summary-cell")}
            ${tableCell(
              "Estado",
              `<span class="status-pill ${statusClass(item.estadoPago)}">${escapeHtml(item.estadoPago)}</span>`,
              "status-cell"
            )}
            ${tableCell("Total", formatCurrency(item.valorTotal), "numeric-cell")}
            ${tableCell("Saldo", formatCurrency(item.saldoPendiente), "numeric-cell")}
            ${tableCell(
              "Acciones",
              `
              <div class="row-actions row-actions--compact">
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
            `,
              "actions-cell"
            )}
          </tr>
          <tr class="accordion-detail-row ${isExpanded ? "is-open" : ""}">
            <td colspan="5" class="accordion-detail-cell">
              ${renderMovementDetail(item)}
            </td>
          </tr>
        `;
      }
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
  const totalPendingPayables = sum(summaries, "pendingPayables");
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

function getAccountingSelectedDateRange() {
  const rawFrom = normalizeDateOnly(elements.accountingDateFrom?.value);
  const rawTo = normalizeDateOnly(elements.accountingDateTo?.value);
  const fallback = defaultAccountingDateForCurrentUser();
  const from = rawFrom || rawTo || fallback;
  const to = rawTo || rawFrom || fallback;

  return from <= to
    ? { from, to }
    : {
        from: to,
        to: from,
      };
}

function getFilteredAccountingMovements() {
  const { from, to } = getAccountingSelectedDateRange();
  const selectedLine = String(elements.accountingLine?.value || "");
  const selectedType = String(elements.accountingType?.value || "");
  const query = normalizeSearchValue(elements.accountingQuery?.value || "");

  return getSortedMovements(
    state.movements.filter((item) => {
      const movementDate = normalizeDateOnly(item.fecha);
      if (movementDate && (movementDate < from || movementDate > to)) {
        return false;
      }

      if (selectedLine && item.linea !== selectedLine) {
        return false;
      }

      if (selectedType && item.tipo !== selectedType) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        item.linea,
        item.tipo,
        item.categoria,
        item.cliente,
        item.descripcion,
        item.medioPago,
        item.observaciones,
      ]
        .map((value) => normalizeSearchValue(value))
        .some((value) => value.includes(query));
    })
  );
}

function getFilteredAccountingDocuments() {
  const { from, to } = getAccountingSelectedDateRange();
  const selectedLine = String(elements.accountingLine?.value || "");
  const query = normalizeSearchValue(elements.accountingQuery?.value || "");

  return [...(state.accountingDocuments || [])].filter((item) => {
    const documentDate = normalizeDateOnly(item.accountingDate);
    if (documentDate && (documentDate < from || documentDate > to)) {
      return false;
    }

    if (selectedLine && item.businessLine !== selectedLine) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      item.businessLine,
      item.documentArea,
      item.documentType,
      item.reference,
      item.notes,
      item.originalName,
      item.uploadedBy,
    ]
      .map((value) => normalizeSearchValue(value))
      .some((value) => value.includes(query));
  });
}

function renderAccountingView() {
  if (
    !elements.accountingSummary ||
    !elements.accountingTable ||
    !elements.accountingDocumentsTable ||
    !elements.accountingDocumentsSummary ||
    !elements.accountingDocumentFeedback
  ) {
    return;
  }

  if (!hasAccountingAccess()) {
    elements.accountingSummary.innerHTML = "";
    elements.accountingTable.innerHTML = "";
    elements.accountingDocumentsTable.innerHTML = "";
    elements.accountingDocumentsSummary.innerHTML = "";
    return;
  }

  if (!elements.accountingDate.value) {
    elements.accountingDate.value = defaultAccountingDateForCurrentUser();
  }

  const movements = getFilteredAccountingMovements();
  const documents = getFilteredAccountingDocuments();
  const sales = movements.filter((item) => item.tipo === "Ingreso");
  const purchases = movements.filter((item) => item.tipo === "Costo");
  const expenses = movements.filter((item) => item.tipo === "Gasto");
  const netCash = movements.reduce(
    (acc, item) => acc + Number(item.flujoNeto || 0),
    0
  );

  elements.accountingSummary.innerHTML = [
    createStatCard(
      "Ventas del día",
      formatCurrency(sum(sales, "valorTotal")),
      `${sales.length} movimiento(s) · Cobrado ${formatCurrency(sum(sales, "abono"))}`
    ),
    createStatCard(
      "Compras / costos",
      formatCurrency(sum(purchases, "valorTotal")),
      `${purchases.length} movimiento(s)`
    ),
    createStatCard(
      "Gastos",
      formatCurrency(sum(expenses, "valorTotal")),
      `${expenses.length} movimiento(s)`
    ),
    createStatCard(
      "Flujo neto",
      formatCurrency(netCash),
      `Saldo pendiente ${formatCurrency(sum(movements, "saldoPendiente"))}`
    ),
  ].join("");

  elements.accountingTable.innerHTML = movements.length
    ? movements
        .map(
          (item) => `
            <tr>
              <td>${formatDate(item.fecha)}</td>
              <td>${escapeHtml(item.linea)}</td>
              <td>${escapeHtml(item.tipo)}</td>
              <td>${escapeHtml(item.categoria)}</td>
              <td>${item.cliente ? escapeHtml(item.cliente) : "<span class='muted'>Sin cliente</span>"}</td>
              <td>${item.descripcion ? escapeHtml(item.descripcion) : "<span class='muted'>Sin descripción</span>"}</td>
              <td>${escapeHtml(item.medioPago)}</td>
              <td>${formatCurrency(item.valorTotal)}</td>
              <td>${formatCurrency(item.abono)}</td>
              <td>${formatCurrency(item.saldoPendiente)}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="10" class="empty-state">
          No hay movimientos para la fecha y filtros seleccionados.
        </td>
      </tr>
    `;

  elements.accountingDocumentsSummary.innerHTML = `
    <div class="mini-stat"><span>Soportes visibles</span><strong>${documents.length}</strong></div>
    <div class="mini-stat"><span>Total cargados</span><strong>${(state.accountingDocuments || []).length}</strong></div>
  `;

  elements.accountingDocumentsTable.innerHTML = documents.length
    ? documents
        .map(
          (item) => `
            <tr>
              <td>${formatDate(item.accountingDate)}</td>
              <td>${escapeHtml(item.businessLine)}</td>
              <td>${escapeHtml(item.documentArea)}</td>
              <td>
                <strong>${escapeHtml(item.documentType)}</strong>
                ${
                  item.reference
                    ? `<small class="muted table-subcopy">${escapeHtml(item.reference)}</small>`
                    : ""
                }
              </td>
              <td>
                <a class="table-link-button" href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noopener">
                  ${escapeHtml(item.originalName)}
                </a>
              </td>
              <td>${escapeHtml(item.uploadedBy || "Sistema")}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="6" class="empty-state">
          No hay soportes contables cargados para esos filtros.
        </td>
      </tr>
    `;
}

function getCollectionClientKey(clientName = "") {
  return normalizeSearchValue(clientName) || "__sin_cliente__";
}

function getPortfolioMovementsByClientKey(
  clientKey,
  source = getPortfolioMovements()
) {
  return getSortedMovements(
    (Array.isArray(source) ? source : []).filter(
      (item) => getCollectionClientKey(item.cliente) === clientKey
    )
  );
}

function getSelectedCollectionClientMovements() {
  if (!selectedCollectionClientKey) {
    return [];
  }

  return getPortfolioMovementsByClientKey(selectedCollectionClientKey);
}

function getSelectedCollectionClientDisplayName() {
  const movements = getSelectedCollectionClientMovements();
  return movements[0]?.cliente || "Cliente sin nombre";
}

function getSelectedCollectionMovementIdsForClient(clientMovements = []) {
  const validIds = new Set(
    clientMovements.map((item) => String(item.id))
  );

  return selectedCollectionMovementIds.filter((id) => validIds.has(String(id)));
}

function getSelectedCollectionMovementsForPayment() {
  const clientMovements = getSelectedCollectionClientMovements();
  const selectedIds = new Set(
    getSelectedCollectionMovementIdsForClient(clientMovements)
  );

  return clientMovements.filter((item) => selectedIds.has(String(item.id)));
}

function setSelectedCollectionMovementIds(ids) {
  selectedCollectionMovementIds = [...new Set((ids || []).map((id) => String(id)))];
}

function selectCollectionClient(clientName, options = {}) {
  const clientKey = getCollectionClientKey(clientName);
  const clientMovements = getPortfolioMovementsByClientKey(clientKey);

  if (!clientMovements.length) {
    selectedCollectionClientKey = null;
    selectedCollectionMovementId = null;
    setSelectedCollectionMovementIds([]);
    syncCollectionSelectionState();
    return false;
  }

  const preferredMovementId = String(options.movementId || "");
  const selectedMovement =
    clientMovements.find(
      (item) => String(item.id) === String(preferredMovementId)
    ) || clientMovements[0];

  selectedCollectionClientKey = clientKey;
  selectedCollectionMovementId = selectedMovement
    ? String(selectedMovement.id)
    : null;
  setSelectedCollectionMovementIds(
    selectedMovement ? [String(selectedMovement.id)] : []
  );
  syncCollectionSelectionState();
  return true;
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
        <td colspan="4" class="empty-state">
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
    .map((item) => {
      const isSelectedMovement =
        String(item.id) === String(selectedCollectionMovementId);
      const isSelectedClient =
        getCollectionClientKey(item.cliente) === selectedCollectionClientKey;
      const isExpanded = expandedPortfolioDetailIds.has(String(item.id));

      return `
        <tr class="accordion-summary-row ${isExpanded ? "is-expanded" : ""} ${
          isSelectedMovement
            ? "portfolio-row-selected"
            : isSelectedClient
              ? "portfolio-row-client-selected"
              : ""
        }">
          ${tableCell(
            "Resumen",
            renderPortfolioSummary(item, isExpanded),
            "summary-cell"
          )}
          ${tableCell(
            "Estado",
            `<span class="status-pill ${statusClass(item.estadoPago)}">${escapeHtml(item.estadoPago)}</span>`,
            "status-cell"
          )}
          ${tableCell("Saldo", formatCurrency(item.saldoPendiente), "numeric-cell")}
          ${tableCell(
            "Acciones",
            `
            <div class="row-actions row-actions--compact">
              ${
                item.tipo === "Ingreso"
                  ? `
                    <button
                      class="table-button"
                      type="button"
                      data-collect-id="${item.id}"
                      data-collect-client="${escapeHtml(item.cliente || "")}"
                    >
                      Cobrar
                    </button>
                  `
                  : "<span class='muted'>No aplica</span>"
              }
            </div>
          `
            ,
            "actions-cell"
          )}
        </tr>
        <tr class="accordion-detail-row ${isExpanded ? "is-open" : ""}">
          <td colspan="4" class="accordion-detail-cell">
            ${renderPortfolioDetail(item)}
          </td>
        </tr>
      `;
    })
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
  const filteredClients = getFilteredClientsAdminList();
  const query = getClientsSearchQuery();
  const activeClients = clients.filter((item) => item.isActive);
  const clientsWithBalance = getPortfolioMovements().filter((item) => item.cliente).length;

  elements.clientsMetrics.innerHTML = `
    <div class="mini-stat"><span>Total clientes</span><strong>${clients.length}</strong></div>
    <div class="mini-stat"><span>Activos</span><strong>${activeClients.length}</strong></div>
    <div class="mini-stat"><span>Inactivos</span><strong>${Math.max(clients.length - activeClients.length, 0)}</strong></div>
    <div class="mini-stat"><span>${query ? "Coincidencias" : "Con saldo pendiente"}</span><strong>${query ? filteredClients.length : clientsWithBalance}</strong></div>
  `;

  if (!clients.length) {
    elements.clientsTable.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          Aún no hay clientes registrados.
        </td>
      </tr>
    `;
    return;
  }

  if (!filteredClients.length) {
    elements.clientsTable.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          No encontramos clientes que coincidan con esa búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  elements.clientsTable.innerHTML = filteredClients
    .map((client) => {
      const nextActive = client.isActive ? "false" : "true";
      const statusTitle = client.isActive ? "Inactivar cliente" : "Activar cliente";

      return `
        <tr>
          <td>${escapeHtml(client.fullName)}</td>
          <td>${client.alias ? escapeHtml(client.alias) : "<span class='muted'>Sin alias</span>"}</td>
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
  const accountants = users.filter((item) => item.role === "contador");

  elements.usersMetrics.innerHTML = `
    <div class="mini-stat"><span>Total usuarios</span><strong>${users.length}</strong></div>
    <div class="mini-stat"><span>Activos</span><strong>${activeUsers.length}</strong></div>
    <div class="mini-stat"><span>Administradores</span><strong>${admins.length}</strong></div>
    <div class="mini-stat"><span>Asistentes operativos</span><strong>${assistants.length}</strong></div>
    <div class="mini-stat"><span>Contadores</span><strong>${accountants.length}</strong></div>
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
  if (
    !elements.excelImportSummary ||
    !elements.excelImportFeedback ||
    !elements.usersClientsImportSummary ||
    !elements.usersClientsImportFeedback
  ) {
    return;
  }

  if (!isAdminUser()) {
    elements.excelImportSummary.innerHTML = `
      <div class="empty-state">
        Solo el perfil administrador puede usar la carga de Excel.
      </div>
    `;
    elements.usersClientsImportSummary.innerHTML = `
      <div class="empty-state">
        Solo el perfil administrador puede usar la carga de clientes.
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
  } else {
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

  if (!lastUsersClientsImportReport) {
    elements.usersClientsImportSummary.innerHTML = `
      <div class="empty-state">
        Aquí verás cuántos clientes fueron evaluados, creados o actualizados desde el archivo de usuarios.
      </div>
    `;
    return;
  }

  elements.usersClientsImportSummary.innerHTML = `
    <article class="list-item">
      <strong>${escapeHtml(lastUsersClientsImportReport.fileName || "Archivo importado")}</strong>
      <small>${escapeHtml(lastUsersClientsImportReport.message || "Carga completada.")}</small>
    </article>
    <div class="mini-stats compact-mini-stats">
      <div class="mini-stat"><span>Clientes evaluados</span><strong>${Number(lastUsersClientsImportReport.considered || 0)}</strong></div>
      <div class="mini-stat"><span>Clientes creados</span><strong>${Number(lastUsersClientsImportReport.inserted || 0)}</strong></div>
      <div class="mini-stat"><span>Clientes actualizados</span><strong>${Number(lastUsersClientsImportReport.updated || 0)}</strong></div>
      <div class="mini-stat"><span>Cruce por cédula</span><strong>${Number(lastUsersClientsImportReport.matchedByDocument || 0)}</strong></div>
      <div class="mini-stat"><span>Cruce por nombre</span><strong>${Number(lastUsersClientsImportReport.matchedByName || 0)}</strong></div>
      <div class="mini-stat"><span>Total en clientes</span><strong>${Number(lastUsersClientsImportReport.totalClients || 0)}</strong></div>
    </div>
  `;
}

function renderInventoryView() {
  if (
    !elements.inventorySummary ||
    !elements.inventoryAssetsTable ||
    !elements.inventoryProductsTable ||
    !elements.inventoryMovementsTable
  ) {
    return;
  }

  renderInventoryPanels();

  if (!isAdminUser()) {
    elements.inventorySummary.innerHTML = `
      <div class="empty-state">
        Solo el perfil administrador puede consultar y gestionar inventario.
      </div>
    `;
    elements.inventoryAssetsMetrics.innerHTML = "";
    elements.inventoryProductsMetrics.innerHTML = "";
    elements.inventoryMovementsMetrics.innerHTML = "";
    elements.inventoryAssetsTable.innerHTML = "";
    elements.inventoryProductsTable.innerHTML = "";
    elements.inventoryMovementsTable.innerHTML = "";
    if (elements.inventoryBusinessProductsMetrics) {
      elements.inventoryBusinessProductsMetrics.innerHTML = "";
    }
    if (elements.inventoryBusinessProductsTable) {
      elements.inventoryBusinessProductsTable.innerHTML = "";
    }
    if (elements.inventoryBusinessComponentsList) {
      elements.inventoryBusinessComponentsList.innerHTML = "";
    }
    fillInventoryProductSelect();
    return;
  }

  fillInventoryProductSelect();
  syncInventoryProductKindFields();
  fillInventoryProductBusinessCategoryOptions();
  syncUnifiedInventorySaleFields();
  fillInventoryBusinessProductCategoryOptions();
  fillBusinessProductDirectInventoryOptions();
  fillBusinessProductComponentInventoryOptions();
  renderInventorySummary();
  renderInventoryAssetsTable();
  renderInventoryProductsTable();
  renderInventoryBusinessProducts();
  renderInventoryStockMovementsTable();
  applyStackTableLabels(elements.appShell);
}

function renderInventorySummary() {
  const assets = Array.isArray(state.inventoryAssets) ? state.inventoryAssets : [];
  const products = Array.isArray(state.inventoryProducts) ? state.inventoryProducts : [];
  const stockMovements = Array.isArray(state.inventoryStockMovements)
    ? state.inventoryStockMovements
    : [];
  const activeAssets = assets.filter((item) => item.isActive);
  const activeProducts = products.filter((item) => item.isActive);
  const lowStockProducts = activeProducts.filter(
    (item) => isInventoryProductStockTracked(item) && item.currentStock <= item.minimumStock
  );
  const assetValue = activeAssets.reduce(
    (total, item) => total + Number(item.purchaseValue || 0),
    0
  );
  const stockValue = activeProducts.reduce(
    (total, item) =>
      total +
      (isInventoryProductStockTracked(item)
        ? Number(item.currentStock || 0) * Number(item.costPrice || 0)
        : 0),
    0
  );

  elements.inventorySummary.innerHTML = [
    createStatCard(
      "Activos gimnasio",
      String(activeAssets.length),
      `${assets.length} registros · Valor ${formatCurrency(assetValue)}`
    ),
    createStatCard(
      "Productos y servicios",
      String(activeProducts.length),
      `${lowStockProducts.length} inventariables con stock bajo`
    ),
    createStatCard(
      "Costo inventario",
      formatCurrency(stockValue),
      "Estimado segun stock actual y costo de compra"
    ),
    createStatCard(
      "Movimientos de stock",
      String(stockMovements.length),
      "Entradas, salidas y ajustes registrados"
    ),
    createStatCard(
      "Venta y recetas",
      String((state.businessProducts || []).filter((item) => item.isActive).length),
      `${(state.businessProductComponents || []).length} componentes de receta configurados`
    ),
  ].join("");
}

function isInventoryProductStockTracked(item) {
  if (item?.tracksStock === true || item?.tracksStock === false) {
    return Boolean(item.tracksStock);
  }

  return (item?.itemKind || "Insumo") !== "Servicio";
}

function getFilteredInventoryAssets() {
  const query = normalizeSearchValue(elements.inventoryAssetQuery?.value || "");
  const items = Array.isArray(state.inventoryAssets) ? state.inventoryAssets : [];

  if (!query) {
    return items;
  }

  return items.filter((item) =>
    normalizeSearchValue(
      [
        item.name,
        item.category,
        item.location,
        item.conditionStatus,
        item.brandModel,
        item.serialNumber,
        item.notes,
        item.purchaseValue,
      ].join(" ")
    ).includes(query)
  );
}

function getFilteredInventoryProducts() {
  const query = normalizeSearchValue(elements.inventoryProductQuery?.value || "");
  const items = Array.isArray(state.inventoryProducts) ? state.inventoryProducts : [];

  if (!query) {
    return items;
  }

  return items.filter((item) =>
    normalizeSearchValue(
      [
        item.name,
        item.area,
        item.itemKind,
        item.category,
        item.unitName,
        item.notes,
        item.currentStock,
        item.minimumStock,
        item.costPrice,
        item.salePrice,
      ].join(" ")
    ).includes(query)
  );
}

function getFilteredInventoryStockMovements() {
  const query = normalizeSearchValue(elements.inventoryMovementQuery?.value || "");
  const items = Array.isArray(state.inventoryStockMovements)
    ? state.inventoryStockMovements
    : [];

  if (!query) {
    return items;
  }

  return items.filter((item) =>
    normalizeSearchValue(
      [
        item.productName,
        item.productArea,
        item.productUnitName,
        inventoryMovementTypeLabel(item.movementType),
        item.reference,
        item.notes,
        item.registeredBy,
        item.quantity,
        item.stockBefore,
        item.stockAfter,
      ].join(" ")
    ).includes(query)
  );
}

function renderInventoryAssetsTable() {
  const items = getFilteredInventoryAssets();
  const activeAssets = items.filter((item) => item.isActive);
  const maintenanceAssets = activeAssets.filter(
    (item) => item.conditionStatus === "En mantenimiento"
  );
  const activeValue = activeAssets.reduce(
    (total, item) => total + Number(item.purchaseValue || 0),
    0
  );

  elements.inventoryAssetsMetrics.innerHTML = `
    <div class="mini-stat"><span>Total</span><strong>${items.length}</strong></div>
    <div class="mini-stat"><span>Activos</span><strong>${activeAssets.length}</strong></div>
    <div class="mini-stat"><span>Mantenimiento</span><strong>${maintenanceAssets.length}</strong></div>
    <div class="mini-stat"><span>Valor</span><strong>${formatCurrency(activeValue)}</strong></div>
  `;

  if (!items.length) {
    elements.inventoryAssetsTable.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">No hay activos registrados para esos filtros.</td>
      </tr>
    `;
    return;
  }

  elements.inventoryAssetsTable.innerHTML = items
    .map((item) => {
      const nextActive = item.isActive ? "false" : "true";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <div class="inline-hint">${escapeHtml(item.brandModel || "Sin marca o modelo")}</div>
          </td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.location || "Sin ubicacion")}</td>
          <td>
            <span class="status-pill ${item.isActive ? "user-status-active" : "user-status-inactive"}">
              ${escapeHtml(item.conditionStatus || (item.isActive ? "Operativo" : "Inactivo"))}
            </span>
          </td>
          <td>${formatCurrency(item.purchaseValue)}</td>
          <td>
            <div class="row-actions row-actions--compact">
              <button
                class="table-button icon-button"
                type="button"
                data-inventory-asset-edit-id="${item.id}"
                title="Editar activo"
                aria-label="Editar activo"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                  <path d="m12 6 4 4"></path>
                </svg>
              </button>
              <button
                class="table-button ${item.isActive ? "danger" : ""} icon-button"
                type="button"
                data-inventory-asset-status-id="${item.id}"
                data-inventory-asset-next-active="${nextActive}"
                title="${item.isActive ? "Inactivar activo" : "Activar activo"}"
                aria-label="${item.isActive ? "Inactivar activo" : "Activar activo"}"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3v7"></path>
                  <path d="M7.8 5.8A9 9 0 1 0 16.2 5.8"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderInventoryProductsTable() {
  const items = getFilteredInventoryProducts();
  const activeProducts = items.filter((item) => item.isActive);
  const lowStockProducts = activeProducts.filter(
    (item) => isInventoryProductStockTracked(item) && item.currentStock <= item.minimumStock
  );
  const stockValue = activeProducts.reduce(
    (total, item) =>
      total +
      (isInventoryProductStockTracked(item)
        ? Number(item.currentStock || 0) * Number(item.costPrice || 0)
        : 0),
    0
  );

  elements.inventoryProductsMetrics.innerHTML = `
    <div class="mini-stat"><span>Total</span><strong>${items.length}</strong></div>
    <div class="mini-stat"><span>Activos</span><strong>${activeProducts.length}</strong></div>
    <div class="mini-stat"><span>Bajo minimo</span><strong>${lowStockProducts.length}</strong></div>
    <div class="mini-stat"><span>Valor costo</span><strong>${formatCurrency(stockValue)}</strong></div>
  `;

  if (!items.length) {
    elements.inventoryProductsTable.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">No hay productos o servicios registrados para esos filtros.</td>
      </tr>
    `;
    return;
  }

  elements.inventoryProductsTable.innerHTML = items
    .map((item) => {
      const nextActive = item.isActive ? "false" : "true";
      const isLowStock =
        item.isActive &&
        isInventoryProductStockTracked(item) &&
        item.currentStock <= item.minimumStock;
      const linkedBusinessProduct = getLinkedBusinessProductForInventoryProduct(item.id);
      const recipeComponents = linkedBusinessProduct
        ? getBusinessProductComponents(linkedBusinessProduct.id)
        : [];
      const classificationHints = [
        isInventoryProductStockTracked(item) ? "Inventariable" : "Sin stock",
        item.itemKind || "Insumo",
        linkedBusinessProduct?.isActive ? "Se vende" : "",
        item.itemKind === "Insumo" ? "Es insumo" : "",
        linkedBusinessProduct?.isActive && linkedBusinessProduct?.directInventoryProductId > 0
          ? "Venta directa"
          : "",
        linkedBusinessProduct?.isActive && recipeComponents.length > 0 ? "Con receta" : "",
      ].filter(Boolean);
      const saleValue = linkedBusinessProduct?.isActive
        ? linkedBusinessProduct?.defaultAmount || item.salePrice || 0
        : 0;
      return `
        <tr class="${isLowStock ? "inventory-row-low-stock" : ""}">
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <div class="inline-hint">${escapeHtml(item.category)} · ${escapeHtml(item.unitName)}</div>
          </td>
          <td>${escapeHtml(item.area)}</td>
          <td>${escapeHtml(classificationHints.join(" | "))}</td>
          <td>${escapeHtml(
            isInventoryProductStockTracked(item)
              ? formatInventoryQuantity(item.currentStock, item.unitName)
              : "No maneja stock"
          )}</td>
          <td>${escapeHtml(
            isInventoryProductStockTracked(item)
              ? formatInventoryQuantity(item.minimumStock, item.unitName)
              : "-"
          )}</td>
          <td>${formatCurrency(saleValue)}</td>
          <td>
            <div class="row-actions row-actions--compact">
              <button
                class="table-button icon-button"
                type="button"
                data-inventory-product-edit-id="${item.id}"
                title="Editar producto o servicio"
                aria-label="Editar producto o servicio"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                  <path d="m12 6 4 4"></path>
                </svg>
              </button>
              <button
                class="table-button ${item.isActive ? "danger" : ""} icon-button"
                type="button"
                data-inventory-product-status-id="${item.id}"
                data-inventory-product-next-active="${nextActive}"
                title="${item.isActive ? "Inactivar producto o servicio" : "Activar producto o servicio"}"
                aria-label="${item.isActive ? "Inactivar producto o servicio" : "Activar producto o servicio"}"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3v7"></path>
                  <path d="M7.8 5.8A9 9 0 1 0 16.2 5.8"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getFilteredBusinessProducts() {
  const query = normalizeSearchValue(
    elements.inventoryBusinessProductQuery?.value || ""
  );
  const items = Array.isArray(state.businessProducts) ? state.businessProducts : [];

  if (!query) {
    return items;
  }

  return items.filter((item) =>
    normalizeSearchValue(
      [
        item.name,
        item.businessLine,
        item.itemType,
        item.category,
        item.notes,
        item.defaultAmount,
        item.directInventoryProductName,
      ].join(" ")
    ).includes(query)
  );
}

function getBusinessProductById(productId) {
  return (state.businessProducts || []).find(
    (item) => String(item.id) === String(productId)
  );
}

function getBusinessProductComponents(businessProductId) {
  return (state.businessProductComponents || [])
    .filter((item) => String(item.businessProductId) === String(businessProductId))
    .sort((a, b) => {
      const sortCompare = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (sortCompare !== 0) {
        return sortCompare;
      }

      return Number(a.id || 0) - Number(b.id || 0);
    });
}

function fillInventoryBusinessProductCategoryOptions(selectedValue = "") {
  const line = elements.inventoryBusinessProductLine?.value || "Gimnasio";
  fillSelect(elements.inventoryBusinessProductType, getActiveCategoryValuesForLine(line), {
    includeValue: String(selectedValue || elements.inventoryBusinessProductType?.value || ""),
  });
}

function syncInventoryBusinessProductCategoryOptions(options = {}) {
  fillInventoryBusinessProductCategoryOptions(options.selectedValue || "");

  const availableValues = getAvailableSelectValues(elements.inventoryBusinessProductType);

  if (options.selectedValue && availableValues.includes(options.selectedValue)) {
    elements.inventoryBusinessProductType.value = options.selectedValue;
    return;
  }

  if (
    elements.inventoryBusinessProductType?.value &&
    availableValues.includes(elements.inventoryBusinessProductType.value)
  ) {
    return;
  }

  elements.inventoryBusinessProductType.value = availableValues[0] || "";
}

function getBusinessProductCategoryLabel(item) {
  if (!item) {
    return "";
  }

  return String(item.category || item.itemType || "").trim() || "Sin categoria";
}

function getBusinessProductDetailLabel(item) {
  if (!item) {
    return "";
  }

  const detail = String(item.itemType || "").trim();
  const category = getBusinessProductCategoryLabel(item);

  if (!detail || detail === category) {
    return "";
  }

  return detail;
}

function fillBusinessProductDirectInventoryOptions(selectedValue = "") {
  const products = (state.inventoryProducts || []).filter(
    (item) => item.isActive && isInventoryProductStockTracked(item)
  );
  fillSelectFromRecords(elements.inventoryBusinessProductDirectProductId, products, {
    selectedValue: String(selectedValue || elements.inventoryBusinessProductDirectProductId?.value || ""),
    placeholder: "Sin producto directo",
    labelBuilder: (item) =>
      `${item.name} · ${item.area} · Stock ${formatInventoryQuantity(
        item.currentStock,
        item.unitName
      )}`,
  });
}

function fillBusinessProductComponentInventoryOptions(selectedValue = "") {
  const products = (state.inventoryProducts || []).filter(
    (item) =>
      item.isActive &&
      isInventoryProductStockTracked(item) &&
      item.itemKind === "Insumo"
  );
  fillSelectFromRecords(elements.inventoryBusinessComponentProductId, products, {
    selectedValue: String(selectedValue || elements.inventoryBusinessComponentProductId?.value || ""),
    placeholder: "Selecciona un insumo del inventario",
    labelBuilder: (item) =>
      `${item.name} · ${item.area} · ${formatInventoryQuantity(
        item.currentStock,
        item.unitName
      )}`,
  });
}

function renderInventoryBusinessProducts() {
  const items = getFilteredBusinessProducts();
  const activeItems = items.filter((item) => item.isActive);
  const recipeConfigured = activeItems.filter(
    (item) => getBusinessProductComponents(item.id).length > 0
  );
  const directLinked = activeItems.filter((item) => item.directInventoryProductId > 0);

  if (elements.inventoryBusinessProductsMetrics) {
    elements.inventoryBusinessProductsMetrics.innerHTML = `
      <div class="mini-stat"><span>Total</span><strong>${items.length}</strong></div>
      <div class="mini-stat"><span>Activos</span><strong>${activeItems.length}</strong></div>
      <div class="mini-stat"><span>Con receta</span><strong>${recipeConfigured.length}</strong></div>
      <div class="mini-stat"><span>Venta directa stock</span><strong>${directLinked.length}</strong></div>
    `;
  }

  if (elements.inventoryBusinessProductsTable) {
    if (!items.length) {
      elements.inventoryBusinessProductsTable.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">No hay productos o servicios registrados para esos filtros.</td>
        </tr>
      `;
    } else {
      elements.inventoryBusinessProductsTable.innerHTML = items
        .map((item) => {
          const nextActive = item.isActive ? "false" : "true";
          const components = getBusinessProductComponents(item.id);
          const categoryLabel = getBusinessProductCategoryLabel(item);
          const detailLabel = getBusinessProductDetailLabel(item);
          const inventorySummary =
            item.directInventoryProductId > 0
              ? `${item.directInventoryProductName || "Producto directo"} · ${formatInventoryQuantity(
                  item.directInventoryQuantity,
                  item.directInventoryProductUnitName
                )}`
              : components.length
                ? `${components.length} insumo(s) en receta`
                : "Sin descuento automatico";

          return `
            <tr>
              <td>
                <strong>${escapeHtml(item.name)}</strong>
                ${detailLabel ? `<div class="inline-hint">${escapeHtml(detailLabel)}</div>` : ""}
              </td>
              <td>${escapeHtml(item.businessLine)}</td>
              <td>
                <strong>${escapeHtml(categoryLabel)}</strong>
                ${detailLabel ? `<div class="inline-hint">${escapeHtml(detailLabel)}</div>` : ""}
              </td>
              <td>${formatCurrency(item.defaultAmount)}</td>
              <td>${escapeHtml(inventorySummary)}</td>
              <td>
                <div class="row-actions row-actions--compact">
                  <button
                    class="table-button icon-button"
                    type="button"
                    data-business-product-edit-id="${item.id}"
                    title="Editar producto o servicio"
                    aria-label="Editar producto o servicio"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                      <path d="m12 6 4 4"></path>
                    </svg>
                  </button>
                  <button
                    class="table-button ${item.isActive ? "danger" : ""} icon-button"
                    type="button"
                    data-business-product-status-id="${item.id}"
                    data-business-product-next-active="${nextActive}"
                    title="${item.isActive ? "Inactivar producto o servicio" : "Activar producto o servicio"}"
                    aria-label="${item.isActive ? "Inactivar producto o servicio" : "Activar producto o servicio"}"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M12 3v7"></path>
                      <path d="M7.8 5.8A9 9 0 1 0 16.2 5.8"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("");
    }
  }

  const activeId = Number(elements.inventoryBusinessProductId?.value || 0);
  const selectedProduct = getBusinessProductById(activeId);
  const selectedComponents = selectedProduct
    ? getBusinessProductComponents(selectedProduct.id)
    : [];

  if (elements.inventoryBusinessProductRecipeTitle) {
    elements.inventoryBusinessProductRecipeTitle.textContent = selectedProduct
      ? `Receta y descuento automatico de ${selectedProduct.name}`
      : "Configuracion de receta y descuento automatico";
  }

  if (elements.inventoryBusinessProductRecipeContext) {
    const categoryLabel = getBusinessProductCategoryLabel(selectedProduct);
    const detailLabel = getBusinessProductDetailLabel(selectedProduct);
    elements.inventoryBusinessProductRecipeContext.innerHTML = selectedProduct
      ? `
        <strong>${escapeHtml(selectedProduct.name)}</strong>
        <small>${escapeHtml(selectedProduct.businessLine)} · ${escapeHtml(
          categoryLabel
        )} · ${formatCurrency(selectedProduct.defaultAmount)}</small>
      `
      : `
        <strong>Sin seleccion activa</strong>
        <small>Edita un producto o servicio arriba para definir si se vende directo o si descuenta varios insumos por receta.</small>
      `;
  }

  if (elements.inventoryBusinessComponentForm) {
    const enabled = Boolean(selectedProduct);
    [
      elements.inventoryBusinessComponentProductId,
      elements.inventoryBusinessComponentQuantity,
      elements.inventoryBusinessComponentNotes,
      elements.inventoryBusinessComponentForm.querySelector('button[type="submit"]'),
    ].forEach((node) => {
      if (node) {
        node.disabled = !enabled;
      }
    });
  }

  if (elements.inventoryBusinessComponentsList) {
    if (!selectedProduct) {
      elements.inventoryBusinessComponentsList.innerHTML = `
        <div class="empty-state collection-empty">
          Guarda primero el producto o servicio, o edita uno existente, para empezar a construir su receta.
        </div>
      `;
    } else if (!selectedComponents.length) {
      elements.inventoryBusinessComponentsList.innerHTML = `
        <div class="empty-state collection-empty">
          Aun no hay insumos configurados para ${escapeHtml(selectedProduct.name)}.
        </div>
      `;
    } else {
      elements.inventoryBusinessComponentsList.innerHTML = selectedComponents
        .map(
          (component) => `
            <article class="catalog-item">
              <div class="catalog-item-copy">
                <strong>${escapeHtml(component.inventoryProductName)}</strong>
                <small>
                  ${escapeHtml(component.inventoryProductArea || "Sin area")} ·
                  ${escapeHtml(
                    formatInventoryQuantity(
                      component.quantity,
                      component.inventoryProductUnitName
                    )
                  )}
                  ${component.notes ? ` · ${escapeHtml(component.notes)}` : ""}
                </small>
              </div>
              <div class="row-actions row-actions--compact">
                <button
                  class="table-button danger icon-button"
                  type="button"
                  data-business-component-delete-id="${component.id}"
                  title="Eliminar insumo de la receta"
                  aria-label="Eliminar insumo de la receta"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M3 6h18"></path>
                    <path d="M8 6V4h8v2"></path>
                    <path d="m19 6-1 14H6L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                  </svg>
                </button>
              </div>
            </article>
          `
        )
        .join("");
    }
  }
}

function renderInventoryStockMovementsTable() {
  const items = getFilteredInventoryStockMovements();
  const entries = items.filter((item) => item.movementType === "entrada").length;
  const exits = items.filter((item) => item.movementType === "salida").length;
  const adjustments = items.filter((item) => item.movementType.includes("ajuste")).length;

  elements.inventoryMovementsMetrics.innerHTML = `
    <div class="mini-stat"><span>Registros</span><strong>${items.length}</strong></div>
    <div class="mini-stat"><span>Entradas</span><strong>${entries}</strong></div>
    <div class="mini-stat"><span>Salidas</span><strong>${exits}</strong></div>
    <div class="mini-stat"><span>Ajustes</span><strong>${adjustments}</strong></div>
  `;

  if (!items.length) {
    elements.inventoryMovementsTable.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">Aún no hay movimientos de inventario registrados.</td>
      </tr>
    `;
    return;
  }

  elements.inventoryMovementsTable.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${formatDate(item.movementDate)}</td>
          <td>
            <strong>${escapeHtml(item.productName)}</strong>
            <div class="inline-hint">${escapeHtml(item.productArea || "Sin area")}</div>
          </td>
          <td>${escapeHtml(inventoryMovementTypeLabel(item.movementType))}</td>
          <td>${escapeHtml(formatInventoryQuantity(item.quantity, item.productUnitName))}</td>
          <td>${escapeHtml(formatInventoryQuantity(item.stockBefore, item.productUnitName))} → ${escapeHtml(formatInventoryQuantity(item.stockAfter, item.productUnitName))}</td>
          <td>${escapeHtml(item.reference || "Sin referencia")}</td>
          <td>${escapeHtml(item.registeredBy || "Sistema")}</td>
        </tr>
      `
    )
    .join("");
}

function fillInventoryProductSelect(selectedValue = "") {
  if (!elements.inventoryMovementProductId) {
    return;
  }

  const products = (state.inventoryProducts || [])
    .filter((item) => item.isActive && isInventoryProductStockTracked(item))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  if (!products.length) {
    elements.inventoryMovementProductId.innerHTML = `
      <option value="">Primero crea un producto inventariable</option>
    `;
    elements.inventoryMovementProductId.disabled = true;
    return;
  }

  elements.inventoryMovementProductId.disabled = false;
  elements.inventoryMovementProductId.innerHTML = products
    .map((item) => {
      const label = `${item.name} · ${item.area} · ${formatInventoryQuantity(
        item.currentStock,
        item.unitName
      )}`;
      return `<option value="${item.id}">${escapeHtml(label)}</option>`;
    })
    .join("");

  if (selectedValue && products.some((item) => String(item.id) === String(selectedValue))) {
    elements.inventoryMovementProductId.value = String(selectedValue);
    return;
  }

  elements.inventoryMovementProductId.value = String(products[0].id);
}

function syncInventoryProductKindFields() {
  if (!elements.inventoryProductKind) {
    return;
  }

  const isService =
    elements.inventoryProductOfferType?.value === "Servicio" ||
    elements.inventoryProductKind.value === "Servicio";
  const tracksStock = Boolean(
    elements.inventoryProductTracksStock?.checked && !isService
  );

  if (isService) {
    elements.inventoryProductUnit.value = "Servicio";
    elements.inventoryProductCurrentStock.value = "0";
    elements.inventoryProductMinimumStock.value = "0";
    elements.inventoryProductCostPrice.value = "0";
  }

  elements.inventoryProductUnit.disabled = isService;
  elements.inventoryProductCurrentStock.disabled = !tracksStock;
  elements.inventoryProductMinimumStock.disabled = !tracksStock;
  elements.inventoryProductCostPrice.disabled = !tracksStock;

  const stockFields = document.querySelectorAll(".inventory-stock-config");
  stockFields.forEach((field) => {
    field.classList.toggle("is-hidden", !tracksStock);
    field.setAttribute("aria-hidden", String(!tracksStock));
  });

  if (!tracksStock) {
    elements.inventoryProductCurrentStock.value = "0";
    elements.inventoryProductMinimumStock.value = "0";
    elements.inventoryProductCostPrice.value = "0";
  }
}

function getLinkedBusinessProductForInventoryProduct(inventoryProductId) {
  return (state.businessProducts || []).find(
    (item) => Number(item.inventoryProductId || 0) === Number(inventoryProductId || 0)
  );
}

function fillInventoryProductBusinessCategoryOptions(selectedValue = "") {
  fillSelect(
    elements.inventoryProductBusinessCategory,
    getActiveCategoryValuesForLine(
      elements.inventoryProductBusinessLine?.value || "Gimnasio"
    ),
    {
      includeValue: String(
        selectedValue || elements.inventoryProductBusinessCategory?.value || ""
      ),
    }
  );
}

function syncUnifiedInventorySaleFields() {
  if (!elements.inventoryProductForm) {
    return;
  }

  const isService = elements.inventoryProductOfferType?.value === "Servicio";
  const isSellable = Boolean(elements.inventoryProductIsSellable?.checked || isService);
  const isIngredient = Boolean(elements.inventoryProductIsIngredient?.checked);
  const isDirectSale = Boolean(
    elements.inventoryProductIsDirectSale?.checked && isSellable && !isService
  );
  let tracksStock = Boolean(elements.inventoryProductTracksStock?.checked && !isService);

  if (elements.inventoryProductIsSellable && isService) {
    elements.inventoryProductIsSellable.checked = true;
    elements.inventoryProductIsSellable.disabled = true;
  } else if (elements.inventoryProductIsSellable) {
    elements.inventoryProductIsSellable.disabled = false;
  }

  if (elements.inventoryProductIsIngredient) {
    elements.inventoryProductIsIngredient.disabled = isService;
    if (isService) {
      elements.inventoryProductIsIngredient.checked = false;
    }
  }

  if (elements.inventoryProductIsDirectSale) {
    elements.inventoryProductIsDirectSale.disabled = !isSellable || isService;
    if (!isSellable || isService) {
      elements.inventoryProductIsDirectSale.checked = false;
    }
  }

  if (isService) {
    tracksStock = false;
  } else if (isIngredient || isDirectSale) {
    tracksStock = true;
  }

  if (elements.inventoryProductTracksStock) {
    elements.inventoryProductTracksStock.checked = tracksStock;
    elements.inventoryProductTracksStock.disabled =
      isService || isIngredient || isDirectSale;
  }

  if (elements.inventoryProductKind) {
    if (isService) {
      elements.inventoryProductKind.value = "Servicio";
      elements.inventoryProductKind.disabled = true;
    } else {
      if (isIngredient) {
        elements.inventoryProductKind.value = "Insumo";
      } else if (isSellable) {
        elements.inventoryProductKind.value = "Producto de venta";
      } else {
        elements.inventoryProductKind.value = "Suministro interno";
      }
      elements.inventoryProductKind.disabled = true;
    }
  }

  syncInventoryProductKindFields();
  fillInventoryProductBusinessCategoryOptions();

  const saleFields = document.querySelectorAll(".inventory-sale-config");
  saleFields.forEach((field) => {
    field.classList.toggle("is-hidden", !isSellable);
    field.setAttribute("aria-hidden", String(!isSellable));
  });

  if (elements.inventoryProductBusinessAmount) {
    elements.inventoryProductBusinessAmount.disabled = !isSellable;
  }

  if (elements.inventoryProductBusinessLine) {
    elements.inventoryProductBusinessLine.disabled = !isSellable;
  }

  if (elements.inventoryProductBusinessCategory) {
    elements.inventoryProductBusinessCategory.disabled = !isSellable;
  }

  if (elements.inventoryProductBusinessDetail) {
    elements.inventoryProductBusinessDetail.disabled = !isSellable;
  }

  if (elements.inventoryProductDirectQuantity) {
    elements.inventoryProductDirectQuantity.disabled = !isDirectSale;
    if (!isDirectSale) {
      elements.inventoryProductDirectQuantity.value = "1";
    }
  }

  if (isSellable && elements.inventoryProductBusinessAmount) {
    const normalizedAmount = Math.max(
      Number(elements.inventoryProductBusinessAmount.value || elements.inventoryProductSalePrice.value || 0),
      0
    );
    elements.inventoryProductBusinessAmount.value = String(normalizedAmount);
    elements.inventoryProductSalePrice.value = String(normalizedAmount);
  } else if (!isSellable && elements.inventoryProductSalePrice) {
    elements.inventoryProductSalePrice.value = "0";
  }
}

async function handleInventoryAssetSubmit(event) {
  event.preventDefault();

  const assetId = Number(elements.inventoryAssetId?.value || 0);
  const payload = {
    name: elements.inventoryAssetName.value.trim(),
    category: elements.inventoryAssetCategory.value.trim(),
    location: elements.inventoryAssetLocation.value.trim(),
    conditionStatus: elements.inventoryAssetCondition.value,
    brandModel: elements.inventoryAssetBrandModel.value.trim(),
    serialNumber: elements.inventoryAssetSerial.value.trim(),
    purchaseDate: elements.inventoryAssetPurchaseDate.value,
    purchaseValue: Number(elements.inventoryAssetPurchaseValue.value || 0),
    notes: elements.inventoryAssetNotes.value.trim(),
  };

  if (!payload.name || !payload.category) {
    elements.inventoryAssetFeedback.textContent =
      "El nombre y la categoria del activo son obligatorios.";
    return;
  }

  try {
    await apiRequest(assetId > 0 ? `/api/inventory/assets/${assetId}` : "/api/inventory/assets", {
      method: assetId > 0 ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    resetInventoryAssetForm();
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "activos",
    });
    elements.inventoryAssetFeedback.textContent =
      assetId > 0
        ? "Activo actualizado correctamente."
        : "Activo registrado correctamente.";
  } catch (error) {
    elements.inventoryAssetFeedback.textContent = error.message;
  }
}

function resetInventoryAssetForm() {
  if (!elements.inventoryAssetForm) {
    return;
  }

  elements.inventoryAssetForm.reset();
  elements.inventoryAssetId.value = "";
  elements.inventoryAssetCondition.value = "Operativo";
  elements.inventoryAssetPurchaseValue.value = "0";
  elements.inventoryAssetFeedback.textContent =
    "Aqui puedes llevar el control de maquinas, accesorios, mobiliario y equipos del gimnasio.";
  elements.inventoryAssetCancelEdit.classList.add("is-hidden");

  const submitButton = elements.inventoryAssetForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Guardar activo";
  }
}

async function handleInventoryAssetsTableClick(event) {
  const editButton = event.target.closest("[data-inventory-asset-edit-id]");
  const statusButton = event.target.closest("[data-inventory-asset-status-id]");

  if (editButton) {
    const asset = (state.inventoryAssets || []).find(
      (item) => String(item.id) === String(editButton.dataset.inventoryAssetEditId)
    );

    if (!asset) {
      elements.inventoryAssetFeedback.textContent =
        "No encontré el activo que quieres editar.";
      return;
    }

    elements.inventoryAssetId.value = String(asset.id);
    elements.inventoryAssetName.value = asset.name || "";
    elements.inventoryAssetCategory.value = asset.category || "";
    elements.inventoryAssetLocation.value = asset.location || "";
    elements.inventoryAssetCondition.value = asset.conditionStatus || "Operativo";
    elements.inventoryAssetBrandModel.value = asset.brandModel || "";
    elements.inventoryAssetSerial.value = asset.serialNumber || "";
    elements.inventoryAssetPurchaseDate.value = asset.purchaseDate || "";
    elements.inventoryAssetPurchaseValue.value = String(asset.purchaseValue || 0);
    elements.inventoryAssetNotes.value = asset.notes || "";
    elements.inventoryAssetFeedback.textContent =
      "Actualiza la informacion del activo y guarda para aplicar el cambio.";
    elements.inventoryAssetCancelEdit.classList.remove("is-hidden");

    const submitButton = elements.inventoryAssetForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = "Guardar cambios";
    }

    switchView("inventario", {
      inventoryPanel: "activos",
    });
    elements.inventoryAssetName.focus();
    return;
  }

  if (!statusButton) {
    return;
  }

  const assetId = statusButton.dataset.inventoryAssetStatusId;
  const activate = statusButton.dataset.inventoryAssetNextActive === "true";
  const confirmed = window.confirm(
    activate ? "¿Deseas activar este activo?" : "¿Deseas inactivar este activo?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/inventory/assets/${assetId}/active`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "activos",
    });
    elements.inventoryAssetFeedback.textContent = activate
      ? "Activo activado correctamente."
      : "Activo inactivado correctamente.";
  } catch (error) {
    elements.inventoryAssetFeedback.textContent = error.message;
  }
}

async function handleInventoryProductSubmit(event) {
  event.preventDefault();

  const productId = Number(elements.inventoryProductId?.value || 0);
  const businessProductId = Number(
    elements.inventoryProductBusinessProductId?.value || 0
  );
  const isService = elements.inventoryProductOfferType.value === "Servicio";
  const isSellable = Boolean(elements.inventoryProductIsSellable.checked || isService);
  const isIngredient = Boolean(elements.inventoryProductIsIngredient.checked);
  const isDirectSale = Boolean(
    elements.inventoryProductIsDirectSale.checked && isSellable && !isService
  );
  const tracksStock = Boolean(
    elements.inventoryProductTracksStock.checked && !isService
  );
  const resolvedItemKind = isService
    ? "Servicio"
    : isIngredient
      ? "Insumo"
      : isSellable
        ? "Producto de venta"
        : "Suministro interno";
  const payload = {
    name: elements.inventoryProductName.value.trim(),
    area: elements.inventoryProductArea.value,
    itemKind: resolvedItemKind,
    tracksStock,
    category: elements.inventoryProductCategory.value.trim(),
    unitName: isService ? "Servicio" : elements.inventoryProductUnit.value,
    currentStock: tracksStock ? Number(elements.inventoryProductCurrentStock.value || 0) : 0,
    minimumStock: tracksStock ? Number(elements.inventoryProductMinimumStock.value || 0) : 0,
    costPrice: tracksStock ? Number(elements.inventoryProductCostPrice.value || 0) : 0,
    salePrice: isSellable
      ? Number(elements.inventoryProductBusinessAmount.value || 0)
      : 0,
    notes: elements.inventoryProductNotes.value.trim(),
  };

  if (!payload.name || !payload.category) {
    elements.inventoryProductFeedback.textContent =
      "El nombre y la categoria del producto o servicio son obligatorios.";
    return;
  }

  if (
    isSellable &&
    !String(elements.inventoryProductBusinessCategory.value || "").trim()
  ) {
    elements.inventoryProductFeedback.textContent =
      "Si este producto o servicio se vende al cliente, debes escoger la categoria de venta.";
    return;
  }

  try {
    const savedInventoryProduct = await apiRequest(
      productId > 0 ? `/api/inventory/products/${productId}` : "/api/inventory/products",
      {
        method: productId > 0 ? "PUT" : "POST",
        body: JSON.stringify(payload),
      }
    );

    if (isSellable) {
      const saleCategory = String(
        elements.inventoryProductBusinessCategory.value || ""
      ).trim();

      const businessPayload = {
        name: payload.name,
        businessLine: elements.inventoryProductBusinessLine.value,
        inventoryProductId: Number(savedInventoryProduct.id || 0),
        itemType:
          String(elements.inventoryProductBusinessDetail.value || "").trim() ||
          saleCategory,
        category: saleCategory,
        defaultAmount: Number(
          elements.inventoryProductBusinessAmount.value || payload.salePrice || 0
        ),
        directInventoryProductId: isDirectSale ? Number(savedInventoryProduct.id || 0) : 0,
        directInventoryQuantity: isDirectSale
          ? Math.max(Number(elements.inventoryProductDirectQuantity.value || 1), 0.01)
          : 0,
        notes: payload.notes,
      };

      const savedBusinessProduct = await apiRequest(
        businessProductId > 0
          ? `/api/business-products/${businessProductId}`
          : "/api/business-products",
        {
          method: businessProductId > 0 ? "PUT" : "POST",
          body: JSON.stringify(businessPayload),
        }
      );

      if (elements.inventoryBusinessProductId) {
        elements.inventoryBusinessProductId.value = String(savedBusinessProduct.id || "");
      }
    } else if (businessProductId > 0) {
      await apiRequest(`/api/business-products/${businessProductId}/active`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: false,
        }),
      });
    }

    resetInventoryProductForm();
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "productos",
    });
    elements.inventoryProductFeedback.textContent =
      productId > 0
        ? "Producto o servicio actualizado correctamente."
        : "Producto o servicio registrado correctamente.";
  } catch (error) {
    elements.inventoryProductFeedback.textContent = error.message;
  }
}

function resetInventoryProductForm() {
  if (!elements.inventoryProductForm) {
    return;
  }

  elements.inventoryProductForm.reset();
  elements.inventoryProductId.value = "";
  elements.inventoryProductBusinessProductId.value = "";
  if (elements.inventoryBusinessProductId) {
    elements.inventoryBusinessProductId.value = "";
  }
  elements.inventoryProductArea.value = "Gimnasio";
  elements.inventoryProductOfferType.value = "Producto";
  elements.inventoryProductKind.value = "Insumo";
  elements.inventoryProductIsSellable.checked = false;
  elements.inventoryProductTracksStock.checked = true;
  elements.inventoryProductIsIngredient.checked = false;
  elements.inventoryProductIsDirectSale.checked = false;
  elements.inventoryProductBusinessLine.value = "Gimnasio";
  fillInventoryProductBusinessCategoryOptions("");
  elements.inventoryProductBusinessDetail.value = "";
  elements.inventoryProductBusinessAmount.value = "0";
  elements.inventoryProductDirectQuantity.value = "1";
  elements.inventoryProductUnit.value = "Unidad";
  elements.inventoryProductCurrentStock.value = "0";
  elements.inventoryProductMinimumStock.value = "0";
  elements.inventoryProductCostPrice.value = "0";
  elements.inventoryProductSalePrice.value = "0";
  syncInventoryProductKindFields();
  syncUnifiedInventorySaleFields();
  elements.inventoryProductFeedback.textContent =
    "Aqui registras una sola vez cada producto o servicio y defines si se vende, si maneja stock, si actua como insumo y si descuenta directo o por receta.";
  elements.inventoryProductCancelEdit.classList.add("is-hidden");

  const submitButton = elements.inventoryProductForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Guardar producto o servicio";
  }
}

async function handleInventoryProductsTableClick(event) {
  const editButton = event.target.closest("[data-inventory-product-edit-id]");
  const statusButton = event.target.closest("[data-inventory-product-status-id]");

  if (editButton) {
    const inventoryProductId = editButton.dataset.inventoryProductEditId;
    const product = (state.inventoryProducts || []).find(
      (item) => String(item.id) === String(inventoryProductId)
    );
    const linkedBusinessProduct = getLinkedBusinessProductForInventoryProduct(
      inventoryProductId
    );

    if (!product) {
      elements.inventoryProductFeedback.textContent =
        "No encontré el producto que quieres editar.";
      return;
    }

    elements.inventoryProductId.value = String(product.id);
    elements.inventoryProductBusinessProductId.value = String(
      linkedBusinessProduct?.id || ""
    );
    elements.inventoryProductName.value = product.name || "";
    elements.inventoryProductArea.value = product.area || "Gimnasio";
    elements.inventoryProductOfferType.value =
      product.itemKind === "Servicio" ? "Servicio" : "Producto";
    elements.inventoryProductKind.value = product.itemKind || "Insumo";
    elements.inventoryProductIsSellable.checked = Boolean(linkedBusinessProduct?.isActive);
    elements.inventoryProductTracksStock.checked = isInventoryProductStockTracked(product);
    elements.inventoryProductIsIngredient.checked =
      product.itemKind === "Insumo";
    elements.inventoryProductIsDirectSale.checked = Boolean(
      linkedBusinessProduct?.isActive &&
        Number(linkedBusinessProduct.directInventoryProductId || 0) ===
          Number(product.id)
    );
    elements.inventoryProductCategory.value = product.category || "";
    elements.inventoryProductBusinessLine.value =
      linkedBusinessProduct?.businessLine || "Gimnasio";
    fillInventoryProductBusinessCategoryOptions(
      linkedBusinessProduct?.category || ""
    );
    elements.inventoryProductBusinessDetail.value =
      linkedBusinessProduct && linkedBusinessProduct.itemType !== linkedBusinessProduct.category
        ? linkedBusinessProduct.itemType || ""
        : "";
    elements.inventoryProductUnit.value = product.unitName || "Unidad";
    elements.inventoryProductCurrentStock.value = String(product.currentStock || 0);
    elements.inventoryProductMinimumStock.value = String(product.minimumStock || 0);
    elements.inventoryProductCostPrice.value = String(product.costPrice || 0);
    elements.inventoryProductSalePrice.value = String(product.salePrice || 0);
    elements.inventoryProductBusinessAmount.value = String(
      linkedBusinessProduct?.defaultAmount || product.salePrice || 0
    );
    elements.inventoryProductDirectQuantity.value = String(
      linkedBusinessProduct?.directInventoryQuantity || 1
    );
    syncInventoryProductKindFields();
    syncUnifiedInventorySaleFields();
    elements.inventoryProductNotes.value = product.notes || "";
    elements.inventoryProductFeedback.textContent =
      "Actualiza la ficha del producto o servicio. Si es inventariable y cambias el stock, el sistema deja trazabilidad del ajuste.";
    elements.inventoryProductCancelEdit.classList.remove("is-hidden");

    const submitButton = elements.inventoryProductForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = "Guardar cambios";
    }

    switchView("inventario", {
      inventoryPanel: "productos",
    });
    if (elements.inventoryBusinessProductId) {
      elements.inventoryBusinessProductId.value = String(
        linkedBusinessProduct?.id || ""
      );
    }
    renderInventoryBusinessProducts();
    elements.inventoryProductName.focus();
    return;
  }

  if (!statusButton) {
    return;
  }

  const productId = statusButton.dataset.inventoryProductStatusId;
  const activate = statusButton.dataset.inventoryProductNextActive === "true";
  const confirmed = window.confirm(
    activate
      ? "¿Deseas activar este producto?"
      : "¿Deseas inactivar este producto?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/inventory/products/${productId}/active`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "productos",
    });
    elements.inventoryProductFeedback.textContent = activate
      ? "Producto activado correctamente."
      : "Producto inactivado correctamente.";
  } catch (error) {
    elements.inventoryProductFeedback.textContent = error.message;
  }
}

async function handleInventoryBusinessProductSubmit(event) {
  event.preventDefault();

  const businessProductId = Number(elements.inventoryBusinessProductId?.value || 0);
  const selectedCategory = String(
    elements.inventoryBusinessProductType.value || ""
  ).trim();
  const detailValue = String(
    elements.inventoryBusinessProductCategory.value || ""
  ).trim();
  const payload = {
    name: elements.inventoryBusinessProductName.value.trim(),
    businessLine: elements.inventoryBusinessProductLine.value,
    itemType: detailValue || selectedCategory,
    category: selectedCategory,
    defaultAmount: Number(elements.inventoryBusinessProductAmount.value || 0),
    directInventoryProductId: Number(
      elements.inventoryBusinessProductDirectProductId.value || 0
    ),
    directInventoryQuantity: Number(
      elements.inventoryBusinessProductDirectQuantity.value || 0
    ),
    notes: elements.inventoryBusinessProductNotes.value.trim(),
  };

  if (!payload.name || !payload.category) {
    elements.inventoryBusinessProductFeedback.textContent =
      "El nombre y la categoria son obligatorios. Si falta la categoria, primero creala en listas maestras.";
    return;
  }

  try {
    await apiRequest(
      businessProductId > 0
        ? `/api/business-products/${businessProductId}`
        : "/api/business-products",
      {
        method: businessProductId > 0 ? "PUT" : "POST",
        body: JSON.stringify(payload),
      }
    );
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "productos",
    });
    elements.inventoryBusinessProductFeedback.textContent =
      businessProductId > 0
        ? "Producto o servicio actualizado correctamente."
        : "Producto o servicio registrado correctamente.";
    if (!businessProductId) {
      resetInventoryBusinessProductForm();
    }
  } catch (error) {
    elements.inventoryBusinessProductFeedback.textContent = error.message;
  }
}

function resetInventoryBusinessProductForm() {
  if (!elements.inventoryBusinessProductForm) {
    return;
  }

  elements.inventoryBusinessProductForm.reset();
  elements.inventoryBusinessProductId.value = "";
  elements.inventoryBusinessProductLine.value = "Gimnasio";
  syncInventoryBusinessProductCategoryOptions();
  elements.inventoryBusinessProductCategory.value = "";
  elements.inventoryBusinessProductAmount.value = "0";
  elements.inventoryBusinessProductDirectQuantity.value = "0";
  fillBusinessProductDirectInventoryOptions("");
  elements.inventoryBusinessProductFeedback.textContent =
    "La categoria conserva el analisis historico. El detalle opcional te ayuda a distinguir versiones como mensual, premium, con bebida o menu ejecutivo.";
  elements.inventoryBusinessProductCancelEdit.classList.add("is-hidden");

  const submitButton = elements.inventoryBusinessProductForm.querySelector(
    'button[type="submit"]'
  );
  if (submitButton) {
    submitButton.textContent = "Guardar producto o servicio";
  }
}

async function handleInventoryBusinessProductsTableClick(event) {
  const editButton = event.target.closest("[data-business-product-edit-id]");
  const statusButton = event.target.closest("[data-business-product-status-id]");

  if (editButton) {
    const item = getBusinessProductById(editButton.dataset.businessProductEditId);
    if (!item) {
      elements.inventoryBusinessProductFeedback.textContent =
        "No encontré el producto o servicio que quieres editar.";
      return;
    }

    elements.inventoryBusinessProductId.value = String(item.id);
    elements.inventoryBusinessProductName.value = item.name || "";
    elements.inventoryBusinessProductLine.value = item.businessLine || "Gimnasio";
    syncInventoryBusinessProductCategoryOptions({
      selectedValue: item.category || item.itemType || "",
    });
    elements.inventoryBusinessProductCategory.value = getBusinessProductDetailLabel(item);
    elements.inventoryBusinessProductAmount.value = String(item.defaultAmount || 0);
    fillBusinessProductDirectInventoryOptions(String(item.directInventoryProductId || ""));
    elements.inventoryBusinessProductDirectProductId.value = item.directInventoryProductId
      ? String(item.directInventoryProductId)
      : "";
    elements.inventoryBusinessProductDirectQuantity.value = String(
      item.directInventoryQuantity || 0
    );
    elements.inventoryBusinessProductNotes.value = item.notes || "";
    elements.inventoryBusinessProductFeedback.textContent =
      "Actualiza el producto o servicio y luego, si aplica, ajusta su receta abajo.";
    elements.inventoryBusinessProductCancelEdit.classList.remove("is-hidden");

    const submitButton = elements.inventoryBusinessProductForm.querySelector(
      'button[type="submit"]'
    );
    if (submitButton) {
      submitButton.textContent = "Guardar cambios";
    }

    switchView("inventario", {
      inventoryPanel: "productos",
    });
    renderInventoryBusinessProducts();
    elements.inventoryBusinessProductName.focus();
    return;
  }

  if (!statusButton) {
    return;
  }

  const productId = statusButton.dataset.businessProductStatusId;
  const activate = statusButton.dataset.businessProductNextActive === "true";
  const confirmed = window.confirm(
    activate
      ? "¿Deseas activar este producto o servicio?"
      : "¿Deseas inactivar este producto o servicio?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/business-products/${productId}/active`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "productos",
    });
    elements.inventoryBusinessProductFeedback.textContent = activate
      ? "Producto o servicio activado correctamente."
      : "Producto o servicio inactivado correctamente.";
  } catch (error) {
    elements.inventoryBusinessProductFeedback.textContent = error.message;
  }
}

async function handleInventoryBusinessComponentSubmit(event) {
  event.preventDefault();

  const businessProductId = Number(elements.inventoryBusinessProductId?.value || 0);
  if (!(businessProductId > 0)) {
    elements.inventoryBusinessComponentFeedback.textContent =
      "Guarda o edita primero un producto o servicio para empezar su receta.";
    return;
  }

  const payload = {
    inventoryProductId: Number(
      elements.inventoryBusinessComponentProductId.value || 0
    ),
    quantity: Number(elements.inventoryBusinessComponentQuantity.value || 0),
    notes: elements.inventoryBusinessComponentNotes.value.trim(),
  };

  if (!(payload.inventoryProductId > 0) || !(payload.quantity > 0)) {
    elements.inventoryBusinessComponentFeedback.textContent =
      "Selecciona un insumo y una cantidad valida para agregarlo a la receta.";
    return;
  }

  try {
    await apiRequest(`/api/business-products/${businessProductId}/components`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    elements.inventoryBusinessComponentQuantity.value = "";
    elements.inventoryBusinessComponentNotes.value = "";
    fillBusinessProductComponentInventoryOptions(
      elements.inventoryBusinessComponentProductId.value
    );
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "productos",
    });
    elements.inventoryBusinessComponentFeedback.textContent =
      "Insumo agregado a la receta correctamente.";
    renderInventoryBusinessProducts();
  } catch (error) {
    elements.inventoryBusinessComponentFeedback.textContent = error.message;
  }
}

async function handleInventoryBusinessComponentsListClick(event) {
  const deleteButton = event.target.closest("[data-business-component-delete-id]");
  if (!deleteButton) {
    return;
  }

  const businessProductId = Number(elements.inventoryBusinessProductId?.value || 0);
  const componentId = Number(deleteButton.dataset.businessComponentDeleteId || 0);
  if (!(businessProductId > 0) || !(componentId > 0)) {
    return;
  }

  const confirmed = window.confirm("¿Deseas quitar este insumo de la receta?");
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/api/business-products/${businessProductId}/components/${componentId}`,
      {
        method: "DELETE",
      }
    );
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "productos",
    });
    elements.inventoryBusinessComponentFeedback.textContent =
      "Insumo retirado de la receta correctamente.";
    renderInventoryBusinessProducts();
  } catch (error) {
    elements.inventoryBusinessComponentFeedback.textContent = error.message;
  }
}

async function handleInventoryStockMovementSubmit(event) {
  event.preventDefault();

  const productId = Number(elements.inventoryMovementProductId?.value || 0);
  const payload = {
    movementDate: elements.inventoryMovementDate.value,
    movementType: elements.inventoryMovementType.value,
    quantity: Number(elements.inventoryMovementQuantity.value || 0),
    unitCost: Number(elements.inventoryMovementUnitCost.value || 0),
    reference: elements.inventoryMovementReference.value.trim(),
    notes: elements.inventoryMovementNotes.value.trim(),
  };

  if (!productId) {
    elements.inventoryMovementFeedback.textContent =
      "Selecciona el producto al que quieres registrar el movimiento.";
    return;
  }

  if (!payload.movementDate || !(payload.quantity > 0)) {
    elements.inventoryMovementFeedback.textContent =
      "La fecha y la cantidad del movimiento son obligatorias.";
    return;
  }

  try {
    await apiRequest(`/api/inventory/products/${productId}/movements`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    resetInventoryMovementForm();
    await loadBootstrap();
    switchView("inventario", {
      inventoryPanel: "movimientos",
    });
    elements.inventoryMovementFeedback.textContent =
      "Movimiento de stock registrado correctamente.";
  } catch (error) {
    elements.inventoryMovementFeedback.textContent = error.message;
  }
}

function resetInventoryMovementForm() {
  if (!elements.inventoryMovementForm) {
    return;
  }

  const currentProductId = elements.inventoryMovementProductId?.value || "";
  elements.inventoryMovementForm.reset();
  elements.inventoryMovementDate.value = getCurrentIsoDate();
  elements.inventoryMovementType.value = "entrada";
  elements.inventoryMovementQuantity.value = "";
  elements.inventoryMovementUnitCost.value = "";
  elements.inventoryMovementReference.value = "";
  elements.inventoryMovementNotes.value = "";
  fillInventoryProductSelect(currentProductId);
  elements.inventoryMovementFeedback.textContent =
    "Registra entradas, salidas y ajustes para dejar trazabilidad del inventario.";
}

function inventoryMovementTypeLabel(value) {
  return (
    {
      entrada: "Entrada",
      salida: "Salida",
      ajuste_positivo: "Ajuste positivo",
      ajuste_negativo: "Ajuste negativo",
    }[String(value || "").trim()] || "Movimiento"
  );
}

function formatInventoryQuantity(value, unitName = "") {
  const numericValue = Number(value || 0);
  const formatter = new Intl.NumberFormat(APP_LOCALE, {
    minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${formatter.format(numericValue)}${unitName ? ` ${unitName}` : ""}`.trim();
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

async function handleUsersClientsImportSubmit(event) {
  event.preventDefault();

  if (!isAdminUser()) {
    elements.usersClientsImportFeedback.textContent =
      "Solo el perfil administrador puede ejecutar esta carga.";
    return;
  }

  const file = elements.usersClientsImportFile?.files?.[0];
  const password = String(elements.usersClientsImportPassword?.value || "").trim();

  if (!file) {
    elements.usersClientsImportFeedback.textContent =
      "Selecciona el archivo de usuarios antes de importar.";
    return;
  }

  if (!password) {
    elements.usersClientsImportFeedback.textContent =
      "Escribe la contraseña del archivo para poder leerlo.";
    return;
  }

  elements.usersClientsImportFeedback.textContent =
    "Leyendo archivo protegido y preparando la carga de clientes...";

  try {
    const fileBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(fileBuffer);
    const result = await apiRequest("/api/import/clients-users-workbook", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        fileDataBase64: base64,
        password,
      }),
    });

    lastUsersClientsImportReport = result;
    elements.usersClientsImportForm.reset();
    elements.usersClientsImportFeedback.textContent =
      result.message || "La carga de clientes terminó correctamente.";

    await loadBootstrap();
    switchView("importar");
  } catch (error) {
    elements.usersClientsImportFeedback.textContent =
      error.message || "No se pudo cargar el archivo de usuarios.";
  }
}

async function handleAccountingDocumentSubmit(event) {
  event.preventDefault();

  if (!hasAccountingAccess()) {
    elements.accountingDocumentFeedback.textContent =
      "Tu perfil no tiene permiso para cargar soportes contables.";
    return;
  }

  const file = elements.accountingDocumentFile?.files?.[0];
  if (!file) {
    elements.accountingDocumentFeedback.textContent =
      "Selecciona el archivo del soporte antes de guardarlo.";
    return;
  }

  elements.accountingDocumentFeedback.textContent =
    "Cargando soporte contable y guardándolo en el sistema...";

  try {
    const fileBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(fileBuffer);
    await apiRequest("/api/accounting-documents", {
      method: "POST",
      body: JSON.stringify({
        accountingDate: elements.accountingDocumentDate.value,
        businessLine: elements.accountingDocumentLine.value,
        documentArea: elements.accountingDocumentArea.value,
        documentType: elements.accountingDocumentType.value,
        reference: elements.accountingDocumentReference.value.trim(),
        notes: elements.accountingDocumentNotes.value.trim(),
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: Number(file.size || 0),
        fileDataBase64: base64,
      }),
    });

    elements.accountingDocumentForm.reset();
    elements.accountingDocumentDate.value = getCurrentIsoDate();
    elements.accountingDocumentLine.value = "Gimnasio";
    elements.accountingDocumentArea.value = "Venta";
    elements.accountingDocumentFeedback.textContent =
      "Soporte contable guardado correctamente.";

    await loadBootstrap();
    switchView("contabilidad");
  } catch (error) {
    elements.accountingDocumentFeedback.textContent =
      error.message || "No se pudo guardar el soporte contable.";
  }
}

function getAccountingDocumentById(documentId) {
  return (state.accountingDocuments || []).find(
    (item) => String(item.id) === String(documentId)
  ) || null;
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!(size > 0)) {
    return "Sin tamaño";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function resetAccountingDocumentForm(preserveFeedback = false) {
  if (!elements.accountingDocumentForm) {
    return;
  }

  elements.accountingDocumentForm.reset();
  elements.accountingDocumentId.value = "";
  elements.accountingDocumentDate.value = getCurrentIsoDate();
  elements.accountingDocumentLine.value = "Gimnasio";
  elements.accountingDocumentArea.value = "Venta";
  if (elements.accountingDocumentFile) {
    elements.accountingDocumentFile.required = true;
  }
  if (elements.accountingDocumentCancelEdit) {
    elements.accountingDocumentCancelEdit.classList.add("is-hidden");
  }
  const submitButton = elements.accountingDocumentForm.querySelector(
    'button[type="submit"]'
  );
  if (submitButton) {
    submitButton.textContent = "Guardar soporte";
  }
  if (!preserveFeedback && elements.accountingDocumentFeedback) {
    elements.accountingDocumentFeedback.textContent =
      "Aqui puedes adjuntar facturas, recibos, comprobantes, cuentas de cobro y demas soportes contables.";
  }
}

function startEditingAccountingDocument(documentId) {
  const document = getAccountingDocumentById(documentId);
  if (!document) {
    if (elements.accountingDocumentFeedback) {
      elements.accountingDocumentFeedback.textContent =
        "No encontramos el soporte que intentas editar.";
    }
    return;
  }

  elements.accountingDocumentId.value = String(document.id);
  elements.accountingDocumentDate.value =
    normalizeDateOnly(document.accountingDate) || getCurrentIsoDate();
  elements.accountingDocumentLine.value = document.businessLine || "Gimnasio";
  elements.accountingDocumentArea.value = document.documentArea || "Venta";
  elements.accountingDocumentType.value = document.documentType || "";
  elements.accountingDocumentReference.value = document.reference || "";
  elements.accountingDocumentNotes.value = document.notes || "";
  if (elements.accountingDocumentFile) {
    elements.accountingDocumentFile.value = "";
    elements.accountingDocumentFile.required = false;
  }
  if (elements.accountingDocumentCancelEdit) {
    elements.accountingDocumentCancelEdit.classList.remove("is-hidden");
  }
  const submitButton = elements.accountingDocumentForm.querySelector(
    'button[type="submit"]'
  );
  if (submitButton) {
    submitButton.textContent = "Guardar cambios";
  }
  elements.accountingDocumentFeedback.textContent =
    `Editando ${document.originalName}. Si el archivo estaba mal, puedes reemplazarlo cargando uno nuevo.`;
  elements.accountingDocumentType.focus();
}

async function triggerAccountingDocumentDownload(documentId) {
  const document = getAccountingDocumentById(documentId);
  if (!document) {
    elements.accountingDocumentFeedback.textContent =
      "No encontramos el soporte que intentas descargar.";
    return;
  }

  const downloadUrl = `/api/accounting-documents/${document.id}/file`;
  const newWindow = window.open(downloadUrl, "_blank", "noopener");
  if (!newWindow) {
    window.location.href = downloadUrl;
  }

  setTimeout(() => {
    loadBootstrap().catch(() => {});
  }, 700);
}

async function handleAccountingDocumentsTableClick(event) {
  const editButton = event.target.closest("[data-accounting-edit-id]");
  if (editButton) {
    startEditingAccountingDocument(editButton.dataset.accountingEditId);
    return;
  }

  const downloadButton = event.target.closest("[data-accounting-download-id]");
  if (downloadButton) {
    await triggerAccountingDocumentDownload(
      downloadButton.dataset.accountingDownloadId
    );
  }
}

function getAccountingSelectedDateRange() {
  const rawFrom = normalizeDateOnly(elements.accountingDateFrom?.value);
  const rawTo = normalizeDateOnly(elements.accountingDateTo?.value);
  const fallback = defaultAccountingDateForCurrentUser();
  const from = rawFrom || rawTo || fallback;
  const to = rawTo || rawFrom || fallback;

  return from <= to ? { from, to } : { from: to, to: from };
}

function getFilteredAccountingMovements() {
  const { from, to } = getAccountingSelectedDateRange();
  const selectedLine = String(elements.accountingLine?.value || "");
  const query = normalizeSearchValue(elements.accountingQuery?.value || "");

  return getSortedMovements(
    state.movements.filter((item) => {
      const movementDate = normalizeDateOnly(item.fecha);
      if (movementDate && (movementDate < from || movementDate > to)) {
        return false;
      }

      if (selectedLine && item.linea !== selectedLine) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        item.linea,
        item.tipo,
        item.categoria,
        item.cliente,
        item.descripcion,
        item.medioPago,
        item.observaciones,
      ]
        .map((value) => normalizeSearchValue(value))
        .some((value) => value.includes(query));
    })
  );
}

function getFilteredAccountingDocuments() {
  const { from, to } = getAccountingSelectedDateRange();
  const selectedLine = String(elements.accountingLine?.value || "");
  const query = normalizeSearchValue(elements.accountingQuery?.value || "");

  return [...(state.accountingDocuments || [])].filter((item) => {
    const documentDate = normalizeDateOnly(item.accountingDate);
    if (documentDate && (documentDate < from || documentDate > to)) {
      return false;
    }

    if (selectedLine && item.businessLine !== selectedLine) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      item.businessLine,
      item.documentArea,
      item.documentType,
      item.reference,
      item.notes,
      item.originalName,
      item.uploadedBy,
      item.lastDownloadedBy,
    ]
      .map((value) => normalizeSearchValue(value))
      .some((value) => value.includes(query));
  });
}

function renderAccountingView() {
  if (
    !elements.accountingSummary ||
    !elements.accountingTable ||
    !elements.accountingDocumentsTable ||
    !elements.accountingDocumentsSummary ||
    !elements.accountingDocumentFeedback
  ) {
    return;
  }

  if (!hasAccountingAccess()) {
    elements.accountingSummary.innerHTML = "";
    elements.accountingTable.innerHTML = "";
    elements.accountingDocumentsTable.innerHTML = "";
    elements.accountingDocumentsSummary.innerHTML = "";
    return;
  }

  if (!elements.accountingDateFrom?.value || !elements.accountingDateTo?.value) {
    const { from, to } = getAccountingDefaultDateRange();
    if (elements.accountingDateFrom) {
      elements.accountingDateFrom.value = elements.accountingDateFrom.value || from;
    }
    if (elements.accountingDateTo) {
      elements.accountingDateTo.value = elements.accountingDateTo.value || to;
    }
  }

  const { from, to } = getAccountingSelectedDateRange();
  const movements = getFilteredAccountingMovements();
  const documents = getFilteredAccountingDocuments();
  const sales = movements.filter((item) => item.tipo === "Ingreso");
  const purchases = movements.filter((item) => item.tipo === "Costo");
  const expenses = movements.filter((item) => item.tipo === "Gasto");
  const netCash = movements.reduce(
    (acc, item) => acc + Number(item.flujoNeto || 0),
    0
  );

  elements.accountingSummary.innerHTML = [
    createStatCard(
      "Ventas del periodo",
      formatCurrency(sum(sales, "valorTotal")),
      `${sales.length} movimiento(s) · Cobrado ${formatCurrency(sum(sales, "abono"))}`
    ),
    createStatCard(
      "Compras / costos",
      formatCurrency(sum(purchases, "valorTotal")),
      `${purchases.length} movimiento(s)`
    ),
    createStatCard(
      "Gastos",
      formatCurrency(sum(expenses, "valorTotal")),
      `${expenses.length} movimiento(s)`
    ),
    createStatCard(
      "Flujo neto",
      formatCurrency(netCash),
      `${formatDate(from)} a ${formatDate(to)} · Saldo pendiente ${formatCurrency(
        sum(movements, "saldoPendiente")
      )}`
    ),
  ].join("");

  elements.accountingTable.innerHTML = movements.length
    ? movements
        .map(
          (item) => `
            <tr>
              <td>${formatDate(item.fecha)}</td>
              <td>${escapeHtml(item.linea)}</td>
              <td>${escapeHtml(item.tipo)}</td>
              <td>${escapeHtml(item.categoria)}</td>
              <td>${item.cliente ? escapeHtml(item.cliente) : "<span class='muted'>Sin cliente</span>"}</td>
              <td>${item.descripcion ? escapeHtml(item.descripcion) : "<span class='muted'>Sin descripcion</span>"}</td>
              <td>${escapeHtml(item.medioPago)}</td>
              <td>${formatCurrency(item.valorTotal)}</td>
              <td>${formatCurrency(item.abono)}</td>
              <td>${formatCurrency(item.saldoPendiente)}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="10" class="empty-state">
          No hay movimientos para el rango de fechas y filtros seleccionados.
        </td>
      </tr>
    `;

  elements.accountingDocumentsSummary.innerHTML = [
    `<div class="mini-stat"><span>Soportes visibles</span><strong>${documents.length}</strong></div>`,
    `<div class="mini-stat"><span>Total cargados</span><strong>${(state.accountingDocuments || []).length}</strong></div>`,
    isAdminUser()
      ? `<div class="mini-stat"><span>Descargas registradas</span><strong>${documents.reduce(
          (acc, item) => acc + Number(item.downloadCount || 0),
          0
        )}</strong></div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  if (elements.accountingDocumentsDownloadsHead) {
    elements.accountingDocumentsDownloadsHead.classList.toggle(
      "is-hidden",
      !isAdminUser()
    );
  }

  elements.accountingDocumentsTable.innerHTML = documents.length
    ? documents
        .map(
          (item) => `
            <tr>
              <td>${formatDate(item.accountingDate)}</td>
              <td>${escapeHtml(item.businessLine)}</td>
              <td>${escapeHtml(item.documentArea)}</td>
              <td>
                <strong>${escapeHtml(item.documentType)}</strong>
                ${
                  item.reference
                    ? `<small class="muted table-subcopy">${escapeHtml(item.reference)}</small>`
                    : ""
                }
              </td>
              <td>
                <strong>${escapeHtml(item.originalName)}</strong>
                <small class="muted table-subcopy">${formatFileSize(item.fileSize)}</small>
              </td>
              <td>${escapeHtml(item.uploadedBy || "Sistema")}</td>
              ${
                isAdminUser()
                  ? `<td>
                      ${
                        Number(item.downloadCount || 0) > 0
                          ? `<strong>${Number(item.downloadCount || 0)} descarga(s)</strong>
                             <small class="muted table-subcopy">${escapeHtml(
                               item.lastDownloadedBy || "Sistema"
                             )} · ${formatDateTime(item.lastDownloadedAt)}</small>`
                          : "<span class='muted'>Sin descargas</span>"
                      }
                    </td>`
                  : ""
              }
              <td>
                <div class="row-actions row-actions--compact">
                  <button
                    class="table-button"
                    type="button"
                    data-accounting-download-id="${item.id}"
                  >
                    Descargar
                  </button>
                  <button
                    class="table-button"
                    type="button"
                    data-accounting-edit-id="${item.id}"
                  >
                    Editar
                  </button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="${isAdminUser() ? 8 : 7}" class="empty-state">
          No hay soportes contables cargados para esos filtros.
        </td>
      </tr>
    `;
}

async function handleAccountingDocumentSubmit(event) {
  event.preventDefault();

  if (!hasAccountingAccess()) {
    elements.accountingDocumentFeedback.textContent =
      "Tu perfil no tiene permiso para cargar soportes contables.";
    return;
  }

  const documentId = Number(elements.accountingDocumentId?.value || 0);
  const isEditing = Number.isInteger(documentId) && documentId > 0;
  const file = elements.accountingDocumentFile?.files?.[0] || null;

  if (!isEditing && !file) {
    elements.accountingDocumentFeedback.textContent =
      "Selecciona el archivo del soporte antes de guardarlo.";
    return;
  }

  elements.accountingDocumentFeedback.textContent = isEditing
    ? "Actualizando soporte contable..."
    : "Cargando soporte contable y guardandolo en el sistema...";

  try {
    let base64 = "";
    if (file) {
      const fileBuffer = await file.arrayBuffer();
      base64 = arrayBufferToBase64(fileBuffer);
    }

    const payload = {
      accountingDate: elements.accountingDocumentDate.value,
      businessLine: elements.accountingDocumentLine.value,
      documentArea: elements.accountingDocumentArea.value,
      documentType: elements.accountingDocumentType.value,
      reference: elements.accountingDocumentReference.value.trim(),
      notes: elements.accountingDocumentNotes.value.trim(),
    };

    if (file) {
      payload.originalName = file.name;
      payload.mimeType = file.type || "application/octet-stream";
      payload.fileSize = Number(file.size || 0);
      payload.fileDataBase64 = base64;
    }

    await apiRequest(
      isEditing
        ? `/api/accounting-documents/${documentId}`
        : "/api/accounting-documents",
      {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      }
    );

    resetAccountingDocumentForm(true);
    elements.accountingDocumentFeedback.textContent = isEditing
      ? "Soporte contable actualizado correctamente."
      : "Soporte contable guardado correctamente.";

    await loadBootstrap();
    switchView("contabilidad");
  } catch (error) {
    elements.accountingDocumentFeedback.textContent =
      error.message || "No se pudo guardar el soporte contable.";
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

  const typedClientQuery = String(elements.clienteSearch?.value || "").trim();
  const resolvedClient =
    syncMovementClientSelectionFromSearch({
      allowClosestMatch: true,
      allowSingleMatch: true,
    }) || !typedClientQuery;

  if (!resolvedClient && typedClientQuery) {
    elements.movementFeedback.textContent =
      "Selecciona un cliente valido de la lista antes de guardar el movimiento.";
    elements.clienteSearch?.focus();
    return;
  }

  const payload = {
    linea: elements.linea.value,
    fecha: elements.fecha.value,
    tipo: elements.tipo.value,
    categoria: elements.categoria.value,
    businessProductId: Number(elements.movementBusinessProductId.value || 0),
    cliente: elements.cliente.value.trim(),
    descripcion: elements.descripcion.value.trim(),
    medioPago: elements.medioPago.value,
    valorTotal: Number(elements.valorTotal.value || 0),
    abono: Number(elements.abono.value || 0),
    inventoryProductId: Number(elements.movementInventoryProductId.value || 0),
    inventoryQuantity: Number(elements.movementInventoryQuantity.value || 0),
    inventoryEffect: elements.movementInventoryEffect.value || "ninguno",
    observaciones: elements.observaciones.value.trim(),
    justificacionEdicion: elements.editJustification.value.trim(),
  };
  payload.estadoPago = derivePaymentStatus(payload.valorTotal, payload.abono);

  const validation = validateMovement(payload, {
    isEditing: Boolean(elements.movementId.value),
  });
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
    alias: elements.clientAlias.value.trim(),
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
    elements.clientAlias.value = client.alias || "";
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
  const detailButton = event.target.closest("[data-movement-detail-id]");
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");
  const detailId = detailButton?.dataset.movementDetailId;
  const editId = editButton?.dataset.editId;
  const deleteId = deleteButton?.dataset.deleteId;

  if (detailId) {
    if (expandedMovementDetailIds.has(String(detailId))) {
      expandedMovementDetailIds.delete(String(detailId));
    } else {
      expandedMovementDetailIds.add(String(detailId));
    }
    renderMovementsView();
    return;
  }

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
    fillMovementBusinessProductOptions(String(movement.businessProductId || ""));
    elements.fecha.value = movement.fecha;
    elements.tipo.value = movement.tipo;
    elements.categoria.value = movement.categoria;
    elements.movementBusinessProductId.value = movement.businessProductId
      ? String(movement.businessProductId)
      : "";
    setClientSelection(movement.cliente);
    elements.descripcion.value = movement.descripcion;
    elements.medioPago.value = movement.medioPago;
    fillMovementInventoryProductOptions({
      selectedValue: String(movement.inventoryProductId || ""),
    });
    elements.movementInventoryProductId.value = movement.inventoryProductId
      ? String(movement.inventoryProductId)
      : "";
    elements.movementInventoryEffect.value = movement.inventoryEffect || "ninguno";
    elements.movementInventoryQuantity.value = movement.inventoryQuantity
      ? String(movement.inventoryQuantity)
      : "";
    elements.valorTotal.value = String(movement.valorTotal);
    elements.abono.value = String(movement.abono);
    elements.observaciones.value = movement.observaciones;
    syncComputedPaymentStatus();
    syncMovementBusinessProductSelection({
      selectedValue: String(movement.businessProductId || ""),
      preserveValue: true,
    });
    syncMovementInventoryFields({
      preserveEffect: true,
      preserveQuantity: true,
    });
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

function startEditingListItem(key, item) {
  const form = document.querySelector(`[data-list-form="${key}"]`);
  if (!form) {
    return;
  }

  form.elements.editId.value = String(item?.id || "");
  form.elements.value.value = String(item?.value || "");

  if (form.elements.defaultAmount) {
    form.elements.defaultAmount.value = Number(item?.defaultAmount || 0) || 0;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Guardar cambios";
  }

  const cancelButton = form.querySelector("[data-list-cancel]");
  if (cancelButton) {
    cancelButton.classList.remove("is-hidden");
  }

  setStatus("Edita el nombre y el valor sugerido en el formulario.");
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  form.elements.value.focus();
  form.elements.value.select?.();
}

function resetListForm(keyOrForm) {
  const form =
    typeof keyOrForm === "string"
      ? document.querySelector(`[data-list-form="${keyOrForm}"]`)
      : keyOrForm;

  if (!form) {
    return;
  }

  form.reset();

  if (form.elements.editId) {
    form.elements.editId.value = "";
  }

  if (form.elements.defaultAmount) {
    form.elements.defaultAmount.value = "";
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Agregar";
  }

  const cancelButton = form.querySelector("[data-list-cancel]");
  if (cancelButton) {
    cancelButton.classList.add("is-hidden");
  }
}

function handleListEditCancelClick(event) {
  const key = event.currentTarget?.dataset?.listCancel;
  resetListForm(key);
  setStatus("Edicion cancelada.");
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

    startEditingListItem(key, {
      id: itemId,
      value: currentValue,
      defaultAmount: currentDefaultAmount,
    });
    return;

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

function fillMovementBusinessProductOptions(selectedValue = "") {
  if (!elements.movementBusinessProductId) {
    return;
  }

  const selectedRecord = getBusinessProductById(selectedValue);
  fillSelectFromRecords(
    elements.movementBusinessProductId,
    getAvailableMovementBusinessProducts(),
    {
      selectedValue: String(
        selectedValue || elements.movementBusinessProductId.value || ""
      ),
      includeRecord:
        selectedRecord &&
        selectedRecord.businessLine === (elements.linea?.value || "Gimnasio")
          ? selectedRecord
          : null,
      placeholder: "Sin producto o servicio",
      labelBuilder: (item) => {
        const detailLabel = getBusinessProductDetailLabel(item);
        return `${item.name} - ${getBusinessProductCategoryLabel(item)}${
          detailLabel ? ` - ${detailLabel}` : ""
        } - ${formatCurrency(item.defaultAmount)}`;
      },
    }
  );
}

function syncMovementBusinessProductSelection(options = {}) {
  if (!elements.movementBusinessProductId) {
    return null;
  }

  fillMovementBusinessProductOptions(
    String(options.selectedValue ?? elements.movementBusinessProductId.value ?? "")
  );

  const selectedProduct = getBusinessProductById(
    elements.movementBusinessProductId.value
  );

  if (
    !selectedProduct ||
    selectedProduct.businessLine !== (elements.linea?.value || "Gimnasio")
  ) {
    if (!options.preserveValue) {
      elements.movementBusinessProductId.value = "";
    }

    syncCategoryOptions({
      includeValue:
        options.preserveCategoryValue === false ? "" : elements.categoria?.value || "",
    });
    elements.categoria.disabled = false;
    elements.movementInventoryProductId.disabled = false;
    elements.movementInventoryEffect.disabled = false;
    syncMovementInventoryFields();

    if (elements.movementBusinessProductFeedback) {
      elements.movementBusinessProductFeedback.textContent =
        "Si seleccionas un producto o servicio, la categoria se completa sola, puede sugerir el valor y tambien mover inventario segun su configuracion.";
    }

    return null;
  }

  syncCategoryOptions({
    includeValue: selectedProduct.category || elements.categoria?.value || "",
  });

  if (selectedProduct.category) {
    elements.categoria.value = selectedProduct.category;
  }

  elements.categoria.disabled = true;

  if (selectedProduct.defaultAmount > 0 && !options.preserveValue) {
    elements.valorTotal.value = String(selectedProduct.defaultAmount);
    syncComputedPaymentStatus();
  }

  if (!elements.descripcion.value.trim()) {
    elements.descripcion.value = selectedProduct.name;
  }

  if (elements.movementBusinessProductFeedback) {
    const recipeItems = getBusinessProductComponents(selectedProduct.id).length;
    const categoryLabel = getBusinessProductCategoryLabel(selectedProduct);
    const detailLabel = getBusinessProductDetailLabel(selectedProduct);

    if (selectedProduct.directInventoryProductId > 0 || recipeItems > 0) {
      fillMovementInventoryProductOptions({
        selectedValue: "",
      });
      elements.movementInventoryProductId.value = "";
      elements.movementInventoryEffect.value = "ninguno";
      elements.movementInventoryQuantity.value = "";
      elements.movementInventoryProductId.disabled = true;
      elements.movementInventoryEffect.disabled = true;
      elements.movementInventoryQuantity.disabled = true;
      syncMovementInventoryFields();
    } else {
      elements.movementInventoryProductId.disabled = false;
      elements.movementInventoryEffect.disabled = false;
      syncMovementInventoryFields();
    }

    const stockMessage =
      selectedProduct.directInventoryProductId > 0
        ? `descontara ${formatInventoryQuantity(
            selectedProduct.directInventoryQuantity || 1,
            selectedProduct.directInventoryProductUnitName
          )} de ${selectedProduct.directInventoryProductName || "inventario"}`
        : recipeItems
          ? `descontara ${recipeItems} insumo(s) configurados en su receta`
          : "no mueve inventario automaticamente";

    elements.movementBusinessProductFeedback.textContent =
      `${selectedProduct.name} - ${categoryLabel}${
        detailLabel ? ` - ${detailLabel}` : ""
      } - ${formatCurrency(selectedProduct.defaultAmount)}. Al registrar la venta, ${stockMessage}.`;
  }

  return selectedProduct;
}

function getActiveCategoryValuesForLine(selectedLine = elements.linea?.value || "") {
  const key = getCategoryCatalogKey(selectedLine);
  return (state.catalogItems[key] || [])
    .filter((item) => item.isActive)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map((item) => item.value);
}

function renderInventoryBusinessProducts() {
  const items = getFilteredBusinessProducts();
  const activeItems = items.filter((item) => item.isActive);
  const recipeConfigured = activeItems.filter(
    (item) => getBusinessProductComponents(item.id).length > 0
  );
  const directLinked = activeItems.filter((item) => item.directInventoryProductId > 0);

  if (elements.inventoryBusinessProductsMetrics) {
    elements.inventoryBusinessProductsMetrics.innerHTML = `
      <div class="mini-stat"><span>Total</span><strong>${items.length}</strong></div>
      <div class="mini-stat"><span>Activos</span><strong>${activeItems.length}</strong></div>
      <div class="mini-stat"><span>Con receta</span><strong>${recipeConfigured.length}</strong></div>
      <div class="mini-stat"><span>Venta directa stock</span><strong>${directLinked.length}</strong></div>
    `;
  }

  if (elements.inventoryBusinessProductsTable) {
    if (!items.length) {
      elements.inventoryBusinessProductsTable.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">No hay productos o servicios registrados para esos filtros.</td>
        </tr>
      `;
    } else {
      elements.inventoryBusinessProductsTable.innerHTML = items
        .map((item) => {
          const nextActive = item.isActive ? "false" : "true";
          const components = getBusinessProductComponents(item.id);
          const categoryLabel = getBusinessProductCategoryLabel(item);
          const detailLabel = getBusinessProductDetailLabel(item);
          const inventorySummary =
            item.directInventoryProductId > 0
              ? `${item.directInventoryProductName || "Producto directo"} - ${formatInventoryQuantity(
                  item.directInventoryQuantity,
                  item.directInventoryProductUnitName
                )}`
              : components.length
                ? `${components.length} insumo(s) en receta`
                : "Sin descuento automatico";

          return `
            <tr>
              <td><strong>${escapeHtml(item.name)}</strong></td>
              <td>${escapeHtml(item.businessLine)}</td>
              <td>
                <strong>${escapeHtml(categoryLabel)}</strong>
                ${detailLabel ? `<div class="inline-hint">${escapeHtml(detailLabel)}</div>` : ""}
              </td>
              <td>${formatCurrency(item.defaultAmount)}</td>
              <td>${escapeHtml(inventorySummary)}</td>
              <td>
                <div class="row-actions row-actions--compact">
                  <button
                    class="table-button icon-button"
                    type="button"
                    data-business-product-edit-id="${item.id}"
                    title="Editar producto o servicio"
                    aria-label="Editar producto o servicio"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                      <path d="m12 6 4 4"></path>
                    </svg>
                  </button>
                  <button
                    class="table-button ${item.isActive ? "danger" : ""} icon-button"
                    type="button"
                    data-business-product-status-id="${item.id}"
                    data-business-product-next-active="${nextActive}"
                    title="${item.isActive ? "Inactivar producto o servicio" : "Activar producto o servicio"}"
                    aria-label="${item.isActive ? "Inactivar producto o servicio" : "Activar producto o servicio"}"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M12 3v7"></path>
                      <path d="M7.8 5.8A9 9 0 1 0 16.2 5.8"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("");
    }
  }

  const activeId = Number(elements.inventoryBusinessProductId?.value || 0);
  const selectedProduct = getBusinessProductById(activeId);
  const selectedComponents = selectedProduct
    ? getBusinessProductComponents(selectedProduct.id)
    : [];

  if (elements.inventoryBusinessProductRecipeTitle) {
    elements.inventoryBusinessProductRecipeTitle.textContent = selectedProduct
      ? `Receta y descuento automatico de ${selectedProduct.name}`
      : "Configuracion de receta y descuento automatico";
  }

  if (elements.inventoryBusinessProductRecipeContext) {
    const categoryLabel = getBusinessProductCategoryLabel(selectedProduct);
    const detailLabel = getBusinessProductDetailLabel(selectedProduct);
    elements.inventoryBusinessProductRecipeContext.innerHTML = selectedProduct
      ? `
        <strong>${escapeHtml(selectedProduct.name)}</strong>
        <small>${escapeHtml(selectedProduct.businessLine)} - ${escapeHtml(
          categoryLabel
        )}${detailLabel ? ` - ${escapeHtml(detailLabel)}` : ""} - ${formatCurrency(
          selectedProduct.defaultAmount
        )}</small>
      `
      : `
        <strong>Sin seleccion activa</strong>
        <small>Edita un producto o servicio arriba para definir si se vende directo o si descuenta varios insumos por receta.</small>
      `;
  }

  if (elements.inventoryBusinessComponentForm) {
    const enabled = Boolean(selectedProduct);
    [
      elements.inventoryBusinessComponentProductId,
      elements.inventoryBusinessComponentQuantity,
      elements.inventoryBusinessComponentNotes,
      elements.inventoryBusinessComponentForm.querySelector('button[type="submit"]'),
    ].forEach((node) => {
      if (node) {
        node.disabled = !enabled;
      }
    });
  }

  if (elements.inventoryBusinessComponentsList) {
    if (!selectedProduct) {
      elements.inventoryBusinessComponentsList.innerHTML = `
        <div class="empty-state collection-empty">
          Guarda primero el producto o servicio, o edita uno existente, para empezar a construir su receta.
        </div>
      `;
    } else if (!selectedComponents.length) {
      elements.inventoryBusinessComponentsList.innerHTML = `
        <div class="empty-state collection-empty">
          Aun no hay insumos configurados para ${escapeHtml(selectedProduct.name)}.
        </div>
      `;
    } else {
      elements.inventoryBusinessComponentsList.innerHTML = selectedComponents
        .map(
          (component) => `
            <article class="catalog-item">
              <div class="catalog-item-copy">
                <strong>${escapeHtml(component.inventoryProductName)}</strong>
                <small>
                  ${escapeHtml(component.inventoryProductArea || "Sin area")} -
                  ${escapeHtml(
                    formatInventoryQuantity(
                      component.quantity,
                      component.inventoryProductUnitName
                    )
                  )}
                  ${component.notes ? ` - ${escapeHtml(component.notes)}` : ""}
                </small>
              </div>
              <div class="row-actions row-actions--compact">
                <button
                  class="table-button danger icon-button"
                  type="button"
                  data-business-component-delete-id="${component.id}"
                  title="Eliminar insumo de la receta"
                  aria-label="Eliminar insumo de la receta"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M3 6h18"></path>
                    <path d="M8 6V4h8v2"></path>
                    <path d="m19 6-1 14H6L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                  </svg>
                </button>
              </div>
            </article>
          `
        )
        .join("");
    }
  }
}

function fillMovementBusinessProductOptions(selectedValue = "") {
  if (!elements.movementBusinessProductId) {
    return;
  }

  const selectedRecord = getBusinessProductById(selectedValue);
  fillSelectFromRecords(
    elements.movementBusinessProductId,
    getAvailableMovementBusinessProducts(),
    {
      selectedValue: String(
        selectedValue || elements.movementBusinessProductId.value || ""
      ),
      includeRecord:
        selectedRecord &&
        selectedRecord.businessLine === (elements.linea?.value || "Gimnasio")
          ? selectedRecord
          : null,
      placeholder: "Sin producto o servicio",
      labelBuilder: (item) => {
        const detailLabel = getBusinessProductDetailLabel(item);
        return `${item.name} - ${getBusinessProductCategoryLabel(item)}${
          detailLabel ? ` - ${detailLabel}` : ""
        } - ${formatCurrency(item.defaultAmount)}`;
      },
    }
  );
}

function syncMovementBusinessProductSelection(options = {}) {
  if (!elements.movementBusinessProductId) {
    return null;
  }

  fillMovementBusinessProductOptions(
    String(options.selectedValue ?? elements.movementBusinessProductId.value ?? "")
  );

  const selectedProduct = getBusinessProductById(
    elements.movementBusinessProductId.value
  );

  if (
    !selectedProduct ||
    selectedProduct.businessLine !== (elements.linea?.value || "Gimnasio")
  ) {
    if (!options.preserveValue) {
      elements.movementBusinessProductId.value = "";
    }

    syncCategoryOptions({
      includeValue:
        options.preserveCategoryValue === false ? "" : elements.categoria?.value || "",
    });
    elements.categoria.disabled = false;
    elements.movementInventoryProductId.disabled = false;
    elements.movementInventoryEffect.disabled = false;
    syncMovementInventoryFields();

    if (elements.movementBusinessProductFeedback) {
      elements.movementBusinessProductFeedback.textContent =
        "Si seleccionas un producto o servicio, la categoria se completa sola, puede sugerir el valor y tambien mover inventario segun su configuracion.";
    }

    return null;
  }

  syncCategoryOptions({
    includeValue: selectedProduct.category || elements.categoria?.value || "",
  });

  if (selectedProduct.category) {
    elements.categoria.value = selectedProduct.category;
  }

  elements.categoria.disabled = true;

  if (selectedProduct.defaultAmount > 0 && !options.preserveValue) {
    elements.valorTotal.value = String(selectedProduct.defaultAmount);
    syncComputedPaymentStatus();
  }

  if (!elements.descripcion.value.trim()) {
    elements.descripcion.value = selectedProduct.name;
  }

  if (elements.movementBusinessProductFeedback) {
    const recipeItems = getBusinessProductComponents(selectedProduct.id).length;
    const categoryLabel = getBusinessProductCategoryLabel(selectedProduct);
    const detailLabel = getBusinessProductDetailLabel(selectedProduct);

    if (selectedProduct.directInventoryProductId > 0 || recipeItems > 0) {
      fillMovementInventoryProductOptions({
        selectedValue: "",
      });
      elements.movementInventoryProductId.value = "";
      elements.movementInventoryEffect.value = "ninguno";
      elements.movementInventoryQuantity.value = "";
      elements.movementInventoryProductId.disabled = true;
      elements.movementInventoryEffect.disabled = true;
      elements.movementInventoryQuantity.disabled = true;
      syncMovementInventoryFields();
    } else {
      elements.movementInventoryProductId.disabled = false;
      elements.movementInventoryEffect.disabled = false;
      syncMovementInventoryFields();
    }

    const stockMessage =
      selectedProduct.directInventoryProductId > 0
        ? `descontara ${formatInventoryQuantity(
            selectedProduct.directInventoryQuantity || 1,
            selectedProduct.directInventoryProductUnitName
          )} de ${selectedProduct.directInventoryProductName || "inventario"}`
        : recipeItems
          ? `descontara ${recipeItems} insumo(s) configurados en su receta`
          : "no mueve inventario automaticamente";

    elements.movementBusinessProductFeedback.textContent =
      `${selectedProduct.name} - ${categoryLabel}${
        detailLabel ? ` - ${detailLabel}` : ""
      } - ${formatCurrency(selectedProduct.defaultAmount)}. Al registrar la venta, ${stockMessage}.`;
  }

  return selectedProduct;
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
      pendingPayables: 0,
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
      pendingPayables: 0,
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

  (state.boxMovements || []).forEach((movement) => {
    const boxName = String(movement.medioPago || "").trim();
    const pendingAmount = Number(movement.saldoPendiente || 0);

    if (!boxName || movement.tipo === "Ingreso" || !(pendingAmount > 0)) {
      return;
    }

    const current = summaries.get(boxName) || {
      name: boxName,
      isActive: false,
      balance: 0,
      inflows: 0,
      outflows: 0,
      pendingPayables: 0,
      entriesCount: 0,
      lastDate: "",
    };

    current.pendingPayables += pendingAmount;
    summaries.set(boxName, current);
  });

  return [...summaries.values()]
    .filter(
      (item) =>
        item.isActive ||
        item.entriesCount > 0 ||
        item.balance !== 0 ||
        item.pendingPayables > 0
    )
    .sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }

      return String(a.name).localeCompare(String(b.name), APP_LOCALE);
    });
}

function getPendingPayablesByBox() {
  const grouped = new Map();

  (state.boxMovements || []).forEach((movement) => {
    const boxName = String(movement.medioPago || "").trim();
    const pendingAmount = Number(movement.saldoPendiente || 0);

    if (!boxName || movement.tipo === "Ingreso" || !(pendingAmount > 0)) {
      return;
    }

    const current = grouped.get(boxName) || {
      boxName,
      totalPending: 0,
      items: [],
    };

    current.totalPending += pendingAmount;
    current.items.push({
      id: movement.id,
      fecha: movement.fecha,
      tipo: movement.tipo,
      categoria: movement.categoria || "",
      descripcion: movement.descripcion || "",
      cliente: movement.cliente || "",
      valorTotal: Number(movement.valorTotal || 0),
      abono: Number(movement.abono || 0),
      saldoPendiente: pendingAmount,
    });

    grouped.set(boxName, current);
  });

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) =>
        String(b.fecha || "").localeCompare(String(a.fecha || ""))
      ),
    }))
    .sort((a, b) => {
      const pendingCompare = Number(b.totalPending || 0) - Number(a.totalPending || 0);
      if (pendingCompare !== 0) {
        return pendingCompare;
      }

      return String(a.boxName).localeCompare(String(b.boxName), APP_LOCALE);
    });
}

function renderBoxesView() {
  renderBoxPanels();

  const pendingGroups = getPendingPayablesByBox();
  const pendingByBox = new Map(
    pendingGroups.map((group) => [group.boxName, Number(group.totalPending || 0)])
  );
  const summaries = getPaymentBoxSummaries().map((box) => ({
    ...box,
    pendingPayables: Number(pendingByBox.get(box.name) || 0),
  }));
  const ledgerEntries = getFilteredBoxLedgerEntries();
  const totalBalance = sum(summaries, "balance");
  const totalInflows = sum(summaries, "inflows");
  const totalOutflows = sum(summaries, "outflows");
  const totalPendingPayables = sum(summaries, "pendingPayables");
  const activeBoxes = summaries.filter((item) => item.isActive);

  elements.boxesSummary.innerHTML = summaries.length
    ? summaries
        .map((box) =>
          createStatCard(
            box.name,
            formatCurrency(box.balance),
            `${box.entriesCount} movimientos · Entradas ${formatCurrency(
              box.inflows
            )} · Salidas ${formatCurrency(
              box.outflows
            )} · Pendiente por pagar ${formatCurrency(box.pendingPayables)}${
              box.isActive ? "" : " · Inactiva"
            }`
          )
        )
        .join("")
    : '<div class="empty-state">Aun no hay cajas disponibles para consultar.</div>';

  elements.boxInsights.innerHTML = `
    <div class="mini-stat"><span>Cajas activas</span><strong>${activeBoxes.length}</strong></div>
    <div class="mini-stat"><span>Saldo disponible</span><strong>${formatCurrency(totalBalance)}</strong></div>
    <div class="mini-stat"><span>Entradas acumuladas</span><strong>${formatCurrency(totalInflows)}</strong></div>
    <div class="mini-stat"><span>Salidas acumuladas</span><strong>${formatCurrency(totalOutflows)}</strong></div>
    <div class="mini-stat"><span>Pendiente por pagar</span><strong>${formatCurrency(totalPendingPayables)}</strong></div>
    <div class="mini-stat"><span>Traslados registrados</span><strong>${state.boxTransfers.length}</strong></div>
  `;

  if (elements.boxPendingBreakdown) {
    elements.boxPendingBreakdown.innerHTML = pendingGroups.length
      ? pendingGroups
          .map(
            (group) => `
              <article class="pending-box-card">
                <div class="pending-box-head">
                  <div>
                    <strong>${escapeHtml(group.boxName)}</strong>
                    <small>${group.items.length} movimiento(s) pendiente(s)</small>
                  </div>
                  <strong>${formatCurrency(group.totalPending)}</strong>
                </div>
                <div class="pending-box-items">
                  ${group.items
                    .map(
                      (item) => `
                        <div class="pending-box-item">
                          <div class="pending-box-item-copy">
                            <strong>${escapeHtml(item.categoria || "Sin categoría")}</strong>
                            <small>
                              ${escapeHtml(
                                [
                                  `#${item.id}`,
                                  formatDate(item.fecha),
                                  item.descripcion || "",
                                  item.cliente || "",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              )}
                            </small>
                          </div>
                          <div class="pending-box-item-metrics">
                            <span>Total ${formatCurrency(item.valorTotal)}</span>
                            <span>Pagado ${formatCurrency(item.abono)}</span>
                            <strong>Saldo ${formatCurrency(item.saldoPendiente)}</strong>
                          </div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty-state">No hay costos ni gastos pendientes por pagar en las cajas actuales.</div>';
  }

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
  const visibleBoxes = [...new Set(ledgerEntries.map((entry) => entry.boxName))];
  const filteredPendingPayables = summaries
    .filter((item) => visibleBoxes.includes(item.name))
    .reduce((acc, item) => acc + Number(item.pendingPayables || 0), 0);

  elements.boxFilterSummary.innerHTML = `
    <div class="mini-stat"><span>Movimientos visibles</span><strong>${ledgerEntries.length}</strong></div>
    <div class="mini-stat"><span>Entradas</span><strong>${formatCurrency(filteredInflows)}</strong></div>
    <div class="mini-stat"><span>Salidas</span><strong>${formatCurrency(filteredOutflows)}</strong></div>
    <div class="mini-stat"><span>Impacto neto</span><strong>${formatCurrency(filteredBalance)}</strong></div>
    <div class="mini-stat"><span>Pendiente por pagar</span><strong>${formatCurrency(filteredPendingPayables)}</strong></div>
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
          ${tableCell(
            "Detalle",
            entry.detail ? escapeHtml(entry.detail) : "<span class='muted'>Sin detalle</span>"
          )}
          ${tableCell("Registrado por", escapeHtml(entry.registeredBy || "Sistema"))}
          ${tableCell("Entrada", formatCurrency(entry.inflow), "numeric-cell")}
          ${tableCell("Salida", formatCurrency(entry.outflow), "numeric-cell")}
        </tr>
      `
    )
    .join("");

  applyStackTableLabels(elements.appShell);
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
  const query = normalizeSearchValue(elements.filterQuery.value || "");
  const recordsQuery = normalizeSearchValue(
    elements.movementRecordsQuery?.value || ""
  );

  return state.movements.filter((item) => {
    const lineMatches = line === "Todas" || item.linea === line;
    const statusMatches = status === "Todos" || item.estadoPago === status;
    const linkedClient = getLinkedClientRecord(item.cliente);
    const searchText = normalizeSearchValue(
      [
        item.linea,
        item.tipo,
        item.categoria,
        item.cliente,
        linkedClient?.alias,
        linkedClient?.documentNumber,
        linkedClient?.phone,
        linkedClient?.email,
        item.descripcion,
        item.estadoPago,
        item.medioPago,
        item.observaciones,
      ].join(" ")
    );
    const queryMatches =
      !query ||
      searchText.includes(query);
    const recordsQueryMatches =
      !recordsQuery || searchText.includes(recordsQuery);

    return lineMatches && statusMatches && queryMatches && recordsQueryMatches;
  });
}

function renderProgrammingView() {
  renderProgrammingPanels();
  renderProgrammingSummary();
  renderProgrammingPrograms();
  renderProgramRosterManager();
  renderProgrammingAthletesAdmin();
  renderProgrammingExercisesLibrary();
  renderProgrammingMethodsReference();
  renderProgramDraftState();
}

function renderProgrammingSummary() {
  if (!elements.programmingSummary) {
    return;
  }

  const allPrograms = Array.isArray(state.classPrograms) ? state.classPrograms : [];
  const activePrograms = allPrograms.filter((item) => item.isActive);
  const exercises = Array.isArray(state.programmingExercises)
    ? state.programmingExercises
    : [];
  const activeExercises = exercises.filter((item) => item.isActive);
  const athletes = Array.isArray(state.athletes) ? state.athletes : [];
  const activeAthletes = athletes.filter((item) => item.isActive);
  const methods = Array.isArray(state.programmingMethods) ? state.programmingMethods : [];
  const { start, end } = getCurrentWeekRange();
  const weekPrograms = activePrograms.filter((item) =>
    isBetween(item.classDate, start, end)
  );

  elements.programmingSummary.innerHTML = [
    createStatCard(
      "Clases activas",
      String(activePrograms.length),
      `${allPrograms.length} programaciones registradas`
    ),
    createStatCard(
      "Clases esta semana",
      String(weekPrograms.length),
      `Ventana ${formatDate(start)} a ${formatDate(end)}`
    ),
    createStatCard(
      "Ejercicios activos",
      String(activeExercises.length),
      `${exercises.length} ejercicios en biblioteca`
    ),
    createStatCard(
      "Atletas activos",
      String(activeAthletes.length),
      `${athletes.length} atletas en base deportiva`
    ),
    createStatCard(
      "Métodos disponibles",
      String(methods.filter((item) => item.isActive).length),
      "AMRAP, EMOM, intervalos, fuerza y más"
    ),
  ].join("");
}

function renderProgrammingPrograms() {
  {
  if (!elements.programsMetrics || !elements.programWeekBoard) {
    return;
  }

  const referenceDate = normalizeDateOnly(
    elements.programFilterDate?.value || getCurrentIsoDate()
  );
  const referenceWeek = getReferenceWeekRange(referenceDate);
  const programs = getFilteredClassPrograms();
  const visibleActivePrograms = programs.filter((item) => item.isActive);
  const totalLines = programs.reduce(
    (accumulator, item) => accumulator + (item.items?.length || 0),
    0
  );
  const weekDays = getWeekBoardDays(referenceDate, programs);
  const visibleProgramIds = new Set(programs.map((item) => String(item.id)));

  if (
    selectedProgramRosterId &&
    !visibleProgramIds.has(String(selectedProgramRosterId))
  ) {
    selectedProgramRosterId = null;
    selectedProgramEnrollmentId = null;
  }

  elements.programsMetrics.innerHTML = `
    <div class="mini-stat"><span>Semana visible</span><strong>${escapeHtml(formatDate(referenceWeek.start))}</strong></div>
    <div class="mini-stat"><span>Clases visibles</span><strong>${programs.length}</strong></div>
    <div class="mini-stat"><span>Clases activas</span><strong>${visibleActivePrograms.length}</strong></div>
    <div class="mini-stat"><span>Líneas del workout</span><strong>${totalLines}</strong></div>
  `;

  if (elements.programsTable) {
    elements.programsTable.innerHTML = "";
  }

  const boardMarkup = weekDays
    .map((day) => {
      const dayPrograms = programs.filter(
        (program) => normalizeDateOnly(program.classDate) === day.iso
      );

      return `
        <section class="program-day-column">
          <div class="program-day-header">
            <div>
              <strong>${escapeHtml(day.label)}</strong>
              <span>${escapeHtml(day.dateLabel)}</span>
            </div>
          </div>
          <div class="program-day-body">
            ${
              dayPrograms.length
                ? dayPrograms.map((program) => renderProgramWeekCard(program)).join("")
                : `<div class="program-day-empty">Sin clase cargada</div>`
            }
          </div>
        </section>
      `;
    })
    .join("");

  elements.programWeekBoard.innerHTML = `
    ${
      programs.length
        ? ""
        : `<div class="program-board-empty">
            No hay clases programadas para esta semana o los filtros actuales.
          </div>`
    }
    ${boardMarkup}
  `;
  return;
  }

  if (!elements.programsTable || !elements.programsMetrics) {
    return;
  }

  const programs = getFilteredClassPrograms();
  const activePrograms = (state.classPrograms || []).filter((item) => item.isActive);
  const totalExercises = programs.reduce(
    (accumulator, item) => accumulator + (item.items?.length || 0),
    0
  );

  elements.programsMetrics.innerHTML = `
    <div class="mini-stat"><span>Clases visibles</span><strong>${programs.length}</strong></div>
    <div class="mini-stat"><span>Activas</span><strong>${activePrograms.length}</strong></div>
    <div class="mini-stat"><span>Ejercicios visibles</span><strong>${totalExercises}</strong></div>
    <div class="mini-stat"><span>Método líder</span><strong>${escapeHtml(getMostUsedProgramMethod(programs))}</strong></div>
  `;

  if (!programs.length) {
    elements.programsTable.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          No hay clases programadas que coincidan con los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  elements.programsTable.innerHTML = programs
    .map((program) => {
      const nextActive = program.isActive ? "false" : "true";
      const statusTitle = program.isActive
        ? "Inactivar programación"
        : "Reactivar programación";
      const exerciseSummary = summarizeProgramExercises(program);

      return `
        <tr>
          <td>${formatDate(program.classDate)}</td>
          <td>
            <strong>${escapeHtml(program.title)}</strong>
            ${program.objective ? `<small class="muted table-subcopy">${escapeHtml(program.objective)}</small>` : ""}
          </td>
          <td>${program.classGroup ? escapeHtml(program.classGroup) : "<span class='muted'>Sin grupo</span>"}</td>
          <td><span class="status-pill method-pill">${escapeHtml(program.methodName || "Sin método")}</span></td>
          <td>${program.focusArea ? escapeHtml(program.focusArea) : "<span class='muted'>Sin enfoque</span>"}</td>
          <td>${program.durationMinutes} min</td>
          <td>${escapeHtml(exerciseSummary)}</td>
          <td><span class="status-pill ${program.isActive ? "user-status-active" : "user-status-inactive"}">${program.isActive ? "Activa" : "Inactiva"}</span></td>
          <td>
            <div class="table-actions">
              <button
                class="table-button icon-button"
                type="button"
                data-program-edit-id="${program.id}"
                title="Editar programación"
                aria-label="Editar programación"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                  <path d="m12 6 4 4"></path>
                </svg>
              </button>
              <button
                class="table-button icon-button ${program.isActive ? "danger" : ""}"
                type="button"
                data-program-status-id="${program.id}"
                data-program-next-active="${nextActive}"
                title="${statusTitle}"
                aria-label="${statusTitle}"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3v9"></path>
                  <path d="M7.05 5.05a8 8 0 1 0 9.9 0"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderProgrammingAthletesAdmin() {
  if (!elements.programAthletesMetrics || !elements.programAthletesTable) {
    return;
  }

  const athletes = Array.isArray(state.athletes) ? state.athletes : [];
  const filteredAthletes = getFilteredProgrammingAthletes();
  const query = getProgrammingAthletesSearchQuery();
  const activeAthletes = athletes.filter((item) => item.isActive);
  const withMedicalNotes = athletes.filter((item) => item.medicalNotes).length;

  elements.programAthletesMetrics.innerHTML = `
    <div class="mini-stat"><span>Total atletas</span><strong>${athletes.length}</strong></div>
    <div class="mini-stat"><span>Activos</span><strong>${activeAthletes.length}</strong></div>
    <div class="mini-stat"><span>Con alerta médica</span><strong>${withMedicalNotes}</strong></div>
    <div class="mini-stat"><span>${query ? "Coincidencias" : "Inactivos"}</span><strong>${query ? filteredAthletes.length : Math.max(athletes.length - activeAthletes.length, 0)}</strong></div>
  `;

  if (!athletes.length) {
    elements.programAthletesTable.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Aún no hay atletas registrados en la base deportiva.
        </td>
      </tr>
    `;
    return;
  }

  if (!filteredAthletes.length) {
    elements.programAthletesTable.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          No encontramos atletas que coincidan con esa búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  elements.programAthletesTable.innerHTML = filteredAthletes
    .map((athlete) => {
      const nextActive = athlete.isActive ? "false" : "true";
      const statusTitle = athlete.isActive ? "Inactivar atleta" : "Activar atleta";
      const contactMarkup =
        athlete.phone || athlete.email
          ? [athlete.phone, athlete.email]
              .filter(Boolean)
              .map((item) => escapeHtml(item))
              .join("<br />")
          : "<span class='muted'>Sin contacto</span>";
      const emergencyMarkup =
        athlete.emergencyContactName || athlete.emergencyContactPhone
          ? [athlete.emergencyContactName, athlete.emergencyContactPhone]
              .filter(Boolean)
              .map((item) => escapeHtml(item))
              .join("<br />")
          : "<span class='muted'>Sin emergencia</span>";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(athlete.fullName)}</strong>
            ${athlete.birthDate ? `<small class="muted table-subcopy">Nació: ${escapeHtml(formatDate(athlete.birthDate))}</small>` : ""}
          </td>
          <td>${athlete.documentNumber ? escapeHtml(athlete.documentNumber) : "<span class='muted'>Sin documento</span>"}</td>
          <td>${contactMarkup}</td>
          <td>${emergencyMarkup}</td>
          <td><span class="status-pill ${athlete.isActive ? "user-status-active" : "user-status-inactive"}">${athlete.isActive ? "Activo" : "Inactivo"}</span></td>
          <td>${athlete.medicalNotes ? escapeHtml(athlete.medicalNotes) : "<span class='muted'>Sin alertas</span>"}</td>
          <td>${athlete.athleteNotes ? escapeHtml(athlete.athleteNotes) : "<span class='muted'>Sin notas</span>"}</td>
          <td>
            <div class="row-actions">
              <button
                class="table-button icon-button"
                type="button"
                data-program-athlete-edit-id="${athlete.id}"
                title="Editar atleta"
                aria-label="Editar atleta"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                  <path d="m12 6 4 4"></path>
                </svg>
              </button>
              <button
                class="table-button ${athlete.isActive ? "danger" : ""} icon-button"
                type="button"
                data-program-athlete-status-id="${athlete.id}"
                data-program-athlete-next-active="${nextActive}"
                title="${statusTitle}"
                aria-label="${statusTitle}"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3v7"></path>
                  <path d="M7.8 5.8A9 9 0 1 0 16.2 5.8"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
  applyStackTableLabels(elements.appShell);
}

function getProgrammingAthletesSearchQuery() {
  return normalizeSearchValue(elements.programAthletesQuery?.value || "");
}

function getFilteredProgrammingAthletes() {
  const athletes = Array.isArray(state.athletes) ? state.athletes : [];
  const query = getProgrammingAthletesSearchQuery();

  if (!query) {
    return athletes;
  }

  return athletes.filter((athlete) =>
    normalizeSearchValue(
      [
        athlete.fullName,
        athlete.documentNumber,
        athlete.birthDate,
        athlete.phone,
        athlete.email,
        athlete.emergencyContactName,
        athlete.emergencyContactPhone,
        athlete.medicalNotes,
        athlete.athleteNotes,
        athlete.isActive ? "activo" : "inactivo",
      ]
        .filter(Boolean)
        .join(" ")
    ).includes(query)
  );
}

function renderProgrammingExercisesLibrary() {
  if (!elements.programExercisesTable || !elements.programExercisesMetrics) {
    return;
  }

  const exercises = getFilteredProgrammingExercises();
  const activeExercises = (state.programmingExercises || []).filter(
    (item) => item.isActive
  );

  elements.programExercisesMetrics.innerHTML = `
    <div class="mini-stat"><span>Ejercicios visibles</span><strong>${exercises.length}</strong></div>
    <div class="mini-stat"><span>Activos</span><strong>${activeExercises.length}</strong></div>
    <div class="mini-stat"><span>HYROX oficiales</span><strong>${activeExercises.filter((item) => item.family === "hyrox_oficial").length}</strong></div>
  `;

  if (!exercises.length) {
    elements.programExercisesTable.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          No hay ejercicios que coincidan con la búsqueda o la familia elegida.
        </td>
      </tr>
    `;
    return;
  }

  elements.programExercisesTable.innerHTML = exercises
    .map((exercise) => {
      const nextActive = exercise.isActive ? "false" : "true";
      const statusTitle = exercise.isActive
        ? "Inactivar ejercicio"
        : "Reactivar ejercicio";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(exercise.name)}</strong>
            ${exercise.coachingNotes ? `<small class="muted table-subcopy">${escapeHtml(exercise.coachingNotes)}</small>` : ""}
          </td>
          <td><span class="status-pill family-pill">${escapeHtml(programmingFamilyLabel(exercise.family))}</span></td>
          <td>${escapeHtml(exercise.category)}</td>
          <td>${escapeHtml(exercise.primaryMuscle)}</td>
          <td>${exercise.movementPattern ? escapeHtml(exercise.movementPattern) : "<span class='muted'>Sin patrón</span>"}</td>
          <td>${exercise.equipment ? escapeHtml(exercise.equipment) : "<span class='muted'>Sin implemento</span>"}</td>
          <td><span class="status-pill ${exercise.isActive ? "user-status-active" : "user-status-inactive"}">${exercise.isActive ? "Activo" : "Inactivo"}</span></td>
          <td>
            <div class="table-actions">
              <button
                class="table-button icon-button"
                type="button"
                data-program-exercise-edit-id="${exercise.id}"
                title="Editar ejercicio"
                aria-label="Editar ejercicio"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                  <path d="m12 6 4 4"></path>
                </svg>
              </button>
              <button
                class="table-button icon-button ${exercise.isActive ? "danger" : ""}"
                type="button"
                data-program-exercise-status-id="${exercise.id}"
                data-program-exercise-next-active="${nextActive}"
                title="${statusTitle}"
                aria-label="${statusTitle}"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3v9"></path>
                  <path d="M7.05 5.05a8 8 0 1 0 9.9 0"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderProgrammingMethodsReference() {
  if (!elements.programmingMethodsGrid) {
    return;
  }

  const methods = (state.programmingMethods || []).filter((item) => item.isActive);

  if (!methods.length) {
    elements.programmingMethodsGrid.innerHTML = `
      <div class="empty-state">
        No hay métodos registrados todavía.
      </div>
    `;
    return;
  }

  elements.programmingMethodsGrid.innerHTML = methods
    .map(
      (method) => `
        <article class="list-item method-reference-card">
          <div class="method-reference-top">
            <strong>${escapeHtml(method.name)}</strong>
            <span class="status-pill method-pill">${escapeHtml(method.code)}</span>
          </div>
          <span>${escapeHtml(method.description)}</span>
          <small><strong>Cómo usarlo:</strong> ${escapeHtml(method.prescriptionGuide)}</small>
          <small><strong>Estructura sugerida:</strong> ${escapeHtml(method.structureHint)}</small>
        </article>
      `
    )
    .join("");
}

function renderProgramDraftState() {
  {
  if (!elements.programDraftItems || !elements.programDraftSummary) {
    return;
  }

  renderProgramMethodGuide();

  const selectedMethod = getProgrammingMethodById(elements.programMethod?.value);
  const classDate = normalizeDateOnly(elements.programDate?.value || getCurrentIsoDate());
  const previewTitle = elements.programTitle?.value.trim() || "Clase sin nombre";

  elements.programDraftSummary.innerHTML = `
    <div class="mini-stat"><span>Líneas</span><strong>${programDraftItems.length}</strong></div>
    <div class="mini-stat"><span>Método</span><strong>${escapeHtml(selectedMethod?.name || "Sin definir")}</strong></div>
    <div class="mini-stat"><span>Día</span><strong>${escapeHtml(formatProgramDayLabel(classDate))}</strong></div>
    <div class="mini-stat"><span>Duración</span><strong>${escapeHtml(elements.programDuration?.value || "0")} min</strong></div>
  `;

  elements.programDraftItems.innerHTML = `
    <div class="program-preview-shell">
      ${renderProgramPreviewCard({
        dayLabel: formatProgramDayLabel(classDate),
        dateLabel: formatProgramShortDate(classDate),
        title: previewTitle,
        methodName: selectedMethod?.name || "",
        workoutHeadline: buildProgramWorkoutHeadline({
          focusArea: elements.programFocus?.value || "",
          methodName: selectedMethod?.name || "",
          durationMinutes: elements.programDuration?.value || "60",
        }),
        items: programDraftItems,
        generalNotes: elements.programNotes?.value || "",
        isDraft: true,
      })}
    </div>
    <div class="program-line-list">
      ${
        programDraftItems.length
          ? programDraftItems
              .map(
                (item, index) => `
                  <article class="program-line-row">
                    <div class="program-line-copy">
                      <strong>${index + 1}. ${escapeHtml(buildProgramDisplayLine(item))}</strong>
                      <small>${escapeHtml(item.exerciseName)} · ${escapeHtml(programmingFamilyLabel(item.exerciseFamily))}</small>
                    </div>
                    <div class="table-actions">
                      <button
                        class="table-button icon-button"
                        type="button"
                        data-program-item-edit-index="${index}"
                        title="Editar línea"
                        aria-label="Editar línea"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                          <path d="m12 6 4 4"></path>
                        </svg>
                      </button>
                      <button
                        class="table-button icon-button danger"
                        type="button"
                        data-program-item-remove-index="${index}"
                        title="Quitar línea"
                        aria-label="Quitar línea"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M3 6h18"></path>
                          <path d="M8 6V4h8v2"></path>
                          <path d="M19 6l-1 14H6L5 6"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                        </svg>
                      </button>
                    </div>
                  </article>
                `
              )
              .join("")
          : `<div class="empty-state">
              Selecciona tipo y ejercicio para ir armando el workout rápido.
            </div>`
      }
    </div>
  `;
  return;
  }

  if (!elements.programDraftItems || !elements.programDraftSummary) {
    return;
  }

  renderProgramMethodGuide();

  const distinctBlocks = new Set(
    programDraftItems.map((item) => normalizeSearchValue(item.blockName))
  ).size;
  const selectedMethod = getProgrammingMethodById(elements.programMethod?.value);

  elements.programDraftSummary.innerHTML = `
    <div class="mini-stat"><span>Ejercicios</span><strong>${programDraftItems.length}</strong></div>
    <div class="mini-stat"><span>Bloques</span><strong>${distinctBlocks}</strong></div>
    <div class="mini-stat"><span>Método</span><strong>${escapeHtml(selectedMethod?.name || "Sin definir")}</strong></div>
    <div class="mini-stat"><span>Duración</span><strong>${escapeHtml(elements.programDuration?.value || "0")} min</strong></div>
  `;

  if (!programDraftItems.length) {
    elements.programDraftItems.innerHTML = `
      <div class="empty-state">
        Aquí aparecerán los ejercicios que vayas agregando a la clase.
      </div>
    `;
    return;
  }

  elements.programDraftItems.innerHTML = programDraftItems
    .map(
      (item, index) => `
        <article class="routine-item-card">
          <div class="routine-item-head">
            <div>
              <strong>${index + 1}. ${escapeHtml(item.exerciseName)}</strong>
              <span class="muted">${escapeHtml(item.blockName)}</span>
            </div>
            <div class="table-actions">
              <button
                class="table-button icon-button"
                type="button"
                data-program-item-edit-index="${index}"
                title="Editar ejercicio de la rutina"
                aria-label="Editar ejercicio de la rutina"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                  <path d="m12 6 4 4"></path>
                </svg>
              </button>
              <button
                class="table-button icon-button danger"
                type="button"
                data-program-item-remove-index="${index}"
                title="Quitar ejercicio de la rutina"
                aria-label="Quitar ejercicio de la rutina"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M3 6h18"></path>
                  <path d="M8 6V4h8v2"></path>
                  <path d="M19 6l-1 14H6L5 6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="routine-meta">
            <span><strong>Dosis:</strong> ${escapeHtml(item.prescription)}</span>
            <span><strong>Método:</strong> ${escapeHtml(item.methodName || selectedMethod?.name || "Principal")}</span>
            <span><strong>Familia:</strong> ${escapeHtml(programmingFamilyLabel(item.exerciseFamily))}</span>
          </div>
          ${item.conditionNotes ? `<p><strong>Condición:</strong> ${escapeHtml(item.conditionNotes)}</p>` : ""}
          ${item.coachNotes ? `<p><strong>Nota técnica:</strong> ${escapeHtml(item.coachNotes)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function renderProgramMethodGuide() {
  if (!elements.programMethodGuide) {
    return;
  }

  const selectedMethod = getProgrammingMethodById(elements.programMethod?.value);

  if (!selectedMethod) {
    elements.programMethodGuide.innerHTML =
      "Selecciona un método principal para ver aquí su guía de uso.";
    return;
  }

  elements.programMethodGuide.innerHTML = `
    <strong>${escapeHtml(selectedMethod.name)}</strong>
    <small>${escapeHtml(selectedMethod.description)}</small>
    <small><strong>Cómo plantearlo:</strong> ${escapeHtml(selectedMethod.prescriptionGuide)}</small>
    <small><strong>Plantilla sugerida:</strong> ${escapeHtml(selectedMethod.structureHint)}</small>
  `;
}

async function handleProgramSubmit(event) {
  event.preventDefault();

  const programId = Number(elements.programId.value || 0);
  const payload = buildProgramPayload();
  const validation = validateProgramPayload(payload);

  if (!validation.valid) {
    elements.programFeedback.textContent = validation.message;
    return;
  }

  try {
    if (programId > 0) {
      await apiRequest(`/api/programming/programs/${programId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest("/api/programming/programs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    await loadBootstrap();
    resetProgramForm();
    switchView("programacion", {
      programmingPanel: "clases",
    });
    elements.programFeedback.textContent =
      programId > 0
        ? "Programación actualizada correctamente."
        : "Clase programada correctamente.";
  } catch (error) {
    elements.programFeedback.textContent = error.message;
  }
}

function handleProgramItemAdd() {
  {
  syncProgramExerciseSelectionFromSearch({
    allowClosestMatch: true,
  });
  const draftIndex = Number(elements.programItemDraftIndex.value || -1);
  const selectedExercise = getProgrammingExerciseById(
    elements.programItemExercise.value
  );
  const selectedMainMethod = getProgrammingMethodById(elements.programMethod.value);
  const repetitionText = String(elements.programItemReps?.value || "").trim();
  const weightText = String(elements.programItemWeight?.value || "").trim();
  const conditionNotes = String(elements.programItemCondition?.value || "").trim();
  const visibleLine = buildProgramLineFromFields({
    exerciseName: selectedExercise?.name || "",
    repetitionText,
    weightText,
  });

  const draftItem = {
    blockName: "Workout",
    exerciseId: Number(elements.programItemExercise.value || 0),
    exerciseName: selectedExercise?.name || "",
    exerciseFamily:
      selectedExercise?.family || elements.programItemFamily?.value || "",
    exerciseCategory: selectedExercise?.category || "",
    exercisePrimaryMuscle: selectedExercise?.primaryMuscle || "",
    methodId: null,
    methodName: "",
    prescription: visibleLine,
    repetitionText,
    weightText,
    conditionNotes,
    coachNotes: "",
    methodFallbackName: selectedMainMethod?.name || "",
  };

  const validation = validateProgramItemDraft(draftItem);
  if (!validation.valid) {
    elements.programItemFeedback.textContent = validation.message;
    return;
  }

  if (draftIndex >= 0 && draftIndex < programDraftItems.length) {
    programDraftItems.splice(draftIndex, 1, draftItem);
    elements.programItemFeedback.textContent =
      "Línea del workout actualizada.";
  } else {
    programDraftItems.push(draftItem);
    elements.programItemFeedback.textContent = "Línea agregada a la clase.";
  }

  resetProgramItemForm();
  renderProgramDraftState();
  return;
  }

  const draftIndex = Number(elements.programItemDraftIndex.value || -1);
  const selectedExercise = getProgrammingExerciseById(
    elements.programItemExercise.value
  );
  const selectedMethod = getProgrammingMethodById(elements.programItemMethod.value);
  const selectedMainMethod = getProgrammingMethodById(elements.programMethod.value);

  const draftItem = {
    blockName: elements.programItemBlock.value.trim(),
    exerciseId: Number(elements.programItemExercise.value || 0),
    exerciseName: selectedExercise?.name || "",
    exerciseFamily: selectedExercise?.family || "",
    exerciseCategory: selectedExercise?.category || "",
    exercisePrimaryMuscle: selectedExercise?.primaryMuscle || "",
    methodId: selectedMethod?.id || null,
    methodName: selectedMethod?.name || "",
    prescription: elements.programItemPrescription.value.trim(),
    conditionNotes: elements.programItemCondition.value.trim(),
    coachNotes: elements.programItemNotes.value.trim(),
    methodFallbackName: selectedMainMethod?.name || "",
  };

  const validation = validateProgramItemDraft(draftItem);
  if (!validation.valid) {
    elements.programItemFeedback.textContent = validation.message;
    return;
  }

  if (draftIndex >= 0 && draftIndex < programDraftItems.length) {
    programDraftItems.splice(draftIndex, 1, draftItem);
    elements.programItemFeedback.textContent =
      "Ejercicio actualizado dentro de la rutina.";
  } else {
    programDraftItems.push(draftItem);
    elements.programItemFeedback.textContent =
      "Ejercicio agregado a la rutina.";
  }

  resetProgramItemForm();
  renderProgramDraftState();
}

function handleProgramDraftItemsClick(event) {
  {
  const editButton = event.target.closest("[data-program-item-edit-index]");
  const removeButton = event.target.closest("[data-program-item-remove-index]");
  const editIndex = Number(editButton?.dataset.programItemEditIndex || -1);
  const removeIndex = Number(removeButton?.dataset.programItemRemoveIndex || -1);

  if (editIndex >= 0) {
    const item = programDraftItems[editIndex];
    if (!item) {
      return;
    }

    elements.programItemDraftIndex.value = String(editIndex);
    elements.programItemFormTitle.textContent = "Editar línea";
    elements.addProgramItem.textContent = "Actualizar línea";
    if (elements.programItemFamily) {
      elements.programItemFamily.value = item.exerciseFamily || "";
    }
    fillProgrammingExerciseSelect({
      selectedValue: String(item.exerciseId || ""),
      familyValue: item.exerciseFamily || "",
    });
    elements.programItemExercise.value = String(item.exerciseId || "");
    if (elements.programItemReps) {
      elements.programItemReps.value = item.repetitionText || "";
    }
    if (elements.programItemWeight) {
      elements.programItemWeight.value = item.weightText || "";
    }
    if (elements.programItemCondition) {
      elements.programItemCondition.value = item.conditionNotes || "";
    }
    elements.programItemPrescription.value =
      item.prescription || buildProgramLineFromFields(item);
    elements.programItemPrescription.dataset.autoSource =
      buildProgramLineFromFields(item);
    elements.programItemFeedback.textContent =
      "Ajusta la línea y guarda para reemplazarla en la rutina.";
    elements.programItemReps?.focus();
    return;
  }

  if (removeIndex >= 0) {
    programDraftItems = programDraftItems.filter(
      (_item, index) => index !== removeIndex
    );
    elements.programItemFeedback.textContent = "Línea retirada de la rutina.";
    if (Number(elements.programItemDraftIndex.value || -1) === removeIndex) {
      resetProgramItemForm();
    }
    renderProgramDraftState();
  }
  return;
  }

  const editButton = event.target.closest("[data-program-item-edit-index]");
  const removeButton = event.target.closest("[data-program-item-remove-index]");
  const editIndex = Number(editButton?.dataset.programItemEditIndex || -1);
  const removeIndex = Number(removeButton?.dataset.programItemRemoveIndex || -1);

  if (editIndex >= 0) {
    const item = programDraftItems[editIndex];
    if (!item) {
      return;
    }

    elements.programItemDraftIndex.value = String(editIndex);
    elements.programItemFormTitle.textContent = "Editar ejercicio";
    elements.addProgramItem.textContent = "Actualizar ejercicio";
    elements.programItemBlock.value = item.blockName || "";
    fillProgrammingExerciseSelect({
      selectedValue: String(item.exerciseId || ""),
    });
    elements.programItemExercise.value = String(item.exerciseId || "");
    fillProgrammingMethodSelects({
      programMethod: elements.programMethod.value,
      itemMethod: item.methodId ? String(item.methodId) : "",
      programFilterMethod: elements.programFilterMethod?.value || "",
    });
    elements.programItemMethod.value = item.methodId
      ? String(item.methodId)
      : "";
    elements.programItemPrescription.value = item.prescription || "";
    elements.programItemCondition.value = item.conditionNotes || "";
    elements.programItemNotes.value = item.coachNotes || "";
    elements.programItemFeedback.textContent =
      "Ajusta el ejercicio y guarda para reemplazarlo en la rutina.";
    elements.programItemBlock.focus();
    return;
  }

  if (removeIndex >= 0) {
    programDraftItems = programDraftItems.filter((_item, index) => index !== removeIndex);
    elements.programItemFeedback.textContent =
      "Ejercicio retirado de la rutina.";
    if (Number(elements.programItemDraftIndex.value || -1) === removeIndex) {
      resetProgramItemForm();
    }
    renderProgramDraftState();
  }
}

async function handleProgramsTableClick(event) {
  const rosterButton = event.target.closest("[data-program-roster-id]");
  const editButton = event.target.closest("[data-program-edit-id]");
  const statusButton = event.target.closest("[data-program-status-id]");
  const rosterProgramId = rosterButton?.dataset.programRosterId;
  const editProgramId = editButton?.dataset.programEditId;
  const programId = statusButton?.dataset.programStatusId;
  const nextActive = statusButton?.dataset.programNextActive;

  if (rosterProgramId) {
    selectProgramRoster(rosterProgramId);
    return;
  }

  if (editProgramId) {
    const program = (state.classPrograms || []).find(
      (item) => String(item.id) === String(editProgramId)
    );

    if (!program) {
      elements.programFeedback.textContent =
        "No encontré la programación que quieres editar.";
      return;
    }

    elements.programId.value = String(program.id);
    elements.programFormTitle.textContent = "Editar programación";
    elements.programDate.value = program.classDate || getCurrentIsoDate();
    if (elements.programFilterDate) {
      elements.programFilterDate.value = program.classDate || getCurrentIsoDate();
    }
    elements.programTitle.value = program.title || "";
    elements.programClassGroup.value = program.classGroup || "";
    fillProgrammingMethodSelects({
      programMethod: String(program.methodId || ""),
      itemMethod: "",
      programFilterMethod: elements.programFilterMethod?.value || "",
    });
    elements.programMethod.value = String(program.methodId || "");
    elements.programDuration.value = String(program.durationMinutes || 60);
    elements.programFocus.value = program.focusArea || "";
    elements.programObjective.value = program.objective || "";
    elements.programNotes.value = program.generalNotes || "";
    programDraftItems = (program.items || []).map((item) => ({
      blockName: item.blockName || "",
      exerciseId: Number(item.exerciseId || 0),
      exerciseName: item.exerciseName || "",
      exerciseFamily: item.exerciseFamily || "",
      exerciseCategory: item.exerciseCategory || "",
      exercisePrimaryMuscle: item.exercisePrimaryMuscle || "",
      methodId: item.methodId ? Number(item.methodId) : null,
      methodName: item.methodName || "",
      prescription: item.prescription || "",
      repetitionText: item.repetitionText || "",
      weightText: item.weightText || "",
      conditionNotes: item.conditionNotes || "",
      coachNotes: item.coachNotes || "",
    }));
    resetProgramItemForm();
    renderProgramDraftState();
    switchView("programacion", {
      programmingPanel: "clases",
    });
    elements.programFeedback.textContent =
      "Puedes ajustar la clase y sus líneas del workout.";
    elements.programTitle.focus();
    return;
  }

  if (!programId || !nextActive) {
    return;
  }

  const activate = nextActive === "true";
  const confirmed = window.confirm(
    activate
      ? "¿Deseas reactivar esta programación?"
      : "¿Deseas inactivar esta programación?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/programming/programs/${programId}/active`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("programacion", {
      programmingPanel: "clases",
    });
    elements.programFeedback.textContent = activate
      ? "Programación reactivada correctamente."
      : "Programación inactivada correctamente.";
  } catch (error) {
    elements.programFeedback.textContent = error.message;
  }
}

async function handleProgramExerciseSubmit(event) {
  event.preventDefault();

  const exerciseId = Number(elements.programExerciseId.value || 0);
  const payload = {
    name: elements.programExerciseName.value.trim(),
    family: elements.programExerciseFamily.value,
    category: elements.programExerciseCategory.value.trim(),
    primaryMuscle: elements.programExerciseMuscle.value.trim(),
    movementPattern: elements.programExercisePattern.value.trim(),
    equipment: elements.programExerciseEquipment.value.trim(),
    coachingNotes: elements.programExerciseNotes.value.trim(),
  };

  const validation = validateProgrammingExerciseFormPayload(payload);
  if (!validation.valid) {
    elements.programExerciseFeedback.textContent = validation.message;
    return;
  }

  try {
    if (exerciseId > 0) {
      await apiRequest(`/api/programming/exercises/${exerciseId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest("/api/programming/exercises", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    await loadBootstrap();
    resetProgramExerciseForm();
    switchView("programacion", {
      programmingPanel: "biblioteca",
    });
    elements.programExerciseFeedback.textContent =
      exerciseId > 0
        ? "Ejercicio actualizado correctamente."
        : "Ejercicio creado correctamente.";
  } catch (error) {
    elements.programExerciseFeedback.textContent = error.message;
  }
}

async function handleProgramExercisesTableClick(event) {
  const editButton = event.target.closest("[data-program-exercise-edit-id]");
  const statusButton = event.target.closest("[data-program-exercise-status-id]");
  const editExerciseId = editButton?.dataset.programExerciseEditId;
  const exerciseId = statusButton?.dataset.programExerciseStatusId;
  const nextActive = statusButton?.dataset.programExerciseNextActive;

  if (editExerciseId) {
    const exercise = (state.programmingExercises || []).find(
      (item) => String(item.id) === String(editExerciseId)
    );

    if (!exercise) {
      elements.programExerciseFeedback.textContent =
        "No encontré el ejercicio que quieres editar.";
      return;
    }

    elements.programExerciseId.value = String(exercise.id);
    elements.programExerciseFormTitle.textContent = "Editar ejercicio";
    elements.programExerciseName.value = exercise.name || "";
    fillProgrammingFamilySelects({
      formValue: exercise.family,
      filterValue: elements.programExerciseFilterFamily?.value || "Todas",
    });
    elements.programExerciseFamily.value = exercise.family || "";
    elements.programExerciseCategory.value = exercise.category || "";
    elements.programExerciseMuscle.value = exercise.primaryMuscle || "";
    elements.programExercisePattern.value = exercise.movementPattern || "";
    elements.programExerciseEquipment.value = exercise.equipment || "";
    elements.programExerciseNotes.value = exercise.coachingNotes || "";
    switchView("programacion", {
      programmingPanel: "biblioteca",
    });
    elements.programExerciseFeedback.textContent =
      "Actualiza la clasificación o las notas técnicas del ejercicio.";
    elements.programExerciseName.focus();
    return;
  }

  if (!exerciseId || !nextActive) {
    return;
  }

  const activate = nextActive === "true";
  const confirmed = window.confirm(
    activate
      ? "¿Deseas reactivar este ejercicio?"
      : "¿Deseas inactivar este ejercicio?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/programming/exercises/${exerciseId}/active`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("programacion", {
      programmingPanel: "biblioteca",
    });
    elements.programExerciseFeedback.textContent = activate
      ? "Ejercicio reactivado correctamente."
      : "Ejercicio inactivado correctamente.";
  } catch (error) {
    elements.programExerciseFeedback.textContent = error.message;
  }
}

function resetProgramForm() {
  if (!elements.programForm) {
    return;
  }

  elements.programForm.reset();
  elements.programId.value = "";
  elements.programFormTitle.textContent = "Armar clase";
  elements.programDate.value = getCurrentIsoDate();
  elements.programDuration.value = "60";
  elements.programFeedback.textContent =
    "Selecciona el método, agrega las líneas del workout y guarda la clase.";
  programDraftItems = [];
  resetProgramItemForm();
  renderProgramDraftState();
  return;

  if (!elements.programForm) {
    return;
  }

  elements.programForm.reset();
  elements.programId.value = "";
  elements.programFormTitle.textContent = "Programar clase";
  elements.programDate.value = getCurrentIsoDate();
  elements.programDuration.value = "60";
  elements.programFeedback.textContent =
    "Primero defines la estructura de la clase y luego agregas cada ejercicio con su condición, volumen y notas de coaching.";
  programDraftItems = [];
  resetProgramItemForm();
  renderProgramDraftState();
}

function resetProgramItemForm() {
  if (!elements.programItemDraftIndex) {
    return;
  }

  const currentFamily = elements.programItemFamily?.value || "";
  elements.programItemDraftIndex.value = "";
  elements.programItemFormTitle.textContent = "Agregar línea del workout";
  elements.addProgramItem.textContent = "Agregar línea";
  if (elements.programItemBlock) {
    elements.programItemBlock.value = "Workout";
  }
  if (elements.programItemFamily) {
    elements.programItemFamily.value = currentFamily;
  }
  fillProgrammingExerciseSelect({
    selectedValue: "",
    familyValue: currentFamily,
  });
  fillProgrammingMethodSelects({
    programMethod: elements.programMethod?.value || "",
    itemMethod: "",
    programFilterMethod: elements.programFilterMethod?.value || "",
  });
  if (elements.programItemReps) {
    elements.programItemReps.value = "";
  }
  if (elements.programItemWeight) {
    elements.programItemWeight.value = "";
  }
  elements.programItemPrescription.value = "";
  elements.programItemPrescription.dataset.autoSource = "";
  if (elements.programItemCondition) {
    elements.programItemCondition.value = "";
  }
  if (elements.programItemNotes) {
    elements.programItemNotes.value = "";
  }
  elements.programItemFeedback.textContent =
    "Selecciona tipo, ejercicio, reps, peso y condición para agregar la línea.";
  return;

  if (!elements.programItemDraftIndex) {
    return;
  }

  elements.programItemDraftIndex.value = "";
  elements.programItemFormTitle.textContent = "Agregar ejercicio";
  elements.addProgramItem.textContent = "Agregar ejercicio";
  elements.programItemBlock.value = "";
  fillProgrammingExerciseSelect({
    selectedValue: "",
  });
  fillProgrammingMethodSelects({
    programMethod: elements.programMethod?.value || "",
    itemMethod: "",
    programFilterMethod: elements.programFilterMethod?.value || "",
  });
  elements.programItemPrescription.value = "";
  elements.programItemCondition.value = "";
  elements.programItemNotes.value = "";
  elements.programItemFeedback.textContent =
    "Agrega los ejercicios uno a uno para construir la rutina completa.";
}

function syncProgramItemVisibleLine(force = false) {
  const selectedExercise = getProgrammingExerciseById(
    elements.programItemExercise?.value
  );

  if (!selectedExercise || !elements.programItemPrescription) {
    return;
  }

  const currentValue = elements.programItemPrescription.value.trim();
  const previousAutoSource = String(
    elements.programItemPrescription.dataset.autoSource || ""
  ).trim();
  const composedLine = buildProgramLineFromFields({
    exerciseName: selectedExercise.name,
    repetitionText: String(elements.programItemReps?.value || "").trim(),
    weightText: String(elements.programItemWeight?.value || "").trim(),
  });

  if (!currentValue || force || currentValue === previousAutoSource) {
    elements.programItemPrescription.value = composedLine;
    elements.programItemPrescription.dataset.autoSource = composedLine;
  }
}

function handleProgramExerciseSearchInput() {
  syncProgramExerciseSelectionFromSearch();
  renderProgramExerciseSuggestions(elements.programItemExerciseSearch?.value || "", {
    forceOpen: true,
  });
}

function handleProgramExerciseSearchKeydown(event) {
  if (event.key === "Escape") {
    hideProgramExerciseSuggestions();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  const suggestions = getProgramExerciseMatches(
    elements.programItemExerciseSearch?.value || "",
    elements.programItemFamily?.value || ""
  );
  if (!suggestions.length) {
    return;
  }

  event.preventDefault();
  applyProgramExerciseSelection(suggestions[0]);
}

function handleProgramExerciseSuggestionClick(event) {
  const trigger = event.target.closest("[data-program-exercise-id]");
  if (!trigger) {
    return;
  }

  const selectedExercise = getProgrammingExerciseById(
    trigger.dataset.programExerciseId
  );
  if (!selectedExercise) {
    return;
  }

  applyProgramExerciseSelection(selectedExercise);
}

function renderProgramExerciseSuggestions(query = "", options = {}) {
  if (!elements.programItemExerciseSuggestions) {
    return;
  }

  const rawQuery = String(query || "").trim();
  const forceOpen = Boolean(options.forceOpen);
  const matches = getProgramExerciseMatches(
    rawQuery,
    elements.programItemFamily?.value || ""
  );

  if (!matches.length && !forceOpen) {
    elements.programItemExerciseSuggestions.innerHTML = "";
    elements.programItemExerciseSuggestions.classList.add("is-hidden");
    return;
  }

  if (!matches.length) {
    elements.programItemExerciseSuggestions.innerHTML = `
      <div class="search-suggestion-empty">
        No encontramos ejercicios con ese filtro.
      </div>
    `;
    elements.programItemExerciseSuggestions.classList.remove("is-hidden");
    return;
  }

  elements.programItemExerciseSuggestions.innerHTML = matches
    .slice(0, 10)
    .map(
      (item) => `
        <button
          class="search-suggestion-item"
          type="button"
          data-program-exercise-id="${escapeHtml(String(item.id))}"
        >
          <span class="search-suggestion-title">${escapeHtml(item.name || "")}</span>
          <span class="search-suggestion-meta">${escapeHtml(
            [
              programmingFamilyLabel(item.family),
              item.category,
              item.primaryMuscle,
            ]
              .filter(Boolean)
              .join(" · ")
          )}</span>
        </button>
      `
    )
    .join("");
  elements.programItemExerciseSuggestions.classList.remove("is-hidden");
}

function hideProgramExerciseSuggestions() {
  if (!elements.programItemExerciseSuggestions) {
    return;
  }

  elements.programItemExerciseSuggestions.classList.add("is-hidden");
}

function getProgramExerciseMatches(query = "", familyValue = "") {
  const normalizedQuery = normalizeSearchValue(String(query || "").trim());
  const records = getActiveProgrammingExercises().filter((item) =>
    familyValue ? item.family === familyValue : true
  );

  if (!normalizedQuery) {
    return records;
  }

  return records.filter((item) => {
    const haystack = normalizeSearchValue(
      [
        item.name,
        programmingFamilyLabel(item.family),
        item.category,
        item.primaryMuscle,
        item.movementPattern,
        item.equipment,
      ]
        .filter(Boolean)
        .join(" ")
    );
    return haystack.includes(normalizedQuery);
  });
}

function applyProgramExerciseSelection(exercise) {
  if (!exercise || !elements.programItemExercise) {
    return false;
  }

  const familyValue = String(elements.programItemFamily?.value || "");
  elements.programItemExercise.value = String(exercise.id);
  if (elements.programItemExerciseSearch) {
    elements.programItemExerciseSearch.value = buildProgramExerciseOptionLabel(
      exercise,
      familyValue
    );
  }
  hideProgramExerciseSuggestions();
  syncProgramItemVisibleLine(true);
  renderProgramDraftState();
  return true;
}

function syncProgramExerciseSelectionFromSearch(options = {}) {
  if (!elements.programItemExerciseSearch || !elements.programItemExercise) {
    return false;
  }

  const rawValue = elements.programItemExerciseSearch.value.trim();
  if (!rawValue) {
    elements.programItemExercise.value = "";
    return false;
  }

  const familyValue = String(elements.programItemFamily?.value || "");
  const selectedOptions = getProgramExerciseMatches(rawValue, familyValue);
  const normalizedQuery = normalizeSearchValue(rawValue);

  let matchedExercise =
    selectedOptions.find(
      (item) =>
        normalizeSearchValue(
          buildProgramExerciseOptionLabel(item, familyValue)
        ) === normalizedQuery
    ) || null;

  if (!matchedExercise && options.allowClosestMatch) {
    matchedExercise =
      selectedOptions.find((item) =>
        normalizeSearchValue(
          buildProgramExerciseOptionLabel(item, familyValue)
        ).startsWith(normalizedQuery)
      ) || null;
  }

  if (!matchedExercise) {
    elements.programItemExercise.value = "";
    return false;
  }

  return applyProgramExerciseSelection(matchedExercise);
}

function buildProgramExerciseOptionLabel(exercise, familyValue = "") {
  if (!exercise) {
    return "";
  }

  if (familyValue) {
    return String(exercise.name || "");
  }

  return `${exercise.name} · ${programmingFamilyLabel(exercise.family)}`;
}

function resetProgramExerciseForm() {
  if (!elements.programExerciseForm) {
    return;
  }

  elements.programExerciseForm.reset();
  elements.programExerciseId.value = "";
  elements.programExerciseFormTitle.textContent = "Crear ejercicio";
  fillProgrammingFamilySelects({
    formValue: "",
    filterValue: elements.programExerciseFilterFamily?.value || "Todas",
  });
  elements.programExerciseFeedback.textContent =
    "Usa familia + categoría + músculo para que luego la búsqueda y la programación sean rápidas.";
}

function resetProgrammingAthleteForm() {
  if (!elements.programAthleteForm) {
    return;
  }

  elements.programAthleteForm.reset();
  elements.programAthleteFormId.value = "";
  elements.programAthleteFormTitle.textContent = "Crear atleta";
  elements.programAthleteFormFeedback.textContent =
    "Aquí puedes construir una base independiente de atletas para el módulo de programación.";
}

function buildProgramPayload() {
  return {
    classDate: elements.programDate.value,
    title: elements.programTitle.value.trim(),
    classGroup: elements.programClassGroup.value.trim(),
    focusArea: elements.programFocus.value.trim(),
    methodId: Number(elements.programMethod.value || 0),
    durationMinutes: Number(elements.programDuration.value || 0),
    objective: elements.programObjective.value.trim(),
    generalNotes: elements.programNotes.value.trim(),
    items: programDraftItems.map((item) => ({
      blockName: item.blockName,
      exerciseId: Number(item.exerciseId || 0),
      methodId: item.methodId ? Number(item.methodId) : null,
      prescription: item.prescription,
      repetitionText: item.repetitionText || "",
      weightText: item.weightText || "",
      conditionNotes: item.conditionNotes,
      coachNotes: item.coachNotes,
    })),
  };
}

function validateProgramPayload(payload) {
  if (!payload.classDate) {
    return {
      valid: false,
      message: "Selecciona la fecha de la clase.",
    };
  }

  if (!payload.title) {
    return {
      valid: false,
      message: "Escribe el nombre de la clase.",
    };
  }

  if (!(payload.methodId > 0)) {
    return {
      valid: false,
      message: "Selecciona el método principal de la clase.",
    };
  }

  if (!(payload.durationMinutes > 0)) {
    return {
      valid: false,
      message: "La duración debe ser mayor que cero.",
    };
  }

  if (!payload.items.length) {
    return {
      valid: false,
      message: "Agrega al menos un ejercicio a la rutina.",
    };
  }

  return {
    valid: true,
  };
}

function validateProgramItemDraft(item) {
  if (!(item.exerciseId > 0) || !item.exerciseName) {
    return {
      valid: false,
      message: "Selecciona un ejercicio de la biblioteca.",
    };
  }

  return {
    valid: true,
  };

  if (!item.prescription) {
    return {
      valid: false,
      message: "Escribe la línea que debe verse en la rutina.",
    };
  }

  return {
    valid: true,
  };

  if (!item.blockName) {
    return {
      valid: false,
      message: "Define a qué bloque pertenece el ejercicio.",
    };
  }

  if (!(item.exerciseId > 0) || !item.exerciseName) {
    return {
      valid: false,
      message: "Selecciona un ejercicio de la biblioteca.",
    };
  }

  if (!item.prescription) {
    return {
      valid: false,
      message: "Escribe la dosificación o el volumen del ejercicio.",
    };
  }

  return {
    valid: true,
  };
}

function validateProgrammingExerciseFormPayload(payload) {
  if (!payload.name) {
    return {
      valid: false,
      message: "El nombre del ejercicio es obligatorio.",
    };
  }

  if (!payload.family) {
    return {
      valid: false,
      message: "Selecciona la familia del ejercicio.",
    };
  }

  if (!payload.category) {
    return {
      valid: false,
      message: "La categoría del ejercicio es obligatoria.",
    };
  }

  if (!payload.primaryMuscle) {
    return {
      valid: false,
      message: "El músculo principal es obligatorio.",
    };
  }

  return {
    valid: true,
  };
}

function fillProgrammingMethodSelects(selectedValues = {}) {
  const methods = getActiveProgrammingMethods();

  fillSelectFromRecords(elements.programMethod, methods, {
    selectedValue: selectedValues.programMethod,
    placeholder: "Selecciona un método",
  });
  fillSelectFromRecords(elements.programItemMethod, methods, {
    selectedValue: selectedValues.itemMethod,
    placeholder: "Usar método principal",
  });
  fillSelectFromRecords(elements.programFilterMethod, methods, {
    selectedValue: selectedValues.programFilterMethod,
    placeholder: "Todos los métodos",
  });
}

function fillProgrammingExerciseSelect(options = {}) {
  {
  const selectedValue = String(options.selectedValue || "");
  const familyValue = String(options.familyValue || "");
  const records = getActiveProgrammingExercises().filter((item) =>
    familyValue ? item.family === familyValue : true
  );
  const selectedRecord = getProgrammingExerciseById(selectedValue);

  fillSelectFromRecords(elements.programItemExercise, records, {
    selectedValue,
    placeholder: "Selecciona un ejercicio",
    includeRecord: selectedRecord,
    labelBuilder: (item) =>
      familyValue ? item.name : `${item.name} · ${programmingFamilyLabel(item.family)}`,
  });
  return;
  }

  const selectedValue = String(options.selectedValue || "");
  const records = getActiveProgrammingExercises();
  const selectedRecord = getProgrammingExerciseById(selectedValue);

  fillSelectFromRecords(elements.programItemExercise, records, {
    selectedValue,
    placeholder: "Selecciona un ejercicio",
    includeRecord: selectedRecord,
    labelBuilder: (item) =>
      `${item.name} · ${programmingFamilyLabel(item.family)}`,
  });
}

function fillProgrammingExerciseSelect(options = {}) {
  const selectedValue = String(options.selectedValue || "");
  const familyValue = String(
    options.familyValue || elements.programItemFamily?.value || ""
  );
  const records = getActiveProgrammingExercises().filter((item) =>
    familyValue ? item.family === familyValue : true
  );
  const selectedRecord = getProgrammingExerciseById(selectedValue);

  fillSelectFromRecords(elements.programItemExercise, records, {
    selectedValue,
    placeholder: "Selecciona un ejercicio",
    includeRecord: selectedRecord,
    labelBuilder: (item) => buildProgramExerciseOptionLabel(item, familyValue),
  });

  if (elements.programItemExerciseSearch) {
    elements.programItemExerciseSearch.value = selectedRecord
      ? buildProgramExerciseOptionLabel(selectedRecord, familyValue)
      : "";
    elements.programItemExerciseSearch.placeholder = records.length
      ? "Escribe para buscar un ejercicio"
      : "No hay ejercicios disponibles para este tipo";
  }

  hideProgramExerciseSuggestions();
}

function fillProgrammingFamilySelects(selectedValues = {}) {
  {
  const options = getProgrammingFamilyOptions();

  if (elements.programExerciseFamily) {
    elements.programExerciseFamily.innerHTML = [
      `<option value="">Selecciona una familia</option>`,
      ...options.map(
        (item) =>
          `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
      ),
    ].join("");
    if (options.some((item) => item.value === selectedValues.formValue)) {
      elements.programExerciseFamily.value = selectedValues.formValue;
    }
  }

  if (elements.programExerciseFilterFamily) {
    elements.programExerciseFilterFamily.innerHTML = [
      `<option value="Todas">Todas</option>`,
      ...options.map(
        (item) =>
          `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
      ),
    ].join("");
    if (
      ["Todas", ...options.map((item) => item.value)].includes(
        selectedValues.filterValue
      )
    ) {
      elements.programExerciseFilterFamily.value = selectedValues.filterValue;
    }
  }

  if (elements.programItemFamily) {
    elements.programItemFamily.innerHTML = [
      `<option value="">Todos los tipos</option>`,
      ...options.map(
        (item) =>
          `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
      ),
    ].join("");
    if (
      ["", ...options.map((item) => item.value)].includes(selectedValues.itemValue)
    ) {
      elements.programItemFamily.value = selectedValues.itemValue;
    }
  }
  return;
  }

  const options = getProgrammingFamilyOptions();

  if (elements.programExerciseFamily) {
    elements.programExerciseFamily.innerHTML = [
      `<option value="">Selecciona una familia</option>`,
      ...options.map(
        (item) =>
          `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
      ),
    ].join("");
    if (options.some((item) => item.value === selectedValues.formValue)) {
      elements.programExerciseFamily.value = selectedValues.formValue;
    }
  }

  if (elements.programExerciseFilterFamily) {
    elements.programExerciseFilterFamily.innerHTML = [
      `<option value="Todas">Todas</option>`,
      ...options.map(
        (item) =>
          `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
      ),
    ].join("");
    if (
      ["Todas", ...options.map((item) => item.value)].includes(
        selectedValues.filterValue
      )
    ) {
      elements.programExerciseFilterFamily.value = selectedValues.filterValue;
    }
  }
}

function fillProgrammingExerciseSelect(options = {}) {
  const selectedValue = String(options.selectedValue || "");
  const familyValue = String(
    options.familyValue || elements.programItemFamily?.value || ""
  );
  const records = getActiveProgrammingExercises().filter((item) =>
    familyValue ? item.family === familyValue : true
  );
  const selectedRecord = getProgrammingExerciseById(selectedValue);
  const normalizedRecords = [...records];

  if (
    selectedRecord &&
    !normalizedRecords.some(
      (item) => String(item.id) === String(selectedRecord.id)
    )
  ) {
    normalizedRecords.push(selectedRecord);
  }

  fillSelectFromRecords(elements.programItemExercise, normalizedRecords, {
    selectedValue,
    placeholder: "Selecciona un ejercicio",
    includeRecord: selectedRecord,
    labelBuilder: (item) =>
      familyValue
        ? item.name
        : `${item.name} · ${programmingFamilyLabel(item.family)}`,
  });

  if (elements.programItemExerciseSearch) {
    elements.programItemExerciseSearch.value = selectedRecord
      ? buildProgramExerciseOptionLabel(selectedRecord, familyValue)
      : "";
    elements.programItemExerciseSearch.placeholder = normalizedRecords.length
      ? "Escribe para buscar un ejercicio"
      : "No hay ejercicios disponibles para este tipo";
  }
  hideProgramExerciseSuggestions();
}

function fillSelectFromRecords(select, records, options = {}) {
  if (!select) {
    return;
  }

  const selectedValue = String(options.selectedValue || "");
  const placeholder = options.placeholder || "";
  const includeRecord = options.includeRecord;
  const normalizedRecords = Array.isArray(records) ? [...records] : [];

  if (
    includeRecord &&
    !normalizedRecords.some(
      (item) => String(item.id) === String(includeRecord.id)
    )
  ) {
    normalizedRecords.push(includeRecord);
  }

  const optionMarkup = normalizedRecords.map((item) => {
    const label = options.labelBuilder
      ? options.labelBuilder(item)
      : item.name || item.value || String(item.id);

    return `<option value="${escapeHtml(String(item.id))}">${escapeHtml(label)}</option>`;
  });

  select.innerHTML = [
    placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : "",
    ...optionMarkup,
  ].join("");

  if ([...select.options].some((item) => item.value === selectedValue)) {
    select.value = selectedValue;
  } else if (placeholder) {
    select.value = "";
  } else if (select.options.length) {
    select.selectedIndex = 0;
  }
}

function getProgrammingFamilyOptions() {
  return [
    {
      value: "multiarticular_tren_inferior",
      label: "Multiarticular tren inferior",
    },
    {
      value: "multiarticular_tren_superior",
      label: "Multiarticular tren superior",
    },
    {
      value: "aislado_por_musculo",
      label: "Aislado por músculo",
    },
    {
      value: "hyrox_oficial",
      label: "HYROX oficial",
    },
  ];
}

function programmingFamilyLabel(value) {
  return (
    getProgrammingFamilyOptions().find((item) => item.value === value)?.label ||
    "Sin familia"
  );
}

function getProgrammingMethodById(id) {
  return (state.programmingMethods || []).find(
    (item) => String(item.id) === String(id)
  );
}

function getProgrammingExerciseById(id) {
  return (state.programmingExercises || []).find(
    (item) => String(item.id) === String(id)
  );
}

function getActiveProgrammingMethods() {
  return (state.programmingMethods || []).filter((item) => item.isActive);
}

function getActiveProgrammingExercises() {
  return (state.programmingExercises || []).filter((item) => item.isActive);
}

function getFilteredProgrammingExercises() {
  const family = elements.programExerciseFilterFamily?.value || "Todas";
  const query = normalizeSearchValue(elements.programExerciseQuery?.value || "");

  return (state.programmingExercises || []).filter((item) => {
    if (family !== "Todas" && item.family !== family) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalizeSearchValue(
      [
        item.name,
        programmingFamilyLabel(item.family),
        item.category,
        item.primaryMuscle,
        item.movementPattern,
        item.equipment,
        item.coachingNotes,
      ].join(" ")
    ).includes(query);
  });
}

function getFilteredClassPrograms() {
  {
  const selectedDate = normalizeDateOnly(
    elements.programFilterDate?.value || getCurrentIsoDate()
  );
  const { start, end } = getReferenceWeekRange(selectedDate);
  const selectedMethod = String(elements.programFilterMethod?.value || "");
  const query = normalizeSearchValue(elements.programFilterQuery?.value || "");

  return [...(state.classPrograms || [])]
    .filter((program) => {
      if (!isBetween(program.classDate, start, end)) {
        return false;
      }

      if (selectedMethod && String(program.methodId) !== selectedMethod) {
        return false;
      }

      if (!query) {
        return true;
      }

      return normalizeSearchValue(
        [
          program.title,
          program.classGroup,
          program.focusArea,
          program.methodName,
          program.objective,
          program.generalNotes,
          ...(program.enrollments || []).map((enrollment) =>
            [
              enrollment.athleteFullName,
              enrollment.athleteDocumentNumber,
              enrollment.generalNotes,
              ...(enrollment.results || []).map((result) =>
                [
                  result.exerciseNameSnapshot,
                  result.resultWeightText,
                  result.resultTimeText,
                  result.resultNotes,
                ].join(" ")
              ),
            ].join(" ")
          ),
          ...(program.items || []).map((item) =>
            [
              item.blockName,
              item.exerciseName,
              item.prescription,
              item.conditionNotes,
              item.coachNotes,
            ].join(" ")
          ),
        ].join(" ")
      ).includes(query);
    })
    .sort((a, b) => {
      const dateCompare = String(a.classDate).localeCompare(String(b.classDate));
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return String(a.title).localeCompare(String(b.title), APP_LOCALE);
    });
  }

  const selectedDate = normalizeDateOnly(elements.programFilterDate?.value || "");
  const selectedMethod = String(elements.programFilterMethod?.value || "");
  const query = normalizeSearchValue(elements.programFilterQuery?.value || "");

  return [...(state.classPrograms || [])].filter((program) => {
    if (selectedDate && normalizeDateOnly(program.classDate) !== selectedDate) {
      return false;
    }

    if (selectedMethod && String(program.methodId) !== selectedMethod) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalizeSearchValue(
      [
        program.title,
        program.classGroup,
        program.focusArea,
        program.methodName,
        program.objective,
        program.generalNotes,
        ...(program.items || []).map((item) =>
          [
            item.blockName,
            item.exerciseName,
            item.prescription,
            item.conditionNotes,
            item.coachNotes,
          ].join(" ")
        ),
      ].join(" ")
    ).includes(query);
  });
}

function summarizeProgramExercises(program) {
  const items = Array.isArray(program.items) ? program.items : [];

  if (!items.length) {
    return "Sin ejercicios";
  }

  const names = items.slice(0, 2).map((item) => item.exerciseName);
  if (items.length <= 2) {
    return names.join(", ");
  }

  return `${names.join(", ")} y ${items.length - 2} más`;
}

function getMostUsedProgramMethod(programs) {
  const counts = new Map();

  programs.forEach((program) => {
    const key = program.methodName || "Sin método";
    counts.set(key, Number(counts.get(key) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Sin datos";
}

function getReferenceWeekRange(referenceDate) {
  const safeReferenceDate = normalizeDateOnly(referenceDate) || getCurrentIsoDate();
  const parsedReferenceDate = parseIsoDateAtMidday(safeReferenceDate);
  const dayIndex = parsedReferenceDate.getUTCDay();
  const offsetToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
  const start = addDays(parsedReferenceDate, offsetToMonday);
  const end = addDays(start, 6);

  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
}

function getWeekBoardDays(referenceDate, programs = []) {
  const { start } = getReferenceWeekRange(referenceDate);
  const startDate = parseIsoDateAtMidday(start);
  const shouldShowWeekend = (programs || []).some((program) => {
    const weekday = parseIsoDateAtMidday(program.classDate).getUTCDay();
    return weekday === 0 || weekday === 6;
  });
  const dayCount = shouldShowWeekend ? 7 : 5;

  return Array.from({ length: dayCount }, (_item, index) => {
    const date = addDays(startDate, index);
    const iso = toIsoDate(date);

    return {
      iso,
      label: formatProgramDayLabel(iso),
      dateLabel: formatProgramShortDate(iso),
    };
  });
}

function formatProgramDayLabel(value) {
  if (!value) {
    return "SIN DÍA";
  }

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
  })
    .format(parseIsoDateAtMidday(value))
    .toLocaleUpperCase(APP_LOCALE);
}

function formatProgramShortDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
  }).format(parseIsoDateAtMidday(value));
}

function buildProgramWorkoutHeadline({
  focusArea = "",
  methodName = "",
  durationMinutes = "",
} = {}) {
  const cleanFocusArea = String(focusArea || "").trim();
  if (cleanFocusArea) {
    return cleanFocusArea;
  }

  const cleanMethod = String(methodName || "").trim();
  if (cleanMethod && durationMinutes) {
    return `${durationMinutes} min ${cleanMethod}`;
  }

  return cleanMethod || "Workout del día";
}

function buildProgramDisplayLine(item) {
  const composedLine = buildProgramLineFromFields(item);
  if (composedLine) {
    return composedLine;
  }

  return (
    String(item?.prescription || "").trim() ||
    String(item?.exerciseName || "").trim() ||
    "Línea sin texto"
  );
}

function buildProgramLineFromFields(item = {}) {
  const exerciseName = String(item.exerciseName || "").trim();
  const repetitionText = String(item.repetitionText || "").trim();
  const weightText = String(item.weightText || "").trim();

  if (!exerciseName) {
    return String(item.prescription || "").trim();
  }

  const parts = [exerciseName];
  const normalizedRepetitionText = formatProgramVolumeText(repetitionText);
  if (normalizedRepetitionText) {
    parts.push(normalizedRepetitionText);
  }
  if (weightText) {
    parts.push(weightText);
  }

  return parts.join(" · ").trim();
}

function formatProgramVolumeText(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return "";
  }

  return /^[0-9]+([.,][0-9]+)?$/.test(rawValue) ? `x ${rawValue}` : rawValue;
}

function renderProgramWeekCard(program) {
  const nextActive = program.isActive ? "false" : "true";
  const statusTitle = program.isActive
    ? "Inactivar programación"
    : "Reactivar programación";

  return renderProgramPreviewCard({
    dayLabel: formatProgramDayLabel(program.classDate),
    dateLabel: formatProgramShortDate(program.classDate),
    title: program.title,
    methodName: program.methodName || "",
    workoutHeadline: buildProgramWorkoutHeadline({
      focusArea: program.focusArea,
      methodName: program.methodName,
      durationMinutes: program.durationMinutes,
    }),
    items: program.items || [],
    generalNotes: program.generalNotes || "",
    programId: program.id,
    isActive: program.isActive,
    statusTitle,
    nextActive,
    isSelected: String(selectedProgramRosterId || "") === String(program.id),
    enrollmentsCount: Array.isArray(program.enrollments) ? program.enrollments.length : 0,
  });
}

function renderProgramPreviewCard({
  dayLabel = "",
  dateLabel = "",
  title = "",
  methodName = "",
  workoutHeadline = "",
  items = [],
  generalNotes = "",
  programId = "",
  isActive = true,
  statusTitle = "",
  nextActive = "",
  isDraft = false,
  isSelected = false,
  enrollmentsCount = 0,
} = {}) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const notesHtml = escapeHtml(String(generalNotes || "").trim()).replace(
    /\n/g,
    "<br />"
  );
  const actionsMarkup = isDraft
    ? ""
    : `
        <div class="program-card-actions">
          <button
            class="table-button icon-button"
            type="button"
            data-program-roster-id="${escapeHtml(String(programId))}"
            title="Gestionar atletas"
            aria-label="Gestionar atletas"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
              <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path>
              <path d="M20 8v6"></path>
              <path d="M17 11h6"></path>
            </svg>
          </button>
          <button
            class="table-button icon-button"
            type="button"
            data-program-edit-id="${escapeHtml(String(programId))}"
            title="Editar programación"
            aria-label="Editar programación"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
              <path d="m12 6 4 4"></path>
            </svg>
          </button>
          <button
            class="table-button icon-button ${isActive ? "danger" : ""}"
            type="button"
            data-program-status-id="${escapeHtml(String(programId))}"
            data-program-next-active="${escapeHtml(String(nextActive))}"
            title="${escapeHtml(statusTitle)}"
            aria-label="${escapeHtml(statusTitle)}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 3v9"></path>
              <path d="M7.05 5.05a8 8 0 1 0 9.9 0"></path>
            </svg>
          </button>
        </div>
      `;

  return `
    <article class="program-week-card ${isDraft ? "program-preview-card" : ""} ${isActive ? "" : "program-week-card-inactive"} ${isSelected ? "program-week-card-selected" : ""}">
      <div class="program-card-top">
        <div class="program-card-day">
          ${dayLabel ? `<span class="program-card-day-name">${escapeHtml(dayLabel)}</span>` : ""}
          ${dateLabel ? `<span class="program-card-day-date">${escapeHtml(dateLabel)}</span>` : ""}
        </div>
        ${actionsMarkup}
      </div>
      <div class="program-card-badge">${escapeHtml(title || "Clase sin nombre")}</div>
      ${
        !isDraft
          ? `<div class="program-card-athletes">${escapeHtml(
              `${enrollmentsCount} atleta${enrollmentsCount === 1 ? "" : "s"} inscrito${enrollmentsCount === 1 ? "" : "s"}`
            )}</div>`
          : ""
      }
      ${
        methodName
          ? `<div class="program-card-method">${escapeHtml(methodName)}</div>`
          : ""
      }
      <div class="program-card-label">Workout</div>
      <div class="program-card-workout">${escapeHtml(workoutHeadline || "Sin encabezado")}</div>
      <div class="program-card-lines ${normalizedItems.length ? "" : "is-empty"}">
        ${
          normalizedItems.length
            ? normalizedItems
                .map(
                  (item) =>
                    `<div class="program-card-line-item">
                      <div class="program-card-line">${escapeHtml(buildProgramDisplayLine(item))}</div>
                      ${
                        item.conditionNotes
                          ? `<div class="program-card-line-meta">${escapeHtml(item.conditionNotes)}</div>`
                          : ""
                      }
                    </div>`
                )
                .join("")
            : `<div class="program-card-line muted">Agrega ejercicios y aquí aparecerá la rutina.</div>`
        }
      </div>
      ${
        notesHtml
          ? `
              <div class="program-card-label">Notes</div>
              <div class="program-card-notes">${notesHtml}</div>
            `
          : ""
      }
    </article>
  `;
}

function getSelectedProgramRoster() {
  return (
    (state.classPrograms || []).find(
      (program) => String(program.id) === String(selectedProgramRosterId || "")
    ) || null
  );
}

function getSelectedProgramEnrollment(program = getSelectedProgramRoster()) {
  if (!program) {
    return null;
  }

  return (
    (program.enrollments || []).find(
      (item) => String(item.id) === String(selectedProgramEnrollmentId || "")
    ) || null
  );
}

function syncProgramRosterSelectionState() {
  const selectedProgram = getSelectedProgramRoster();

  if (!selectedProgram) {
    selectedProgramRosterId = null;
    selectedProgramEnrollmentId = null;
    return;
  }

  const enrollments = Array.isArray(selectedProgram.enrollments)
    ? selectedProgram.enrollments
    : [];

  if (
    selectedProgramEnrollmentId &&
    !enrollments.some(
      (item) => String(item.id) === String(selectedProgramEnrollmentId)
    )
  ) {
    selectedProgramEnrollmentId = null;
  }

  if (!selectedProgramEnrollmentId && enrollments.length) {
    selectedProgramEnrollmentId = enrollments[0].id;
  }
}

function clearProgramAthleteSearchSelection() {
  if (elements.programAthleteId) {
    elements.programAthleteId.value = "";
  }
  if (elements.programAthleteSearch) {
    elements.programAthleteSearch.value = "";
  }
  hideProgramAthleteSuggestions();
}

function selectProgramRoster(programId, options = {}) {
  const nextProgramId = Number(programId || 0);
  selectedProgramRosterId =
    Number.isInteger(nextProgramId) && nextProgramId > 0 ? nextProgramId : null;

  syncProgramRosterSelectionState();

  const selectedProgram = getSelectedProgramRoster();
  if (!selectedProgram) {
    renderProgrammingPrograms();
    renderProgramRosterManager();
    return;
  }

  const requestedEnrollmentId = Number(options.enrollmentId || 0);
  if (
    Number.isInteger(requestedEnrollmentId) &&
    requestedEnrollmentId > 0 &&
    (selectedProgram.enrollments || []).some(
      (item) => Number(item.id || 0) === requestedEnrollmentId
    )
  ) {
    selectedProgramEnrollmentId = requestedEnrollmentId;
  } else if (
    !selectedProgramEnrollmentId &&
    Array.isArray(selectedProgram.enrollments) &&
    selectedProgram.enrollments.length
  ) {
    selectedProgramEnrollmentId = selectedProgram.enrollments[0].id;
  }

  renderProgrammingPrograms();
  renderProgramRosterManager();

  if (options.scroll !== false) {
    elements.programRosterClassSummary?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function selectProgramEnrollment(enrollmentId) {
  const nextEnrollmentId = Number(enrollmentId || 0);
  selectedProgramEnrollmentId =
    Number.isInteger(nextEnrollmentId) && nextEnrollmentId > 0
      ? nextEnrollmentId
      : null;
  renderProgramRosterManager();
}

function renderProgramRosterManager() {
  if (
    !elements.programRosterClassSummary ||
    !elements.programAthleteSummary ||
    !elements.programAthleteList ||
    !elements.programAthleteResults ||
    !elements.programAthleteResultsTitle ||
    !elements.programAthleteResultsFeedback
  ) {
    return;
  }

  syncProgramRosterSelectionState();

  const selectedProgram = getSelectedProgramRoster();
  if (!selectedProgram) {
    elements.programRosterClassSummary.innerHTML =
      "Selecciona una clase del tablero semanal para inscribir atletas y guardar sus resultados.";
    elements.programAthleteSummary.innerHTML = "";
    elements.programAthleteList.innerHTML = `
      <div class="empty-state">
        Aún no has elegido una clase para gestionar atletas.
      </div>
    `;
    elements.programAthleteResultsTitle.textContent = "Resultados del atleta";
    elements.programAthleteResults.innerHTML = `
      <div class="empty-state">
        Cuando selecciones una clase, aquí verás los ejercicios y podrás guardar peso, tiempo y anotaciones por atleta.
      </div>
    `;
    if (elements.programAthleteGeneralNotes) {
      elements.programAthleteGeneralNotes.value = "";
    }
    if (elements.programAthleteResultsFeedback) {
      elements.programAthleteResultsFeedback.textContent =
        "Primero selecciona una clase del tablero semanal.";
    }
    if (elements.programAthleteSearch) {
      elements.programAthleteSearch.placeholder =
        "Selecciona una clase para habilitar la inscripción";
    }
    clearProgramAthleteSearchSelection();
    return;
  }

  const enrollments = Array.isArray(selectedProgram.enrollments)
    ? selectedProgram.enrollments
    : [];
  const selectedEnrollment = getSelectedProgramEnrollment(selectedProgram);
  const athletesWithResults = enrollments.filter((item) =>
    (item.results || []).some(
      (result) =>
        result.resultWeightText || result.resultTimeText || result.resultNotes
    )
  );

  elements.programRosterClassSummary.innerHTML = `
    <strong>${escapeHtml(selectedProgram.title || "Clase sin nombre")}</strong>
    <small>
      ${formatDate(selectedProgram.classDate)} ·
      ${escapeHtml(selectedProgram.methodName || "Sin método")} ·
      ${escapeHtml(selectedProgram.focusArea || "Sin enfoque")}
    </small>
  `;

  elements.programAthleteSummary.innerHTML = `
    <div class="mini-stat"><span>Inscritos</span><strong>${enrollments.length}</strong></div>
    <div class="mini-stat"><span>Con resultados</span><strong>${athletesWithResults.length}</strong></div>
    <div class="mini-stat"><span>Ejercicios de la clase</span><strong>${(selectedProgram.items || []).length}</strong></div>
  `;

  if (elements.programAthleteSearch) {
    elements.programAthleteSearch.placeholder = getAvailableProgramAthleteRecords()
      .length
      ? "Escribe para buscar un atleta"
      : "No hay atletas activos disponibles para inscribir";
  }

  elements.programAthleteList.innerHTML = enrollments.length
    ? enrollments
        .map((item) => {
          const isSelected =
            String(item.id) === String(selectedProgramEnrollmentId || "");
          const resultCount = (item.results || []).filter(
            (result) =>
              result.resultWeightText ||
              result.resultTimeText ||
              result.resultNotes
          ).length;

          return `
            <article class="program-athlete-card ${isSelected ? "is-selected" : ""}">
              <div class="program-athlete-card-copy">
                <strong>${escapeHtml(item.athleteFullName || "Atleta sin nombre")}</strong>
                <small>${escapeHtml(buildProgramAthleteMeta(item))}</small>
              </div>
              <div class="program-athlete-card-side">
                <span class="status-pill method-pill">${resultCount} resultado${resultCount === 1 ? "" : "s"}</span>
                <div class="table-actions">
                  <button
                    class="table-button icon-button"
                    type="button"
                    data-program-enrollment-select-id="${escapeHtml(String(item.id))}"
                    title="Abrir resultados"
                    aria-label="Abrir resultados"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </button>
                  <button
                    class="table-button icon-button danger"
                    type="button"
                    data-program-enrollment-remove-id="${escapeHtml(String(item.id))}"
                    title="Quitar atleta"
                    aria-label="Quitar atleta"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M3 6h18"></path>
                      <path d="M8 6V4h8v2"></path>
                      <path d="M19 6l-1 14H6L5 6"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join("")
    : `
      <div class="empty-state">
        Esta clase aún no tiene atletas inscritos.
      </div>
    `;

  if (!selectedEnrollment) {
    elements.programAthleteResultsTitle.textContent = "Resultados del atleta";
    elements.programAthleteResults.innerHTML = `
      <div class="empty-state">
        Inscribe un atleta o selecciona uno de la lista para cargar sus marcas.
      </div>
    `;
    if (elements.programAthleteGeneralNotes) {
      elements.programAthleteGeneralNotes.value = "";
    }
    elements.programAthleteResultsFeedback.textContent =
      "Selecciona un atleta para registrar peso, tiempo y anotaciones por ejercicio.";
    return;
  }

  const resultMap = new Map(
    (selectedEnrollment.results || []).map((item) => [
      Number(item.itemSortOrder || 0),
      item,
    ])
  );

  elements.programAthleteResultsTitle.textContent = `Resultados de ${selectedEnrollment.athleteFullName || "Atleta"}`;
  elements.programAthleteResults.innerHTML = (selectedProgram.items || []).length
    ? (selectedProgram.items || [])
        .map((item, index) => {
          const currentResult =
            resultMap.get(Number(item.sortOrder || 0)) || {};

          return `
            <article
              class="program-athlete-result-card"
              data-program-result-row
              data-item-sort-order="${escapeHtml(String(item.sortOrder || index + 1))}"
            >
              <div class="program-athlete-result-head">
                <strong>${index + 1}. ${escapeHtml(item.exerciseName || "Ejercicio")}</strong>
                <small>${escapeHtml(buildProgramDisplayLine(item))}</small>
              </div>
              <div class="form-grid compact-program-result-grid">
                <label>
                  Peso realizado
                  <input
                    type="text"
                    data-program-result-weight
                    value="${escapeHtml(currentResult.resultWeightText || "")}"
                    placeholder="Ej. 20 kg, 2 x 15 lb"
                  />
                </label>
                <label>
                  Tiempo / score
                  <input
                    type="text"
                    data-program-result-time
                    value="${escapeHtml(currentResult.resultTimeText || "")}"
                    placeholder="Ej. 4:32, 12 rounds, 220 m"
                  />
                </label>
                <label class="span-2">
                  Anotaciones
                  <textarea
                    rows="2"
                    data-program-result-notes
                    placeholder="Cómo lo ejecutó, ajustes, observaciones..."
                  >${escapeHtml(currentResult.resultNotes || "")}</textarea>
                </label>
              </div>
            </article>
          `;
        })
        .join("")
    : `
      <div class="empty-state">
        Esta clase todavía no tiene ejercicios guardados.
      </div>
    `;

  if (elements.programAthleteGeneralNotes) {
    elements.programAthleteGeneralNotes.value =
      selectedEnrollment.generalNotes || "";
  }
  elements.programAthleteResultsFeedback.textContent =
    "Guarda aquí las marcas del atleta por ejercicio y cualquier observación general de la clase.";
}

function buildProgramAthleteMeta(enrollment) {
  if (!enrollment) {
    return "";
  }

  return (
    [
      enrollment.athleteDocumentNumber || "Sin documento",
      enrollment.athletePhone,
      enrollment.athleteEmail,
    ]
      .filter(Boolean)
      .join(" · ") || "Atleta activo"
  );
}

function getAvailableProgramAthleteRecords() {
  const selectedProgram = getSelectedProgramRoster();
  const enrolledIds = new Set(
    (selectedProgram?.enrollments || []).map((item) => Number(item.athleteId || 0))
  );

  return (state.athletes || [])
    .filter((item) => item.isActive)
    .filter((item) => !enrolledIds.has(Number(item.id || 0)))
    .map((item) => ({
      lookupKey: `athlete:${String(item.id)}`,
      athleteId: Number(item.id || 0),
      fullName: String(item.fullName || "").trim(),
      documentNumber: String(item.documentNumber || "").trim(),
      birthDate: normalizeDateOnly(item.birthDate),
      phone: String(item.phone || "").trim(),
      email: String(item.email || "").trim(),
      emergencyContactName: String(item.emergencyContactName || "").trim(),
      emergencyContactPhone: String(item.emergencyContactPhone || "").trim(),
      medicalNotes: String(item.medicalNotes || "").trim(),
      athleteNotes: String(item.athleteNotes || "").trim(),
    }));
}

function getProgramAthleteMatches(query = "") {
  const normalizedQuery = normalizeSearchValue(String(query || "").trim());
  const records = getAvailableProgramAthleteRecords();

  if (!normalizedQuery) {
    return records;
  }

  return records.filter((item) =>
    normalizeSearchValue(
      [
        item.fullName,
        item.documentNumber,
        item.birthDate,
        item.phone,
        item.email,
        item.emergencyContactName,
        item.emergencyContactPhone,
        item.medicalNotes,
        item.athleteNotes,
      ]
        .filter(Boolean)
        .join(" ")
    ).includes(normalizedQuery)
  );
}

function renderProgramAthleteSuggestions(query = "", options = {}) {
  if (!elements.programAthleteSuggestions) {
    return;
  }

  const forceOpen = Boolean(options.forceOpen);
  const matches = getProgramAthleteMatches(query);

  if (!matches.length && !forceOpen) {
    elements.programAthleteSuggestions.innerHTML = "";
    elements.programAthleteSuggestions.classList.add("is-hidden");
    return;
  }

  if (!matches.length) {
    elements.programAthleteSuggestions.innerHTML = `
      <div class="search-suggestion-empty">
        No hay atletas disponibles con ese filtro.
      </div>
    `;
    elements.programAthleteSuggestions.classList.remove("is-hidden");
    return;
  }

  elements.programAthleteSuggestions.innerHTML = matches
    .slice(0, 10)
    .map(
      (item) => `
        <button
          class="search-suggestion-item"
          type="button"
          data-program-athlete-key="${escapeHtml(item.lookupKey)}"
        >
          <span class="search-suggestion-title">${escapeHtml(item.fullName || "")}</span>
          <span class="search-suggestion-meta">${escapeHtml(buildProgramAthleteSuggestionMeta(item))}</span>
        </button>
      `
    )
    .join("");
  elements.programAthleteSuggestions.classList.remove("is-hidden");
}

function hideProgramAthleteSuggestions() {
  if (!elements.programAthleteSuggestions) {
    return;
  }

  elements.programAthleteSuggestions.classList.add("is-hidden");
}

function buildProgramAthleteSuggestionMeta(item) {
  return (
    [
      item.documentNumber || "Sin documento",
      item.phone,
      item.email,
      item.medicalNotes ? "Con alerta médica" : "",
    ]
      .filter(Boolean)
      .join(" · ") || "Atleta activo"
  );
}

function applyProgramAthleteSelection(record) {
  if (!record) {
    return false;
  }

  if (elements.programAthleteId) {
    elements.programAthleteId.value = String(record.athleteId || "");
  }
  if (elements.programAthleteSearch) {
    elements.programAthleteSearch.value = String(record.fullName || "");
  }
  hideProgramAthleteSuggestions();
  return true;
}

function syncProgramAthleteSelectionFromSearch(options = {}) {
  if (!elements.programAthleteSearch || !elements.programAthleteId) {
    return false;
  }

  const rawValue = elements.programAthleteSearch.value.trim();
  if (!rawValue) {
    elements.programAthleteId.value = "";
    return true;
  }

  const matches = getProgramAthleteMatches(rawValue);
  const normalizedQuery = normalizeSearchValue(rawValue);

  let matchedRecord =
    matches.find(
      (item) => normalizeSearchValue(String(item.fullName || "")) === normalizedQuery
    ) || null;

  if (!matchedRecord && options.allowSingleMatch && matches.length === 1) {
    matchedRecord = matches[0];
  }

  if (!matchedRecord && options.allowClosestMatch) {
    matchedRecord =
      matches.find((item) =>
        normalizeSearchValue(String(item.fullName || "")).startsWith(
          normalizedQuery
        )
      ) || null;
  }

  if (!matchedRecord) {
    elements.programAthleteId.value = "";
    return false;
  }

  return applyProgramAthleteSelection(matchedRecord);
}

function handleProgramAthleteSearchInput() {
  syncProgramAthleteSelectionFromSearch();
  renderProgramAthleteSuggestions(elements.programAthleteSearch?.value || "", {
    forceOpen: true,
  });
}

function handleProgramAthleteSearchKeydown(event) {
  if (event.key === "Escape") {
    hideProgramAthleteSuggestions();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  const matches = getProgramAthleteMatches(
    elements.programAthleteSearch?.value || ""
  );

  if (!matches.length) {
    return;
  }

  event.preventDefault();
  applyProgramAthleteSelection(matches[0]);
}

function handleProgramAthleteSuggestionClick(event) {
  const trigger = event.target.closest("[data-program-athlete-key]");
  if (!trigger) {
    return;
  }

  const selectedRecord = getAvailableProgramAthleteRecords().find(
    (item) => item.lookupKey === trigger.dataset.programAthleteKey
  );

  if (!selectedRecord) {
    return;
  }

  applyProgramAthleteSelection(selectedRecord);
}

async function handleProgramAthleteAdd() {
  const selectedProgram = getSelectedProgramRoster();
  if (!selectedProgram) {
    if (elements.programAthleteFeedback) {
      elements.programAthleteFeedback.textContent =
        "Selecciona primero una clase para poder inscribir atletas.";
    }
    return;
  }

  syncProgramAthleteSelectionFromSearch({
    allowClosestMatch: true,
    allowSingleMatch: true,
  });

  const athleteId = Number(elements.programAthleteId?.value || 0);
  if (!Number.isInteger(athleteId) || athleteId <= 0) {
    if (elements.programAthleteFeedback) {
      elements.programAthleteFeedback.textContent =
        "Selecciona un atleta válido de la lista antes de inscribirlo.";
    }
    return;
  }

  try {
    await apiRequest(`/api/programming/programs/${selectedProgram.id}/enrollments`, {
      method: "POST",
      body: JSON.stringify({ athleteId }),
    });

    await loadBootstrap();
    const refreshedProgram = (state.classPrograms || []).find(
      (item) => String(item.id) === String(selectedProgram.id)
    );
    const enrollment = (refreshedProgram?.enrollments || []).find(
      (item) => Number(item.athleteId || 0) === athleteId
    );

    clearProgramAthleteSearchSelection();
    if (elements.programAthleteFeedback) {
      elements.programAthleteFeedback.textContent =
        "Atleta inscrito correctamente en la clase.";
    }
    selectProgramRoster(selectedProgram.id, {
      enrollmentId: enrollment?.id || null,
      scroll: false,
    });
  } catch (error) {
    if (elements.programAthleteFeedback) {
      elements.programAthleteFeedback.textContent =
        error.message || "No se pudo inscribir el atleta.";
    }
  }
}

async function handleProgramAthleteListClick(event) {
  const selectButton = event.target.closest("[data-program-enrollment-select-id]");
  const removeButton = event.target.closest("[data-program-enrollment-remove-id]");

  if (selectButton) {
    selectProgramEnrollment(selectButton.dataset.programEnrollmentSelectId);
    return;
  }

  if (!removeButton) {
    return;
  }

  const selectedProgram = getSelectedProgramRoster();
  const enrollmentId = Number(removeButton.dataset.programEnrollmentRemoveId || 0);
  const enrollment = (selectedProgram?.enrollments || []).find(
    (item) => Number(item.id || 0) === enrollmentId
  );

  if (!selectedProgram || !enrollmentId || !enrollment) {
    return;
  }

  const confirmed = window.confirm(
    `¿Deseas retirar a ${enrollment.athleteFullName || "este atleta"} de la clase?`
  );
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/api/programming/programs/${selectedProgram.id}/enrollments/${enrollmentId}`,
      {
        method: "DELETE",
      }
    );

    await loadBootstrap();
    if (elements.programAthleteFeedback) {
      elements.programAthleteFeedback.textContent =
        "Atleta retirado de la clase.";
    }
    selectProgramRoster(selectedProgram.id, { scroll: false });
  } catch (error) {
    if (elements.programAthleteFeedback) {
      elements.programAthleteFeedback.textContent =
        error.message || "No se pudo retirar el atleta de la clase.";
    }
  }
}

async function handleProgramAthleteResultsSubmit(event) {
  event.preventDefault();

  const selectedProgram = getSelectedProgramRoster();
  const selectedEnrollment = getSelectedProgramEnrollment(selectedProgram);

  if (!selectedProgram || !selectedEnrollment) {
    elements.programAthleteResultsFeedback.textContent =
      "Selecciona una clase y un atleta antes de guardar resultados.";
    return;
  }

  const results = [...elements.programAthleteResults.querySelectorAll("[data-program-result-row]")]
    .map((row) => ({
      itemSortOrder: Number(row.dataset.itemSortOrder || 0),
      resultWeightText:
        row.querySelector("[data-program-result-weight]")?.value.trim() || "",
      resultTimeText:
        row.querySelector("[data-program-result-time]")?.value.trim() || "",
      resultNotes:
        row.querySelector("[data-program-result-notes]")?.value.trim() || "",
    }));

  try {
    await apiRequest(
      `/api/programming/programs/${selectedProgram.id}/enrollments/${selectedEnrollment.id}/results`,
      {
        method: "PUT",
        body: JSON.stringify({
          generalNotes: elements.programAthleteGeneralNotes?.value.trim() || "",
          results,
        }),
      }
    );

    await loadBootstrap();
    elements.programAthleteResultsFeedback.textContent =
      "Resultados del atleta guardados correctamente.";
    selectProgramRoster(selectedProgram.id, {
      enrollmentId: selectedEnrollment.id,
      scroll: false,
    });
  } catch (error) {
    elements.programAthleteResultsFeedback.textContent =
      error.message || "No se pudieron guardar los resultados del atleta.";
  }
}

async function handleProgrammingAthleteSubmit(event) {
  event.preventDefault();

  const athleteId = Number(elements.programAthleteFormId?.value || 0);
  const payload = {
    fullName: elements.programAthleteFullName?.value.trim() || "",
    documentNumber: elements.programAthleteDocument?.value.trim() || "",
    birthDate: elements.programAthleteBirthDate?.value || "",
    phone: elements.programAthletePhone?.value.trim() || "",
    email: elements.programAthleteEmail?.value.trim() || "",
    emergencyContactName:
      elements.programAthleteEmergencyName?.value.trim() || "",
    emergencyContactPhone:
      elements.programAthleteEmergencyPhone?.value.trim() || "",
    medicalNotes: elements.programAthleteMedicalNotes?.value.trim() || "",
    athleteNotes: elements.programAthleteNotes?.value.trim() || "",
  };

  if (!payload.fullName) {
    if (elements.programAthleteFormFeedback) {
      elements.programAthleteFormFeedback.textContent =
        "El nombre del atleta es obligatorio.";
    }
    return;
  }

  try {
    if (athleteId > 0) {
      await apiRequest(`/api/programming/athletes/${athleteId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest("/api/programming/athletes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    resetProgrammingAthleteForm();
    await loadBootstrap();
    switchView("programacion", {
      programmingPanel: "atletas",
    });
    elements.programAthleteFormFeedback.textContent =
      athleteId > 0
        ? "Atleta actualizado correctamente."
        : "Atleta registrado correctamente.";
  } catch (error) {
    if (elements.programAthleteFormFeedback) {
      elements.programAthleteFormFeedback.textContent = error.message;
    }
  }
}

async function handleProgrammingAthletesTableClick(event) {
  const editButton = event.target.closest("[data-program-athlete-edit-id]");
  const statusButton = event.target.closest("[data-program-athlete-status-id]");
  const editAthleteId = editButton?.dataset.programAthleteEditId;
  const athleteId = statusButton?.dataset.programAthleteStatusId;
  const nextActive = statusButton?.dataset.programAthleteNextActive;

  if (editAthleteId) {
    const athlete = (state.athletes || []).find(
      (item) => String(item.id) === String(editAthleteId)
    );

    if (!athlete) {
      elements.programAthleteFormFeedback.textContent =
        "No encontré el atleta que quieres editar.";
      return;
    }

    elements.programAthleteFormId.value = String(athlete.id);
    elements.programAthleteFormTitle.textContent = "Editar atleta";
    elements.programAthleteFullName.value = athlete.fullName || "";
    elements.programAthleteDocument.value = athlete.documentNumber || "";
    elements.programAthleteBirthDate.value = athlete.birthDate || "";
    elements.programAthletePhone.value = athlete.phone || "";
    elements.programAthleteEmail.value = athlete.email || "";
    elements.programAthleteEmergencyName.value =
      athlete.emergencyContactName || "";
    elements.programAthleteEmergencyPhone.value =
      athlete.emergencyContactPhone || "";
    elements.programAthleteMedicalNotes.value = athlete.medicalNotes || "";
    elements.programAthleteNotes.value = athlete.athleteNotes || "";
    elements.programAthleteFormFeedback.textContent =
      "Actualiza la ficha del atleta y guarda para aplicar el cambio.";
    switchView("programacion", {
      programmingPanel: "atletas",
    });
    elements.programAthleteFullName.focus();
    return;
  }

  if (!athleteId || !nextActive) {
    return;
  }

  const activate = nextActive === "true";
  const confirmed = window.confirm(
    activate
      ? "¿Deseas activar este atleta?"
      : "¿Deseas inactivar este atleta?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/programming/athletes/${athleteId}/active`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: activate,
      }),
    });
    await loadBootstrap();
    switchView("programacion", {
      programmingPanel: "atletas",
    });
    elements.programAthleteFormFeedback.textContent = activate
      ? "Atleta activado correctamente."
      : "Atleta inactivado correctamente.";
  } catch (error) {
    elements.programAthleteFormFeedback.textContent = error.message;
  }
}

function getCurrentWeekRange() {
  const currentDate = getCurrentTimeZoneDate();
  const dayIndex = currentDate.getDay();
  const offsetToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
  const start = addDays(currentDate, offsetToMonday);
  const end = addDays(start, 6);

  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
}

function normalizeProgrammingMethods(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    sortOrder: Number(item.sortOrder || 0),
    isActive: Boolean(item.isActive),
  }));
}

function normalizeProgrammingExercises(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    isActive: Boolean(item.isActive),
  }));
}

function normalizeProgrammingAthletes(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    birthDate: normalizeDateOnly(item.birthDate),
    isActive: Boolean(item.isActive),
  }));
}

function normalizeClassPrograms(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    classDate: normalizeDateOnly(item.classDate),
    methodId: Number(item.methodId || 0),
    durationMinutes: Number(item.durationMinutes || 0),
    isActive: Boolean(item.isActive),
    items: Array.isArray(item.items)
      ? item.items.map((entry) => ({
          ...entry,
          id: Number(entry.id || 0),
          classProgramId: Number(entry.classProgramId || 0),
          sortOrder: Number(entry.sortOrder || 0),
          exerciseId: Number(entry.exerciseId || 0),
          methodId: entry.methodId ? Number(entry.methodId) : null,
        }))
      : [],
    enrollments: Array.isArray(item.enrollments)
      ? item.enrollments.map((entry) => ({
          ...entry,
          id: Number(entry.id || 0),
          classProgramId: Number(entry.classProgramId || 0),
          athleteId: Number(entry.athleteId || 0),
          athleteBirthDate: normalizeDateOnly(entry.athleteBirthDate),
          results: Array.isArray(entry.results)
            ? entry.results.map((result) => ({
                ...result,
                id: Number(result.id || 0),
                enrollmentId: Number(result.enrollmentId || 0),
                itemSortOrder: Number(result.itemSortOrder || 0),
              }))
            : [],
        }))
      : [],
  }));
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
    businessProductId: Number(item.businessProductId || 0),
    inventoryProductId: Number(item.inventoryProductId || 0),
    inventoryQuantity: Number(item.inventoryQuantity || 0),
    inventoryEffect: item.inventoryEffect || "ninguno",
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

function normalizeInventoryAssets(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    purchaseDate: normalizeDateOnly(item.purchaseDate),
    purchaseValue: Number(item.purchaseValue || 0),
    isActive: Boolean(item.isActive),
  }));
}

function normalizeInventoryProducts(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    tracksStock:
      item.tracksStock === true || item.tracksStock === false
        ? Boolean(item.tracksStock)
        : (item.itemKind || "Insumo") !== "Servicio",
    currentStock: Number(item.currentStock || 0),
    minimumStock: Number(item.minimumStock || 0),
    costPrice: Number(item.costPrice || 0),
    salePrice: Number(item.salePrice || 0),
    isActive: Boolean(item.isActive),
  }));
}

function normalizeInventoryStockMovements(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    inventoryProductId: Number(item.inventoryProductId || 0),
    movementDate: normalizeDateOnly(item.movementDate),
    quantity: Number(item.quantity || 0),
    unitCost: Number(item.unitCost || 0),
    stockBefore: Number(item.stockBefore || 0),
    stockAfter: Number(item.stockAfter || 0),
  }));
}

function normalizeBusinessProducts(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    inventoryProductId: Number(item.inventoryProductId || 0),
    defaultAmount: Number(item.defaultAmount || 0),
    directInventoryProductId: Number(item.directInventoryProductId || 0),
    directInventoryQuantity: Number(item.directInventoryQuantity || 0),
    isActive: Boolean(item.isActive),
  }));
}

function normalizeBusinessProductComponents(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    id: Number(item.id || 0),
    businessProductId: Number(item.businessProductId || 0),
    inventoryProductId: Number(item.inventoryProductId || 0),
    quantity: Number(item.quantity || 0),
    sortOrder: Number(item.sortOrder || 0),
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
    {
      const linkedClient = (state.clients || []).find(
        (client) =>
          normalizeSearchValue(client.fullName) ===
          normalizeSearchValue(item.cliente)
      );

      return normalizeSearchValue(
        [
          item.linea,
          item.fecha,
          item.cliente,
          linkedClient?.documentNumber,
          linkedClient?.phone,
          linkedClient?.email,
          item.categoria,
          item.descripcion,
          item.estadoPago,
          item.medioPago,
          item.observaciones,
          item.valorTotal,
          item.abono,
          item.saldoPendiente,
        ].join(" ")
      ).includes(query);
    }
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
      pendingPayables: 0,
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
      pendingPayables: 0,
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

  (state.boxMovements || []).forEach((movement) => {
    const boxName = String(movement.medioPago || "").trim();
    const pendingAmount = Number(movement.saldoPendiente || 0);

    if (!boxName || movement.tipo === "Ingreso" || !(pendingAmount > 0)) {
      return;
    }

    const current = summaries.get(boxName) || {
      name: boxName,
      isActive: false,
      balance: 0,
      inflows: 0,
      outflows: 0,
      pendingPayables: 0,
      entriesCount: 0,
      lastDate: "",
    };

    current.pendingPayables += pendingAmount;
    summaries.set(boxName, current);
  });

  return [...summaries.values()]
    .filter(
      (item) =>
        item.isActive ||
        item.entriesCount > 0 ||
        item.balance !== 0 ||
        item.pendingPayables > 0
    )
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

function validateMovement(payload, options = {}) {
  if (!payload.fecha) {
    return { valid: false, message: "Selecciona una fecha para el movimiento." };
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

  if (!["ninguno", "entrada", "salida"].includes(payload.inventoryEffect)) {
    return {
      valid: false,
      message: "Selecciona un impacto de inventario valido.",
    };
  }

  if (payload.inventoryProductId > 0 && payload.inventoryEffect === "ninguno") {
    return {
      valid: false,
      message:
        "Si seleccionas un producto de inventario, indica si entra o sale del stock.",
    };
  }

  if (payload.inventoryEffect !== "ninguno") {
    if (!(payload.inventoryProductId > 0)) {
      return {
        valid: false,
        message: "Selecciona el producto de inventario relacionado.",
      };
    }

    if (!(payload.inventoryQuantity > 0)) {
      return {
        valid: false,
        message:
          "La cantidad de inventario debe ser mayor que cero cuando enlazas stock.",
      };
    }
  }

  if (!derivePaymentStatus(payload.valorTotal, payload.abono)) {
    return {
      valid: false,
      message: "No se pudo calcular el estado de pago del movimiento.",
    };
  }

  if (options.isEditing && String(payload.observaciones || "").trim().length < 4) {
    return {
      valid: false,
      message:
        "Cuando editas un movimiento, escribe una observacion de al menos 4 caracteres.",
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

  if (movement.tipo !== "Ingreso") {
    return {
      valid: false,
      message: "Solo puedes registrar cobros sobre ingresos pendientes.",
    };
  }

  if (!(Number(movement.saldoPendiente || 0) > 0)) {
    return {
      valid: false,
      message: "La cuenta seleccionada ya no tiene saldo pendiente por cobrar.",
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

function handleMovementClientSearchInput() {
  syncMovementClientSelectionFromSearch();
  renderMovementClientSuggestions(elements.clienteSearch?.value || "", {
    forceOpen: true,
  });
}

function handleMovementClientSearchKeydown(event) {
  if (event.key === "Escape") {
    hideMovementClientSuggestions();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  const suggestions = getMovementClientMatches(
    elements.clienteSearch?.value || "",
    {
      selectedValue: elements.cliente?.value || "",
    }
  );

  if (!suggestions.length) {
    return;
  }

  const preferredSuggestion =
    suggestions.find((item) => !item.isEmpty) || suggestions[0];

  event.preventDefault();
  applyMovementClientSelection(preferredSuggestion);
}

function handleMovementClientSuggestionClick(event) {
  const trigger = event.target.closest("[data-client-option-key]");
  if (!trigger) {
    return;
  }

  const selectedClient = getMovementClientRecords(
    elements.cliente?.value || ""
  ).find((item) => item.lookupKey === trigger.dataset.clientOptionKey);

  if (!selectedClient) {
    return;
  }

  applyMovementClientSelection(selectedClient);
}

function renderMovementClientSuggestions(query = "", options = {}) {
  if (!elements.clienteSuggestions) {
    return;
  }

  const rawQuery = String(query || "").trim();
  const forceOpen = Boolean(options.forceOpen);
  const matches = getMovementClientMatches(rawQuery, {
    selectedValue: elements.cliente?.value || "",
  });

  if (!matches.length && !forceOpen) {
    elements.clienteSuggestions.innerHTML = "";
    elements.clienteSuggestions.classList.add("is-hidden");
    return;
  }

  if (!matches.length) {
    elements.clienteSuggestions.innerHTML = `
      <div class="search-suggestion-empty">
        No encontramos clientes con ese filtro.
      </div>
    `;
    elements.clienteSuggestions.classList.remove("is-hidden");
    return;
  }

  elements.clienteSuggestions.innerHTML = matches
    .slice(0, 10)
    .map(
      (item) => `
        <button
          class="search-suggestion-item"
          type="button"
          data-client-option-key="${escapeHtml(item.lookupKey)}"
        >
          <span class="search-suggestion-title">${escapeHtml(
            item.isEmpty ? "Sin cliente" : item.fullName || ""
          )}</span>
          <span class="search-suggestion-meta">${escapeHtml(
            buildMovementClientSearchMeta(item)
          )}</span>
        </button>
      `
    )
    .join("");
  elements.clienteSuggestions.classList.remove("is-hidden");
}

function hideMovementClientSuggestions() {
  if (!elements.clienteSuggestions) {
    return;
  }

  elements.clienteSuggestions.classList.add("is-hidden");
}

function getMovementClientMatches(query = "", options = {}) {
  const normalizedQuery = normalizeSearchValue(String(query || "").trim());
  const records = getMovementClientRecords(options.selectedValue || "");

  if (!normalizedQuery) {
    return records;
  }

  return records.filter((item) => {
    const haystack = normalizeSearchValue(
      [
        item.isEmpty ? "sin cliente movimiento sin cliente" : "",
        item.fullName,
        item.alias,
        item.documentNumber,
        item.phone,
        item.email,
        item.notes,
        item.isHistorical ? "historico" : "",
      ]
        .filter(Boolean)
        .join(" ")
    );
    return haystack.includes(normalizedQuery);
  });
}

function getMovementClientRecords(selectedValue = elements.cliente?.value || "") {
  const currentValue = String(selectedValue || "").trim();
  const activeClients = (state.clients || []).filter((item) => item.isActive);
  const records = activeClients.map((item) => ({
    lookupKey: `client:${String(item.id)}`,
    fullName: String(item.fullName || "").trim(),
    alias: String(item.alias || "").trim(),
    documentNumber: String(item.documentNumber || "").trim(),
    phone: String(item.phone || "").trim(),
    email: String(item.email || "").trim(),
    notes: String(item.notes || "").trim(),
    isEmpty: false,
    isHistorical: false,
  }));

  if (currentValue && !records.some((item) => item.fullName === currentValue)) {
    records.push({
      lookupKey: `historical:${currentValue}`,
      fullName: currentValue,
      documentNumber: "",
      phone: "",
      email: "",
      notes: "",
      isEmpty: false,
      isHistorical: true,
    });
  }

  return [
    {
      lookupKey: "empty",
      fullName: "",
      documentNumber: "",
      phone: "",
      email: "",
      notes: "",
      isEmpty: true,
      isHistorical: false,
    },
    ...records,
  ];
}

function buildMovementClientSearchMeta(client) {
  if (!client) {
    return "";
  }

  if (client.isEmpty) {
    return "Movimiento sin cliente asociado.";
  }

  return (
    [
      client.alias ? `Alias: ${client.alias}` : "",
      client.documentNumber || "Sin documento",
      client.phone,
      client.email,
      client.isHistorical ? "Historico" : "Cliente activo",
    ]
      .filter(Boolean)
      .join(" · ") || "Cliente"
  );
}

function applyMovementClientSelection(client) {
  if (!client || !elements.cliente) {
    return false;
  }

  elements.cliente.value = client.isEmpty
    ? ""
    : String(client.fullName || "").trim();

  if (elements.clienteSearch) {
    elements.clienteSearch.value = client.isEmpty
      ? ""
      : String(client.fullName || "").trim();
  }

  hideMovementClientSuggestions();
  return true;
}

function syncMovementClientSelectionFromSearch(options = {}) {
  if (!elements.clienteSearch || !elements.cliente) {
    return false;
  }

  const rawValue = elements.clienteSearch.value.trim();
  if (!rawValue) {
    elements.cliente.value = "";
    return true;
  }

  const selectedOptions = getMovementClientMatches(rawValue, {
    selectedValue: elements.cliente?.value || "",
  }).filter((item) => !item.isEmpty);
  const normalizedQuery = normalizeSearchValue(rawValue);

  let matchedClient =
    selectedOptions.find(
      (item) =>
        normalizeSearchValue(String(item.fullName || "")) === normalizedQuery
          || normalizeSearchValue(String(item.alias || "")) === normalizedQuery
    ) || null;

  if (!matchedClient && options.allowSingleMatch && selectedOptions.length === 1) {
    matchedClient = selectedOptions[0];
  }

  if (!matchedClient && options.allowClosestMatch) {
    matchedClient =
      selectedOptions.find((item) =>
        normalizeSearchValue(String(item.fullName || "")).startsWith(
          normalizedQuery
        ) ||
        normalizeSearchValue(String(item.alias || "")).startsWith(
          normalizedQuery
        )
      ) || null;
  }

  if (!matchedClient) {
    elements.cliente.value = "";
    return false;
  }

  return applyMovementClientSelection(matchedClient);
}

function syncMovementClientSearchFromSelection() {
  const currentValue = String(elements.cliente?.value || "").trim();
  const activeClients = (state.clients || []).filter((item) => item.isActive);

  if (elements.clienteSearch) {
    elements.clienteSearch.value = currentValue;
    elements.clienteSearch.placeholder = activeClients.length
      ? "Escribe para buscar un cliente"
      : "No hay clientes activos disponibles";
  }
}

function fillClientOptions(selectedValue = elements.cliente?.value || "") {
  if (!elements.cliente) {
    return;
  }

  const currentValue = String(selectedValue || "").trim();

  if (elements.cliente.tagName !== "SELECT") {
    elements.cliente.value = currentValue;
    syncMovementClientSearchFromSelection();
    return;
  }

  const activeClients = (state.clients || []).filter((item) => item.isActive);
  const activeNames = [
    ...new Set(
      activeClients
        .map((item) => String(item.fullName || "").trim())
        .filter(Boolean)
    ),
  ];
  const emptyLabel = activeClients.length
    ? "Sin cliente"
    : "Sin cliente · crea clientes en Cartera";
  const options = [`<option value="">${escapeHtml(emptyLabel)}</option>`];

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
  syncMovementClientSearchFromSelection();
}

function setClientSelection(value) {
  const cleanValue = String(value || "").trim();
  fillClientOptions(cleanValue);
}

function getAvailableMovementBusinessProducts() {
  const activeLine = elements.linea?.value || "Gimnasio";
  return (state.businessProducts || []).filter(
    (item) => item.isActive && item.businessLine === activeLine
  );
}

function fillMovementBusinessProductOptions(selectedValue = "") {
  if (!elements.movementBusinessProductId) {
    return;
  }

  const selectedRecord = getBusinessProductById(selectedValue);
  fillSelectFromRecords(
    elements.movementBusinessProductId,
    getAvailableMovementBusinessProducts(),
    {
      selectedValue: String(
        selectedValue || elements.movementBusinessProductId.value || ""
      ),
      includeRecord:
        selectedRecord &&
        selectedRecord.businessLine === (elements.linea?.value || "Gimnasio")
          ? selectedRecord
          : null,
      placeholder: "Sin producto o servicio",
      labelBuilder: (item) =>
        `${item.name} · ${item.itemType} · ${formatCurrency(item.defaultAmount)}`,
    }
  );
}

function syncMovementBusinessProductSelection(options = {}) {
  if (!elements.movementBusinessProductId) {
    return null;
  }

  fillMovementBusinessProductOptions(
    String(
      options.selectedValue ??
        elements.movementBusinessProductId.value ??
        ""
    )
  );

  const selectedProduct = getBusinessProductById(
    elements.movementBusinessProductId.value
  );

  if (
    !selectedProduct ||
    selectedProduct.businessLine !== (elements.linea?.value || "Gimnasio")
  ) {
    if (!options.preserveValue) {
      elements.movementBusinessProductId.value = "";
    }
    elements.movementInventoryProductId.disabled = false;
    elements.movementInventoryEffect.disabled = false;
    syncMovementInventoryFields();
    if (elements.movementBusinessProductFeedback) {
      elements.movementBusinessProductFeedback.textContent =
        "Si seleccionas un producto o servicio, el sistema puede sugerir valor y descontar inventario segun su configuracion.";
    }
    return null;
  }

  syncCategoryOptions({
    includeValue: selectedProduct.category || elements.categoria?.value || "",
  });
  if (selectedProduct.category) {
    elements.categoria.value = selectedProduct.category;
  }

  if (selectedProduct.defaultAmount > 0 && !options.preserveValue) {
    elements.valorTotal.value = String(selectedProduct.defaultAmount);
    syncComputedPaymentStatus();
  }

  if (!elements.descripcion.value.trim()) {
    elements.descripcion.value = selectedProduct.name;
  }

  if (elements.movementBusinessProductFeedback) {
    const recipeItems = getBusinessProductComponents(selectedProduct.id).length;
    if (selectedProduct.directInventoryProductId > 0 || recipeItems > 0) {
      fillMovementInventoryProductOptions({
        selectedValue: "",
      });
      elements.movementInventoryProductId.value = "";
      elements.movementInventoryEffect.value = "ninguno";
      elements.movementInventoryQuantity.value = "";
      elements.movementInventoryProductId.disabled = true;
      elements.movementInventoryEffect.disabled = true;
      elements.movementInventoryQuantity.disabled = true;
      syncMovementInventoryFields();
    } else {
      elements.movementInventoryProductId.disabled = false;
      elements.movementInventoryEffect.disabled = false;
      syncMovementInventoryFields();
    }
    const stockMessage =
      selectedProduct.directInventoryProductId > 0
        ? `descontará ${formatInventoryQuantity(
            selectedProduct.directInventoryQuantity || 1,
            selectedProduct.directInventoryProductUnitName
          )} de ${selectedProduct.directInventoryProductName || "inventario"}`
        : recipeItems
          ? `descontará ${recipeItems} insumo(s) configurados en su receta`
          : "no mueve inventario automáticamente";
    elements.movementBusinessProductFeedback.textContent =
      `${selectedProduct.name} · ${selectedProduct.itemType} · ${formatCurrency(
        selectedProduct.defaultAmount
      )}. Al registrar la venta, ${stockMessage}.`;
  }

  return selectedProduct;
}

function getInventoryProductById(productId) {
  return (state.inventoryProducts || []).find(
    (item) => String(item.id) === String(productId)
  );
}

function fillMovementInventoryProductOptions(options = {}) {
  if (!elements.movementInventoryProductId) {
    return;
  }

  const selectedValue = String(
    options.selectedValue ?? elements.movementInventoryProductId.value ?? ""
  );
  const selectedProduct = getInventoryProductById(selectedValue);
  const products = (state.inventoryProducts || []).filter((item) => item.isActive);

  fillSelectFromRecords(elements.movementInventoryProductId, products, {
    selectedValue,
    includeRecord: selectedProduct,
    placeholder: "Sin producto enlazado",
    labelBuilder: (item) =>
      `${item.name} · ${item.area} · Stock ${formatInventoryQuantity(
        item.currentStock,
        item.unitName
      )}`,
  });
}

function getSuggestedMovementInventoryEffect() {
  if (elements.tipo.value === "Costo") {
    return "entrada";
  }

  if (["Ingreso", "Gasto"].includes(elements.tipo.value)) {
    return "salida";
  }

  return "ninguno";
}

function syncMovementInventoryFields(options = {}) {
  if (
    !elements.movementInventoryProductId ||
    !elements.movementInventoryEffect ||
    !elements.movementInventoryQuantity
  ) {
    return;
  }

  fillMovementInventoryProductOptions({
    selectedValue: elements.movementInventoryProductId.value,
  });

  const selectedProduct = getInventoryProductById(
    elements.movementInventoryProductId.value
  );
  const hasProduct = Boolean(selectedProduct);

  if (
    hasProduct &&
    !options.preserveEffect &&
    elements.movementInventoryEffect.value === "ninguno"
  ) {
    elements.movementInventoryEffect.value = getSuggestedMovementInventoryEffect();
  }

  if (!hasProduct) {
    elements.movementInventoryEffect.value = "ninguno";
    if (!options.preserveQuantity) {
      elements.movementInventoryQuantity.value = "";
    }
  }

  const shouldTrackStock =
    hasProduct && elements.movementInventoryEffect.value !== "ninguno";

  elements.movementInventoryQuantity.disabled = !shouldTrackStock;

  if (!shouldTrackStock && !options.preserveQuantity) {
    elements.movementInventoryQuantity.value = "";
  }

  if (elements.movementInventoryFeedback) {
    if (!hasProduct) {
      elements.movementInventoryFeedback.textContent =
        "Si este movimiento compra, consume o vende un producto, enlazalo aqui para que el stock tambien se ajuste.";
    } else {
      const effectLabel =
        elements.movementInventoryEffect.value === "entrada"
          ? "sumará"
          : elements.movementInventoryEffect.value === "salida"
            ? "restará"
            : "no moverá";
      elements.movementInventoryFeedback.textContent =
        `${selectedProduct.name} ${effectLabel} stock en inventario. Usa esta opcion cuando el movimiento financiero tambien afecte cantidades fisicas.`;
    }
  }
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

function handleBoxSummaryClick(event) {
  const trigger = event.target.closest("[data-box-summary-name]");
  if (!trigger || !elements.boxFilter) {
    return;
  }

  const boxName = String(trigger.dataset.boxSummaryName || "").trim();
  if (!boxName) {
    return;
  }

  fillBoxFilterOptions(boxName);
  elements.boxFilter.value = boxName;
  switchView("cajas", {
    boxPanel: "movimientos",
  });
  renderBoxesView();
}

function renderBoxesView() {
  renderBoxPanels();

  const pendingGroups = getPendingPayablesByBox();
  const pendingByBox = new Map(
    pendingGroups.map((group) => [group.boxName, Number(group.totalPending || 0)])
  );
  const summaries = getPaymentBoxSummaries().map((box) => ({
    ...box,
    pendingPayables: Number(pendingByBox.get(box.name) || 0),
  }));
  const ledgerEntries = getFilteredBoxLedgerEntries();
  const totalBalance = sum(summaries, "balance");
  const totalInflows = sum(summaries, "inflows");
  const totalOutflows = sum(summaries, "outflows");
  const totalPendingPayables = sum(summaries, "pendingPayables");
  const activeBoxes = summaries.filter((item) => item.isActive);

  elements.boxesSummary.innerHTML = summaries.length
    ? summaries
        .map(
          (box) => `
            <button
              class="stat-card stat-card-button"
              type="button"
              data-box-summary-name="${escapeHtml(box.name)}"
              title="Ver movimientos de ${escapeHtml(box.name)}"
              aria-label="Ver movimientos de ${escapeHtml(box.name)}"
            >
              <span class="label">${escapeHtml(box.name)}</span>
              <strong class="value">${formatCurrency(box.balance)}</strong>
              <div class="meta">
                ${box.entriesCount} movimientos · Entradas ${formatCurrency(
                  box.inflows
                )} · Salidas ${formatCurrency(
                  box.outflows
                )} · Pendiente por pagar ${formatCurrency(box.pendingPayables)}${
                  box.isActive ? "" : " · Inactiva"
                }
              </div>
            </button>
          `
        )
        .join("")
    : '<div class="empty-state">Aun no hay cajas disponibles para consultar.</div>';

  elements.boxInsights.innerHTML = `
    <div class="mini-stat"><span>Cajas activas</span><strong>${activeBoxes.length}</strong></div>
    <div class="mini-stat"><span>Saldo disponible</span><strong>${formatCurrency(totalBalance)}</strong></div>
    <div class="mini-stat"><span>Entradas acumuladas</span><strong>${formatCurrency(totalInflows)}</strong></div>
    <div class="mini-stat"><span>Salidas acumuladas</span><strong>${formatCurrency(totalOutflows)}</strong></div>
    <div class="mini-stat"><span>Pendiente por pagar</span><strong>${formatCurrency(totalPendingPayables)}</strong></div>
    <div class="mini-stat"><span>Traslados registrados</span><strong>${state.boxTransfers.length}</strong></div>
  `;

  if (elements.boxPendingBreakdown) {
    elements.boxPendingBreakdown.innerHTML = pendingGroups.length
      ? pendingGroups
          .map(
            (group) => `
              <article class="pending-box-card">
                <div class="pending-box-head">
                  <div>
                    <strong>${escapeHtml(group.boxName)}</strong>
                    <small>${group.items.length} movimiento(s) pendiente(s)</small>
                  </div>
                  <strong>${formatCurrency(group.totalPending)}</strong>
                </div>
                <div class="pending-box-items">
                  ${group.items
                    .map(
                      (item) => `
                        <div class="pending-box-item">
                          <div class="pending-box-item-copy">
                            <strong>${escapeHtml(item.categoria || "Sin categoría")}</strong>
                            <small>
                              ${escapeHtml(
                                [
                                  `#${item.id}`,
                                  formatDate(item.fecha),
                                  item.descripcion || "",
                                  item.cliente || "",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              )}
                            </small>
                          </div>
                          <div class="pending-box-item-metrics">
                            <span>Total ${formatCurrency(item.valorTotal)}</span>
                            <span>Pagado ${formatCurrency(item.abono)}</span>
                            <strong>Saldo ${formatCurrency(item.saldoPendiente)}</strong>
                          </div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty-state">No hay costos ni gastos pendientes por pagar en las cajas actuales.</div>';
  }

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
  const visibleBoxes = [...new Set(ledgerEntries.map((entry) => entry.boxName))];
  const filteredPendingPayables = summaries
    .filter((item) => visibleBoxes.includes(item.name))
    .reduce((acc, item) => acc + Number(item.pendingPayables || 0), 0);

  elements.boxFilterSummary.innerHTML = `
    <div class="mini-stat"><span>Movimientos visibles</span><strong>${ledgerEntries.length}</strong></div>
    <div class="mini-stat"><span>Entradas</span><strong>${formatCurrency(filteredInflows)}</strong></div>
    <div class="mini-stat"><span>Salidas</span><strong>${formatCurrency(filteredOutflows)}</strong></div>
    <div class="mini-stat"><span>Saldo visible</span><strong>${formatCurrency(filteredBalance)}</strong></div>
    <div class="mini-stat"><span>Pendiente por pagar</span><strong>${formatCurrency(filteredPendingPayables)}</strong></div>
  `;

  elements.boxLedgerTable.innerHTML = ledgerEntries.length
    ? ledgerEntries
        .map(
          (entry) => `
            <tr>
              ${tableCell("Fecha", escapeHtml(formatDate(entry.date)))}
              ${tableCell("Caja", escapeHtml(entry.boxName))}
              ${tableCell("Tipo", escapeHtml(entry.entryType))}
              ${tableCell("Referencia", escapeHtml(entry.reference || "Sin referencia"))}
              ${tableCell("Detalle", escapeHtml(entry.detail || "Sin detalle"))}
              ${tableCell("Registrado por", escapeHtml(entry.registeredBy || "Sistema"))}
              ${tableCell("Entrada", formatCurrency(entry.inflow || 0))}
              ${tableCell("Salida", formatCurrency(entry.outflow || 0))}
              ${tableCell("Saldo neto", formatCurrency(entry.amount || 0))}
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="9" class="empty-state">
          No hay movimientos de caja para los filtros actuales.
        </td>
      </tr>
    `;
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
  fillMovementBusinessProductOptions("");
  elements.movementBusinessProductId.value = "";
  fillMovementInventoryProductOptions({
    selectedValue: "",
  });
  elements.movementInventoryEffect.value = "ninguno";
  elements.movementInventoryQuantity.value = "";
  if ((state.lists.tipos || []).length) {
    elements.tipo.value = state.lists.tipos[0];
  }
  if ((state.lists.mediosPago || []).length) {
    elements.medioPago.value = state.lists.mediosPago[0];
  }
  syncComputedPaymentStatus();
  syncMovementBusinessProductSelection();
  syncMovementInventoryFields();
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
  if (elements.collectionAmount) {
    elements.collectionAmount.disabled = false;
    elements.collectionAmount.dataset.selectionMode = "single";
  }
  if ((state.lists.mediosPago || []).length) {
    elements.collectionMethod.value = state.lists.mediosPago[0];
  }
  const submitButton = elements.collectionForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Registrar cobro";
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

function handlePortfolioTableClick(event) {
  const detailTrigger = event.target.closest("[data-portfolio-detail-id]");
  const detailId = detailTrigger?.dataset.portfolioDetailId;
  if (detailId) {
    if (expandedPortfolioDetailIds.has(String(detailId))) {
      expandedPortfolioDetailIds.delete(String(detailId));
    } else {
      expandedPortfolioDetailIds.add(String(detailId));
    }
    renderPortfolioView();
    return;
  }

  const collectTrigger = event.target.closest("[data-collect-id]");
  const movementId = collectTrigger?.dataset.collectId;

  if (!movementId) {
    return;
  }

  const movement = getPortfolioMovements().find(
    (item) => String(item.id) === String(movementId)
  );
  if (!movement) {
    return;
  }

  selectCollectionClient(movement.cliente, {
    movementId,
  });
  renderPortfolioView();
  switchView("cartera", {
    clientPanel: "cobros",
  });
  elements.collectionAmount.focus();
}

function handleCollectionMovementListClick(event) {
  const actionTrigger = event.target.closest("[data-collection-selection-action]");
  const checkboxTrigger = event.target.closest("[data-collection-select-id]");
  const detailTrigger = event.target.closest("[data-collection-detail-id]");
  const focusTrigger = event.target.closest("[data-collection-movement-id]");

  if (actionTrigger) {
    const clientMovements = getSelectedCollectionClientMovements();
    if (!clientMovements.length) {
      return;
    }

    const activeId =
      String(selectedCollectionMovementId || clientMovements[0]?.id || "");

    if (actionTrigger.dataset.collectionSelectionAction === "all") {
      setSelectedCollectionMovementIds(clientMovements.map((item) => item.id));
    } else {
      setSelectedCollectionMovementIds(activeId ? [activeId] : []);
    }

    renderCollectionManager();
    return;
  }

  if (checkboxTrigger) {
    const movementId = String(checkboxTrigger.dataset.collectionSelectId || "");
    if (!movementId) {
      return;
    }

    const currentIds = new Set(
      getSelectedCollectionMovementIdsForClient(getSelectedCollectionClientMovements())
    );
    if (checkboxTrigger.checked) {
      currentIds.add(movementId);
      selectedCollectionMovementId = movementId;
    } else {
      currentIds.delete(movementId);
      if (!currentIds.size) {
        currentIds.add(movementId);
      }
      if (!currentIds.has(String(selectedCollectionMovementId || ""))) {
        selectedCollectionMovementId = [...currentIds][0] || movementId;
      }
    }

    setSelectedCollectionMovementIds([...currentIds]);
    renderCollectionManager();
    return;
  }

  const detailId = detailTrigger?.dataset.collectionDetailId;
  if (detailId) {
    if (expandedCollectionAccountIds.has(String(detailId))) {
      expandedCollectionAccountIds.delete(String(detailId));
    } else {
      expandedCollectionAccountIds.add(String(detailId));
    }
    renderCollectionManager();
    return;
  }

  const movementId = focusTrigger?.dataset.collectionMovementId;
  if (!movementId) {
    return;
  }

  const selectedMovement = getSelectedCollectionClientMovements().find(
    (item) => String(item.id) === String(movementId)
  );

  if (!selectedMovement) {
    return;
  }

  selectedCollectionMovementId = String(selectedMovement.id);
  const currentIds = new Set(
    getSelectedCollectionMovementIdsForClient(getSelectedCollectionClientMovements())
  );
  currentIds.add(String(selectedMovement.id));
  setSelectedCollectionMovementIds([...currentIds]);
  renderCollectionManager();
  elements.collectionAmount.focus();
}

function getSelectedCollectionMovement() {
  if (!selectedCollectionMovementId) {
    return null;
  }

  return (
    getSelectedCollectionClientMovements().find(
      (item) => String(item.id) === String(selectedCollectionMovementId)
    ) ||
    getPortfolioMovements().find(
      (item) => String(item.id) === String(selectedCollectionMovementId)
    ) ||
    null
  );
}

function syncCollectionSelectionState() {
  const clientMovements = getSelectedCollectionClientMovements();

  if (!clientMovements.length) {
    selectedCollectionMovementId = null;
    selectedCollectionClientKey = null;
    setSelectedCollectionMovementIds([]);
    resetCollectionForm(false);
    setCollectionFormEnabled(false);
    return;
  }

  const selectedMovement =
    clientMovements.find(
      (item) => String(item.id) === String(selectedCollectionMovementId)
    ) || clientMovements[0];

  selectedCollectionClientKey = getCollectionClientKey(selectedMovement.cliente);
  selectedCollectionMovementId = String(selectedMovement.id);
  const validSelectedIds = getSelectedCollectionMovementIdsForClient(clientMovements);
  setSelectedCollectionMovementIds(
    validSelectedIds.length ? validSelectedIds : [String(selectedMovement.id)]
  );
  elements.collectionMovementId.value = String(selectedMovement.id);
  elements.collectionDate.value = getCurrentIsoDate();
  elements.collectionAmount.value = "";
  elements.collectionNotes.value = "";
  if ((state.lists.mediosPago || []).length) {
    elements.collectionMethod.value = state.lists.mediosPago[0];
  }
  setCollectionFormEnabled(true);
}

function renderCollectionManager() {
  if (!elements.collectionForm) {
    return;
  }

  const clientMovements = getSelectedCollectionClientMovements();
  const selectedMovement = getSelectedCollectionMovement();
  const selectedPaymentMovements = getSelectedCollectionMovementsForPayment();
  const collectionHistory = selectedMovement
    ? getCollectionHistory(selectedMovement.id)
    : [];

  if (!clientMovements.length || !selectedMovement) {
    elements.collectionMovementId.value = "";
    elements.collectionContext.innerHTML = `
      <strong>Sin selección activa</strong>
      <small>Elige un cliente desde la cartera para ver todas sus cuentas pendientes y registrar el cobro.</small>
    `;
    elements.collectionBalance.innerHTML = `
      <div class="empty-state collection-empty">
        Aquí verás el saldo pendiente total del cliente, sus cuentas abiertas y la cuenta que selecciones para cobrar.
      </div>
    `;
    if (elements.collectionMovementList) {
      elements.collectionMovementList.innerHTML = `
        <div class="empty-state collection-empty">
          Aquí aparecerán todas las transacciones pendientes del cliente seleccionado.
        </div>
      `;
    }
    elements.collectionHistory.innerHTML = `
      <div class="empty-state">
        Aquí aparecerán los cobros de la cuenta que selecciones.
      </div>
    `;
    elements.collectionFeedback.textContent =
      "El cobro actualiza el saldo pendiente y guarda el historial del pago.";
    setCollectionFormEnabled(false);
    return;
  }

  const clientDisplayName = getSelectedCollectionClientDisplayName();
  const totalPending = sum(clientMovements, "saldoPendiente");
  const totalInvoiced = sum(clientMovements, "valorTotal");
  const totalCollected = sum(clientMovements, "abono");
  const selectedPendingTotal = sum(selectedPaymentMovements, "saldoPendiente");
  const isBatchSelection = selectedPaymentMovements.length > 1;

  elements.collectionMovementId.value = String(selectedMovement.id);
  elements.collectionContext.innerHTML = `
    <strong>${escapeHtml(clientDisplayName)}</strong>
    <small>${clientMovements.length} cuentas pendientes · ${selectedPaymentMovements.length} seleccionadas · cartera abierta ${formatCurrency(
      totalPending
    )}</small>
  `;
  elements.collectionBalance.innerHTML = `
    <div class="mini-stats compact-mini-stats">
      <div class="mini-stat"><span>Total facturado</span><strong>${formatCurrency(
        totalInvoiced
      )}</strong></div>
      <div class="mini-stat"><span>Cobrado acumulado</span><strong>${formatCurrency(
        totalCollected
      )}</strong></div>
      <div class="mini-stat"><span>Saldo pendiente</span><strong>${formatCurrency(
        totalPending
      )}</strong></div>
      <div class="mini-stat"><span>Seleccionado para cobrar</span><strong>${formatCurrency(
        selectedPendingTotal
      )}</strong></div>
      <div class="mini-stat"><span>Estado actual</span><strong>${escapeHtml(
        selectedMovement.estadoPago
      )}</strong></div>
    </div>
  `;
  if (elements.collectionMovementList) {
    const selectedIdSet = new Set(
      selectedPaymentMovements.map((item) => String(item.id))
    );
    elements.collectionMovementList.innerHTML = `
      <div class="collection-selection-tools">
        <button
          class="ghost-button"
          type="button"
          data-collection-selection-action="all"
        >
          Seleccionar todas
        </button>
        <button
          class="ghost-button"
          type="button"
          data-collection-selection-action="active"
        >
          Dejar solo la activa
        </button>
        <span>${selectedPaymentMovements.length} cuenta(s) marcadas</span>
      </div>
      ${clientMovements
        .map(
          (item) => {
            const isActive = String(item.id) === String(selectedMovement.id);
            const isChecked = selectedIdSet.has(String(item.id));
            const isExpanded = expandedCollectionAccountIds.has(String(item.id));
            return `
            <article
              class="collection-account-item ${
                isActive ? "active" : ""
              }"
            >
              <div class="collection-account-summary">
                <label class="collection-account-check" title="Incluir en este cobro">
                  <input
                    type="checkbox"
                    data-collection-select-id="${item.id}"
                    ${isChecked ? "checked" : ""}
                  />
                </label>
                <button
                  class="collection-account-focus"
                  type="button"
                  data-collection-movement-id="${item.id}"
                >
                  <strong>${escapeHtml(
                    item.descripcion || item.categoria || "Cuenta pendiente"
                  )}</strong>
                  <span>${formatDate(item.fecha)} · ${escapeHtml(
                    item.categoria
                  )} · ${escapeHtml(item.linea)} · ${escapeHtml(
                    item.medioPago
                  )}</span>
                </button>
                <span class="status-pill ${statusClass(item.estadoPago)} collection-account-status">${escapeHtml(
                  item.estadoPago
                )}</span>
                <strong class="collection-account-amount">${formatCurrency(
                  item.saldoPendiente
                )}</strong>
                ${createDetailToggleButton(
                  "data-collection-detail-id",
                  item.id,
                  isExpanded,
                  isExpanded ? "Ocultar detalle de la cuenta" : "Ver detalle de la cuenta"
                )}
              </div>
              <div class="collection-account-detail ${isExpanded ? "is-open" : ""}">
                ${renderCollectionAccountDetail(item)}
              </div>
            </article>
          `;
          }
        )
        .join("")}
    `;
  }
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
        Esta cuenta todavía no tiene cobros registrados.
      </div>
    `;
  if (elements.collectionAmount) {
    if (isBatchSelection) {
      elements.collectionAmount.value = String(
        Number(selectedPendingTotal || 0).toFixed(2)
      );
      elements.collectionAmount.disabled = true;
      elements.collectionAmount.dataset.selectionMode = "batch";
    } else {
      if (elements.collectionAmount.dataset.selectionMode === "batch") {
        elements.collectionAmount.value = "";
      }
      elements.collectionAmount.disabled = false;
      elements.collectionAmount.dataset.selectionMode = "single";
    }
  }
  const submitButton = elements.collectionForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = isBatchSelection
      ? `Registrar cobro de ${selectedPaymentMovements.length} cuentas`
      : "Registrar cobro";
  }
  elements.collectionFeedback.textContent = isBatchSelection
    ? `Se registrará el pago completo de ${selectedPaymentMovements.length} cuentas por ${formatCurrency(
        selectedPendingTotal
      )} para ${clientDisplayName}.`
    : `Registrarás un cobro sobre un saldo pendiente de ${formatCurrency(
        selectedMovement.saldoPendiente
      )} para ${clientDisplayName}.`;
  setCollectionFormEnabled(true);
  if (isBatchSelection && elements.collectionAmount) {
    elements.collectionAmount.disabled = true;
  }
}

function resetCollectionSelection() {
  selectedCollectionMovementId = null;
  selectedCollectionClientKey = null;
  setSelectedCollectionMovementIds([]);
  resetCollectionForm(true);
  renderPortfolioView();
}

async function handleCollectionSubmit(event) {
  event.preventDefault();

  const selectedMovements = getSelectedCollectionMovementsForPayment();
  const selectedMovement = getSelectedCollectionMovement();
  const isBatchSelection = selectedMovements.length > 1;
  const clientName = String(selectedMovement?.cliente || "");
  const clientDisplayName = getSelectedCollectionClientDisplayName();

  if (!selectedMovements.length || !selectedMovement) {
    elements.collectionFeedback.textContent =
      "Selecciona al menos una cuenta pendiente del cliente antes de registrar el cobro.";
    return;
  }

  if (isBatchSelection) {
    const basePayload = {
      collectionDate: elements.collectionDate.value,
      paymentMethod: elements.collectionMethod.value,
      notes: elements.collectionNotes.value.trim(),
    };

    if (!basePayload.collectionDate) {
      elements.collectionFeedback.textContent =
        "Selecciona la fecha del cobro para registrar el pago masivo.";
      return;
    }

    if (!basePayload.paymentMethod) {
      elements.collectionFeedback.textContent =
        "Selecciona la caja o medio de pago que recibió el cobro.";
      return;
    }

    let processed = 0;

    try {
      for (const movement of selectedMovements) {
        const payload = {
          ...basePayload,
          amount: Number(movement.saldoPendiente || 0),
        };
        const validation = validateCollection(payload, movement);
        if (!validation.valid) {
          throw new Error(validation.message);
        }

        await apiRequest(`/api/movements/${movement.id}/collections`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        processed += 1;
      }

      await loadBootstrap();
      selectCollectionClient(clientName);
      switchView("cartera", {
        clientPanel: "cobros",
      });
      elements.collectionFeedback.textContent = `Se registró el cobro completo de ${processed} cuenta(s) para ${clientDisplayName}.`;
    } catch (error) {
      await loadBootstrap();
      selectCollectionClient(clientName);
      switchView("cartera", {
        clientPanel: "cobros",
      });
      elements.collectionFeedback.textContent = processed
        ? `Se registraron ${processed} cobro(s) antes de encontrar un problema: ${error.message}`
        : error.message;
    }
    return;
  }

  const payload = {
    collectionDate: elements.collectionDate.value,
    amount: Number(elements.collectionAmount.value || 0),
    paymentMethod: elements.collectionMethod.value,
    notes: elements.collectionNotes.value.trim(),
  };

  const movementId = Number(elements.collectionMovementId.value || 0);

  if (!movementId) {
    elements.collectionFeedback.textContent =
      "Selecciona primero una cuenta pendiente para registrar el cobro.";
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

    await loadBootstrap();
    selectCollectionClient(clientName, {
      movementId,
    });
    switchView("cartera", {
      clientPanel: "cobros",
    });
    elements.collectionFeedback.textContent = `Cobro registrado correctamente para ${clientDisplayName}.`;
  } catch (error) {
    elements.collectionFeedback.textContent = error.message;
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

function getClientsSearchQuery() {
  return normalizeSearchValue(elements.clientsQuery?.value || "");
}

function getFilteredClientsAdminList() {
  const clients = Array.isArray(state.clients) ? state.clients : [];
  const query = getClientsSearchQuery();

  if (!query) {
    return clients;
  }

  return clients.filter((client) =>
    normalizeSearchValue(
      [
        client.fullName,
        client.alias,
        client.documentNumber,
        client.phone,
        client.email,
        client.notes,
        client.isActive ? "activo" : "inactivo",
      ]
        .filter(Boolean)
        .join(" ")
    ).includes(query)
  );
}

function getPortfolioSearchQuery() {
  return normalizeSearchValue(elements.portfolioQuery?.value || "");
}

function getLinkedClientRecord(clientName = "") {
  const normalizedClientName = normalizeSearchValue(clientName);
  if (!normalizedClientName) {
    return null;
  }

  return (
    (state.clients || []).find(
      (client) =>
        normalizeSearchValue(client.fullName) === normalizedClientName
    ) ||
    (state.clients || []).find(
      (client) => normalizeSearchValue(client.alias) === normalizedClientName
    ) ||
    null
  );
}

function getClientPrimaryName(clientName = "") {
  const linkedClient = getLinkedClientRecord(clientName);
  return (
    String(linkedClient?.fullName || clientName || "").trim() ||
    "Cliente sin nombre"
  );
}

function getClientAliasMeta(clientName = "") {
  const linkedClient = getLinkedClientRecord(clientName);
  const alias = String(linkedClient?.alias || "").trim();
  const primaryName = getClientPrimaryName(clientName);

  if (!alias || normalizeSearchValue(alias) === normalizeSearchValue(primaryName)) {
    return "";
  }

  return `Alias: ${alias}`;
}

function formatClientDisplayName(clientName = "") {
  const primaryName = getClientPrimaryName(clientName);
  const aliasMeta = getClientAliasMeta(clientName);

  if (!aliasMeta) {
    return primaryName;
  }

  return `${primaryName} (${aliasMeta.replace(/^Alias:\s*/, "")})`;
}

function isCategoryPricingGroup(group) {
  return ["gimnasioCategorias", "restauranteCategorias"].includes(
    String(group || "")
  );
}

function getCategoryCatalogKey(selectedLine = elements.linea?.value || "") {
  return selectedLine === "Gimnasio"
    ? "gimnasioCategorias"
    : "restauranteCategorias";
}

function getCategoryCatalogItem(lineOrGroup, categoryValue) {
  const group = CATALOG_KEYS.includes(String(lineOrGroup || ""))
    ? String(lineOrGroup || "")
    : getCategoryCatalogKey(lineOrGroup);
  const normalizedCategory = normalizeSearchValue(categoryValue);

  if (!normalizedCategory) {
    return null;
  }

  return (state.catalogItems[group] || []).find(
    (item) => normalizeSearchValue(item.value) === normalizedCategory
  ) || null;
}

function syncCategorySuggestedAmount(options = {}) {
  const categoryValue =
    options.categoryValue ?? elements.categoria?.value ?? "";
  const categoryItem = getCategoryCatalogItem(
    options.group || elements.linea?.value || "",
    categoryValue
  );

  if (!categoryItem || !(Number(categoryItem.defaultAmount || 0) > 0)) {
    return;
  }

  if (!elements.valorTotal) {
    return;
  }

  elements.valorTotal.value = String(Number(categoryItem.defaultAmount));
  syncComputedPaymentStatus();
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

    if (!container) {
      return;
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
        const pricingMeta =
          item.defaultAmount > 0
            ? ` · Valor sugerido ${formatCurrency(item.defaultAmount)}`
            : "";

        return `
          <article class="catalog-item ${item.isActive ? "" : "catalog-item-inactive"}">
            <div class="catalog-item-copy">
              <strong>${escapeHtml(item.value)}</strong>
              <small>${escapeHtml(
                `${statusLabel}${isProtectedGroup ? " · Fijo del sistema" : ""}${pricingMeta}`
              )}</small>
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
                      data-catalog-default-amount="${item.defaultAmount}"
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

async function handleListSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const key = form.dataset.listForm;
  const editId = Number(form.elements.editId?.value || 0);
  const value = form.elements.value.value.trim();
  const defaultAmount = Math.max(
    Number(form.elements.defaultAmount?.value || 0),
    0
  );

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
    await apiRequest(
      editId > 0
        ? `/api/catalogs/${key}/items/${editId}`
        : `/api/catalogs/${key}/items`,
      {
        method: editId > 0 ? "PATCH" : "POST",
        body: JSON.stringify({ value, defaultAmount }),
      }
    );
    resetListForm(form);
    await loadBootstrap();
    setStatus(
      editId > 0
        ? "Item de lista actualizado correctamente."
        : "Item de lista guardado correctamente."
    );
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
    const catalogItem = (state.catalogItems[key] || []).find(
      (item) => String(item.id) === String(itemId)
    );
    const currentValue =
      String(catalogItem?.value || "") ||
      decodeURIComponent(editButton.dataset.catalogValue || "");
    const currentDefaultAmount = Number(
      catalogItem?.defaultAmount ?? editButton.dataset.catalogDefaultAmount ?? 0
    );

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

    let nextDefaultAmount = currentDefaultAmount;
    if (isCategoryPricingGroup(key)) {
      const amountPrompt = window.prompt(
        `Escribe el valor sugerido para "${cleanValue}". Usa 0 si no aplica.`,
        currentDefaultAmount > 0 ? String(currentDefaultAmount) : "0"
      );

      if (amountPrompt === null) {
        return;
      }

      nextDefaultAmount = Math.max(Number(amountPrompt || 0), 0);
      if (!Number.isFinite(nextDefaultAmount)) {
        setStatus("El valor sugerido debe ser numérico.");
        return;
      }
    }

    if (
      cleanValue === currentValue &&
      Number(nextDefaultAmount) === Number(currentDefaultAmount)
    ) {
      return;
    }

    try {
      await apiRequest(`/api/catalogs/${key}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          value: cleanValue,
          defaultAmount: nextDefaultAmount,
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

function syncCategoryOptions(options = {}) {
  const key = getCategoryCatalogKey(options.line || elements.linea?.value || "");
  const previous = options.includeValue ?? elements.categoria.value;
  const activeItems = (state.catalogItems[key] || [])
    .filter((item) => item.isActive)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  fillSelect(
    elements.categoria,
    activeItems.map((item) => item.value),
    {
      includeValue: previous,
    }
  );

  if (getAvailableSelectValues(elements.categoria).includes(previous)) {
    elements.categoria.value = previous;
  }

  if (options.applySuggestedAmount) {
    syncCategorySuggestedAmount({
      group: key,
      categoryValue: elements.categoria.value,
    });
  }
}

function renderPortfolioSummary(item, isExpanded) {
  const clientName = getClientPrimaryName(item.cliente);
  const clientAliasMeta = getClientAliasMeta(item.cliente);
  const summaryText = item.descripcion || item.categoria || "Cuenta pendiente";
  const summaryMeta = [
    clientAliasMeta,
    summaryText,
    formatDate(item.fecha),
    item.linea,
    item.categoria,
  ]
    .filter(Boolean)
    .map((value) => escapeHtml(String(value)))
    .join(" · ");

  return `
    <div class="compact-summary">
      <div class="compact-summary-head">
        <div class="compact-summary-copy">
          ${
            item.cliente
              ? `<button
                  class="table-link-button compact-client-button"
                  type="button"
                  data-collect-client="${escapeHtml(item.cliente)}"
                  data-collect-id="${item.id}"
                >${escapeHtml(clientName)}</button>`
              : "<strong>Sin cliente</strong>"
          }
        </div>
        ${createDetailToggleButton(
          "data-portfolio-detail-id",
          item.id,
          isExpanded,
          isExpanded ? "Ocultar detalle de la cuenta" : "Ver detalle de la cuenta"
        )}
      </div>
      <small class="compact-summary-meta">${summaryMeta}</small>
    </div>
  `;
}

function getSelectedCollectionClientDisplayName() {
  const movements = getSelectedCollectionClientMovements();
  return formatClientDisplayName(movements[0]?.cliente);
}

function getFilteredPortfolioMovements() {
  const query = getPortfolioSearchQuery();
  const portfolio = getPortfolioMovements();

  if (!query) {
    return portfolio;
  }

  return portfolio.filter((item) => {
    const linkedClient = getLinkedClientRecord(item.cliente);

    return normalizeSearchValue(
      [
        item.linea,
        item.fecha,
        item.cliente,
        linkedClient?.alias,
        linkedClient?.documentNumber,
        linkedClient?.phone,
        linkedClient?.email,
        item.categoria,
        item.descripcion,
        item.estadoPago,
        item.medioPago,
        item.observaciones,
        item.valorTotal,
        item.abono,
        item.saldoPendiente,
      ].join(" ")
    ).includes(query);
  });
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

async function handleCatalogItemAction(event) {
  const editButton = event.target.closest("[data-catalog-edit-id]");
  const toggleButton = event.target.closest("[data-catalog-toggle-id]");

  if (editButton) {
    const key = editButton.dataset.catalogGroup;
    const itemId = editButton.dataset.catalogEditId;
    const catalogItem = (state.catalogItems[key] || []).find(
      (item) => String(item.id) === String(itemId)
    );
    const currentValue =
      String(catalogItem?.value || "") ||
      decodeURIComponent(editButton.dataset.catalogValue || "");
    const currentDefaultAmount = Number(
      catalogItem?.defaultAmount ?? editButton.dataset.catalogDefaultAmount ?? 0
    );

    if (!key || !itemId) {
      return;
    }

    startEditingListItem(key, {
      id: itemId,
      value: currentValue,
      defaultAmount: currentDefaultAmount,
    });
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
      ? "Este item volvera a quedar disponible. Quieres activarlo?"
      : "Este item dejara de aparecer en nuevos registros. Quieres inactivarlo?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/catalogs/${key}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: activate }),
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
