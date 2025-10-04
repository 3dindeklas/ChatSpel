(function () {
  "use strict";

  const PAGE_BASE = new URL("./", window.location.href);

  function normalizeBasePath(path) {
    if (!path || path === "/") {
      return "";
    }
    return path.replace(/\/+$/, "");
  }

  function getApiBasePath() {
    if (typeof window.__CHAT_SPEL_API_BASE_PATH__ === "string") {
      return normalizeBasePath(window.__CHAT_SPEL_API_BASE_PATH__);
    }
    return normalizeBasePath(PAGE_BASE.pathname);
  }

  function getApiBaseUrl() {
    const basePath = getApiBasePath();
    const normalized = basePath ? `${basePath}/` : "";
    return new URL(normalized, PAGE_BASE.origin);
  }

  function buildApiUrl(path) {
    const base = getApiBaseUrl();
    const normalized = (path || "").toString().replace(/^\/+/, "");
    return new URL(normalized, base).toString();
  }

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) {
      element.className = options.className;
    }
    if (options.text) {
      element.textContent = options.text;
    }
    if (options.html) {
      element.innerHTML = options.html;
    }
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    return element;
  }

  function formatType(type) {
    if (type === "multiple") {
      return "Meerdere antwoorden";
    }
    return "Eén antwoord";
  }

  async function fetchQuestions() {
    const response = await fetch(buildApiUrl("api/questions"));
    if (!response.ok) {
      throw new Error("Kon vragen niet laden");
    }
    return response.json();
  }

  function showFeedback(container, message, variant = "error") {
    container.innerHTML = "";
    const box = createElement("div", {
      className: variant === "error" ? "admin-error" : "admin-success",
      text: message
    });
    container.append(box);
  }

  function clearFeedback(container) {
    container.innerHTML = "";
  }

  function renderQuestions(table, emptyState, questions) {
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";

    if (!Array.isArray(questions) || !questions.length) {
      table.hidden = true;
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    table.hidden = false;

    questions.forEach((question) => {
      const row = document.createElement("tr");
      const questionCell = createElement("td", {
        html: `<strong>${question.text}</strong>`
      });

      const moduleCell = createElement("td", {
        text: question.moduleTitle || "Onbekende module"
      });

      const typeCell = createElement("td", {
        html: `<span class="admin-tag">${formatType(question.type)}</span>`
      });

      const actionCell = createElement("td");
      const editLink = createElement("a", {
        className: "admin-button admin-secondary",
        text: "Bewerken",
        attrs: {
          href: `question-editor.html?id=${encodeURIComponent(question.id)}`
        }
      });
      actionCell.append(editLink);

      row.append(questionCell, moduleCell, typeCell, actionCell);
      tbody.append(row);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("questions-table");
    const emptyState = document.getElementById("questions-empty");
    const feedback = document.getElementById("questions-feedback");

    // Zorg dat de API-basis ook beschikbaar is voor andere scripts indien nodig.
    if (!window.__CHAT_SPEL_API_BASE_PATH__) {
      window.__CHAT_SPEL_API_BASE_PATH__ = getApiBasePath();
    }

    fetchQuestions()
      .then((questions) => {
        clearFeedback(feedback);
        renderQuestions(table, emptyState, questions);
      })
      .catch((error) => {
        showFeedback(
          feedback,
          error.message || "Er ging iets mis bij het laden van de vragen."
        );
        table.hidden = true;
        emptyState.hidden = false;
      });
  });
})();
