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
        element.setAttribute(key, value);
      });
    }
    return element;
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

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  async function fetchModules() {
    const response = await fetch(buildApiUrl("api/modules"));
    if (!response.ok) {
      throw new Error("Kon categorieën niet laden");
    }
    return response.json();
  }

  async function fetchQuestion(id) {
    const response = await fetch(
      buildApiUrl(`api/questions/${encodeURIComponent(id)}`)
    );
    if (!response.ok) {
      throw new Error("Kon vraag niet laden");
    }
    return response.json();
  }

  function createOptionField(optionsList, option = {}) {
    const wrapper = createElement("div", { className: "admin-option" });
    const input = createElement("input", {
      attrs: {
        type: "text",
        value: option.label || "",
        placeholder: "Optietekst",
        required: "required"
      }
    });
    if (option.id) {
      input.dataset.optionId = option.id;
    }

    const checkboxWrapper = createElement("label", {
      className: "admin-tag"
    });
    const checkbox = createElement("input", {
      attrs: {
        type: "checkbox",
        checked: option.isCorrect ? "checked" : undefined
      }
    });
    const checkboxLabel = createElement("span", { text: "Juist" });
    checkboxWrapper.append(checkbox, checkboxLabel);

    const removeButton = createElement("button", {
      className: "admin-option-remove",
      text: "Verwijderen",
      attrs: { type: "button" }
    });

    removeButton.addEventListener("click", () => {
      if (optionsList.children.length <= 2) {
        showFeedback(
          $("#editor-feedback"),
          "Een vraag moet minimaal twee antwoordopties hebben."
        );
        return;
      }
      optionsList.removeChild(wrapper);
    });

    wrapper.append(input, checkboxWrapper, removeButton);
    optionsList.append(wrapper);
  }

  function readOptions(optionsList) {
    const items = Array.from(optionsList.querySelectorAll(".admin-option"));
    return items.map((item) => {
      const input = item.querySelector("input[type='text']");
      const checkbox = item.querySelector("input[type='checkbox']");
      return {
        id: input.dataset.optionId,
        label: input.value.trim(),
        isCorrect: checkbox.checked
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const feedback = $("#editor-feedback");
    clearFeedback(feedback);

    const moduleSelect = $("#question-module");
    const textInput = $("#question-text");
    const typeSelect = $("#question-type");
    const optionsList = $("#options-list");
    const feedbackCorrect = $("#feedback-correct");
    const feedbackIncorrect = $("#feedback-incorrect");

    const options = readOptions(optionsList).filter((option) => option.label);

    if (options.length < 2) {
      showFeedback(feedback, "Voeg minimaal twee antwoordopties toe.");
      return;
    }

    if (!options.some((option) => option.isCorrect)) {
      showFeedback(feedback, "Markeer minimaal één juist antwoord.");
      return;
    }

    const payload = {
      moduleId: moduleSelect.value,
      text: textInput.value.trim(),
      type: typeSelect.value,
      feedback: {
        correct: feedbackCorrect.value.trim(),
        incorrect: feedbackIncorrect.value.trim()
      },
      options
    };

    const questionId = getQueryParam("id");
    const url = questionId
      ? buildApiUrl(`api/questions/${encodeURIComponent(questionId)}`)
      : buildApiUrl("api/questions");
    const method = questionId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || "Opslaan is mislukt.";
      showFeedback(feedback, message);
      return;
    }

    showFeedback(feedback, "Vraag opgeslagen.", "success");
    setTimeout(() => {
      window.location.href = "questions.html";
    }, 800);
  }

  function populateModules(select, modules, selectedId) {
    select.innerHTML = "";
    modules.forEach((module) => {
      const option = createElement("option", {
        text: module.title,
        attrs: { value: module.id }
      });
      if (selectedId && selectedId === module.id) {
        option.selected = true;
      }
      select.append(option);
    });
  }

  function populateForm(question) {
    $("#editor-title").textContent = "Vraag bewerken";
    $("#question-text").value = question.text || "";
    $("#question-type").value = question.type || "single";
    $("#feedback-correct").value = question.feedback?.correct || "";
    $("#feedback-incorrect").value = question.feedback?.incorrect || "";

    const optionsList = $("#options-list");
    optionsList.innerHTML = "";
    const options = Array.isArray(question.options) && question.options.length
      ? question.options
      : [{}, {}];
    options.forEach((option) => createOptionField(optionsList, option));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const feedback = $("#editor-feedback");
    const optionsList = $("#options-list");
    const addButton = $("#add-option");
    const cancelButton = $("#cancel-button");
    const form = $("#question-form");
    const moduleSelect = $("#question-module");

    if (!window.__CHAT_SPEL_API_BASE_PATH__) {
      window.__CHAT_SPEL_API_BASE_PATH__ = getApiBasePath();
    }

    let modules = [];
    try {
      modules = await fetchModules();
      populateModules(moduleSelect, modules, null);
    } catch (error) {
      showFeedback(feedback, error.message || "Kon de categorieën niet laden.");
      return;
    }

    const questionId = getQueryParam("id");
    if (questionId) {
      try {
        const question = await fetchQuestion(questionId);
        populateModules(moduleSelect, modules, question.moduleId);
        populateForm(question);
      } catch (error) {
        showFeedback(
          feedback,
          error.message || "Kon de vraaggegevens niet laden."
        );
        return;
      }
    } else {
      optionsList.innerHTML = "";
      createOptionField(optionsList, {});
      createOptionField(optionsList, {});
    }

    addButton.addEventListener("click", () => {
      createOptionField(optionsList, {});
    });

    cancelButton.addEventListener("click", () => {
      window.location.href = "questions.html";
    });

    form.addEventListener("submit", (event) => {
      handleSubmit(event).catch((error) => {
        showFeedback(
          feedback,
          error.message || "Er is een fout opgetreden tijdens het opslaan."
        );
      });
    });
  });
})();
