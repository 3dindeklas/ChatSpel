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

  function $(selector) {
    return document.querySelector(selector);
  }

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) {
      element.className = options.className;
    }
    if (options.text) {
      element.textContent = options.text;
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

  function showFeedback(container, message, variant = "info") {
    container.innerHTML = "";
    const box = createElement("div", {
      className:
        variant === "error"
          ? "admin-error"
          : variant === "success"
          ? "admin-success"
          : "admin-info",
      text: message
    });
    container.append(box);
  }

  function populateModules(select, modules, selectedId) {
    if (!select) {
      return;
    }
    select.innerHTML = "";
    modules.forEach((module) => {
      const option = createElement("option", {
        text: module.title,
        attrs: { value: module.id }
      });
      select.append(option);
    });
    if (selectedId) {
      select.value = selectedId;
    }
    select.disabled = true;
  }

  function renderOptionsList(optionsList, question) {
    if (!optionsList) {
      return;
    }
    optionsList.innerHTML = "";
    const options = Array.isArray(question?.options) ? question.options : [];
    const correctIds = new Set(
      Array.isArray(question?.options)
        ? options
            .filter((option) => option.isCorrect)
            .map((option) => option.id)
        : []
    );

    if (!options.length) {
      const empty = createElement("p", {
        className: "admin-hint",
        text: "Geen antwoordopties gevonden in de Google Sheet."
      });
      optionsList.append(empty);
      return;
    }

    options.forEach((option) => {
      const wrapper = createElement("div", { className: "admin-option" });
      const label = createElement("span", {
        className: "admin-option-label",
        text: option.label || "(Lege optie)"
      });
      wrapper.append(label);

      if (correctIds.has(option.id)) {
        const badge = createElement("span", {
          className: "admin-tag",
          text: "Juist antwoord"
        });
        wrapper.append(badge);
      }

      optionsList.append(wrapper);
    });
  }

  function disableFormInteractions(form) {
    if (!form) {
      return;
    }
    const controls = form.querySelectorAll("input, textarea, select, button");
    controls.forEach((control) => {
      if (control.id === "cancel-button") {
        return;
      }
      control.disabled = true;
    });
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  async function loadConfig() {
    if (
      !window.DSQGoogleSheets ||
      typeof window.DSQGoogleSheets.loadQuizConfig !== "function"
    ) {
      throw new Error(
        "Google Sheets loader is niet beschikbaar. Controleer of googleSheetsConfigClient.js geladen is."
      );
    }
    return window.DSQGoogleSheets.loadQuizConfig(getSheetOptions());
  }

  async function loadQuestionDetail(questionId) {
    if (!questionId) {
      return null;
    }
    if (
      !window.DSQGoogleSheets ||
      typeof window.DSQGoogleSheets.getQuestionDetail !== "function"
    ) {
      throw new Error(
        "Google Sheets loader is niet beschikbaar. Controleer of googleSheetsConfigClient.js geladen is."
      );
    }
    return window.DSQGoogleSheets.getQuestionDetail(
      questionId,
      getSheetOptions()
    );
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const title = $("#editor-title");
    const form = $("#question-form");
    const feedback = $("#editor-feedback");
    const hint = $("#editor-hint");
    const moduleSelect = $("#question-module");
    const textInput = $("#question-text");
    const typeSelect = $("#question-type");
    const feedbackCorrect = $("#feedback-correct");
    const feedbackIncorrect = $("#feedback-incorrect");
    const optionsList = $("#options-list");
    const addOptionButton = $("#add-option");
    const cancelButton = $("#cancel-button");

    if (addOptionButton) {
      addOptionButton.style.display = "none";
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        showFeedback(
          feedback,
          "Wijzig vragen rechtstreeks in Google Sheets. Deze pagina toont alleen een voorbeeld.",
          "info"
        );
      });
    }

    if (cancelButton) {
      cancelButton.textContent = "Terug";
      cancelButton.addEventListener("click", () => {
        window.location.href = "questions.html";
      });
    }

    const spreadsheetUrl = getSpreadsheetUrl();
    if (hint && spreadsheetUrl) {
      const link = createElement("a", {
        text: "open het Google Sheet",
        attrs: { href: spreadsheetUrl, target: "_blank", rel: "noopener" }
      });
      hint.innerHTML = "Alle wijzigingen voer je uit in Google Sheets (";
      hint.append(link);
      hint.append(document.createTextNode(")"));
    }

    const questionId = getQueryParam("id");
    showFeedback(
      feedback,
      "Gegevens worden geladen vanuit Google Sheets...",
      "info"
    );

    try {
      const config = await loadConfig();
      const modules = config.modules.map((module) => ({
        id: module.id,
        title: module.title
      }));

      populateModules(moduleSelect, modules, null);

      let detail = null;
      if (questionId) {
        detail = await loadQuestionDetail(questionId);
      }

      if (detail) {
        if (title) {
          title.textContent = "Vraag bekijken";
        }
        moduleSelect.value = detail.moduleId || "";
        textInput.value = detail.text || "";
        typeSelect.value = detail.type || "single";
        feedbackCorrect.value = detail.feedback?.correct || "";
        feedbackIncorrect.value = detail.feedback?.incorrect || "";
        renderOptionsList(optionsList, detail);
        showFeedback(
          feedback,
          "Je bekijkt een vraag vanuit Google Sheets. Pas de gegevens daar aan om wijzigingen op te slaan.",
          "info"
        );
      } else {
        if (title) {
          title.textContent = "Vraagbeheer";
        }
        renderOptionsList(optionsList, { options: [] });
        showFeedback(
          feedback,
          "Nieuwe vragen voeg je toe in Google Sheets. Deze editor is alleen ter referentie.",
          "info"
        );
      }

      disableFormInteractions(form);
    } catch (error) {
      showFeedback(
        feedback,
        error.message ||
          "Het is niet gelukt om de gegevens uit Google Sheets te laden.",
        "error"
      );
      if (optionsList) {
        optionsList.innerHTML = "";
      }
    }
  });
})();
