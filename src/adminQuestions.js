(function () {
  "use strict";

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
        if (value !== undefined && value !== null) {
          element.setAttribute(key, value);
        }
      });
    }
    return element;
  }

  const ICON_SVGS = {
    edit:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.232 5.232a2.5 2.5 0 0 0-3.536 0l-7.5 7.5a1 1 0 0 0-.263.465l-1 3.5a1 1 0 0 0 1.263 1.263l3.5-1a1 1 0 0 0 .465-.263l7.5-7.5a2.5 2.5 0 0 0 0-3.536l-1.5-1.5Zm-2.122 1.414 1.5 1.5-6.95 6.95-1.5-1.5 6.95-6.95Z"/><path d="M5.586 17H4a1 1 0 0 1-1-1v-1.586a1 1 0 0 1 .293-.707l2 2a1 1 0 0 1-.707.293Z"/></svg>',
    delete:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2h3a1 1 0 1 1 0 2h-1v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6H3a1 1 0 1 1 0-2h4Zm6 2H7v11h6V6Zm-4 3a1 1 0 0 1 2 0v5a1 1 0 1 1-2 0V9Zm4 0a1 1 0 0 1 2 0v5a1 1 0 0 1-2 0V9Z"/></svg>'
  };

  function createIcon(type) {
    const svg = ICON_SVGS[type];
    if (!svg) {
      return null;
    }
    const wrapper = document.createElement("span");
    wrapper.className = "admin-button__icon";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = svg;
    return wrapper;
  }

  function formatType(type) {
    if (type === "multiple") {
      return "Meerdere antwoorden";
    }
    return "Eén antwoord";
  }

  async function fetchQuestions() {
    const response = await fetch("/api/questions");
    if (!response.ok) {
      throw new Error("Kon vragen niet laden");
    }
    return response.json();
  }

  function showFeedback(container, message, variant = "error") {
    if (!container) {
      return;
    }
    container.innerHTML = "";
    const box = createElement("div", {
      className: variant === "error" ? "admin-error" : "admin-success",
      text: message
    });
    container.append(box);
  }

  function clearFeedback(container) {
    if (container) {
      container.innerHTML = "";
    }
  }

  function resolveModuleTitle(question) {
    if (!question || typeof question !== "object") {
      return "Onbekende module";
    }

    return (
      question.moduleTitle ||
      question.module_title ||
      question.moduletitle ||
      "Onbekende module"
    );
  }

  function renderQuestions(table, emptyState, questions, onDelete) {
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
        text: resolveModuleTitle(question)
      });

      const typeCell = createElement("td", {
        html: `<span class="admin-tag">${formatType(question.type)}</span>`
      });

      const questionText = question.text || "deze vraag";

      const actionCell = createElement("td");
      const actionGroup = createElement("div", {
        className: "admin-table__actions"
      });
      const editLink = createElement("a", {
        className: "admin-button admin-secondary",
        attrs: {
          href: `question-editor.html?id=${encodeURIComponent(question.id)}`,
          "aria-label": `Vraag "${questionText}" bewerken`,
          title: `Bewerken (${questionText})`
        }
      });
      const editIcon = createIcon("edit");
      if (editIcon) {
        editLink.prepend(editIcon);
      }
      actionGroup.append(editLink);

      const deleteButton = createElement("button", {
        className: "admin-button admin-danger",
        attrs: {
          type: "button",
          "aria-label": `Vraag "${questionText}" verwijderen`,
          title: `Verwijderen (${questionText})`
        }
      });
      const deleteIcon = createIcon("delete");
      if (deleteIcon) {
        deleteButton.prepend(deleteIcon);
      }
      deleteButton.addEventListener("click", () => {
        if (typeof onDelete === "function") {
          onDelete(question, deleteButton);
        }
      });
      actionGroup.append(deleteButton);
      actionCell.append(actionGroup);

      row.append(questionCell, moduleCell, typeCell, actionCell);
      tbody.append(row);
    });
  }

  async function deleteQuestion(id) {
    const response = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Kon de vraag niet verwijderen");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("questions-table");
    const emptyState = document.getElementById("questions-empty");
    const feedback = document.getElementById("questions-feedback");

    const state = {
      questions: []
    };

    function refreshTable() {
      renderQuestions(table, emptyState, state.questions, handleDelete);
    }

    function handleDelete(question, button) {
      if (!question) {
        return;
      }

      const questionText = question.text || "deze vraag";
      const confirmed = window.confirm(
        `Weet je zeker dat je "${questionText}" wilt verwijderen? ` +
          "Deze actie kan niet ongedaan worden gemaakt."
      );
      if (!confirmed) {
        return;
      }

      if (button) {
        button.disabled = true;
      }

      clearFeedback(feedback);

      deleteQuestion(question.id)
        .then(() => {
          state.questions = state.questions.filter(
            (item) => item.id !== question.id
          );
          refreshTable();
          showFeedback(
            feedback,
            `Vraag "${questionText}" is verwijderd.`,
            "success"
          );
        })
        .catch((error) => {
          showFeedback(
            feedback,
            error.message || "Kon de vraag niet verwijderen"
          );
          if (button) {
            button.disabled = false;
          }
        });
    }

    fetchQuestions()
      .then((questions) => {
        state.questions = Array.isArray(questions) ? questions : [];
        clearFeedback(feedback);
        refreshTable();
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
