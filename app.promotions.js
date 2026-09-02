(function decemberPromotionModule() {
  const promotionElements = {
    form: document.getElementById("promotion-form"),
    clientId: document.getElementById("promotion-client-id"),
    clientSearch: document.getElementById("promotion-client-search"),
    clientSuggestions: document.getElementById("promotion-client-suggestions"),
    paymentDate: document.getElementById("promotion-payment-date"),
    paymentMethod: document.getElementById("promotion-payment-method"),
    notes: document.getElementById("promotion-notes"),
    feedback: document.getElementById("promotion-feedback"),
    metrics: document.getElementById("promotion-metrics"),
    filterStatus: document.getElementById("promotion-filter-status"),
    filterQuery: document.getElementById("promotion-filter-query"),
    registrations: document.getElementById("promotion-registrations"),
  };

  if (!promotionElements.form) {
    return;
  }

  const promotionState = {
    campaign: null,
    registrations: [],
    editingPaymentRegistrationId: 0,
  };

  function getActivePromotionClients() {
    const registeredClientIds = new Set(
      promotionState.registrations.map((item) => Number(item.clientId))
    );

    return (state.clients || []).filter(
      (client) =>
        client.isActive &&
        client.isClient !== false &&
        !registeredClientIds.has(Number(client.id))
    );
  }

  function getPromotionClientLabel(client) {
    return [client.fullName, client.alias ? `(${client.alias})` : ""]
      .filter(Boolean)
      .join(" ");
  }

  function getPromotionClientMeta(client) {
    return [client.documentNumber, client.phone, client.email]
      .filter(Boolean)
      .join(" · ") || "Sin datos de contacto";
  }

  function renderPromotionClientSuggestions(options = {}) {
    const query = normalizeSearchValue(promotionElements.clientSearch.value || "");
    const matches = getActivePromotionClients()
      .filter((client) =>
        normalizeSearchValue(
          [
            client.fullName,
            client.alias,
            client.documentNumber,
            client.phone,
            client.email,
          ].join(" ")
        ).includes(query)
      )
      .slice(0, 10);

    promotionElements.clientSuggestions.innerHTML = matches.length
      ? matches
          .map(
            (client) => `
              <button
                class="search-suggestion-item"
                type="button"
                data-promotion-client-option="${Number(client.id)}"
              >
                <span class="search-suggestion-title">${escapeHtml(
                  getPromotionClientLabel(client)
                )}</span>
                <span class="search-suggestion-meta">${escapeHtml(
                  getPromotionClientMeta(client)
                )}</span>
              </button>
            `
          )
          .join("")
      : `
          <div class="search-suggestion-empty">
            No hay clientes disponibles con ese filtro.
          </div>
        `;

    promotionElements.clientSuggestions.classList.toggle(
      "is-hidden",
      !options.forceOpen && !String(promotionElements.clientSearch.value || "").trim()
    );
  }

  function hidePromotionClientSuggestions() {
    promotionElements.clientSuggestions.classList.add("is-hidden");
  }

  function selectPromotionClient(clientId) {
    const client = (state.clients || []).find(
      (item) => Number(item.id) === Number(clientId)
    );
    if (!client) {
      return;
    }

    promotionElements.clientId.value = String(client.id);
    promotionElements.clientSearch.value = getPromotionClientLabel(client);
    promotionElements.clientSearch.dataset.selectedLabel =
      promotionElements.clientSearch.value;
    hidePromotionClientSuggestions();
  }

  function fillPromotionPaymentMethods() {
    const currentValue = promotionElements.paymentMethod.value;
    const methods = state.lists.mediosPago || [];
    promotionElements.paymentMethod.innerHTML = [
      '<option value="">Selecciona una caja</option>',
      ...methods.map(
        (method) =>
          `<option value="${escapeHtml(method)}">${escapeHtml(method)}</option>`
      ),
    ].join("");

    if (methods.includes(currentValue)) {
      promotionElements.paymentMethod.value = currentValue;
    }
  }

  function resetPromotionForm() {
    promotionElements.form.reset();
    promotionElements.clientId.value = "";
    promotionElements.clientSearch.dataset.selectedLabel = "";
    promotionElements.paymentDate.value = getCurrentIsoDate();
    fillPromotionPaymentMethods();
    hidePromotionClientSuggestions();
  }

  function getFilteredPromotionRegistrations() {
    const status = promotionElements.filterStatus.value || "all";
    const query = normalizeSearchValue(promotionElements.filterQuery.value || "");

    return promotionState.registrations.filter((item) => {
      if (status !== "all" && item.status !== status) {
        return false;
      }
      if (!query) {
        return true;
      }
      return normalizeSearchValue(
        [
          item.clientName,
          item.clientAlias,
          item.documentNumber,
          item.phone,
          item.paymentMethod,
          item.registeredBy,
          item.activatedBy,
          item.notes,
        ].join(" ")
      ).includes(query);
    });
  }

  function renderPromotionMetrics() {
    const campaign = promotionState.campaign;
    if (!campaign) {
      promotionElements.metrics.innerHTML = "";
      return;
    }

    promotionElements.metrics.innerHTML = [
      createStatCard(
        "Cupos registrados",
        `${campaign.registeredCount} / ${campaign.capacity}`,
        `${campaign.availableSlots} disponibles`
      ),
      createStatCard(
        "Pendientes de activar",
        String(campaign.pendingCount),
        "Activaciones desde el 15 de noviembre"
      ),
      createStatCard(
        "Mensualidades activadas",
        String(campaign.activatedCount),
        "Consumibles en diciembre"
      ),
      createStatCard(
        "Recaudo promoción",
        formatCurrency(campaign.totalCollected),
        `${campaign.registeredCount} pago(s) de ${formatCurrency(campaign.unitPrice)}`
      ),
    ].join("");
  }

  function promotionStatusLabel(status) {
    return status === "activated" ? "Activada" : "Pendiente de activar";
  }

  function renderPromotionPaymentEdit(registration) {
    const paymentMethods = [
      ...new Set(
        [registration.paymentMethod, ...(state.lists.mediosPago || [])].filter(Boolean)
      ),
    ];
    const options = paymentMethods
      .map(
        (method) => `
          <option value="${escapeHtml(method)}" ${
            method === registration.paymentMethod ? "selected" : ""
          }>${escapeHtml(method)}</option>
        `
      )
      .join("");

    return `
      <form
        class="promotion-payment-edit-form"
        data-promotion-payment-edit-form="${registration.id}"
        data-promotion-movement-id="${registration.movementId}"
      >
        <label>
          Caja correcta
          <select data-promotion-payment-method required>${options}</select>
        </label>
        <label class="promotion-payment-edit-reason">
          Justificación
          <input
            data-promotion-payment-justification
            minlength="10"
            placeholder="Explica por qué se corrige la caja"
            required
          />
        </label>
        <div class="form-actions">
          <button class="primary-button" type="submit">Guardar corrección</button>
          <button class="ghost-button" type="button" data-promotion-payment-cancel>
            Cancelar
          </button>
        </div>
      </form>
    `;
  }

  function renderPromotionRegistrations() {
    const campaign = promotionState.campaign;
    const registrations = getFilteredPromotionRegistrations();
    if (!campaign) {
      promotionElements.registrations.innerHTML = `
        <div class="empty-state">No se pudo cargar la promoción.</div>
      `;
      return;
    }

    if (!registrations.length) {
      promotionElements.registrations.innerHTML = `
        <div class="empty-state">
          No hay personas registradas para los filtros seleccionados.
        </div>
      `;
      return;
    }

    promotionElements.registrations.innerHTML = registrations
      .map((item, index) => {
        const activated = item.status === "activated";
        const activationAction = activated
          ? `
              <div class="promotion-activation-copy">
                <strong>Activada ${escapeHtml(formatDate(item.activationDate))}</strong>
                <small>Por ${escapeHtml(item.activatedBy || "Sistema")}</small>
              </div>
            `
          : `
              <button
                class="primary-button promotion-activate-button"
                type="button"
                data-promotion-activate-id="${item.id}"
                ${campaign.activationOpen ? "" : "disabled"}
                title="${
                  campaign.activationOpen
                    ? "Activar mensualidad de diciembre"
                    : "Disponible desde el 15 de noviembre de 2026"
                }"
              >
                ${campaign.activationOpen ? "Activar mensualidad" : "Disponible 15 nov"}
              </button>
            `;
        const paymentEditAction =
          isAdminUser() && item.movementId
            ? `
                <button
                  class="ghost-button promotion-payment-edit-button"
                  type="button"
                  data-promotion-payment-edit="${item.id}"
                >
                  Corregir caja
                </button>
              `
            : "";
        const paymentEditForm =
          isAdminUser() &&
          Number(promotionState.editingPaymentRegistrationId) === Number(item.id)
            ? renderPromotionPaymentEdit(item)
            : "";

        return `
          <article class="promotion-registration-card ${activated ? "is-activated" : ""}">
            <div class="promotion-registration-index">${index + 1}</div>
            <div class="promotion-registration-main">
              <div class="promotion-registration-head">
                <div>
                  <strong>${escapeHtml(item.clientName || "Cliente sin nombre")}</strong>
                  <small>${escapeHtml(
                    [
                      item.clientAlias ? `Alias: ${item.clientAlias}` : "",
                      item.documentNumber ? `DNI ${item.documentNumber}` : "",
                      item.phone,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin datos adicionales"
                  )}</small>
                </div>
                <span class="promotion-status ${activated ? "is-activated" : "is-pending"}">
                  ${promotionStatusLabel(item.status)}
                </span>
              </div>
              <div class="promotion-registration-meta">
                <span><small>Pago</small><strong>${escapeHtml(formatDate(item.paymentDate))}</strong></span>
                <span><small>Caja</small><strong>${escapeHtml(item.paymentMethod)}</strong></span>
                <span><small>Valor</small><strong>${formatCurrency(item.amountPaid)}</strong></span>
                <span><small>Registrado por</small><strong>${escapeHtml(item.registeredBy)}</strong></span>
              </div>
              ${
                item.notes
                  ? `<p class="promotion-registration-notes">${escapeHtml(item.notes)}</p>`
                  : ""
              }
              ${paymentEditForm}
            </div>
            <div class="promotion-registration-action">
              ${activationAction}
              ${paymentEditAction}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderPromotionModule() {
    fillPromotionPaymentMethods();
    renderPromotionMetrics();
    renderPromotionRegistrations();

    const submitButton = promotionElements.form.querySelector(
      'button[type="submit"]'
    );
    if (submitButton && promotionState.campaign) {
      submitButton.disabled = promotionState.campaign.availableSlots <= 0;
      submitButton.textContent =
        promotionState.campaign.availableSlots > 0
          ? "Registrar pago y reservar cupo"
          : "Cupos agotados";
    }
  }

  async function loadPromotion() {
    if (!canWriteOperations()) {
      promotionState.campaign = null;
      promotionState.registrations = [];
      return;
    }

    const payload = await apiRequest("/api/promotions/december-2026");
    promotionState.campaign = payload.campaign || null;
    promotionState.registrations = Array.isArray(payload.registrations)
      ? payload.registrations
      : [];
  }

  async function handlePromotionSubmit(event) {
    event.preventDefault();
    const clientId = Number(promotionElements.clientId.value || 0);
    if (!clientId) {
      promotionElements.feedback.textContent =
        "Selecciona una persona de las sugerencias antes de guardar.";
      promotionElements.clientSearch.focus();
      return;
    }

    promotionElements.feedback.textContent = "Registrando pago y reservando cupo...";
    try {
      await apiRequest("/api/promotions/december-2026/registrations", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          paymentDate: promotionElements.paymentDate.value,
          paymentMethod: promotionElements.paymentMethod.value,
          notes: promotionElements.notes.value.trim(),
        }),
      });
      resetPromotionForm();
      await loadBootstrap();
      switchView("promocion");
      promotionElements.feedback.textContent =
        "Pago registrado y cupo reservado correctamente.";
    } catch (error) {
      promotionElements.feedback.textContent = error.message;
    }
  }

  async function activatePromotionRegistration(registrationId) {
    const registration = promotionState.registrations.find(
      (item) => Number(item.id) === Number(registrationId)
    );
    if (!registration) {
      return;
    }
    if (
      !window.confirm(
        `¿Activar la mensualidad de diciembre para ${registration.clientName}?`
      )
    ) {
      return;
    }

    try {
      await apiRequest(
        `/api/promotions/december-2026/registrations/${registrationId}/activate`,
        { method: "PATCH", body: "{}" }
      );
      await loadBootstrap();
      switchView("promocion");
      promotionElements.feedback.textContent =
        `Mensualidad activada correctamente para ${registration.clientName}.`;
    } catch (error) {
      promotionElements.feedback.textContent = error.message;
    }
  }

  function startPromotionPaymentEdit(registrationId) {
    if (!isAdminUser()) {
      promotionElements.feedback.textContent =
        "Solo el administrador puede corregir la caja de una promoción.";
      return;
    }

    promotionState.editingPaymentRegistrationId = Number(registrationId || 0);
    promotionElements.feedback.textContent =
      "Selecciona la caja correcta y explica el motivo del ajuste.";
    renderPromotionRegistrations();
    promotionElements.registrations
      .querySelector("[data-promotion-payment-method]")
      ?.focus();
  }

  async function handlePromotionPaymentEdit(event) {
    const form = event.target.closest("[data-promotion-payment-edit-form]");
    if (!form) {
      return;
    }
    event.preventDefault();

    if (!isAdminUser()) {
      promotionElements.feedback.textContent =
        "Solo el administrador puede corregir la caja de una promoción.";
      return;
    }

    const registrationId = Number(form.dataset.promotionPaymentEditForm || 0);
    const movementId = Number(form.dataset.promotionMovementId || 0);
    const registration = promotionState.registrations.find(
      (item) => Number(item.id) === registrationId
    );
    const paymentMethod = String(
      form.querySelector("[data-promotion-payment-method]")?.value || ""
    ).trim();
    const justification = String(
      form.querySelector("[data-promotion-payment-justification]")?.value || ""
    ).trim();

    if (!movementId || !registration) {
      promotionElements.feedback.textContent =
        "No se encontró el movimiento financiero de esta promoción.";
      return;
    }
    if (!paymentMethod) {
      promotionElements.feedback.textContent = "Selecciona la caja correcta.";
      return;
    }
    if (paymentMethod === registration.paymentMethod) {
      promotionElements.feedback.textContent =
        "Selecciona una caja diferente a la registrada actualmente.";
      return;
    }
    if (justification.length < 10) {
      promotionElements.feedback.textContent =
        "Escribe una justificación de al menos 10 caracteres.";
      form.querySelector("[data-promotion-payment-justification]")?.focus();
      return;
    }

    promotionElements.feedback.textContent =
      "Actualizando la promoción y su movimiento de caja...";
    try {
      const result = await apiRequest(
        `/api/box-entries/movement/${movementId}/payment-method`,
        {
          method: "PATCH",
          body: JSON.stringify({ paymentMethod, justification }),
        }
      );
      promotionState.editingPaymentRegistrationId = 0;
      await loadBootstrap();
      switchView("promocion");
      promotionElements.feedback.textContent =
        result.message || "La caja de la promoción quedó corregida.";
    } catch (error) {
      promotionElements.feedback.textContent = error.message;
    }
  }

  promotionElements.form.addEventListener("submit", handlePromotionSubmit);
  promotionElements.clientSearch.addEventListener("input", () => {
    if (
      promotionElements.clientSearch.value !==
      promotionElements.clientSearch.dataset.selectedLabel
    ) {
      promotionElements.clientId.value = "";
    }
    renderPromotionClientSuggestions({ forceOpen: true });
  });
  ["focus", "click"].forEach((eventName) => {
    promotionElements.clientSearch.addEventListener(eventName, () =>
      renderPromotionClientSuggestions({ forceOpen: true })
    );
  });
  promotionElements.clientSearch.addEventListener("blur", () => {
    window.setTimeout(hidePromotionClientSuggestions, 140);
  });
  promotionElements.clientSuggestions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-promotion-client-option]");
    if (option) {
      selectPromotionClient(option.dataset.promotionClientOption);
    }
  });
  promotionElements.filterStatus.addEventListener(
    "change",
    renderPromotionRegistrations
  );
  promotionElements.filterQuery.addEventListener(
    "input",
    renderPromotionRegistrations
  );
  promotionElements.registrations.addEventListener("click", (event) => {
    const cancelButton = event.target.closest("[data-promotion-payment-cancel]");
    if (cancelButton) {
      promotionState.editingPaymentRegistrationId = 0;
      promotionElements.feedback.textContent =
        "Corrección cancelada. No se modificó la caja.";
      renderPromotionRegistrations();
      return;
    }

    const editButton = event.target.closest("[data-promotion-payment-edit]");
    if (editButton) {
      startPromotionPaymentEdit(editButton.dataset.promotionPaymentEdit);
      return;
    }

    const activateButton = event.target.closest("[data-promotion-activate-id]");
    if (activateButton && !activateButton.disabled) {
      activatePromotionRegistration(activateButton.dataset.promotionActivateId);
    }
  });
  promotionElements.registrations.addEventListener(
    "submit",
    handlePromotionPaymentEdit
  );

  const originalLoadBootstrap = window.loadBootstrap || loadBootstrap;
  window.loadBootstrap = async function promotionLoadBootstrap(...args) {
    const result = await originalLoadBootstrap(...args);
    await loadPromotion();
    renderPromotionModule();
    return result;
  };

  const originalSwitchView = window.switchView || switchView;
  window.switchView = function promotionSwitchView(view, options = {}) {
    originalSwitchView(view, options);
    if (view === "promocion") {
      renderPromotionModule();
    }
  };

  resetPromotionForm();
  renderPromotionModule();
})();
