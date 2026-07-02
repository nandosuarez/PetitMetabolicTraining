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
    editJustificationShell: document.getElementById(
      "purchase-edit-justification-shell"
    ),
    editJustification: document.getElementById("purchase-edit-justification"),
    feedback: document.getElementById("purchase-feedback"),
    addItemButton: document.getElementById("purchase-add-item"),
    itemsList: document.getElementById("purchase-items-list"),
    itemsSummary: document.getElementById("purchase-items-summary"),
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
  const comboElements = {
    form: document.getElementById("sales-combo-form"),
    id: document.getElementById("sales-combo-id"),
    name: document.getElementById("sales-combo-name"),
    businessLine: document.getElementById("sales-combo-line"),
    maxUnits: document.getElementById("sales-combo-max-units"),
    maxUnitsLabel: document.getElementById("sales-combo-max-units-label"),
    triggerProductId: document.getElementById("sales-combo-trigger-product"),
    targetProductId: document.getElementById("sales-combo-target-product"),
    targetUnitPrice: document.getElementById("sales-combo-target-price"),
    targetUnitPriceLabel: document.getElementById(
      "sales-combo-target-price-label"
    ),
    targetUnitPriceHint: document.getElementById("sales-combo-price-hint"),
    notes: document.getElementById("sales-combo-notes"),
    feedback: document.getElementById("sales-combo-feedback"),
    cancelEdit: document.getElementById("sales-combo-cancel-edit"),
    query: document.getElementById("sales-combo-query"),
    metrics: document.getElementById("sales-combos-metrics"),
    table: document.getElementById("sales-combos-table"),
  };

  let salesDraftItems = [];
  let lastAutoSalesDescription = "";
  let salesDraftEditingMovementId = "";
  let purchaseDraftItems = [];

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

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function parseSalesEditQuantity(movement, selectedProduct) {
    const fallbackQuantity = 1;
    const productName = String(selectedProduct?.name || "").trim();
    const description = String(movement?.descripcion || "").trim();

    if (productName && description) {
      const byNameRegex = new RegExp(
        `${escapeRegExp(productName)}\\s*x\\s*(\\d+)`,
        "i"
      );
      const byNameMatch = description.match(byNameRegex);
      if (byNameMatch?.[1]) {
        const parsed = normalizeSalesQuantity(byNameMatch[1]);
        if (parsed > 0) {
          return parsed;
        }
      }

      const genericMatch = description.match(/\bx\s*(\d+)\b/i);
      if (genericMatch?.[1]) {
        const parsed = normalizeSalesQuantity(genericMatch[1]);
        if (parsed > 0) {
          return parsed;
        }
      }
    }

    return fallbackQuantity;
  }

  function buildSalesEditDraftItem(movement) {
    if (!movement || movement.tipo !== "Ingreso") {
      return null;
    }

    const selectedProduct = getBusinessProductById(
      String(movement.businessProductId || elements.movementBusinessProductId?.value || "")
    );

    if (!selectedProduct) {
      return null;
    }

    const quantity = parseSalesEditQuantity(movement, selectedProduct);
    const totalAmount = normalizeMoney(movement.valorTotal || 0);
    const baseUnitPrice =
      quantity > 0
        ? normalizeMoney(totalAmount / quantity)
        : normalizeMoney(selectedProduct.defaultAmount || 0);

    return {
      id: `edit-${movement.id}`,
      productId: Number(selectedProduct.id),
      name: selectedProduct.name,
      categoryLabel:
        selectedProduct.category || getBusinessProductCategoryLabel(selectedProduct),
      baseUnitPrice: baseUnitPrice > 0 ? baseUnitPrice : normalizeMoney(selectedProduct.defaultAmount || 0),
      quantity: quantity > 0 ? quantity : 1,
    };
  }

  function normalizeSalesComboRuleRecord(item) {
    const triggerBusinessProductId = Number(item?.triggerBusinessProductId || 0);
    const targetBusinessProductId = Number(item?.targetBusinessProductId || 0);
    const maxTargetUnitsPerTrigger = Number(item?.maxTargetUnitsPerTrigger || 0);

    return {
      id: Number(item?.id || 0),
      name: String(item?.name || "").trim(),
      businessLine: String(item?.businessLine || "").trim(),
      triggerBusinessProductId: Number.isInteger(triggerBusinessProductId)
        ? triggerBusinessProductId
        : 0,
      targetBusinessProductId: Number.isInteger(targetBusinessProductId)
        ? targetBusinessProductId
        : 0,
      isSameProductBundle:
        triggerBusinessProductId > 0 &&
        triggerBusinessProductId === targetBusinessProductId,
      targetUnitPrice: normalizeMoney(item?.targetUnitPrice || 0),
      maxTargetUnitsPerTrigger: Number.isInteger(maxTargetUnitsPerTrigger)
        ? maxTargetUnitsPerTrigger
        : 0,
      notes: String(item?.notes || "").trim(),
      isActive: item?.isActive !== false,
      triggerBusinessProductName: String(item?.triggerBusinessProductName || "").trim(),
      targetBusinessProductName: String(item?.targetBusinessProductName || "").trim(),
    };
  }

  function getSalesComboRulesForCurrentState() {
    if (!Array.isArray(state?.salesComboRules)) {
      return [];
    }

    return state.salesComboRules
      .map(normalizeSalesComboRuleRecord)
      .filter(
        (item) =>
          item.id > 0 &&
          item.name &&
          item.businessLine &&
          item.triggerBusinessProductId > 0 &&
          item.targetBusinessProductId > 0 &&
          item.targetUnitPrice > 0 &&
          item.maxTargetUnitsPerTrigger > 0
      );
  }

  function getActiveSalesComboRules() {
    return getSalesComboRulesForCurrentState().filter((item) => item.isActive);
  }

  function getSalesDraftPricing(items = salesDraftItems) {
    const currentLine = String(elements.linea?.value || "Gimnasio");
    const pricedItems = (items || []).map((item) => {
      const quantity = normalizeSalesQuantity(item.quantity);
      const baseUnitPrice = normalizeMoney(item.baseUnitPrice ?? item.unitPrice ?? 0);
      const appliedTotal = computeSalesItemSubtotal(quantity, baseUnitPrice);

      return {
        ...item,
        quantity,
        baseUnitPrice,
        appliedUnitPrice: baseUnitPrice,
        appliedTotal,
        promoUnits: 0,
        promoUnitPrice: 0,
        promoName: "",
        promoBundleCount: 0,
        promoBundleQuantity: 0,
        promoBundleTotal: 0,
        discountAmount: 0,
      };
    });

    const activeRules = getActiveSalesComboRules();
    activeRules.forEach((rule) => {
      if (rule.businessLine && rule.businessLine !== currentLine) {
        return;
      }

      if (rule.isSameProductBundle) {
        const bundleQuantity = normalizeSalesQuantity(
          rule.maxTargetUnitsPerTrigger
        );
        const bundleTotal = normalizeMoney(rule.targetUnitPrice || 0);

        if (!(bundleQuantity > 1) || !(bundleTotal > 0)) {
          return;
        }

        pricedItems.forEach((item) => {
          if (
            Number(item.productId || 0) !==
            Number(rule.triggerBusinessProductId || 0)
          ) {
            return;
          }

          const bundleCount = Math.floor(item.quantity / bundleQuantity);
          if (!(bundleCount > 0)) {
            return;
          }

          const bundledUnits = bundleCount * bundleQuantity;
          const regularUnits = item.quantity - bundledUnits;
          const regularBundleValue = computeSalesItemSubtotal(
            bundledUnits,
            item.baseUnitPrice
          );
          const promotionalBundleValue = normalizeMoney(
            bundleCount * bundleTotal
          );

          if (!(regularBundleValue > promotionalBundleValue)) {
            return;
          }

          item.promoUnits = bundledUnits;
          item.promoUnitPrice = normalizeMoney(
            bundleTotal / bundleQuantity
          );
          item.promoName = rule.name;
          item.promoBundleCount = bundleCount;
          item.promoBundleQuantity = bundleQuantity;
          item.promoBundleTotal = bundleTotal;
          item.discountAmount = normalizeMoney(
            regularBundleValue - promotionalBundleValue
          );
          item.appliedTotal = normalizeMoney(
            promotionalBundleValue +
              computeSalesItemSubtotal(regularUnits, item.baseUnitPrice)
          );
          item.appliedUnitPrice = normalizeMoney(
            item.appliedTotal / item.quantity
          );
        });
        return;
      }

      const triggerUnits = pricedItems
        .filter(
          (item) =>
            Number(item.productId || 0) === Number(rule.triggerBusinessProductId || 0)
        )
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      let remainingPromoUnits = normalizeSalesQuantity(
        triggerUnits * Number(rule.maxTargetUnitsPerTrigger || 0)
      );

      if (!(remainingPromoUnits > 0)) {
        return;
      }

      const promoUnitPrice = normalizeMoney(rule.targetUnitPrice || 0);
      if (!(promoUnitPrice > 0)) {
        return;
      }

      pricedItems.forEach((item) => {
        if (!(remainingPromoUnits > 0)) {
          return;
        }

        if (
          Number(item.productId || 0) !== Number(rule.targetBusinessProductId || 0)
        ) {
          return;
        }

        if (!(item.baseUnitPrice > promoUnitPrice)) {
          return;
        }

        const promoUnits = Math.min(item.quantity, remainingPromoUnits);
        if (!(promoUnits > 0)) {
          return;
        }

        const regularUnits = Math.max(0, item.quantity - promoUnits);
        const regularTotal = computeSalesItemSubtotal(regularUnits, item.baseUnitPrice);
        const promoTotal = computeSalesItemSubtotal(promoUnits, promoUnitPrice);
        const lineTotal = normalizeMoney(regularTotal + promoTotal);

        item.promoUnits = promoUnits;
        item.promoUnitPrice = promoUnitPrice;
        item.promoName = rule.name;
        item.discountAmount = normalizeMoney(
          (item.baseUnitPrice - promoUnitPrice) * promoUnits
        );
        item.appliedTotal = lineTotal;
        item.appliedUnitPrice =
          item.quantity > 0
            ? normalizeMoney(lineTotal / item.quantity)
            : item.baseUnitPrice;

        remainingPromoUnits = Math.max(0, remainingPromoUnits - promoUnits);
      });
    });

    const total = normalizeMoney(
      pricedItems.reduce((acc, item) => acc + Number(item.appliedTotal || 0), 0)
    );
    const discount = normalizeMoney(
      pricedItems.reduce((acc, item) => acc + Number(item.discountAmount || 0), 0)
    );

    return { items: pricedItems, total, discount };
  }

  function getSalesDraftTotal() {
    return getSalesDraftPricing().total;
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

    const pricing = getSalesDraftPricing();
    const total = pricing.total;
    const units = getSalesDraftUnits();
    const discountCopy =
      pricing.discount > 0
        ? ` Descuento combos ${formatCurrency(pricing.discount)}.`
        : "";
    salesElements.itemsSummary.textContent = `${salesDraftItems.length} item(s), ${units} unidad(es). Total ${formatCurrency(total)}.${discountCopy}`;
  }

  function clearSalesDraft(options = {}) {
    salesDraftItems = [];
    lastAutoSalesDescription = "";
    salesDraftEditingMovementId = "";
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

    const pricing = getSalesDraftPricing();
    salesElements.itemsList.innerHTML = pricing.items
      .map((item) => {
        const subtotal = normalizeMoney(item.appliedTotal || 0);
        const baseUnitPrice = normalizeMoney(item.baseUnitPrice || 0);
        const unitPriceCopy =
          item.promoUnits > 0
            ? `${formatCurrency(item.appliedUnitPrice)} promedio`
            : `${formatCurrency(baseUnitPrice)} c/u`;
        const promoCopy =
          item.promoUnits > 0
            ? item.promoBundleCount > 0
              ? `<small class="inline-hint">${escapeHtml(
                  item.promoName || "Promoción"
                )}: ${escapeHtml(
                  String(item.promoBundleCount)
                )} paquete(s) de ${escapeHtml(
                  String(item.promoBundleQuantity)
                )} por ${escapeHtml(
                  formatCurrency(item.promoBundleTotal)
                )}. Ahorro ${escapeHtml(
                  formatCurrency(item.discountAmount)
                )}.</small>`
              : `<small class="inline-hint">${escapeHtml(
                  item.promoName || "Promoción"
                )}: ${escapeHtml(
                  String(item.promoUnits)
                )} unidad(es) a ${escapeHtml(
                  formatCurrency(item.promoUnitPrice)
                )}. Ahorro ${escapeHtml(formatCurrency(item.discountAmount))}.</small>`
            : "";
        return `
          <article class="list-item sales-item-row" data-sales-item-id="${escapeHtml(
            item.id
          )}">
            <div class="sales-item-main">
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(item.categoryLabel)} · ${escapeHtml(
                unitPriceCopy
              )}</small>
              ${promoCopy}
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
    const movementId = String(elements.movementId?.value || "");
    if (elements.valorTotal) {
      elements.valorTotal.readOnly = !isEditing;
    }
    if (salesElements.quantity) {
      salesElements.quantity.disabled = true;
    }
    if (salesElements.addItemButton) {
      salesElements.addItemButton.disabled = isEditing;
    }

    if (isEditing) {
      if (movementId && movementId !== salesDraftEditingMovementId) {
        const currentMovement = state.movements.find(
          (item) => String(item.id) === movementId
        );
        const editDraftItem = buildSalesEditDraftItem(currentMovement);
        salesDraftItems = editDraftItem ? [editDraftItem] : [];
        salesDraftEditingMovementId = movementId;
      }

      if (!salesDraftItems.length) {
        updateSalesDraftSummary(
          "No se pudo reconstruir el detalle de la venta para esta edicion."
        );
        if (salesElements.itemsList) {
          salesElements.itemsList.innerHTML = `
            <article class="list-item">
              <small>Este movimiento no tiene un producto valido para editar en el detalle.</small>
            </article>
          `;
        }
        return;
      }

      const currentDraftItem = salesDraftItems[0];
      if (
        currentDraftItem &&
        Number(currentDraftItem.productId || 0) > 0 &&
        elements.movementBusinessProductId
      ) {
        elements.movementBusinessProductId.value = String(currentDraftItem.productId);
      }

      renderSalesDraftItems();
      updateSalesDraftSummary(
        "Editando movimiento: ajusta cantidad, total o abono antes de guardar."
      );
      return;
    }

    salesDraftEditingMovementId = "";
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

  function syncAutoSalesDescriptionFromDraft() {
    if (elements.movementId?.value || !elements.descripcion) {
      return;
    }

    if (!shouldReplaceAutoSalesDescription(elements.descripcion.value)) {
      return;
    }

    if (!salesDraftItems.length) {
      elements.descripcion.value = "";
      lastAutoSalesDescription = "";
      return;
    }

    if (salesDraftItems.length > 1) {
      elements.descripcion.value = "Venta múltiple";
      lastAutoSalesDescription = "Venta múltiple";
      return;
    }

    const singleName = String(salesDraftItems[0]?.name || "").trim();
    elements.descripcion.value = singleName;
    lastAutoSalesDescription = singleName;
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

    const rawQuantity = String(salesElements.quantity?.value ?? "").trim();
    if (!Number.isInteger(Number(rawQuantity || 0))) {
      elements.movementFeedback.textContent =
        "La cantidad debe ser un número entero (1, 2, 3...).";
      salesElements.quantity?.focus();
      return;
    }

    const quantity = normalizeSalesQuantity(rawQuantity || 0);
    if (!(quantity > 0)) {
      elements.movementFeedback.textContent =
        "La cantidad del producto debe ser mayor que cero.";
      salesElements.quantity?.focus();
      return;
    }

    const existingItem = salesDraftItems.find(
      (item) => Number(item.productId || 0) === Number(selectedProduct.id)
    );
    if (existingItem) {
      existingItem.quantity = normalizeSalesQuantity(existingItem.quantity + quantity);
      existingItem.baseUnitPrice = normalizeMoney(selectedProduct.defaultAmount);
    } else {
      salesDraftItems.push({
        id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
        productId: Number(selectedProduct.id),
        name: selectedProduct.name,
        categoryLabel:
          selectedProduct.category || getBusinessProductCategoryLabel(selectedProduct),
        baseUnitPrice: normalizeMoney(selectedProduct.defaultAmount),
        quantity,
      });
    }

    syncAutoSalesDescriptionFromDraft();

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

    if (elements.movementId?.value) {
      elements.movementFeedback.textContent =
        "En edicion no se puede quitar la linea del producto. Ajusta solo cantidad, total o abono.";
      return;
    }

    const itemId = String(removeButton.dataset.salesItemRemoveId || "");
    if (!itemId) {
      return;
    }

    salesDraftItems = salesDraftItems.filter((item) => String(item.id) !== itemId);
    syncAutoSalesDescriptionFromDraft();
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

    if (!Number.isInteger(Number(rawValue))) {
      elements.movementFeedback.textContent =
        "La cantidad debe ser entera (1, 2, 3...).";
      quantityInput.focus();
      return;
    }

    const quantity = normalizeSalesQuantity(rawValue);
    if (!(quantity > 0)) {
      return;
    }

    item.quantity = quantity;
    syncAutoSalesDescriptionFromDraft();
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

      if (!Number.isInteger(Number(rawValue))) {
        return {
          valid: false,
          message:
            "Las cantidades deben ser enteras (1, 2, 3...). No se permiten decimales.",
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
        const editingDraftValidation = getValidatedSalesDraftItems();
        if (!editingDraftValidation.valid) {
          elements.movementFeedback.textContent = editingDraftValidation.message;
          editingDraftValidation.focusNode?.focus();
          return;
        }

        const editingItem = editingDraftValidation.items?.[0] || null;
        const editingProduct =
          getBusinessProductById(
            String(
              editingItem?.productId ||
                elements.movementBusinessProductId.value ||
                ""
            )
          ) || selectedProduct;

        if (!editingProduct) {
          elements.movementFeedback.textContent =
            "No encontramos el producto de esta venta. Seleccionalo e intenta de nuevo.";
          elements.movementBusinessProductId?.focus();
          return;
        }

        const editingQuantity =
          normalizeSalesQuantity(editingItem?.quantity || 1) || 1;
        const currentDescription = String(elements.descripcion.value || "").trim();
        const autoDescriptionPattern = new RegExp(
          `^${escapeRegExp(String(editingProduct.name || "").trim())}(\\s*x\\s*\\d+)?$`,
          "i"
        );
        const useAutoDescription =
          !currentDescription || autoDescriptionPattern.test(currentDescription);

        const payload = buildSalesPayload({
          selectedProduct: editingProduct,
          businessProductId: editingProduct.id,
          quantity: editingQuantity,
          valorTotal: elements.valorTotal.value,
          abono: elements.abono.value,
          descripcion: useAutoDescription ? "" : currentDescription,
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

        salesDraftItems = draftValidation.items.map((item) => ({
          ...item,
          baseUnitPrice: normalizeMoney(item.baseUnitPrice ?? item.unitPrice ?? 0),
        }));
        const draftPricing = getSalesDraftPricing(salesDraftItems);
        renderSalesDraftItems();
        syncSalesTotalField();
        const totalAmount = normalizeMoney(draftPricing.total);
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

        const sharedDescription = String(elements.descripcion.value || "").trim();
        const hasCustomSharedDescription =
          Boolean(sharedDescription) &&
          !shouldReplaceAutoSalesDescription(sharedDescription);
        const sharedObservations = String(elements.observaciones.value || "").trim();

        let remainingPaid = paidAmount;
        for (const item of draftPricing.items) {
          const currentProduct = getBusinessProductById(item.productId);
          if (!currentProduct) {
            elements.movementFeedback.textContent =
              `No encontramos el producto ${item.name}. Actualiza el detalle de venta e intenta de nuevo.`;
            return;
          }

          const lineTotal = normalizeMoney(item.appliedTotal || 0);
          const linePaid = normalizeMoney(Math.min(remainingPaid, lineTotal));
          remainingPaid = normalizeMoney(Math.max(0, remainingPaid - linePaid));
          const promoDetail =
            item.promoUnits > 0
              ? item.promoBundleCount > 0
                ? `Promo ${item.promoName}: ${item.promoBundleCount} paquete(s) de ${item.promoBundleQuantity} por ${formatCurrency(
                    item.promoBundleTotal
                  )}`
                : `Promo ${item.promoName}: ${item.promoUnits} x ${formatCurrency(
                    item.promoUnitPrice
                  )}`
              : "";
          const autoLineDescription = buildSalesLineDescription(
            currentProduct,
            item.quantity,
            ""
          );
          const lineDescription = hasCustomSharedDescription
            ? `${sharedDescription} · ${autoLineDescription}`
            : [autoLineDescription, promoDetail].filter(Boolean).join(" · ");
          const lineObservations = [sharedObservations, promoDetail]
            .filter(Boolean)
            .join(" | ");

          const payload = buildSalesPayload({
            selectedProduct: currentProduct,
            businessProductId: item.productId,
            quantity: item.quantity,
            valorTotal: lineTotal,
            abono: linePaid,
            descripcion: lineDescription,
            observaciones: lineObservations,
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
    const rawDateFrom = normalizeDateOnly(elements.filterDateFrom?.value);
    const rawDateTo = normalizeDateOnly(elements.filterDateTo?.value);
    const dateFrom = rawDateFrom && rawDateTo && rawDateFrom > rawDateTo
      ? rawDateTo
      : rawDateFrom;
    const dateTo = rawDateFrom && rawDateTo && rawDateFrom > rawDateTo
      ? rawDateFrom
      : rawDateTo;
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
      const movementDate = normalizeDateOnly(item.fecha);
      const dateMatches =
        (!dateFrom || movementDate >= dateFrom) &&
        (!dateTo || movementDate <= dateTo);
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
      return (
        lineMatches &&
        statusMatches &&
        dateMatches &&
        queryMatches &&
        recordsQueryMatches
      );
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
    const resolvedValue = String(
      selectedValue || purchaseElements.categoria.value || ""
    );
    fillSelect(purchaseElements.categoria, getActiveCategoryValuesForLine(line), {
      includeValue: resolvedValue,
    });
    if (
      resolvedValue &&
      [...purchaseElements.categoria.options].some(
        (option) => option.value === resolvedValue
      )
    ) {
      purchaseElements.categoria.value = resolvedValue;
    }
  }

  function fillPurchasePaymentMethods(selectedValue = "") {
    const resolvedValue = String(
      selectedValue || purchaseElements.medioPago?.value || ""
    );
    fillSelect(purchaseElements.medioPago, state.lists.mediosPago, {
      includeValue: resolvedValue,
    });
    if (
      resolvedValue &&
      [...purchaseElements.medioPago.options].some(
        (option) => option.value === resolvedValue
      )
    ) {
      purchaseElements.medioPago.value = resolvedValue;
    }
  }

  function getActivePurchaseProviders() {
    return (state.clients || [])
      .filter((item) => item.isActive && item.isSupplier)
      .sort((a, b) =>
        String(a.fullName || "").localeCompare(String(b.fullName || ""), APP_LOCALE)
      );
  }

  function buildPurchaseProviderLabel(provider) {
    const fullName = String(provider?.fullName || "").trim();
    const alias = String(provider?.alias || "").trim();
    const documentNumber = String(provider?.documentNumber || "").trim();
    const labelParts = [fullName];

    if (alias && normalizeSearchValue(alias) !== normalizeSearchValue(fullName)) {
      labelParts.push(`Alias: ${alias}`);
    }

    if (documentNumber) {
      labelParts.push(`Doc: ${documentNumber}`);
    }

    return labelParts.join(" · ");
  }

  function fillPurchaseBeneficiaryOptions(selectedValue = "") {
    if (!purchaseElements.beneficiary) {
      return;
    }

    const providers = getActivePurchaseProviders();
    const selected = String(
      selectedValue || purchaseElements.beneficiary.value || ""
    ).trim();
    const hasSelectedProvider = providers.some(
      (item) => String(item.fullName || "").trim() === selected
    );
    const includeHistorical = selected && !hasSelectedProvider;
    const placeholderLabel = providers.length
      ? "Selecciona un proveedor"
      : "No hay proveedores activos";
    const options = [
      `<option value="">${escapeHtml(placeholderLabel)}</option>`,
      ...providers.map(
        (provider) =>
          `<option value="${escapeHtml(
            String(provider.fullName || "").trim()
          )}">${escapeHtml(buildPurchaseProviderLabel(provider))}</option>`
      ),
    ];

    if (includeHistorical) {
      options.push(
        `<option value="${escapeHtml(selected)}">${escapeHtml(
          `${selected} (inactivo)`
        )}</option>`
      );
    }

    purchaseElements.beneficiary.innerHTML = options.join("");

    if (
      selected &&
      [...purchaseElements.beneficiary.options].some(
        (option) => option.value === selected
      )
    ) {
      purchaseElements.beneficiary.value = selected;
    } else {
      purchaseElements.beneficiary.value = "";
    }

    purchaseElements.beneficiary.disabled =
      !providers.length && !includeHistorical;
  }

  function syncPurchaseTotalFromCost() {
    if (!purchaseElements.movementId?.value && purchaseDraftItems.length) {
      return;
    }

    if (!isPurchaseKindCost()) {
      return;
    }

    const quantity = Number(purchaseElements.inventoryQuantity.value || 0);
    const unitCost = Number(purchaseElements.unitCost.value || 0);
    if (
      purchaseElements.movementId?.value &&
      !(quantity > 0) &&
      !(unitCost > 0)
    ) {
      return;
    }

    const total = Number((quantity * unitCost).toFixed(2));
    purchaseElements.total.value = total > 0 ? String(total) : "";
  }

  function syncPurchaseDraftTotalField() {
    if (!purchaseElements.total || purchaseElements.movementId?.value) {
      return;
    }

    if (!purchaseDraftItems.length) {
      return;
    }

    const total = getPurchaseDraftTotal();
    purchaseElements.total.value = total > 0 ? String(total) : "";

    const paidAmount = normalizeMoney(purchaseElements.paid?.value || 0);
    if (paidAmount > total && purchaseElements.paid) {
      purchaseElements.paid.value = String(total);
    }
  }

  function syncPurchaseKindUi() {
    const isCost = isPurchaseKindCost();
    const hasDraftItems =
      !purchaseElements.movementId?.value && purchaseDraftItems.length > 0;
    const isEditing = Boolean(purchaseElements.movementId?.value);

    setNodeVisibility(purchaseElements.inventoryProductShell, isCost);
    setNodeVisibility(purchaseElements.inventoryQuantityShell, isCost);
    setNodeVisibility(purchaseElements.unitCostShell, isCost);
    setNodeVisibility(purchaseElements.categoriaShell, !isCost);

    purchaseElements.inventoryProductId.required = isCost && !hasDraftItems;
    purchaseElements.inventoryQuantity.required = isCost && !hasDraftItems;
    purchaseElements.unitCost.required = isCost && !hasDraftItems;
    purchaseElements.categoria.required = !isCost && !hasDraftItems;
    purchaseElements.total.readOnly = isCost || hasDraftItems;
    purchaseElements.total.required = !isCost && !hasDraftItems;
    if (purchaseElements.addItemButton) {
      purchaseElements.addItemButton.disabled = Boolean(
        purchaseElements.movementId?.value
      );
    }
    setNodeVisibility(
      purchaseElements.editJustificationShell,
      isEditing && isAssistantUser()
    );

    if (isCost) {
      syncPurchaseTotalFromCost();
    } else {
      purchaseElements.inventoryProductId.value = "";
      purchaseElements.inventoryQuantity.value = "";
      purchaseElements.unitCost.value = "";
    }
  }

  function normalizePurchaseQuantity(value) {
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return 0;
    }
    return Number(numericValue.toFixed(4));
  }

  function computePurchaseLineTotal(quantity, unitCost) {
    return normalizeMoney(
      normalizePurchaseQuantity(quantity) * normalizeMoney(unitCost)
    );
  }

  function getPurchaseDraftTotal(items = purchaseDraftItems) {
    return normalizeMoney(
      (Array.isArray(items) ? items : []).reduce(
        (sum, item) => sum + Number(item.total || 0),
        0
      )
    );
  }

  function updatePurchaseDraftSummary(message = "") {
    if (!purchaseElements.itemsSummary) {
      return;
    }

    if (message) {
      purchaseElements.itemsSummary.textContent = message;
      return;
    }

    if (!purchaseDraftItems.length) {
      purchaseElements.itemsSummary.textContent =
        "Agrega uno o más items para registrar la compra o gasto.";
      return;
    }

    const total = getPurchaseDraftTotal();
    const costItems = purchaseDraftItems.filter(
      (item) => item.kind === "Costo"
    ).length;
    const expenseItems = purchaseDraftItems.filter(
      (item) => item.kind === "Gasto"
    ).length;

    purchaseElements.itemsSummary.textContent = `${purchaseDraftItems.length} item(s) - Costos ${costItems}, Gastos ${expenseItems}. Total ${formatCurrency(total)}.`;
  }

  function clearPurchaseLineFields() {
    purchaseElements.description.value = "";
    purchaseElements.total.value = "";

    if (isPurchaseKindCost()) {
      purchaseElements.inventoryProductId.value = "";
      purchaseElements.inventoryQuantity.value = "";
      purchaseElements.unitCost.value = "";
    } else {
      purchaseElements.categoria.value = "";
    }
  }

  function clearPurchaseDraft() {
    purchaseDraftItems = [];
    syncPurchaseKindUi();
    renderPurchaseDraftItems();
  }

  function buildPurchaseDraftItemFromForm() {
    const isCost = isPurchaseKindCost();
    const beneficiary = String(purchaseElements.beneficiary.value || "").trim();
    const description = String(purchaseElements.description.value || "").trim();
    const line = String(purchaseElements.linea.value || "Gimnasio");

    if (purchaseElements.beneficiary.disabled) {
      return {
        valid: false,
        message:
          "No hay proveedores activos. Crea o activa uno en Clientes antes de registrar este movimiento.",
      };
    }

    if (!beneficiary) {
      return {
        valid: false,
        message: "Selecciona un proveedor de la lista antes de agregar el item.",
        focusNode: purchaseElements.beneficiary,
      };
    }

    if (isCost) {
      const inventoryProductId = Number(purchaseElements.inventoryProductId.value || 0);
      const inventoryProduct = getInventoryProductById(inventoryProductId);
      if (!inventoryProduct) {
        return {
          valid: false,
          message:
            "Selecciona el producto o insumo comprado para actualizar inventario.",
          focusNode: purchaseElements.inventoryProductId,
        };
      }

      const quantity = normalizePurchaseQuantity(
        purchaseElements.inventoryQuantity.value
      );
      if (!(quantity > 0)) {
        return {
          valid: false,
          message: "La cantidad comprada debe ser mayor que cero.",
          focusNode: purchaseElements.inventoryQuantity,
        };
      }

      const unitCost = normalizeMoney(purchaseElements.unitCost.value);
      if (!(unitCost > 0)) {
        return {
          valid: false,
          message: "El costo unitario debe ser mayor que cero.",
          focusNode: purchaseElements.unitCost,
        };
      }

      const total = computePurchaseLineTotal(quantity, unitCost);
      if (!(total > 0)) {
        return {
          valid: false,
          message: "No se pudo calcular el valor total del item.",
          focusNode: purchaseElements.total,
        };
      }

      return {
        valid: true,
        item: {
          id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
          kind: "Costo",
          line,
          category:
            String(inventoryProduct.category || "").trim() || "Compras inventario",
          beneficiary,
          description: description || `Compra de ${inventoryProduct.name}`,
          inventoryProductId: Number(inventoryProduct.id || 0),
          inventoryProductName: String(inventoryProduct.name || "Insumo"),
          inventoryProductUnit: String(inventoryProduct.unitName || "Unidad"),
          quantity,
          unitCost,
          total,
        },
      };
    }

    const category = String(purchaseElements.categoria.value || "").trim();
    if (!category) {
      return {
        valid: false,
        message: "Selecciona la categoría del gasto operativo.",
        focusNode: purchaseElements.categoria,
      };
    }

    const total = normalizeMoney(purchaseElements.total.value);
    if (!(total > 0)) {
      return {
        valid: false,
        message: "El valor total del gasto debe ser mayor que cero.",
        focusNode: purchaseElements.total,
      };
    }

    return {
      valid: true,
      item: {
        id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
        kind: "Gasto",
        line,
        category,
        beneficiary,
        description: description || category || "Gasto operativo",
        inventoryProductId: 0,
        inventoryProductName: "",
        inventoryProductUnit: "",
        quantity: 1,
        unitCost: total,
        total,
      },
    };
  }

  function renderPurchaseDraftItems() {
    if (!purchaseElements.itemsList) {
      return;
    }

    if (!purchaseDraftItems.length) {
      purchaseElements.itemsList.innerHTML = `
        <article class="list-item">
          <small>No hay items agregados en esta compra o gasto.</small>
        </article>
      `;
      updatePurchaseDraftSummary();
      if (!purchaseElements.movementId?.value && !isPurchaseKindCost()) {
        purchaseElements.total.value = "";
      }
      return;
    }

    purchaseElements.itemsList.innerHTML = purchaseDraftItems
      .map((item) => {
        const quantityCopy =
          item.kind === "Costo"
            ? formatInventoryQuantity(item.quantity, item.inventoryProductUnit)
            : "1";
        const headerTitle =
          item.kind === "Costo"
            ? item.inventoryProductName || "Insumo"
            : item.category || "Gasto";
        const detailCopy =
          item.kind === "Costo"
            ? `${item.kind} · ${quantityCopy} · ${formatCurrency(item.unitCost)} c/u`
            : `${item.kind} · ${item.category || "Sin categoría"}`;

        return `
          <article class="list-item sales-item-row">
            <div class="sales-item-main">
              <strong>${escapeHtml(headerTitle)}</strong>
              <small>${escapeHtml(detailCopy)}</small>
              <small>${escapeHtml(item.description || "Sin descripción")}</small>
            </div>
            <div class="sales-item-controls">
              <strong>${formatCurrency(item.total)}</strong>
              <button
                type="button"
                class="table-button icon-button danger"
                data-purchase-item-remove-id="${escapeHtml(String(item.id || ""))}"
                aria-label="Quitar item de la compra"
                title="Quitar item"
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

    syncPurchaseDraftTotalField();
    updatePurchaseDraftSummary();
  }

  function addPurchaseDraftItem() {
    if (purchaseElements.movementId.value) {
      purchaseElements.feedback.textContent =
        "En edición se actualiza un solo movimiento. Para múltiples items crea un registro nuevo.";
      return;
    }

    const result = buildPurchaseDraftItemFromForm();
    if (!result.valid || !result.item) {
      purchaseElements.feedback.textContent =
        result.message || "No se pudo agregar el item.";
      result.focusNode?.focus();
      return;
    }

    if (purchaseDraftItems.length) {
      const firstItem = purchaseDraftItems[0];
      const sameKind = String(firstItem.kind || "") === String(result.item.kind || "");
      const sameLine = String(firstItem.line || "") === String(result.item.line || "");
      const sameBeneficiary =
        String(firstItem.beneficiary || "") ===
        String(result.item.beneficiary || "");

      if (!sameKind) {
        purchaseElements.feedback.textContent =
          "No puedes mezclar costos y gastos en el mismo registro. Guarda este detalle y luego crea otro.";
        return;
      }

      if (!sameLine) {
        purchaseElements.feedback.textContent =
          "No puedes mezclar líneas de negocio en el mismo registro.";
        return;
      }

      if (!sameBeneficiary) {
        purchaseElements.feedback.textContent =
          "No puedes mezclar proveedores en el mismo registro.";
        return;
      }
    }

    purchaseDraftItems.push(result.item);
    clearPurchaseLineFields();
    syncPurchaseKindUi();
    renderPurchaseDraftItems();
    purchaseElements.feedback.textContent = "Item agregado correctamente.";
  }

  function handlePurchaseDraftListClick(event) {
    const removeButton = event.target.closest("[data-purchase-item-remove-id]");
    if (!removeButton) {
      return;
    }

    const itemId = String(removeButton.dataset.purchaseItemRemoveId || "").trim();
    if (!itemId) {
      return;
    }

    purchaseDraftItems = purchaseDraftItems.filter(
      (item) => String(item.id || "") !== itemId
    );
    syncPurchaseKindUi();
    renderPurchaseDraftItems();
    purchaseElements.feedback.textContent = "Item retirado del detalle.";
  }

  function resetPurchaseForm() {
    if (!purchaseElements.form) {
      return;
    }

    purchaseElements.form.reset();
    purchaseElements.movementId.value = "";
    if (purchaseElements.editJustification) {
      purchaseElements.editJustification.value = "";
    }
    setNodeVisibility(purchaseElements.editJustificationShell, false);
    purchaseElements.fecha.value = getCurrentIsoDate();
    purchaseElements.linea.value = "Gimnasio";
    purchaseElements.kind.value = "Costo";
    fillPurchaseCategoryOptions("");
    fillPurchaseInventoryOptions("");
    fillPurchasePaymentMethods("");
    fillPurchaseBeneficiaryOptions("");
    clearPurchaseDraft();
    purchaseElements.feedback.textContent =
      "Registra aquí costos y gastos. Si es compra de inventario, además actualiza stock.";
    syncPurchaseKindUi();
    updatePurchaseDraftSummary();
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
          <td colspan="8" class="empty-state">
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
            <td>
              <div class="row-actions row-actions--compact">
                <button
                  class="table-button icon-button"
                  type="button"
                  data-purchase-edit-id="${item.id}"
                  title="Editar compra o gasto"
                  aria-label="Editar compra o gasto"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                    <path d="m12 6 4 4"></path>
                  </svg>
                </button>
                ${
                  isAdminUser() && ["Costo", "Gasto"].includes(item.tipo)
                    ? `
                    <button
                      class="table-button danger icon-button"
                      type="button"
                      data-purchase-delete-id="${item.id}"
                      title="Eliminar ${escapeHtml(item.tipo.toLowerCase())}"
                      aria-label="Eliminar ${escapeHtml(item.tipo.toLowerCase())}"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M4 7h16"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                        <path d="M6 7l1 12h10l1-12"></path>
                        <path d="M9 7V4h6v3"></path>
                      </svg>
                    </button>
                  `
                    : ""
                }
                ${
                  Number(item.saldoPendiente || 0) > 0
                    ? `
                    <button
                      class="table-button icon-button"
                      type="button"
                      data-purchase-register-payment-id="${item.id}"
                      title="Registrar pago pendiente"
                      aria-label="Registrar pago pendiente"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M12 2v20"></path>
                        <path d="M17 6.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5 2.2 3.5 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5"></path>
                      </svg>
                    </button>
                  `
                    : "<span class='muted'>Pagado</span>"
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    applyStackTableLabels(elements.appShell);
  }

  function focusPurchasePendingPayment(movementId) {
    const resolvedMovementId = String(movementId || "").trim();
    const movement = (state.portfolioMovements || []).find(
      (item) => String(item.id) === resolvedMovementId
    );

    if (!movement) {
      purchaseElements.feedback.textContent =
        "No encontré ese saldo pendiente. Recarga datos e intenta de nuevo.";
      return;
    }

    if (!(Number(movement.saldoPendiente || 0) > 0)) {
      purchaseElements.feedback.textContent =
        "Ese movimiento ya no tiene saldo pendiente.";
      return;
    }

    if (typeof selectCollectionClient !== "function") {
      purchaseElements.feedback.textContent =
        "No pude abrir la gestión de pagos en este momento.";
      return;
    }

    selectCollectionClient(movement.cliente || "", {
      movementId: resolvedMovementId,
    });
    switchView("cartera", {
      clientPanel: "cobros",
    });

    if (elements.collectionAmount) {
      elements.collectionAmount.focus();
    }

    const actionLabel = movement.tipo === "Ingreso" ? "cobro" : "pago";
    purchaseElements.feedback.textContent = `Abrimos la gestión de cartera para registrar el ${actionLabel} pendiente.`;
  }

  function handlePurchaseTableClick(event) {
    const editButton = event.target.closest("[data-purchase-edit-id]");
    const deleteButton = event.target.closest("[data-purchase-delete-id]");
    const paymentButton = event.target.closest(
      "[data-purchase-register-payment-id]"
    );
    const editId = editButton?.dataset.purchaseEditId;
    const deleteId = deleteButton?.dataset.purchaseDeleteId;
    const movementId = paymentButton?.dataset.purchaseRegisterPaymentId;

    if (editId) {
      startEditingPurchaseMovement(editId);
      return;
    }

    if (deleteId) {
      deletePurchaseCost(deleteId);
      return;
    }

    if (!movementId) {
      return;
    }

    focusPurchasePendingPayment(movementId);
  }

  async function deletePurchaseCost(movementId) {
    const movement = state.movements.find(
      (item) => String(item.id) === String(movementId)
    );

    if (!isAdminUser() || !["Costo", "Gasto"].includes(movement?.tipo)) {
      purchaseElements.feedback.textContent =
        "Solo el administrador puede eliminar movimientos de costos o gastos.";
      return;
    }

    const confirmed = window.confirm(
      `Deseas eliminar este ${String(movement.tipo || "movimiento").toLowerCase()}? Tambien se reversara cualquier movimiento de inventario relacionado. Esta accion no se puede deshacer.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/api/movements/${movement.id}`, {
        method: "DELETE",
      });
      await loadBootstrap();
      switchView("movimientos");
      setMovementPanel("compras");
      purchaseElements.feedback.textContent =
        `${movement.tipo} eliminado y movimiento de inventario reversado correctamente.`;
    } catch (error) {
      purchaseElements.feedback.textContent = error.message;
    }
  }

  function getPurchaseUnitCostForEdit(movement) {
    const quantity = normalizePurchaseQuantity(movement?.inventoryQuantity || 0);
    const total = normalizeMoney(movement?.valorTotal || 0);

    if (!(quantity > 0) || !(total > 0)) {
      return "";
    }

    return String(normalizeMoney(total / quantity));
  }

  function startEditingPurchaseMovement(movementId) {
    const movement = state.movements.find(
      (item) => String(item.id) === String(movementId)
    );

    if (!movement || !["Costo", "Gasto"].includes(movement.tipo)) {
      purchaseElements.feedback.textContent =
        "No encontré la compra o gasto que quieres editar.";
      return;
    }

    switchView("movimientos");
    setMovementPanel("compras");

    purchaseDraftItems = [];
    purchaseElements.movementId.value = String(movement.id);
    purchaseElements.linea.value = movement.linea || "Gimnasio";
    purchaseElements.fecha.value = movement.fecha;
    purchaseElements.kind.value = movement.tipo === "Gasto" ? "Gasto" : "Costo";

    fillPurchaseCategoryOptions(movement.categoria || "");
    fillPurchaseInventoryOptions(String(movement.inventoryProductId || ""));
    fillPurchasePaymentMethods(movement.medioPago || "");
    fillPurchaseBeneficiaryOptions(movement.cliente || "");

    purchaseElements.categoria.value = movement.categoria || "";
    purchaseElements.inventoryProductId.value = movement.inventoryProductId
      ? String(movement.inventoryProductId)
      : "";
    purchaseElements.inventoryQuantity.value = movement.inventoryQuantity
      ? String(movement.inventoryQuantity)
      : "";
    purchaseElements.unitCost.value =
      movement.tipo === "Costo" ? getPurchaseUnitCostForEdit(movement) : "";
    purchaseElements.medioPago.value = movement.medioPago || "";
    purchaseElements.beneficiary.value = movement.cliente || "";
    purchaseElements.description.value = movement.descripcion || "";
    purchaseElements.total.value = String(movement.valorTotal || "");
    purchaseElements.paid.value = String(movement.abono || "");
    purchaseElements.notes.value = movement.observaciones || "";
    if (purchaseElements.editJustification) {
      purchaseElements.editJustification.value = "";
    }

    syncPurchaseKindUi();
    renderPurchaseDraftItems();
    purchaseElements.feedback.textContent =
      isAssistantUser()
        ? "Estás editando una compra o gasto reciente. Escribe la justificación antes de guardar."
        : "Estás editando una compra o gasto. Puedes corregir la caja y guardar.";
    purchaseElements.medioPago.focus();
  }

  function renderPurchasesModule() {
    if (!purchaseElements.form) {
      return;
    }

    fillPurchaseCategoryOptions();
    fillPurchaseInventoryOptions();
    fillPurchasePaymentMethods();
    fillPurchaseBeneficiaryOptions();
    syncPurchaseKindUi();
    renderPurchaseDraftItems();

    const filtered = getPurchaseFilteredMovements();
    renderPurchaseMetrics(filtered);
    renderPurchaseTable(filtered);
  }

  function buildPurchasePayload() {
    const isCost = isPurchaseKindCost();
    const existingMovement = purchaseElements.movementId.value
      ? state.movements.find(
          (item) => String(item.id) === String(purchaseElements.movementId.value)
        ) || null
      : null;
    const total = normalizeMoney(purchaseElements.total.value || 0);
    const paid = normalizeMoney(purchaseElements.paid.value || 0);
    const inventoryProductId = Number(purchaseElements.inventoryProductId.value || 0);
    const inventoryQuantity = normalizePurchaseQuantity(
      purchaseElements.inventoryQuantity.value || 0
    );
    const selectedInventoryProduct = getInventoryProductById(inventoryProductId);
    const beneficiary = String(purchaseElements.beneficiary.value || "").trim();
    const description = String(purchaseElements.description.value || "").trim();

    let category = String(purchaseElements.categoria.value || "").trim();
    if (isCost) {
      category =
        String(selectedInventoryProduct?.category || "").trim() ||
        String(existingMovement?.categoria || "").trim() ||
        "Compras inventario";
    }

    const shouldLinkInventory =
      isCost && inventoryProductId > 0 && inventoryQuantity > 0;

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
      inventoryProductId: shouldLinkInventory ? inventoryProductId : 0,
      inventoryQuantity: shouldLinkInventory ? inventoryQuantity : 0,
      inventoryEffect: shouldLinkInventory ? "entrada" : "ninguno",
      observaciones: purchaseElements.notes.value.trim(),
      justificacionEdicion: String(
        purchaseElements.editJustification?.value || ""
      ).trim(),
    };
  }

  async function handlePurchaseSubmit(event) {
    event.preventDefault();

    const isEditing = Boolean(purchaseElements.movementId.value);

    if (isEditing) {
      const isCost = isPurchaseKindCost();
      const payload = buildPurchasePayload();
      const existingMovement =
        state.movements.find(
          (item) => String(item.id) === String(purchaseElements.movementId.value)
        ) || null;
      const hasInventoryLink =
        Number(existingMovement?.inventoryProductId || 0) > 0 ||
        Number(existingMovement?.inventoryQuantity || 0) > 0 ||
        Number(purchaseElements.inventoryProductId.value || 0) > 0 ||
        Number(purchaseElements.inventoryQuantity.value || 0) > 0;

    if (isCost && hasInventoryLink) {
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

    if (purchaseElements.beneficiary.disabled) {
      purchaseElements.feedback.textContent =
        "No hay proveedores activos. Crea o activa uno en Clientes antes de registrar este movimiento.";
      return;
    }

    if (!payload.cliente) {
      purchaseElements.feedback.textContent =
        "Selecciona un proveedor de la lista antes de guardar.";
      purchaseElements.beneficiary.focus();
      return;
    }

    if (
      isAssistantUser() &&
      String(payload.justificacionEdicion || "").length < 10
    ) {
      purchaseElements.feedback.textContent =
        "Debes escribir una justificacion de al menos 10 caracteres para editar esta compra o gasto.";
      purchaseElements.editJustification?.focus();
      return;
    }

    payload.estadoPago = derivePaymentStatus(payload.valorTotal, payload.abono);

      const validation = validateMovement(payload, {
        isEditing: true,
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
        "Compra o gasto actualizado correctamente.";
    } catch (error) {
      purchaseElements.feedback.textContent = error.message;
    }

      return;
    }

    if (!purchaseDraftItems.length) {
      purchaseElements.feedback.textContent =
        "Agrega al menos un item al detalle antes de guardar.";
      purchaseElements.addItemButton?.focus();
      return;
    }

    const totalAmount = getPurchaseDraftTotal();
    const paidAmount = normalizeMoney(purchaseElements.paid.value);
    if (!(totalAmount > 0)) {
      purchaseElements.feedback.textContent =
        "El total del detalle debe ser mayor que cero.";
      return;
    }

    if (paidAmount < 0 || paidAmount > totalAmount) {
      purchaseElements.feedback.textContent =
        "El abono total no puede ser negativo ni mayor al total de la compra o gasto.";
      purchaseElements.paid.focus();
      return;
    }

    const movementDate = String(purchaseElements.fecha.value || "").trim();
    const paymentMethod = String(purchaseElements.medioPago.value || "").trim();
    const sharedNotes = String(purchaseElements.notes.value || "").trim();

    if (!movementDate) {
      purchaseElements.feedback.textContent = "Selecciona la fecha del movimiento.";
      purchaseElements.fecha.focus();
      return;
    }

    if (!paymentMethod) {
      purchaseElements.feedback.textContent =
        "Selecciona la caja o medio de pago.";
      purchaseElements.medioPago.focus();
      return;
    }

    let remainingPaid = paidAmount;
    try {
      for (const item of purchaseDraftItems) {
        const lineTotal = normalizeMoney(item.total || 0);
        const linePaid = normalizeMoney(Math.min(remainingPaid, lineTotal));
        remainingPaid = normalizeMoney(Math.max(0, remainingPaid - linePaid));
        const isCostItem = String(item.kind || "") === "Costo";
        const inventoryQuantity = isCostItem
          ? normalizePurchaseQuantity(item.quantity || 0)
          : 0;

        const payload = {
          linea: String(item.line || purchaseElements.linea.value || "Gimnasio"),
          fecha: movementDate,
          tipo: isCostItem ? "Costo" : "Gasto",
          categoria: String(item.category || "").trim(),
          businessProductId: 0,
          cliente: String(item.beneficiary || "").trim(),
          descripcion:
            String(item.description || "").trim() ||
            (isCostItem
              ? `Compra de ${String(item.inventoryProductName || "insumo")}`
              : "Gasto operativo"),
          medioPago: paymentMethod,
          valorTotal: lineTotal,
          abono: linePaid,
          inventoryProductId: isCostItem ? Number(item.inventoryProductId || 0) : 0,
          inventoryQuantity,
          inventoryEffect: isCostItem ? "entrada" : "ninguno",
          observaciones: sharedNotes,
          justificacionEdicion: "",
        };
        payload.estadoPago = derivePaymentStatus(payload.valorTotal, payload.abono);

        const validation = validateMovement(payload, {
          isEditing: false,
        });
        if (!validation.valid) {
          purchaseElements.feedback.textContent = validation.message;
          return;
        }

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
        "Compra o gasto con multiples items registrado correctamente.";
    } catch (error) {
      purchaseElements.feedback.textContent = error.message;
    }
  }

  function getComboBusinessProductsByLine(lineValue = "") {
    const line = String(lineValue || comboElements.businessLine?.value || "Gimnasio");
    return (state.businessProducts || [])
      .filter((item) => item.isActive && item.businessLine === line)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), APP_LOCALE));
  }

  function getSelectedSalesComboTargetProductIds() {
    if (!comboElements.targetProductId) {
      return [];
    }

    const uniqueIds = new Set();
    [...comboElements.targetProductId.selectedOptions].forEach((option) => {
      const parsedId = Number(option.value || 0);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        uniqueIds.add(parsedId);
      }
    });

    return [...uniqueIds];
  }

  function isSameProductBundleSelection() {
    const triggerId = Number(comboElements.triggerProductId?.value || 0);
    const targetIds = getSelectedSalesComboTargetProductIds();
    return (
      triggerId > 0 &&
      targetIds.length === 1 &&
      targetIds[0] === triggerId
    );
  }

  function syncSalesComboFieldMode() {
    const isBundle = isSameProductBundleSelection();

    if (comboElements.maxUnitsLabel) {
      comboElements.maxUnitsLabel.textContent = isBundle
        ? "Cantidad del paquete"
        : "Unidades con descuento por activador";
    }
    if (comboElements.targetUnitPriceLabel) {
      comboElements.targetUnitPriceLabel.textContent = isBundle
        ? "Precio total del paquete"
        : "Precio promocional por unidad";
    }
    if (comboElements.targetUnitPriceHint) {
      comboElements.targetUnitPriceHint.textContent = isBundle
        ? "Ejemplo: cantidad 3 y precio $10.000 para vender 3 unidades por $10.000."
        : "Valor que pagará cada unidad del producto objetivo.";
    }
  }

  function fillSalesComboTargetProductsSelect(products, selectedValues = []) {
    if (!comboElements.targetProductId) {
      return;
    }

    const selectedSet = new Set(
      (Array.isArray(selectedValues) ? selectedValues : [])
        .map((value) => Number(value || 0))
        .filter((value) => Number.isInteger(value) && value > 0)
        .map((value) => String(value))
    );

    comboElements.targetProductId.innerHTML = products
      .map(
        (item) =>
          `<option value="${escapeHtml(String(item.id))}">${escapeHtml(
            `${item.name} · ${getBusinessProductCategoryLabel(item)} · ${formatCurrency(
              item.defaultAmount
            )}`
          )}</option>`
      )
      .join("");

    [...comboElements.targetProductId.options].forEach((option) => {
      option.selected = selectedSet.has(option.value);
    });
    syncSalesComboFieldMode();
  }

  function fillSalesComboProductSelects(options = {}) {
    if (!comboElements.triggerProductId || !comboElements.targetProductId) {
      return;
    }

    const products = getComboBusinessProductsByLine(
      options.businessLine || comboElements.businessLine?.value || "Gimnasio"
    );
    const labelBuilder = (item) =>
      `${item.name} · ${getBusinessProductCategoryLabel(item)} · ${formatCurrency(
        item.defaultAmount
      )}`;

    fillSelectFromRecords(comboElements.triggerProductId, products, {
      selectedValue: String(
        options.triggerValue ?? comboElements.triggerProductId.value ?? ""
      ),
      placeholder: "Selecciona producto activador",
      labelBuilder,
    });

    const targetValues = Array.isArray(options.targetValues)
      ? options.targetValues
      : options.targetValue
        ? [options.targetValue]
        : getSelectedSalesComboTargetProductIds();
    fillSalesComboTargetProductsSelect(products, targetValues);
    syncSalesComboFieldMode();
  }

  function resetSalesComboForm(options = {}) {
    if (!comboElements.form) {
      return;
    }

    comboElements.form.reset();
    if (comboElements.id) {
      comboElements.id.value = "";
    }
    comboElements.businessLine.value = "Restaurante";
    comboElements.maxUnits.value = "1";
    comboElements.targetUnitPrice.value = "";
    comboElements.notes.value = "";
    fillSalesComboProductSelects({
      businessLine: comboElements.businessLine.value,
      triggerValue: "",
      targetValues: [],
    });
    syncSalesComboFieldMode();
    comboElements.cancelEdit?.classList.add("is-hidden");

    const submitButton = comboElements.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = "Guardar combo";
    }

    if (!options.preserveFeedback && comboElements.feedback) {
      comboElements.feedback.textContent =
        "Crea descuentos entre productos o paquetes del mismo producto, por ejemplo 3 tortillas por $10.000.";
    }
  }

  function getFilteredSalesComboRules() {
    const query = normalizeSearchValue(comboElements.query?.value || "");
    const rules = getSalesComboRulesForCurrentState();

    if (!query) {
      return rules;
    }

    return rules.filter((item) =>
      normalizeSearchValue(
        [
          item.name,
          item.businessLine,
          item.triggerBusinessProductName,
          item.targetBusinessProductName,
          item.targetUnitPrice,
          item.maxTargetUnitsPerTrigger,
          item.notes,
          item.isActive ? "activo" : "inactivo",
        ].join(" ")
      ).includes(query)
    );
  }

  function renderSalesComboRulesAdmin() {
    if (!comboElements.table || !comboElements.metrics) {
      return;
    }

    const rules = getFilteredSalesComboRules();
    const activeRules = rules.filter((item) => item.isActive);

    comboElements.metrics.innerHTML = `
      <div class="mini-stat"><span>Total</span><strong>${rules.length}</strong></div>
      <div class="mini-stat"><span>Activos</span><strong>${activeRules.length}</strong></div>
      <div class="mini-stat"><span>Gimnasio</span><strong>${
        rules.filter((item) => item.businessLine === "Gimnasio").length
      }</strong></div>
      <div class="mini-stat"><span>Restaurante</span><strong>${
        rules.filter((item) => item.businessLine === "Restaurante").length
      }</strong></div>
    `;

    if (!rules.length) {
      comboElements.table.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            No hay combos registrados para los filtros actuales.
          </td>
        </tr>
      `;
      applyStackTableLabels(elements.appShell);
      return;
    }

    comboElements.table.innerHTML = rules
      .map((item) => {
        const nextActive = item.isActive ? "false" : "true";
        const sameProductBundle = item.isSameProductBundle;
        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.name || "Combo")}</strong>
              <div class="inline-hint">${escapeHtml(item.notes || "Sin notas")}</div>
            </td>
            <td>${escapeHtml(item.businessLine || "-")}</td>
            <td>
              <strong>${escapeHtml(item.triggerBusinessProductName || "Sin activador")}</strong>
              <div class="inline-hint">${
                sameProductBundle
                  ? `Paquete del mismo producto · ${escapeHtml(
                      String(item.maxTargetUnitsPerTrigger || 1)
                    )} unidades`
                  : `Activa ${escapeHtml(
                      item.targetBusinessProductName || "Sin objetivo"
                    )} · ${escapeHtml(
                      String(item.maxTargetUnitsPerTrigger || 1)
                    )} por activador`
              }</div>
            </td>
            <td>${
              sameProductBundle
                ? `${escapeHtml(
                    String(item.maxTargetUnitsPerTrigger || 1)
                  )} por ${formatCurrency(item.targetUnitPrice)}`
                : `${formatCurrency(item.targetUnitPrice)} c/u`
            }</td>
            <td>
              <span class="status-pill ${item.isActive ? "status-pagado" : "status-pendiente"}">
                ${item.isActive ? "Activo" : "Inactivo"}
              </span>
            </td>
            <td>
              <div class="row-actions row-actions--compact">
                <button
                  class="table-button icon-button"
                  type="button"
                  data-sales-combo-edit-id="${escapeHtml(String(item.id))}"
                  title="Editar combo"
                  aria-label="Editar combo"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 20h4l10-10-4-4L4 16v4Z"></path>
                    <path d="m12 6 4 4"></path>
                  </svg>
                </button>
                <button
                  class="table-button ${item.isActive ? "danger" : ""} icon-button"
                  type="button"
                  data-sales-combo-status-id="${escapeHtml(String(item.id))}"
                  data-sales-combo-next-active="${nextActive}"
                  title="${item.isActive ? "Inactivar combo" : "Activar combo"}"
                  aria-label="${item.isActive ? "Inactivar combo" : "Activar combo"}"
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

  function startEditingSalesComboRule(ruleId) {
    const comboRule = getSalesComboRulesForCurrentState().find(
      (item) => String(item.id) === String(ruleId)
    );
    if (!comboRule) {
      comboElements.feedback.textContent = "No encontramos el combo que intentas editar.";
      return;
    }

    comboElements.id.value = String(comboRule.id);
    comboElements.name.value = comboRule.name || "";
    comboElements.businessLine.value = comboRule.businessLine || "Restaurante";
    fillSalesComboProductSelects({
      businessLine: comboElements.businessLine.value,
      triggerValue: String(comboRule.triggerBusinessProductId || ""),
      targetValues: [String(comboRule.targetBusinessProductId || "")],
    });
    comboElements.maxUnits.value = String(comboRule.maxTargetUnitsPerTrigger || 1);
    comboElements.targetUnitPrice.value = String(comboRule.targetUnitPrice || 0);
    comboElements.notes.value = comboRule.notes || "";
    syncSalesComboFieldMode();
    comboElements.cancelEdit?.classList.remove("is-hidden");
    comboElements.feedback.textContent =
      "Edita la regla y, si quieres, agrega varios productos objetivo para aplicar el mismo combo en bloque.";
    const submitButton = comboElements.form?.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = "Guardar cambios";
    }
    comboElements.name?.focus();
  }

  async function handleSalesComboSubmit(event) {
    event.preventDefault();

    if (!comboElements.form || !isAdminUser()) {
      return;
    }

    const comboId = Number(comboElements.id?.value || 0);
    const selectedTargetIds = getSelectedSalesComboTargetProductIds();
    const isBulkCreateFromEdit = comboId > 0 && selectedTargetIds.length > 1;
    const payload = {
      name: String(comboElements.name?.value || "").trim(),
      businessLine: comboElements.businessLine?.value || "Restaurante",
      triggerBusinessProductId: Number(comboElements.triggerProductId?.value || 0),
      targetBusinessProductIds: selectedTargetIds,
      targetBusinessProductId: Number(selectedTargetIds[0] || 0),
      targetUnitPrice: Number(comboElements.targetUnitPrice?.value || 0),
      maxTargetUnitsPerTrigger: Number(comboElements.maxUnits?.value || 0),
      notes: String(comboElements.notes?.value || "").trim(),
    };

    if (!payload.name) {
      comboElements.feedback.textContent = "Escribe el nombre del combo.";
      comboElements.name?.focus();
      return;
    }

    if (!(payload.triggerBusinessProductId > 0) || !selectedTargetIds.length) {
      comboElements.feedback.textContent =
        "Selecciona el producto activador y al menos un producto objetivo del combo.";
      return;
    }

    if (
      selectedTargetIds.includes(payload.triggerBusinessProductId) &&
      selectedTargetIds.length > 1
    ) {
      comboElements.feedback.textContent =
        "Para un paquete del mismo producto, selecciona únicamente ese producto como objetivo.";
      return;
    }

    const isSameProductBundle =
      selectedTargetIds.length === 1 &&
      selectedTargetIds[0] === payload.triggerBusinessProductId;

    if (!(payload.targetUnitPrice > 0)) {
      comboElements.feedback.textContent =
        "El precio promocional debe ser mayor que cero.";
      comboElements.targetUnitPrice?.focus();
      return;
    }

    if (
      !Number.isInteger(payload.maxTargetUnitsPerTrigger) ||
      !(payload.maxTargetUnitsPerTrigger > 0)
    ) {
      comboElements.feedback.textContent =
        "Las unidades con descuento por activador deben ser un entero mayor que cero.";
      comboElements.maxUnits?.focus();
      return;
    }

    if (isSameProductBundle && payload.maxTargetUnitsPerTrigger < 2) {
      comboElements.feedback.textContent =
        "Un paquete del mismo producto debe tener al menos 2 unidades.";
      comboElements.maxUnits?.focus();
      return;
    }

    try {
      await apiRequest(
        comboId > 0 && !isBulkCreateFromEdit
          ? `/api/sales-combo-rules/${comboId}`
          : "/api/sales-combo-rules",
        {
          method: comboId > 0 && !isBulkCreateFromEdit ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      await loadBootstrap();
      switchView("inventario", {
        inventoryPanel: "productos",
      });
      renderSalesComboRulesAdmin();
      resetSalesComboForm({
        preserveFeedback: true,
      });
      comboElements.feedback.textContent =
        comboId > 0
          ? isBulkCreateFromEdit
            ? `Reglas actualizadas/creadas para ${selectedTargetIds.length} productos objetivo.`
            : "Combo actualizado correctamente."
          : selectedTargetIds.length > 1
            ? `Combos creados correctamente para ${selectedTargetIds.length} productos.`
            : "Combo creado correctamente.";
    } catch (error) {
      comboElements.feedback.textContent = error.message;
    }
  }

  async function handleSalesComboTableClick(event) {
    const editButton = event.target.closest("[data-sales-combo-edit-id]");
    if (editButton) {
      startEditingSalesComboRule(editButton.dataset.salesComboEditId);
      return;
    }

    const statusButton = event.target.closest("[data-sales-combo-status-id]");
    if (!statusButton) {
      return;
    }

    const comboRuleId = Number(statusButton.dataset.salesComboStatusId || 0);
    const activate = statusButton.dataset.salesComboNextActive === "true";
    if (!(comboRuleId > 0)) {
      return;
    }

    const confirmed = window.confirm(
      activate
        ? "¿Deseas activar este combo?"
        : "¿Deseas inactivar este combo?"
    );
    if (!confirmed) {
      return;
    }

    try {
      const updatedCombo = await apiRequest(
        `/api/sales-combo-rules/${comboRuleId}/active`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isActive: activate,
          }),
        }
      );

      await loadBootstrap();
      switchView("inventario", {
        inventoryPanel: "productos",
      });
      renderSalesComboRulesAdmin();
      const updatedCount = Number(updatedCombo?.updatedCount || 1);
      comboElements.feedback.textContent =
        updatedCount > 1
          ? `${activate ? "Combo activado" : "Combo inactivado"} correctamente en sus ${updatedCount} productos objetivo.`
          : activate
            ? "Combo activado correctamente."
            : "Combo inactivado correctamente.";
    } catch (error) {
      comboElements.feedback.textContent = error.message;
    }
  }

  function refreshSalesComboAdminUi() {
    if (!comboElements.form) {
      return;
    }

    fillSalesComboProductSelects({
      businessLine: comboElements.businessLine?.value || "Restaurante",
      triggerValue: comboElements.triggerProductId?.value || "",
      targetValues: getSelectedSalesComboTargetProductIds(),
    });
    renderSalesComboRulesAdmin();
  }

  function bindSalesComboEvents() {
    if (!comboElements.form) {
      return;
    }

    comboElements.form.addEventListener("submit", handleSalesComboSubmit);
    comboElements.businessLine?.addEventListener("change", () => {
      fillSalesComboProductSelects({
        businessLine: comboElements.businessLine?.value || "Restaurante",
        triggerValue: "",
        targetValues: [],
      });
      syncSalesComboFieldMode();
    });
    comboElements.triggerProductId?.addEventListener(
      "change",
      syncSalesComboFieldMode
    );
    comboElements.targetProductId?.addEventListener(
      "change",
      syncSalesComboFieldMode
    );
    comboElements.cancelEdit?.addEventListener("click", () => {
      resetSalesComboForm();
      renderSalesComboRulesAdmin();
    });
    comboElements.query?.addEventListener("input", renderSalesComboRulesAdmin);
    comboElements.table?.addEventListener("click", handleSalesComboTableClick);
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
      if (!purchaseElements.movementId.value && purchaseDraftItems.length) {
        clearPurchaseDraft();
        purchaseElements.feedback.textContent =
          "Cambiaste la linea de negocio, por eso limpiamos el detalle para evitar cruces.";
      }
      fillPurchaseCategoryOptions("");
      renderPurchasesModule();
    });
    purchaseElements.kind.addEventListener("change", () => {
      if (!purchaseElements.movementId.value && purchaseDraftItems.length) {
        clearPurchaseDraft();
        purchaseElements.feedback.textContent =
          "Cambiaste el tipo de egreso, por eso limpiamos el detalle actual.";
      }
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
    purchaseElements.table?.addEventListener("click", handlePurchaseTableClick);
    purchaseElements.addItemButton?.addEventListener("click", addPurchaseDraftItem);
    purchaseElements.itemsList?.addEventListener("click", handlePurchaseDraftListClick);
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
      return;
    }

    if (view === "inventario") {
      refreshSalesComboAdminUi();
    }
  };

  const originalLoadBootstrap = loadBootstrap;
  window.loadBootstrap = async function loadBootstrapOverride(...args) {
    const result = await originalLoadBootstrap(...args);
    refreshSalesComboAdminUi();
    return result;
  };

  window.getFilteredMovements = getFilteredSalesMovements;

  bindMovementPanelEvents();
  bindSalesDraftEvents();
  bindSalesSubmitOverride();
  bindCancelEditOverride();
  bindQuickMovementOverride();
  bindPurchaseEvents();
  bindSalesComboEvents();

  resetPurchaseForm();
  resetSalesComboForm({
    preserveFeedback: true,
  });
  applySalesOnlyMode();
  syncMovementBusinessProductSelection({
    preserveValue: true,
    preserveCategoryValue: true,
  });
  renderSalesDraftItems();
  refreshSalesComboAdminUi();
  syncSalesTotalField();
  setMovementPanel("ventas");
})();
