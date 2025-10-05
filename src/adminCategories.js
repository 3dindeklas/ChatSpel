(function () {
  "use strict";

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

  function normalizeModule(module) {
    if (!module) {
      return null;
    }
    const questions = Number(module.questionsPerSession);
    return {
      id: module.id,
      title: module.title || "Naamloze categorie",
      questionsPerSession:
        Number.isFinite(questions) && questions > 0 ? questions : 1,
      isActive: Boolean(module.isActive)
    };
  }

  async function fetchModules() {
    const response = await fetch("/api/modules");
    if (!response.ok) {
      throw new Error("Kon categorieën niet laden");
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((module) => normalizeModule(module))
      .filter((module) => module !== null);
  }

  async function createModule(payload) {
    const response = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || "Kon de categorie niet aanmaken"
      );
    }

    const data = await response.json();
    return normalizeModule(data);
  }

  async function updateModule(id, payload) {
    const response = await fetch(`/api/modules/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Kon de categorie niet bijwerken");
    }

    const data = await response.json();
    return normalizeModule(data);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("categories-table");
    const tableBody = table ? table.querySelector("tbody") : null;
    const emptyState = document.getElementById("categories-empty");
    const listFeedback = document.getElementById("categories-feedback");
    const newButton = document.getElementById("category-new");

    const form = document.getElementById("category-form");
    const formTitle = document.getElementById("category-form-title");
    const nameInput = document.getElementById("category-name");
    const questionsInput = document.getElementById("category-questions");
    const activeInput = document.getElementById("category-active");
    const formFeedback = document.getElementById("category-form-feedback");
    const cancelButton = document.getElementById("category-cancel");
    const submitButton = form ? form.querySelector("button[type='submit']") : null;

    const state = {
      modules: [],
      editingId: null
    };

    function setEditing(module) {
      if (!module) {
        state.editingId = null;
        if (formTitle) {
          formTitle.textContent = "Nieuwe categorie";
        }
        if (nameInput) {
          nameInput.value = "";
        }
        if (questionsInput) {
          questionsInput.value = "5";
        }
        if (activeInput) {
          activeInput.checked = true;
        }
        if (cancelButton) {
          cancelButton.hidden = true;
        }
        return;
      }

      state.editingId = module.id;
      if (formTitle) {
        formTitle.textContent = "Categorie bewerken";
      }
      if (nameInput) {
        nameInput.value = module.title || "";
      }
      if (questionsInput) {
        questionsInput.value = String(module.questionsPerSession || 1);
      }
      if (activeInput) {
        activeInput.checked = Boolean(module.isActive);
      }
      if (cancelButton) {
        cancelButton.hidden = false;
      }
    }

    function updateLocalModule(updated) {
      const index = state.modules.findIndex((module) => module.id === updated.id);
      if (index !== -1) {
        state.modules[index] = updated;
      } else {
        state.modules.push(updated);
      }
    }

    function renderModules() {
      if (!table || !tableBody) {
        return;
      }

      tableBody.innerHTML = "";

      if (!state.modules.length) {
        table.hidden = true;
        if (emptyState) {
          emptyState.hidden = false;
        }
        return;
      }

      table.hidden = false;
      if (emptyState) {
        emptyState.hidden = true;
      }

      state.modules.forEach((module) => {
        const row = document.createElement("tr");

        const nameCell = createElement("td");
        const nameLabel = createElement("strong", { text: module.title });
        nameCell.append(nameLabel);
        if (!module.isActive) {
          nameCell.append(" ");
          nameCell.append(
            createElement("span", {
              className: "admin-tag admin-tag--muted",
              text: "Inactief"
            })
          );
        }

        const questionsCell = createElement("td", {
          text: String(module.questionsPerSession)
        });

        const statusCell = createElement("td");
        const toggleLabel = createElement("label", {
          className: "admin-toggle",
          text: "Actief"
        });
        const toggle = createElement("input", {
          attrs: { type: "checkbox" }
        });
        toggle.checked = Boolean(module.isActive);
        toggle.addEventListener("change", () => {
          const desired = toggle.checked;
          toggle.disabled = true;
          clearFeedback(listFeedback);
          updateModule(module.id, {
            title: module.title,
            questionsPerSession: module.questionsPerSession,
            isActive: desired
          })
            .then((updated) => {
              updateLocalModule(updated);
              renderModules();
              showFeedback(
                listFeedback,
                `Categorie "${updated.title}" is ${
                  updated.isActive ? "geactiveerd" : "gedeactiveerd"
                }.`,
                "success"
              );
            })
            .catch((error) => {
              toggle.checked = !desired;
              showFeedback(
                listFeedback,
                error.message || "Kon de status niet bijwerken"
              );
            })
            .finally(() => {
              toggle.disabled = false;
            });
        });
        toggleLabel.prepend(toggle);
        statusCell.append(toggleLabel);

        const actionCell = createElement("td");
        const editButton = createElement("button", {
          className: "admin-button admin-secondary",
          text: "Bewerken",
          attrs: { type: "button" }
        });
        editButton.addEventListener("click", () => {
          setEditing(module);
          clearFeedback(formFeedback);
          if (nameInput) {
            nameInput.focus();
          }
        });
        actionCell.append(editButton);

        row.append(nameCell, questionsCell, statusCell, actionCell);
        tableBody.append(row);
      });
    }

    function refreshModules() {
      clearFeedback(listFeedback);
      if (emptyState) {
        emptyState.hidden = true;
      }
      if (table) {
        table.hidden = true;
      }

      return fetchModules()
        .then((modules) => {
          state.modules = modules;
          renderModules();
        })
        .catch((error) => {
          showFeedback(
            listFeedback,
            error.message || "Kon categorieën niet laden"
          );
        });
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        clearFeedback(formFeedback);
        setEditing(null);
      });
    }

    if (newButton) {
      newButton.addEventListener("click", () => {
        clearFeedback(formFeedback);
        setEditing(null);
        if (nameInput) {
          nameInput.focus();
        }
      });
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!submitButton) {
          return;
        }

        const title = nameInput ? nameInput.value.trim() : "";
        const questionsValue = questionsInput ? questionsInput.value : "";
        const questionsPerSession = Number.parseInt(questionsValue, 10);
        const isActive = activeInput ? activeInput.checked : true;

        clearFeedback(formFeedback);

        if (!title) {
          showFeedback(formFeedback, "Vul een titel in");
          return;
        }

        if (!Number.isFinite(questionsPerSession) || questionsPerSession <= 0) {
          showFeedback(
            formFeedback,
            "Vul een positief aantal vragen per sessie in"
          );
          return;
        }

        submitButton.disabled = true;

        const payload = {
          title,
          questionsPerSession,
          isActive
        };

        const request = state.editingId
          ? updateModule(state.editingId, payload)
          : createModule(payload);

        request
          .then((module) => {
            updateLocalModule(module);
            renderModules();
            showFeedback(
              formFeedback,
              state.editingId
                ? "Categorie bijgewerkt"
                : "Categorie toegevoegd",
              "success"
            );
            if (!state.editingId) {
              setEditing(null);
            } else {
              setEditing(module);
            }
            refreshModules();
          })
          .catch((error) => {
            showFeedback(
              formFeedback,
              error.message || "Opslaan is mislukt"
            );
          })
          .finally(() => {
            submitButton.disabled = false;
          });
      });
    }

    setEditing(null);
    refreshModules();
  });
})();
