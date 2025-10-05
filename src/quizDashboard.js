(function (global) {
  "use strict";

  function resolveContainer(container) {
    if (typeof container === "string") {
      return document.querySelector(container);
    }
    return container || null;
  }

  function createStore(providedStore) {
    if (providedStore) {
      return providedStore;
    }

    const dashboardAPI = global.DSQDashboard || {};
    if (dashboardAPI.DailySessionStore) {
      return new dashboardAPI.DailySessionStore();
    }

    throw new Error(
      "DigitalSafetyDashboard: DailySessionStore is niet beschikbaar. Zorg dat digitalSafetyQuiz.js geladen is."
    );
  }

  function createView(container, store) {
    const dashboardAPI = global.DSQDashboard || {};
    if (!dashboardAPI.DashboardView) {
      throw new Error(
        "DigitalSafetyDashboard: DashboardView is niet beschikbaar. Zorg dat digitalSafetyQuiz.js geladen is."
      );
    }

    return new dashboardAPI.DashboardView(container, store);
  }

  function createDigitalSafetyDashboard(options = {}) {
    const container = resolveContainer(options.container);
    if (!container) {
      throw new Error(
        "DigitalSafetyDashboard: kon de container niet vinden. Geef een element of CSS-selector door."
      );
    }

    const store = createStore(options.store);
    return createView(container, store);
  }

  global.createDigitalSafetyDashboard = createDigitalSafetyDashboard;
})(typeof window !== "undefined" ? window : this);
