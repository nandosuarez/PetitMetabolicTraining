(function merchandiseOrdersModule() {
  if (typeof window === "undefined" || typeof elements === "undefined") {
    return;
  }

  const orderElements = {
    form: document.getElementById("merchandise-order-form"),
    client: document.getElementById("merchandise-order-client"),
    orderDate: document.getElementById("merchandise-order-date"),
    expectedDate: document.getElementById("merchandise-order-expected-date"),
    product: document.getElementById("merchandise-order-product"),
    size: document.getElementById("merchandise-order-size"),
    color: document.getElementById("merchandise-order-color"),
    quantity: document.getElementById("merchandise-order-quantity"),
    extra: document.getElementById("merchandise-order-extra"),
    unitPrice: document.getElementById("merchandise-order-unit-price"),
    addItem: document.getElementById("merchandise-order-add-item"),
    items: document.getElementById("merchandise-order-items"),
    summary: document.getElementById("merchandise-order-summary"),
    initialPayment: document.getElementById(
      "merchandise-order-initial-payment"
    ),
    paymentMethod: document.getElementById(
      "merchandise-order-payment-method"
    ),
    notes: document.getElementById("merchandise-order-notes"),
    feedback: document.getElementById("merchandise-order-feedback"),
    filterStatus: document.getElementById(
      "merchandise-order-filter-status"
    ),
    filterQuery: document.getElementById("merchandise-order-filter-query"),
    metrics: document.getElementById("merchandise-order-metrics"),
    list: document.getElementById("merchandise-orders-list"),
  };

  if (!orderElements.form) {
    return;
  }

  let orderDraftItems = [];

  function normalizeMoney(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
  }

  function normalizeInteger(value) {
    const amount = Number(value);
    return Number.isInteger(amount) ? amount : 0;
  }

  function statusLabel(status) {
    return {
      pedido: "Pedido recibido",
      produccion: "En produccion",
      recibido: "Prendas recibidas",
      entregado: "Entregado",
      cancelado: "Cancelado",
    }[status] || status;
  }

  function paymentStatusClass(status) {
    return {
      Pagado: "status-paid",
      Parcial: "status-partial",
      Pendiente: "status-pending",
    }[status] || "";
  }

  function getOrderProducts() {
    const businessProducts = (state.businessProducts || []).filter((item) => {
      const notes = String(item.notes || "").toLowerCase();
      return (
        item.isActive &&
        String(item.itemType || "").toLowerCase() !== "servicio" &&
        !notes.includes("variante generada automaticamente desde pedidos")
      );
    });
    const linkedInventoryIds = new Set(
      businessProducts
        .map((item) => Number(item.inventoryProductId || 0))
        .filter((id) => id > 0)
    );
    const inventoryFallbacks = (state.inventoryProducts || [])
      .filter(
        (item) =>
          item.isActive &&
          String(item.itemKind || "").toLowerCase() !== "servicio" &&
          !linkedInventoryIds.has(Number(item.id || 0))
      )
      .map((item) => ({
        id: `inventory-${item.id}`,
        businessProductId: 0,
        inventoryProductId: Number(item.id),
        name: item.name,
        defaultAmount: Number(item.salePrice || 0),
        itemType: "Producto",
        category: item.category || "Mercancia Petit",
        businessLine: item.area === "Restaurante" ? "Restaurante" : "Gimnasio",
        isActive: true,
        notes: "Producto historico de inventario sin ficha comercial.",
      }));

    return [...businessProducts, ...inventoryFallbacks];
  }

  function hydrateOrderOptions() {
    const previousClient = orderElements.client.value;
    const clients = (state.clients || []).filter(
      (item) => item.isActive && item.isClient !== false
    );
    orderElements.client.innerHTML = [
      '<option value="">Selecciona un cliente</option>',
      ...clients.map(
        (item) =>
          `<option value="${escapeHtml(String(item.id))}">${escapeHtml(
            [item.fullName, item.alias ? `(${item.alias})` : ""]
              .filter(Boolean)
              .join(" ")
          )}</option>`
      ),
    ].join("");
    if (
      previousClient &&
      [...orderElements.client.options].some(
        (option) => option.value === previousClient
      )
    ) {
      orderElements.client.value = previousClient;
    }

    const previousProduct = orderElements.product.value;
    orderElements.product.innerHTML = [
      '<option value="">Selecciona un producto</option>',
      ...getOrderProducts().map(
        (item) =>
          `<option value="${escapeHtml(String(item.id))}">${escapeHtml(
            `${item.name} - ${formatCurrency(item.defaultAmount || 0)}`
          )}</option>`
      ),
    ].join("");
    if (
      previousProduct &&
      [...orderElements.product.options].some(
        (option) => option.value === previousProduct
      )
    ) {
      orderElements.product.value = previousProduct;
    }

    const previousMethod = orderElements.paymentMethod.value;
    orderElements.paymentMethod.innerHTML = (state.lists.mediosPago || [])
      .map(
        (method) =>
          `<option value="${escapeHtml(method)}">${escapeHtml(method)}</option>`
      )
      .join("");
    if (
      previousMethod &&
      [...orderElements.paymentMethod.options].some(
        (option) => option.value === previousMethod
      )
    ) {
      orderElements.paymentMethod.value = previousMethod;
    }
  }

  function getSelectedOrderProduct() {
    return getOrderProducts().find(
      (item) => String(item.id) === String(orderElements.product.value)
    );
  }

  function syncOrderProductPrice() {
    const product = getSelectedOrderProduct();
    orderElements.unitPrice.value = product?.defaultAmount
      ? String(product.defaultAmount)
      : "";
  }

  function getDraftTotal() {
    return normalizeMoney(
      orderDraftItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      )
    );
  }

  function renderOrderDraft() {
    if (!orderDraftItems.length) {
      orderElements.items.innerHTML = `
        <article class="list-item">
          <small>No hay prendas agregadas.</small>
        </article>
      `;
      orderElements.summary.textContent =
        "Agrega las prendas solicitadas por el cliente.";
      return;
    }

    orderElements.items.innerHTML = orderDraftItems
      .map((item) => {
        const variant = [
          item.size ? `Talla ${item.size}` : "",
          item.color,
        ]
          .filter(Boolean)
          .join(" - ");
        return `
          <article class="list-item order-draft-row">
            <div>
              <strong>${escapeHtml(item.productName)}</strong>
              <small>${escapeHtml(variant || "Sin variante")} · Cliente ${
                item.quantity
              } · Inventario extra ${item.extraStockQuantity}</small>
            </div>
            <div class="order-draft-price">
              <strong>${escapeHtml(
                formatCurrency(item.quantity * item.unitPrice)
              )}</strong>
              <small>${escapeHtml(formatCurrency(item.unitPrice))} c/u</small>
            </div>
            <button
              class="table-button icon-button danger"
              type="button"
              data-order-draft-remove="${escapeHtml(item.id)}"
              title="Quitar prenda"
              aria-label="Quitar prenda"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 7h14"></path>
                <path d="M9 7V5h6v2"></path>
                <path d="M8 10v8"></path>
                <path d="M12 10v8"></path>
                <path d="M16 10v8"></path>
                <path d="M7 7l1 14h8l1-14"></path>
              </svg>
            </button>
          </article>
        `;
      })
      .join("");

    const clientUnits = orderDraftItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const extraUnits = orderDraftItems.reduce(
      (sum, item) => sum + item.extraStockQuantity,
      0
    );
    orderElements.summary.textContent = `${clientUnits} unidad(es) para clientes · ${extraUnits} adicional(es) para inventario · Total ${formatCurrency(
      getDraftTotal()
    )}.`;
  }

  function addOrderDraftItem() {
    const product = getSelectedOrderProduct();
    const quantity = normalizeInteger(orderElements.quantity.value);
    const extraStockQuantity = normalizeInteger(orderElements.extra.value);
    const unitPrice = normalizeMoney(orderElements.unitPrice.value);

    if (!product) {
      orderElements.feedback.textContent = "Selecciona el producto de la prenda.";
      orderElements.product.focus();
      return;
    }
    if (quantity <= 0) {
      orderElements.feedback.textContent =
        "La cantidad del cliente debe ser un entero mayor que cero.";
      orderElements.quantity.focus();
      return;
    }
    if (extraStockQuantity < 0) {
      orderElements.feedback.textContent =
        "La cantidad adicional no puede ser negativa.";
      orderElements.extra.focus();
      return;
    }
    if (!(unitPrice > 0)) {
      orderElements.feedback.textContent =
        "El precio de venta debe ser mayor que cero.";
      orderElements.unitPrice.focus();
      return;
    }

    orderDraftItems.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      businessProductId: Number(product.businessProductId || product.id || 0),
      inventoryProductId: Number(product.inventoryProductId || 0),
      productName: product.name,
      size: String(orderElements.size.value || "").trim(),
      color: String(orderElements.color.value || "").trim(),
      quantity,
      extraStockQuantity,
      unitPrice,
    });
    orderElements.size.value = "";
    orderElements.color.value = "";
    orderElements.quantity.value = "1";
    orderElements.extra.value = "0";
    orderElements.feedback.textContent = "Prenda agregada al pedido.";
    renderOrderDraft();
  }

  function resetOrderForm() {
    orderElements.form.reset();
    orderElements.orderDate.value = getCurrentIsoDate();
    orderElements.quantity.value = "1";
    orderElements.extra.value = "0";
    orderElements.initialPayment.value = "0";
    orderDraftItems = [];
    hydrateOrderOptions();
    renderOrderDraft();
    orderElements.feedback.textContent =
      "El pedido genera la cuenta por cobrar, pero no mueve inventario hasta que las prendas lleguen.";
  }

  async function handleOrderSubmit(event) {
    event.preventDefault();

    const clientId = Number(orderElements.client.value || 0);
    const initialPayment = normalizeMoney(
      orderElements.initialPayment.value
    );
    const total = getDraftTotal();

    if (!clientId) {
      orderElements.feedback.textContent = "Selecciona el cliente del pedido.";
      orderElements.client.focus();
      return;
    }
    if (!orderDraftItems.length) {
      orderElements.feedback.textContent =
        "Agrega al menos una prenda antes de guardar.";
      orderElements.product.focus();
      return;
    }
    if (initialPayment < 0 || initialPayment > total) {
      orderElements.feedback.textContent =
        "El abono inicial no puede superar el total del pedido.";
      orderElements.initialPayment.focus();
      return;
    }

    orderElements.feedback.textContent = "Guardando pedido...";
    try {
      await apiRequest("/api/merchandise-orders", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          orderDate: orderElements.orderDate.value,
          expectedDate: orderElements.expectedDate.value,
          paymentMethod: orderElements.paymentMethod.value,
          initialPayment,
          notes: orderElements.notes.value.trim(),
          items: orderDraftItems,
        }),
      });
      resetOrderForm();
      await loadBootstrap();
      switchView("pedidos");
      orderElements.feedback.textContent = "Pedido registrado correctamente.";
    } catch (error) {
      orderElements.feedback.textContent = error.message;
    }
  }

  function getFilteredOrders() {
    const status = orderElements.filterStatus.value || "todos";
    const query = normalizeSearchValue(orderElements.filterQuery.value || "");
    return (state.merchandiseOrders || []).filter((order) => {
      if (status !== "todos" && order.status !== status) {
        return false;
      }
      if (!query) {
        return true;
      }
      return normalizeSearchValue(
        [
          order.clientName,
          order.clientAlias,
          order.notes,
          ...(order.items || []).flatMap((item) => [
            item.productName,
            item.size,
            item.color,
            item.inventoryProductName,
          ]),
        ].join(" ")
      ).includes(query);
    });
  }

  function renderOrderMetrics() {
    const orders = state.merchandiseOrders || [];
    const active = orders.filter(
      (order) => !["entregado", "cancelado"].includes(order.status)
    );
    const pendingBalance = active.reduce(
      (sum, order) => sum + Number(order.balanceDue || 0),
      0
    );
    const extras = active.reduce(
      (sum, order) =>
        sum +
        (order.items || []).reduce(
          (itemSum, item) => itemSum + Number(item.extraStockQuantity || 0),
          0
        ),
      0
    );
    orderElements.metrics.innerHTML = `
      <div class="mini-stat"><span>Pedidos activos</span><strong>${active.length}</strong></div>
      <div class="mini-stat"><span>Saldo por cobrar</span><strong>${escapeHtml(
        formatCurrency(pendingBalance)
      )}</strong></div>
      <div class="mini-stat"><span>Extras solicitados</span><strong>${extras}</strong></div>
    `;
  }

  function renderOrderActions(order) {
    const buttons = [];
    if (order.status === "pedido") {
      buttons.push(
        `<button class="ghost-button" type="button" data-order-status-id="${order.id}" data-order-next-status="produccion">Enviar a produccion</button>`
      );
    }
    if (["pedido", "produccion"].includes(order.status)) {
      buttons.push(
        `<button class="primary-button" type="button" data-order-status-id="${order.id}" data-order-next-status="recibido">Marcar recibido</button>`
      );
    }
    if (order.status === "recibido") {
      buttons.push(
        `<button class="primary-button" type="button" data-order-status-id="${order.id}" data-order-next-status="entregado">Entregar al cliente</button>`
      );
    }
    if (
      isAdminUser() &&
      ["pedido", "produccion"].includes(order.status) &&
      Number(order.paidAmount || 0) <= 0
    ) {
      buttons.push(
        `<button class="ghost-button danger" type="button" data-order-status-id="${order.id}" data-order-next-status="cancelado">Cancelar pedido</button>`
      );
    }
    return buttons.join("");
  }

  function renderOrders() {
    renderOrderMetrics();
    const orders = getFilteredOrders();
    if (!orders.length) {
      orderElements.list.innerHTML = `
        <div class="empty-state">No hay pedidos para los filtros seleccionados.</div>
      `;
      return;
    }

    orderElements.list.innerHTML = orders
      .map((order) => {
        const items = (order.items || [])
          .map((item) => {
            const variant = [
              item.size ? `Talla ${item.size}` : "",
              item.color,
            ]
              .filter(Boolean)
              .join(" - ");
            const extraCopy =
              item.extraStockQuantity > 0
                ? ` · ${item.extraStockQuantity} extra para inventario`
                : "";
            return `
              <li>
                <strong>${escapeHtml(item.productName)}</strong>
                <span>${escapeHtml(variant || "Sin variante")} · ${
                  item.quantity
                } para cliente${escapeHtml(extraCopy)}</span>
              </li>
            `;
          })
          .join("");
        const canCollect =
          order.movementId > 0 &&
          Number(order.balanceDue || 0) > 0 &&
          order.status !== "cancelado";

        return `
          <article class="order-card" data-order-id="${order.id}">
            <header class="order-card-head">
              <div>
                <p class="section-kicker">Pedido #${order.id}</p>
                <h4>${escapeHtml(order.clientName)}</h4>
                <small>${escapeHtml(formatDate(order.orderDate))}${
                  order.expectedDate
                    ? ` · Llega ${escapeHtml(formatDate(order.expectedDate))}`
                    : ""
                }</small>
              </div>
              <div class="order-status-stack">
                <span class="status-badge order-status-${escapeHtml(
                  order.status
                )}">${escapeHtml(statusLabel(order.status))}</span>
                <span class="status-badge ${paymentStatusClass(
                  order.paymentStatus
                )}">${escapeHtml(order.paymentStatus)}</span>
              </div>
            </header>

            <div class="order-card-body">
              <ul class="order-items-list">${items}</ul>
              <div class="order-money">
                <span>Total <strong>${escapeHtml(
                  formatCurrency(order.totalAmount)
                )}</strong></span>
                <span>Pagado <strong>${escapeHtml(
                  formatCurrency(order.paidAmount)
                )}</strong></span>
                <span>Saldo <strong>${escapeHtml(
                  formatCurrency(order.balanceDue)
                )}</strong></span>
              </div>
              ${
                order.notes
                  ? `<p class="order-notes">${escapeHtml(order.notes)}</p>`
                  : ""
              }
            </div>

            ${
              canCollect
                ? `
                  <form class="order-payment-form" data-order-payment-form="${order.id}">
                    <input
                      type="number"
                      min="0.01"
                      max="${order.balanceDue}"
                      step="0.01"
                      placeholder="Valor del abono"
                      data-order-payment-amount
                      required
                    />
                    <select data-order-payment-method required>
                      ${(state.lists.mediosPago || [])
                        .map(
                          (method) =>
                            `<option value="${escapeHtml(method)}">${escapeHtml(
                              method
                            )}</option>`
                        )
                        .join("")}
                    </select>
                    <button class="ghost-button" type="submit">Registrar abono</button>
                  </form>
                `
                : ""
            }

            <footer class="order-card-actions">
              ${renderOrderActions(order)}
            </footer>
          </article>
        `;
      })
      .join("");
  }

  async function changeOrderStatus(orderId, nextStatus) {
    const messages = {
      produccion: "enviar este pedido a produccion",
      recibido:
        "marcar las prendas como recibidas y sumarlas al inventario",
      entregado:
        "entregar el pedido y descontar las prendas del inventario",
      cancelado: "cancelar este pedido",
    };
    if (!window.confirm(`Deseas ${messages[nextStatus]}?`)) {
      return;
    }

    try {
      await apiRequest(`/api/merchandise-orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadBootstrap();
      switchView("pedidos");
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function registerOrderPayment(form) {
    const orderId = Number(form.dataset.orderPaymentForm || 0);
    const order = (state.merchandiseOrders || []).find(
      (item) => Number(item.id) === orderId
    );
    const amountInput = form.querySelector("[data-order-payment-amount]");
    const methodSelect = form.querySelector("[data-order-payment-method]");
    const amount = normalizeMoney(amountInput?.value);

    if (!order?.movementId || !(amount > 0)) {
      window.alert("Ingresa un valor valido para el abono.");
      amountInput?.focus();
      return;
    }
    if (amount > Number(order.balanceDue || 0)) {
      window.alert("El abono no puede superar el saldo del pedido.");
      amountInput?.focus();
      return;
    }

    await apiRequest(`/api/movements/${order.movementId}/collections`, {
      method: "POST",
      body: JSON.stringify({
        collectionDate: getCurrentIsoDate(),
        amount,
        paymentMethod: methodSelect.value,
        notes: `Abono pedido de prendas #${order.id}`,
      }),
    });
    await loadBootstrap();
    switchView("pedidos");
  }

  function handleOrderListClick(event) {
    const statusButton = event.target.closest("[data-order-status-id]");
    if (!statusButton) {
      return;
    }
    changeOrderStatus(
      Number(statusButton.dataset.orderStatusId),
      statusButton.dataset.orderNextStatus
    );
  }

  function handleOrderListSubmit(event) {
    const form = event.target.closest("[data-order-payment-form]");
    if (!form) {
      return;
    }
    event.preventDefault();
    registerOrderPayment(form).catch((error) => window.alert(error.message));
  }

  async function loadMerchandiseOrders() {
    if (!canWriteOperations()) {
      state.merchandiseOrders = [];
      return;
    }
    const payload = await apiRequest("/api/merchandise-orders");
    state.merchandiseOrders = Array.isArray(payload.orders)
      ? payload.orders
      : [];
  }

  const originalLoadBootstrap = window.loadBootstrap || loadBootstrap;
  window.loadBootstrap = async function merchandiseLoadBootstrap(...args) {
    const result = await originalLoadBootstrap(...args);
    await loadMerchandiseOrders();
    hydrateOrderOptions();
    renderOrders();
    return result;
  };

  const originalSwitchView = window.switchView || switchView;
  window.switchView = function merchandiseSwitchView(view, options = {}) {
    originalSwitchView(view, options);
    if (view === "pedidos") {
      hydrateOrderOptions();
      renderOrderDraft();
      renderOrders();
    }
  };

  orderElements.product.addEventListener("change", syncOrderProductPrice);
  orderElements.addItem.addEventListener("click", addOrderDraftItem);
  orderElements.items.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-draft-remove]");
    if (!button) {
      return;
    }
    orderDraftItems = orderDraftItems.filter(
      (item) => item.id !== button.dataset.orderDraftRemove
    );
    renderOrderDraft();
  });
  orderElements.form.addEventListener("submit", handleOrderSubmit);
  orderElements.filterStatus.addEventListener("change", renderOrders);
  orderElements.filterQuery.addEventListener("input", renderOrders);
  orderElements.list.addEventListener("click", handleOrderListClick);
  orderElements.list.addEventListener("submit", handleOrderListSubmit);

  orderElements.orderDate.value = getCurrentIsoDate();
  renderOrderDraft();
})();
