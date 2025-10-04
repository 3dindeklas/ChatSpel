(function (global) {
  "use strict";

  function resolveContainer(container) {
    if (typeof container === "string") {
      return document.querySelector(container);
    }
    return container || null;
  }

  function createStore(providedStore, storeOptions = {}) {
    if (providedStore) {
      return providedStore;
    }

    const dashboardAPI = global.DSQDashboard || {};
    if (dashboardAPI.DailySessionStore) {
      return new dashboardAPI.DailySessionStore(storeOptions);
    }

    throw new Error(
      "DigitalSafetyDashboard: DailySessionStore is niet beschikbaar. Zorg dat digitalSafetyQuiz.js geladen is."
    );
  }

  function createView(container, store, viewOptions = {}) {
    const dashboardAPI = global.DSQDashboard || {};
    if (!dashboardAPI.DashboardView) {
      throw new Error(
        "DigitalSafetyDashboard: DashboardView is niet beschikbaar. Zorg dat digitalSafetyQuiz.js geladen is."
      );
    }

    return new dashboardAPI.DashboardView(container, store, viewOptions);
  }

  function createDigitalSafetyDashboard(options = {}) {
    const container = resolveContainer(options.container);
    if (!container) {
      throw new Error(
        "DigitalSafetyDashboard: kon de container niet vinden. Geef een element of CSS-selector door."
      );
    }

    const storeOptions = {
      ...(options.storeOptions || {})
    };

    if (options.apiBaseUrl && !storeOptions.apiBaseUrl) {
      storeOptions.apiBaseUrl = options.apiBaseUrl;
    }

    if (
      typeof options.heartbeatIntervalMs === "number" &&
      storeOptions.heartbeatIntervalMs === undefined
    ) {
      storeOptions.heartbeatIntervalMs = options.heartbeatIntervalMs;
    }

    const store = createStore(options.store, storeOptions);
    const viewOptions = {
      refreshIntervalMs: options.refreshIntervalMs,
      autoUpdate: options.autoUpdate
    };

    return createView(container, store, viewOptions);
  }

  global.createDigitalSafetyDashboard = createDigitalSafetyDashboard;
})(typeof window !== "undefined" ? window : this);
