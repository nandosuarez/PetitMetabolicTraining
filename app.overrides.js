(function movementAndPurchasesOverrides() {
  if (typeof window === "undefined" || typeof elements === "undefined") {
    return;
  }

  let activeMovementPanel = "ventas";

  const movementPanelButtons = [
    ...document.querySelectorAll("[data-movement-panel]"),
  ];
  const movementPanels = {
    ventas: document.getElementById("movement-panel-ventas"),
    compras: document.getElementById("movement-panel-compras"),
  };

  const purchaseElements = {
    form: document.getElementById("purchase-form"),
    movementId: document.getElementById("purchase-movement-id"),
    linea: document.getElementById("purchase-linea"),
    fecha: document.getElementById("purchase-fecha"),
    kind: document.getElementById("purchase-kind"),
    categoriaShell: document.getElementById("purchase-category-shell"),
    categoria: document.getElementById("purchase-categoria"),
    inventoryProductShell: document.getElementById(
      "purchase-inventory-product-shell"
    ),
    inventoryProductId: document.getElementById("purchase-inventory-product-id"),
    inventoryQuantityShell: document.getElementById("purchase-quantity-shell"),
    inventoryQuantity: document.getElementById("purchase-inventory-quantity"),
    unitCostShell: document.getElementById("purchase-unit-cost-shell"),
    unitCost: document.getElementById("purchase-unit-cost"),
    medioPago: document.getElementById("purchase-medio-pago"),
    beneficiary: document.getElementById("purchase-beneficiary"),
    description: document.getElementById("purchase-description"),
    total: document.getElementById("purchase-total"),
    paid: document.getElementById("purchase-paid"),
    notes: document.getElementById("purchase-notes"),
    feedback: document.getElementById("purchase-feedback"),
    filterLine: document.getElementById("purchase-filter-line"),
    filterKind: document.getElementById("purchase-filter-kind"),
    filterQuery: document.getElementById("purchase-filter-query"),
    metrics: document.getElementById("purchase-metrics"),
    table: document.getElementById("purchases-table"),
  };
  const salesElements = {
    quantity: document.getElementById("movement-item-quantity"),
    addItemButton: document.getElementById("movement-add-item"),
    itemsList: document.getElementById("sales-items-list"),
    itemsSummary: document.getElementById("sales-items-summary"),
  };

  let salesDraftItems = [];
  let lastAutoSalesDescription = "";

  function normalizeMovementPanel(panel) {
    return ["ventas", "compras"].includes(panel) ? panel : "ventas";
  }

  function isPurchaseKindCost() {
    return String(purchaseElements.kind?.value || "Costo") === "Costo";
  }

  function setNodeVisibility(node, visible) {
    if (!node) {
      return;
    }

    node.classList.toggle("is-hidden", !visible);
    node.setAttribute("aria-hidden", String(!visible));
  }

  function normalizeSalesQuantity(value) {
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return 0;
    }
    return Math.floor(numericValue);
  }

  function normalizeMoney(value) {
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue)) {
      return 0;
    }
    return Number(numericValue.toFixed(2));
  }

  function computeSalesItemSubtotal(quantity, unitPrice) {
    return normalizeMoney(normalizeSalesQuantity(quantity) * normalizeMoney(unitPrice));
  }

  function getSalesDraftTotal() {
    return normalizeMoney(
      salesDraftItems.reduce(
        (acc, item) => acc + computeSalesItemSubtotal(item.quantity, item.unitPrice),
        0
      )
    );
  }

  function getSalesDraftUnits() {
    return normalizeSalesQuantity(
      salesDraftItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0)
    );
  }

  function syncSalesTotalField() {
    if (!elements.valorTotal) {
      return;
    }

    const total = getSalesDraftTotal();
    elements.valorTotal.value = total > 0 ? String(total) : "";

    const paid = normalizeMoney(elements.abono?.value);
    if (total > 0 && paid > total && elements.abono) {
      elements.abono.value = String(total);
    }

    syncComputedPaymentStatus();
  }

  function updateSalesDraftSummary(message = "") {
    if (!salesElements.itemsSummary) {
      return;
    }

    if (message) {
      salesElements.itemsSummary.textContent = message;
      return;
    }

    if (!salesDraftItems.length) {
      salesElements.itemsSummary.textContent =
        "Agrega uno o más productos para registrar la venta.";
      return;
    }

    const total = getSalesDraftTotal();
    const units = getSalesDraftUnits();
    salesElements.itemsSummary.textContent = `${salesDraftItems.length} item(s), ${units} unidad(es). Total ${formatCurrency(total)}.`;
  }

  function clearSalesDraft(options = {}) {
    salesDraftItems = [];
    lastAutoSalesDescription = "";
    if (salesElements.quantity) {
      salesElements.quantity.value = "1";
    }
    renderSalesDraftItems();
    if (options.updateTotal !== false) {
      syncSalesTotalField();
    }
  }

  function renderSalesDraftItems() {
    if (!salesElements.itemsList) {
      return;
    }

    if (!salesDraftItems.length) {
      salesElements.itemsList.innerHTML = `
        <article class="list-item">
          <small>No hay productos agregados en esta venta.</small>
        </article>
      `;
      updateSalesDraftSummary();
      return;
    }

    salesElements.itemsList.innerHTML = salesDraftItems
      .map((item) => {
        const subtotal = computeSalesItemSubtotal(item.quantity, item.unitPrice);
        return `
          <article class="list-item sales-item-row" data-sales-item-id="${escapeHtml(
            item.id
          )}">
            <div class="sales-item-main">
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(item.categoryLabel)} · ${formatCurrency(
                item.unitPrice
              )} c/u</small>
            </div>
            <div class="sales-item-controls">
              <label class="inline-label">
                Cantidad
                <input
                  type="number"
                  min="1"
                  step="1"
                  value="${escapeHtml(String(item.quantity))}"
                  data-sales-item-quantity-id="${escapeHtml(item.id)}"
                />
              </label>
              <strong>${formatCurrency(subtotal)}</strong>
              <button
                type="button"
                class="table-button icon-button danger"
                data-sales-item-remove-id="${escapeHtml(item.id)}"
                aria-label="Quitar producto de la venta"
                title="Quitar producto"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    updateSalesDraftSummary();
  }

  function syncSalesDraftEditState() {
    const isEditing = Boolean(elements.movementId?.value);
    if (elements.valorTotal) {
      elements.valorTotal.readOnly = !isEditing;
    }
    if (salesElements.quantity) {
      salesElements.quantity.disabled = isEditing;
    }
    if (salesElements.addItemButton) {
      salesElements.addItemButton.disabled = isEditing;
    }

    if (isEditing) {
      updateSalesDraftSummary(
        "En edición se actualiza un solo movimiento. Para venta múltiple, crea una venta nueva."
      );
      if (salesElements.itemsList) {
        salesElements.itemsList.innerHTML = `
          <article class="list-item">
            <small>La edición se hace por movimiento individual.</small>
          </article>
        `;
      }
      return;
    }

    renderSalesDraftItems();
  }

  function setMovementPanel(panel) {
    activeMovementPanel = normalizeMovementPanel(panel);

    movementPanelButtons.forEach((button) => {
      const isActive = button.dataset.movementPanel === activeMovementPanel;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    Object.entries(movementPanels).forEach(([key, section]) => {
      if (!section) {
        return;
      }
      const isActive = key === activeMovementPanel;
      section.classList.toggle("is-hidden", !isActive);
      section.setAttribute("aria-hidden", String(!isActive));
    });

    if (activeMovementPanel === "ventas") {
      applySalesOnlyMode();
      syncMovementBusinessProductSelection({
        preserveValue: true,
        preserveCategoryValue: true,
      });
      syncSalesDraftEditState();
      if (!elements.movementId.value) {
        syncSalesTotalField();
      }
      renderMovementsView();
      return;
    }

    renderPurchasesModule();
  }

  function applySalesOnlyMode() {
    const typeLabel = elements.tipo?.closest("label");
    const categoryLabel = elements.categoria?.closest("label");
    setNodeVisibility(typeLabel, false);
    setNodeVisibility(categoryLabel, false);

    if (elements.tipo) {
      elements.tipo.value = "Ingreso";
      elements.tipo.disabled = true;
    }

    if (elements.categoria) {
      elements.categoria.disabled = true;
    }

    if (elements.movementFormTitle && !elements.movementId.value) {
      elements.movementFormTitle.textContent = "Registrar venta";
    }

    syncSalesDraftEditState();

    if (elements.movementFeedback && !elements.movementId.value) {
      elements.movementFeedback.textContent =
        "Registra aquí únicamente ventas (ingresos). Compras y gastos van en el panel de Compras y gastos.";
    }
  }

  function shouldReplaceAutoSalesDescription(currentDescription) {
    const description = String(currentDescription || "").trim();
    if (!description) {
      return true;
    }

    return (
      description === lastAutoSalesDescription ||
      description === "Venta múltiple"
    );
  }

  window.fillMovementBusinessProductOptions = function fillMovementOptionsOverride(
    selectedValue = ""
  ) {
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
        placeholder: "Selecciona producto o servicio",
        labelBuilder: (item) => {
          const detailLabel = getBusinessProductDetailLabel(item);
          return `${item.name} - ${getBusinessProductCategoryLabel(item)}${
            detailLabel ? ` - ${detailLabel}` : ""
          } - ${formatCurrency(item.defaultAmount)}`;
        },
      }
    );
  };

  window.syncMovementBusinessProductSelection =
    function syncMovementBusinessProductSelectionOverride(options = {}) {
      if (!elements.movementBusinessProductId) {
        return null;
      }

      fillMovementBusinessProductOptions(
        String(
          options.selectedValue ?? elements.movementBusinessProductId.value ?? ""
        )
      );

      if (elements.tipo) {
        elements.tipo.value = "Ingreso";
      }

      const selectedProduct = getBusinessProductById(
        elements.movementBusinessProductId.value
      );
      const currentLine = elements.linea?.value || "Gimnasio";

      if (!selectedProduct || selectedProduct.businessLine !== currentLine) {
        if (!options.preserveValue) {
          elements.movementBusinessProductId.value = "";
        }

        syncCategoryOptions({
          includeValue:
            options.preserveCategoryValue === false
              ? ""
              : elements.categoria?.value || "",
        });
        if (elements.categoria) {
          elements.categoria.disabled = true;
        }

        if (elements.movementBusinessProductFeedback) {
          elements.movementBusinessProductFeedback.textContent =
            "Selecciona el producto o servicio vendido para completar automáticamente la categoría y el valor sugerido.";
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

      if (
        selectedProduct.defaultAmount > 0 &&
        !options.preserveValue &&
        !salesDraftItems.length &&
        !elements.movementId.value
      ) {
        elements.valorTotal.value = String(selectedProduct.defaultAmount);
        syncComputedPaymentStatus();
      }

      if (!salesDraftItems.length) {
        const currentDescription = elements.descripcion.value;
        if (shouldReplaceAutoSalesDescription(currentDescription)) {
          elements.descripcion.value = selectedProduct.name;
          lastAutoSalesDescription = selectedProduct.name;
        }
      }

      if (salesDraftItems.length && !elements.movementId.value) {
        syncSalesTotalField();
      }

      if (elements.movementBusinessProductFeedback) {
        const recipeItems = getBusinessProductComponents(selectedProduct.id).length;
        const stockMessage =
          selectedProduct.directInventoryProductId > 0
            ? `descontará ${formatInventoryQuantity(
                selectedProduct.directInventoryQuantity || 1,
                selectedProduct.directInventoryProductUnitName
              )} de ${
                selectedProduct.directInventoryProductName || "inventario"
              }`
            : recipeItems > 0
              ? `descontará ${recipeItems} insumo(s) configurados en su receta`
              : "no mueve inventario automáticamente";
        elements.movementBusinessProductFeedback.textContent =
          `${selectedProduct.name} - ${getBusinessProductCategoryLabel(
            selectedProduct
          )} - ${formatCurrency(
            selectedProduct.defaultAmount
          )}. Al registrar la venta, ${stockMessage}.`;
      }

      return selectedProduct;
    };

  function buildSalesLineDescription(selectedProduct, quantity, baseDescription = "") {
    const normalizedBase = String(baseDescription || "").trim();
    if (normalizedBase) {
      return normalizedBase;
    }

    if (!selectedProduct?.name) {
      return "Venta";
    }

    if (normalizeSalesQuantity(quantity) > 1) {
      return `${selectedProduct.name} x${normalizeSalesQuantity(quantity)}`;
    }

    return selectedProduct.name;
  }

  function buildSalesPayload(options = {}) {
    const selectedProduct =
      options.selectedProduct ||
      getBusinessProductById(elements.movementBusinessProductId.value);
    const quantity = normalizeSalesQuantity(options.quantity || 1) || 1;
    const totalAmount = normalizeMoney(
      options.valorTotal ?? options.totalAmount ?? elements.valorTotal.value
    );
    const paidAmount = normalizeMoney(
      options.abono ?? options.paidAmount ?? elements.abono.value
    );
    const categoryValue =
      selectedProduct?.category ||
      getBusinessProductCategoryLabel(selectedProduct) ||
      elements.categoria?.value ||
      "Ventas";
    const productId = Number(
      options.businessProductId ??
        selectedProduct?.id ??
        elements.movementBusinessProductId.value ??
        0
    );
    const description = buildSalesLineDescription(
      selectedProduct,
      quantity,
      options.descripcion ?? elements.descripcion.value
    );

    return {
      linea: options.linea || elements.linea.value,
      fecha: options.fecha || elements.fecha.value,
      tipo: "Ingreso",
      categoria: categoryValue,
      businessProductId: productId > 0 ? productId : 0,
      cliente: String(options.cliente ?? elements.cliente.value ?? "").trim(),
      descripcion: description,
      medioPago: options.medioPago || elements.medioPago.value,
      valorTotal: totalAmount,
      abono: paidAmount,
      inventoryProductId: 0,
      inventoryQuantity: 0,
      inventoryEffect: "ninguno",
      observaciones: String(
        options.observaciones ?? elements.observaciones.value ?? ""
      ).trim(),
      justificacionEdicion: String(
        options.justificacionEdicion ?? elements.editJustification.value ?? ""
      ).trim(),
    };
  }

  function addSalesDraftItem() {
    if (elements.movementId.value) {
      elements.movementFeedback.textContent =
        "En edición se actualiza un solo movimiento. Crea una venta nueva para registrar varios productos.";
      return;
    }

    const selectedProduct = getBusinessProductById(
      elements.movementBusinessProductId.value
    );
    if (!selectedProduct) {
      elements.movementFeedback.textContent =
        "Selecciona el producto o servicio que quieres agregar a la venta.";
      elements.movementBusinessProductId?.focus();
      return;
    }

    const quantity = normalizeSalesQuantity(salesElements.quantity?.value || 0);
    if (!(quantity > 0)) {
      elements.movementFeedback.textContent =
        "La cantidad del producto debe ser mayor que cero.";
      salesElements.quantity?.focus();
      return;
    }

    const existingItem = salesDraftItems.find(
      (item) =>
        Number(item.productId || 0) === Number(selectedProduct.id) &&
        normalizeMoney(item.unitPrice) === normalizeMoney(selectedProduct.defaultAmount)
    );
    if (existingItem) {
      existingItem.quantity = normalizeSalesQuantity(existingItem.quantity + quantity);
    } else {
      salesDraftItems.push({
        id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
        productId: Number(selectedProduct.id),
        name: selectedProduct.name,
        categoryLabel:
          selectedProduct.category || getBusinessProductCategoryLabel(selectedProduct),
        unitPrice: normalizeMoney(selectedProduct.defaultAmount),
        quantity,
      });
    }

    if (salesDraftItems.length > 1) {
      elements.descripcion.value = "Venta múltiple";
      lastAutoSalesDescription = "Venta múltiple";
    } else if (shouldReplaceAutoSalesDescription(elements.descripcion.value)) {
      elements.descripcion.value = selectedProduct.name;
      lastAutoSalesDescription = selectedProduct.name;
    }

    if (salesElements.quantity) {
      salesElements.quantity.value = "1";
    }
    renderSalesDraftItems();
    syncSalesTotalField();

    elements.movementFeedback.textContent = `${selectedProduct.name} agregado a la venta.`;
  }

  function handleSalesDraftListClick(event) {
    const removeButton = event.target.closest("[data-sales-item-remove-id]");
    if (!removeButton) {
      return;
    }

    const itemId = String(removeButton.dataset.salesItemRemoveId || "");
    if (!itemId) {
      return;
    }

    salesDraftItems = salesDraftItems.filter((item) => String(item.id) !== itemId);
    renderSalesDraftItems();
    syncSalesTotalField();
  }

  function handleSalesDraftListInput(event) {
    const quantityInput = event.target.closest("[data-sales-item-quantity-id]");
    if (!quantityInput) {
      return;
    }

    const itemId = String(quantityInput.dataset.salesItemQuantityId || "");
    const rawValue = String(quantityInput.value ?? "").trim();
    const item = salesDraftItems.find((entry) => String(entry.id) === itemId);
    if (!item) {
      return;
    }

    if (!rawValue) {
      return;
    }

    const quantity = normalizeSalesQuantity(rawValue);
    if (!(quantity > 0)) {
      return;
    }

    item.quantity = quantity;
    renderSalesDraftItems();
    syncSalesTotalField();
  }

  function getValidatedSalesDraftItems() {
    const draftItems = salesDraftItems.map((item) => ({ ...item }));
    const quantityInputs = [
      ...(salesElements.itemsList?.querySelectorAll(
        "[data-sales-item-quantity-id]"
      ) || []),
    ];

    for (const input of quantityInputs) {
      const itemId = String(input.dataset.salesItemQuantityId || "");
      const item = draftItems.find((entry) => String(entry.id) === itemId);
      if (!item) {
        continue;
      }

      const rawValue = String(input.value ?? "").trim();
      if (!rawValue) {
        return {
          valid: false,
          message:
            "Hay productos sin cantidad. Completa todas las cantidades antes de guardar la venta.",
          focusNode: input,
        };
      }

      const quantity = normalizeSalesQuantity(rawValue);
      if (!(quantity > 0)) {
        return {
          valid: false,
          message:
            "Todas las cantidades deben ser números enteros mayores que cero.",
          focusNode: input,
        };
      }

      item.quantity = quantity;
    }

    return {
      valid: true,
      items: draftItems,
    };
  }

  async function handleSalesSubmitOverride(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (activeMovementPanel !== "ventas") {
      return;
    }

    const isEditing = Boolean(elements.movementId.value);

    const typedClientQuery = String(elements.clienteSearch?.value || "").trim();
    const resolvedClient =
      syncMovementClientSelectionFromSearch({
        allowClosestMatch: true,
        allowSingleMatch: true,
      }) || !typedClientQuery;

    if (!resolvedClient && typedClientQuery) {
      elements.movementFeedback.textContent =
        "Selecciona un cliente válido de la lista antes de guardar la venta.";
      elements.clienteSearch?.focus();
      return;
    }

    if (!isEditing && !salesDraftItems.length) {
      elements.movementFeedback.textContent =
        "Agrega al menos un producto al detalle para registrar la venta.";
      salesElements.addItemButton?.focus();
      return;
    }

    const selectedProduct = getBusinessProductById(
      elements.movementBusinessProductId.value
    );

    try {
      if (isEditing) {
        const payload = buildSalesPayload({
          selectedProduct,
          valorTotal: elements.valorTotal.value,
          abono: elements.abono.value,
        });
        payload.estadoPago = derivePaymentStatus(payload.valorTotal, payload.abono);

        const validation = validateMovement(payload, {
          isEditing: true,
        });
        if (!validation.valid) {
          elements.movementFeedback.textContent = validation.message;
          return;
        }

        await apiRequest(`/api/movements/${elements.movementId.value}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const draftValidation = getValidatedSalesDraftItems();
        if (!draftValidation.valid) {
          elements.movementFeedback.textContent = draftValidation.message;
          draftValidation.focusNode?.focus();
          return;
        }

        salesDraftItems = draftValidation.items;
        renderSalesDraftItems();
        syncSalesTotalField();
        const totalAmount = normalizeMoney(elements.valorTotal.value);
        const paidAmount = normalizeMoney(elements.abono.value);

        if (!(totalAmount > 0)) {
          elements.movementFeedback.textContent =
            "El total de la venta debe ser mayor que cero.";
          return;
        }

        if (paidAmount < 0 || paidAmount > totalAmount) {
          elements.movementFeedback.textContent =
            "El abono total no puede ser negativo ni mayor al valor total de la venta.";
          return;
        }

        let remainingPaid = paidAmount;
        for (const item of salesDraftItems) {
          const currentProduct = getBusinessProductById(item.productId);
          if (!currentProduct) {
            elements.movementFeedback.textContent =
              `No encontramos el producto ${item.name}. Actualiza el detalle de venta e intenta de nuevo.`;
            return;
          }

          const lineTotal = computeSalesItemSubtotal(item.quantity, item.unitPrice);
          const linePaid = normalizeMoney(Math.min(remainingPaid, lineTotal));
          remainingPaid = normalizeMoney(Math.max(0, remainingPaid - linePaid));

          const payload = buildSalesPayload({
            selectedProduct: currentProduct,
            businessProductId: item.productId,
            quantity: item.quantity,
            valorTotal: lineTotal,
            abono: linePaid,
          });
          payload.estadoPago = derivePaymentStatus(payload.valorTotal, payload.abono);

          const validation = validateMovement(payload, {
            isEditing: false,
          });
          if (!validation.valid) {
            elements.movementFeedback.textContent = validation.message;
            return;
          }

          await apiRequest("/api/movements", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      }

      resetMovementForm();
      clearSalesDraft();
      applySalesOnlyMode();
      syncMovementBusinessProductSelection({
        preserveValue: true,
        preserveCategoryValue: true,
      });
      await loadBootstrap();
      switchView("movimientos");
      setMovementPanel("ventas");
    } catch (error) {
      elements.movementFeedback.textContent = error.message;
    }
  }

  function getFilteredSalesMovements() {
    const line = elements.filterLine.value;
    const status = elements.filterStatus.value;
    const query = normalizeSearchValue(elements.filterQuery.value || "");
    const recordsQuery = normalizeSearchValue(
      elements.movementRecordsQuery?.value || ""
    );

    return state.movements.filter((item) => {
      if (item.tipo !== "Ingreso") {
        return false;
      }

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
      const queryMatches = !query || searchText.includes(query);
      const recordsQueryMatches = !recordsQuery || searchText.includes(recordsQuery);
      return lineMatches && statusMatches && queryMatches && recordsQueryMatches;
    });
  }

  function fillPurchaseInventoryOptions(selectedValue = "") {
    const products = (state.inventoryProducts || []).filter(
      (item) => item.isActive && isInventoryProductStockTracked(item)
    );
    fillSelectFromRecords(purchaseElements.inventoryProductId, products, {
      selectedValue: String(
        selectedValue || purchaseElements.inventoryProductId.value || ""
      ),
      placeholder: "Selecciona producto de inventario",
      labelBuilder: (item) =>
        `${item.name} - ${item.area} - Stock ${formatInventoryQuantity(
          item.currentStock,
          item.unitName
        )}`,
    });
  }

  function fillPurchaseCategoryOptions(selectedValue = "") {
    if (!purchaseElements.categoria) {
      return;
    }

    const line = purchaseElements.linea?.value || "Gimnasio";
    fillSelect(purchaseElements.categoria, getActiveCategoryValuesForLine(line), {
      includeValue: selectedValue || purchaseElements.categoria.value || "",
    });
  }

  function fillPurchasePaymentMethods(selectedValue = "") {
    fillSelect(purchaseElements.medioPago, state.lists.mediosPago, {
      includeValue: selectedValue || purchaseElements.medioPago.value || "",
    });
  }

  function syncPurchaseTotalFromCost() {
    if (!isPurchaseKindCost()) {
      return;
    }

    const quantity = Number(purchaseElements.inventoryQuantity.value || 0);
    const unitCost = Number(purchaseElements.unitCost.value || 0);
    const total = Number((quantity * unitCost).toFixed(2));
    purchaseElements.total.value = total > 0 ? String(total) : "";
  }

  function syncPurchaseKindUi() {
    const isCost = isPurchaseKindCost();

    setNodeVisibility(purchaseElements.inventoryProductShell, isCost);
    setNodeVisibility(purchaseElements.inventoryQuantityShell, isCost);
    setNodeVisibility(purchaseElements.unitCostShell, isCost);
    setNodeVisibility(purchaseElements.categoriaShell, !isCost);

    purchaseElements.inventoryProductId.required = isCost;
    purchaseElements.inventoryQuantity.required = isCost;
    purchaseElements.unitCost.required = isCost;
    purchaseElements.categoria.required = !isCost;
    purchaseElements.total.readOnly = isCost;
    purchaseElements.total.required = !isCost;

    if (isCost) {
      syncPurchaseTotalFromCost();
    } else {
      purchaseElements.inventoryProductId.value = "";
      purchaseElements.inventoryQuantity.value = "";
      purchaseElements.unitCost.value = "";
    }
  }

  function resetPurchaseForm() {
    if (!purchaseElements.form) {
      return;
    }

    purchaseElements.form.reset();
    purchaseElements.movementId.value = "";
    purchaseElements.fecha.value = getCurrentIsoDate();
    purchaseElements.linea.value = "Gimnasio";
    purchaseElements.kind.value = "Costo";
    fillPurchaseCategoryOptions("");
    fillPurchaseInventoryOptions("");
    fillPurchasePaymentMethods("");
    purchaseElements.feedback.textContent =
      "Registra aquí costos y gastos. Si es compra de inventario, además actualiza stock.";
    syncPurchaseKindUi();
  }

  function getPurchaseFilteredMovements() {
    const line = purchaseElements.filterLine?.value || "Todas";
    const kind = purchaseElements.filterKind?.value || "Todos";
    const query = normalizeSearchValue(purchaseElements.filterQuery?.value || "");

    return state.movements.filter((item) => {
      if (!["Costo", "Gasto"].includes(item.tipo)) {
        return false;
      }

      if (line !== "Todas" && item.linea !== line) {
        return false;
      }

      if (kind !== "Todos" && item.tipo !== kind) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchText = normalizeSearchValue(
        [
          item.fecha,
          item.linea,
          item.tipo,
          item.categoria,
          item.cliente,
          item.descripcion,
          item.medioPago,
          item.observaciones,
          item.valorTotal,
          item.abono,
        ].join(" ")
      );
      return searchText.includes(query);
    });
  }

  function renderPurchaseMetrics(items) {
    if (!purchaseElements.metrics) {
      return;
    }

    const totals = items.reduce(
      (acc, item) => {
        acc.total += Number(item.valorTotal || 0);
        acc.paid += Number(item.abono || 0);
        acc.pending += Number(item.saldoPendiente || 0);
        return acc;
      },
      { total: 0, paid: 0, pending: 0 }
    );
    const costsCount = items.filter((item) => item.tipo === "Costo").length;
    const expensesCount = items.filter((item) => item.tipo === "Gasto").length;

    purchaseElements.metrics.innerHTML = `
      <div class="mini-stat"><span>Registros</span><strong>${items.length}</strong></div>
      <div class="mini-stat"><span>Costos</span><strong>${costsCount}</strong></div>
      <div class="mini-stat"><span>Gastos</span><strong>${expensesCount}</strong></div>
      <div class="mini-stat"><span>Total egresos</span><strong>${formatCurrency(totals.total)}</strong></div>
      <div class="mini-stat"><span>Total pagado</span><strong>${formatCurrency(totals.paid)}</strong></div>
      <div class="mini-stat"><span>Saldo pendiente</span><strong>${formatCurrency(totals.pending)}</strong></div>
    `;
  }

  function renderPurchaseTable(items) {
    if (!purchaseElements.table) {
      return;
    }

    if (!items.length) {
      purchaseElements.table.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            No hay compras o gastos para los filtros seleccionados.
          </td>
        </tr>
      `;
      applyStackTableLabels(elements.appShell);
      return;
    }

    const ordered = getSortedMovements(items);
    purchaseElements.table.innerHTML = ordered
      .map((item) => {
        const summary = [
          item.categoria || "Sin categoría",
          item.cliente || "",
          item.descripcion || "",
        ]
          .filter(Boolean)
          .join(" · ");

        return `
          <tr>
            <td>${escapeHtml(formatDate(item.fecha))}</td>
            <td>${escapeHtml(item.tipo)}</td>
            <td>${escapeHtml(summary || "Sin detalle")}</td>
            <td>${escapeHtml(item.medioPago || "Sin caja")}</td>
            <td>${formatCurrency(item.valorTotal)}</td>
            <td>${formatCurrency(item.abono)}</td>
            <td>${formatCurrency(item.saldoPendiente)}</td>
          </tr>
        `;
      })
      .join("");

    applyStackTableLabels(elements.appShell);
  }

  function renderPurchasesModule() {
    if (!purchaseElements.form) {
      return;
    }

    fillPurchaseCategoryOptions();
    fillPurchaseInventoryOptions();
    fillPurchasePaymentMethods();
    syncPurchaseKindUi();

    const filtered = getPurchaseFilteredMovements();
    renderPurchaseMetrics(filtered);
    renderPurchaseTable(filtered);
  }

  function buildPurchasePayload() {
    const isCost = isPurchaseKindCost();
    const total = Number(purchaseElements.total.value || 0);
    const paid = Number(purchaseElements.paid.value || 0);
    const inventoryProductId = Number(purchaseElements.inventoryProductId.value || 0);
    const inventoryQuantity = Number(
      purchaseElements.inventoryQuantity.value || 0
    );
    const selectedInventoryProduct = getInventoryProductById(inventoryProductId);
    const beneficiary = String(purchaseElements.beneficiary.value || "").trim();
    const description = String(purchaseElements.description.value || "").trim();

    let category = String(purchaseElements.categoria.value || "").trim();
    if (isCost) {
      category =
        String(selectedInventoryProduct?.category || "").trim() ||
        "Compras inventario";
    }

    return {
      linea: purchaseElements.linea.value,
      fecha: purchaseElements.fecha.value,
      tipo: isCost ? "Costo" : "Gasto",
      categoria: category,
      businessProductId: 0,
      cliente: beneficiary,
      descripcion:
        description ||
        (isCost && selectedInventoryProduct
          ? `Compra de ${selectedInventoryProduct.name}`
          : "Gasto operativo"),
      medioPago: purchaseElements.medioPago.value,
      valorTotal: total,
      abono: paid,
      inventoryProductId: isCost ? inventoryProductId : 0,
      inventoryQuantity: isCost ? inventoryQuantity : 0,
      inventoryEffect: isCost ? "entrada" : "ninguno",
      observaciones: purchaseElements.notes.value.trim(),
      justificacionEdicion: "",
    };
  }

  async function handlePurchaseSubmit(event) {
    event.preventDefault();

    const isCost = isPurchaseKindCost();
    const payload = buildPurchasePayload();

    if (isCost) {
      if (!(payload.inventoryProductId > 0)) {
        purchaseElements.feedback.textContent =
          "Selecciona el producto o insumo comprado para actualizar inventario.";
        purchaseElements.inventoryProductId.focus();
        return;
      }

      if (!(payload.inventoryQuantity > 0)) {
        purchaseElements.feedback.textContent =
          "La cantidad comprada debe ser mayor que cero.";
        purchaseElements.inventoryQuantity.focus();
        return;
      }

      if (!(Number(purchaseElements.unitCost.value || 0) > 0)) {
        purchaseElements.feedback.textContent =
          "El costo unitario debe ser mayor que cero.";
        purchaseElements.unitCost.focus();
        return;
      }
    } else if (!payload.categoria) {
      purchaseElements.feedback.textContent =
        "Selecciona la categoría del gasto operativo.";
      purchaseElements.categoria.focus();
      return;
    }

    payload.estadoPago = derivePaymentStatus(payload.valorTotal, payload.abono);

    const validation = validateMovement(payload, {
      isEditing: Boolean(purchaseElements.movementId.value),
    });
    if (!validation.valid) {
      purchaseElements.feedback.textContent = validation.message;
      return;
    }

    try {
      if (purchaseElements.movementId.value) {
        await apiRequest(`/api/movements/${purchaseElements.movementId.value}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/movements", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetPurchaseForm();
      await loadBootstrap();
      switchView("movimientos");
      setMovementPanel("compras");
      purchaseElements.feedback.textContent =
        "Compra o gasto registrado correctamente.";
    } catch (error) {
      purchaseElements.feedback.textContent = error.message;
    }
  }

  function bindMovementPanelEvents() {
    movementPanelButtons.forEach((button) => {
      button.addEventListener("click", () =>
        setMovementPanel(button.dataset.movementPanel || "ventas")
      );
    });
  }

  function bindPurchaseEvents() {
    if (!purchaseElements.form) {
      return;
    }

    purchaseElements.form.addEventListener("submit", handlePurchaseSubmit);
    purchaseElements.linea.addEventListener("change", () => {
      fillPurchaseCategoryOptions("");
      renderPurchasesModule();
    });
    purchaseElements.kind.addEventListener("change", () => {
      syncPurchaseKindUi();
      renderPurchasesModule();
    });
    purchaseElements.inventoryQuantity.addEventListener(
      "input",
      syncPurchaseTotalFromCost
    );
    purchaseElements.unitCost.addEventListener("input", syncPurchaseTotalFromCost);
    [purchaseElements.filterLine, purchaseElements.filterKind, purchaseElements.filterQuery]
      .forEach((node) =>
        node?.addEventListener("input", renderPurchasesModule)
      );
  }

  function bindSalesDraftEvents() {
    salesElements.addItemButton?.addEventListener("click", addSalesDraftItem);
    salesElements.quantity?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      addSalesDraftItem();
    });

    salesElements.itemsList?.addEventListener("click", handleSalesDraftListClick);
    salesElements.itemsList?.addEventListener("change", handleSalesDraftListInput);

    elements.linea?.addEventListener("change", () => {
      if (elements.movementId.value || !salesDraftItems.length) {
        return;
      }

      clearSalesDraft();
      elements.movementFeedback.textContent =
        "Cambiaste la línea de negocio, por eso limpiamos el detalle de venta para evitar cruces entre líneas.";
    });
  }

  function bindSalesSubmitOverride() {
    if (!elements.movementForm) {
      return;
    }

    elements.movementForm.addEventListener("submit", handleSalesSubmitOverride, true);
  }

  function bindCancelEditOverride() {
    if (!elements.cancelEdit) {
      return;
    }

    elements.cancelEdit.addEventListener("click", () => {
      window.requestAnimationFrame(() => {
        clearSalesDraft();
        applySalesOnlyMode();
        syncMovementBusinessProductSelection({
          preserveValue: true,
          preserveCategoryValue: true,
        });
      });
    });
  }

  function bindQuickMovementOverride() {
    if (!elements.quickMovement) {
      return;
    }

    elements.quickMovement.textContent = "Nueva venta";
    elements.quickMovement.addEventListener(
      "click",
      () => {
        window.requestAnimationFrame(() => {
          setMovementPanel("ventas");
        });
      },
      true
    );
  }

  const originalSwitchView = switchView;
  window.switchView = function switchViewOverride(view, options = {}) {
    originalSwitchView(view, options);

    if (view === "movimientos") {
      applySalesOnlyMode();
      if (activeMovementPanel === "compras") {
        renderPurchasesModule();
      } else {
        syncSalesDraftEditState();
        if (!elements.movementId.value) {
          syncSalesTotalField();
        }
      }
    }
  };

  window.getFilteredMovements = getFilteredSalesMovements;

  bindMovementPanelEvents();
  bindSalesDraftEvents();
  bindSalesSubmitOverride();
  bindCancelEditOverride();
  bindQuickMovementOverride();
  bindPurchaseEvents();

  resetPurchaseForm();
  applySalesOnlyMode();
  syncMovementBusinessProductSelection({
    preserveValue: true,
    preserveCategoryValue: true,
  });
  renderSalesDraftItems();
  syncSalesTotalField();
  setMovementPanel("ventas");
})();
