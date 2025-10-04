(function () {
  "use strict";

  function getSheetOptions() {
    const sheetOptions = {};
    const mappings = [
      ["sheetId", "__CHAT_SPEL_GOOGLE_SHEETS_ID__"],
      ["defaultsSheet", "__CHAT_SPEL_GOOGLE_SHEETS_DEFAULTS_SHEET__"],
      ["modulesSheet", "__CHAT_SPEL_GOOGLE_SHEETS_MODULES_SHEET__"],
      ["questionsSheet", "__CHAT_SPEL_GOOGLE_SHEETS_QUESTIONS_SHEET__"],
      ["optionsSheet", "__CHAT_SPEL_GOOGLE_SHEETS_OPTIONS_SHEET__"]
    ];

    mappings.forEach(([optionKey, globalKey]) => {
      const value = window[globalKey];
      if (typeof value === "string" && value.trim()) {
        sheetOptions[optionKey] = value.trim();
      }
    });

    if (
      !sheetOptions.sheetId &&
      window.DSQGoogleSheets &&
      window.DSQGoogleSheets.DEFAULT_SHEET_ID
    ) {
      sheetOptions.sheetId = window.DSQGoogleSheets.DEFAULT_SHEET_ID;
    }

    return sheetOptions;
  }

  function getSpreadsheetUrl() {
    const sheetId =
      (typeof window.__CHAT_SPEL_GOOGLE_SHEETS_ID__ === "string" &&
        window.__CHAT_SPEL_GOOGLE_SHEETS_ID__.trim()) ||
      (window.DSQGoogleSheets && window.DSQGoogleSheets.DEFAULT_SHEET_ID) ||
      "";

    if (!sheetId) {
      return "";
    }

    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
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
        if (value !== undefined) {
          element.setAttribute(key, value);
        }
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
    if (
      !window.DSQGoogleSheets ||
      typeof window.DSQGoogleSheets.listQuestions !== "function"
    ) {
      throw new Error(
        "Google Sheets loader is niet beschikbaar. Controleer of googleSheetsConfigClient.js geladen is."
      );
    }
    return window.DSQGoogleSheets.listQuestions(getSheetOptions());
  }

  function showFeedback(container, message, variant = "error") {
    container.innerHTML = "";
    const box = createElement("div", {
      className:
        variant === "success"
          ? "admin-success"
          : variant === "info"
          ? "admin-info"
          : "admin-error",
      html: message
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

      const actionCell = createElement("td", {
        html: "<span class=\"admin-hint\">Aanpassen doe je in Google Sheets</span>"
      });

      row.append(questionCell, moduleCell, typeCell, actionCell);
      tbody.append(row);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("questions-table");
    const emptyState = document.getElementById("questions-empty");
    const feedback = document.getElementById("questions-feedback");
    const hint = document.getElementById("questions-hint");

    const spreadsheetUrl = getSpreadsheetUrl();
    if (hint && spreadsheetUrl) {
      const link = createElement("a", {
        text: "open het Google Sheet",
        attrs: { href: spreadsheetUrl, target: "_blank", rel: "noopener" }
      });
      hint.innerHTML = "Beheer de vragen rechtstreeks in Google Sheets (";
      hint.append(link);
      hint.append(
        document.createTextNode(
          "). Wijzigingen verschijnen automatisch in het overzicht."
        )
      );
    }

    fetchQuestions()
      .then((questions) => {
        clearFeedback(feedback);
        renderQuestions(table, emptyState, questions);
      })
      .catch((error) => {
        showFeedback(
          feedback,
          error.message ||
            "Er ging iets mis bij het laden van de vragen. Controleer de Google Sheet configuratie.",
          "error"
        );
        table.hidden = true;
        emptyState.hidden = false;
      });
  });
})();
