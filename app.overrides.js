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

if (elements?.movementBusinessProductId) {
  elements.movementBusinessProductId.addEventListener(
    "change",
    (event) => {
      event.stopImmediatePropagation();
      syncMovementBusinessProductSelection();
    },
    true
  );
}

syncMovementBusinessProductSelection({
  preserveValue: true,
  preserveCategoryValue: true,
});
