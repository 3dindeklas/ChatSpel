(function () {
  "use strict";

  const adminUI = (window.ChatSpel && window.ChatSpel.adminUI) || {};
  const {
    createElement,
    createIcon,
    showFeedback,
    clearFeedback,
    setListVisibility
  } = adminUI;

  if (typeof createElement !== "function") {
    throw new Error("Admin UI helpers zijn niet geladen");
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

    setListVisibility(table, emptyState, questions);

    if (!Array.isArray(questions) || !questions.length) {
      return;
    }

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
