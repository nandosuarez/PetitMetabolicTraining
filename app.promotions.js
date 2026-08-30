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
        const action = activated
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
            </div>
            <div class="promotion-registration-action">${action}</div>
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
    const button = event.target.closest("[data-promotion-activate-id]");
    if (button && !button.disabled) {
      activatePromotionRegistration(button.dataset.promotionActivateId);
    }
  });

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
