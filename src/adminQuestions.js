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

      const actionCell = createElement("td");
      const editLink = createElement("a", {
        className: "admin-button admin-secondary",
        text: "Bewerken",
        attrs: {
          href: `question-editor.html?id=${encodeURIComponent(question.id)}`
        }
      });
      actionCell.append(editLink);

      const deleteButton = createElement("button", {
        className: "admin-button admin-danger",
        text: "Verwijderen",
        attrs: { type: "button" }
      });
      deleteButton.addEventListener("click", () => {
        if (typeof onDelete === "function") {
          onDelete(question, deleteButton);
        }
      });
      actionCell.append(deleteButton);

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
