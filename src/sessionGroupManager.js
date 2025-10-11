(function () {
  "use strict";

  async function fetchJson(url, options = {}) {
    const requestOptions = {
      credentials: "same-origin",
      ...options
    };
    requestOptions.headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (
      options.body !== undefined &&
      options.body !== null &&
      !requestOptions.headers["Content-Type"]
    ) {
      requestOptions.headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, requestOptions);
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = null;
      }
    }

    if (!response.ok) {
      const message = data?.message || `Aanvraag mislukt (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function toArray(iterable) {
    return Array.from(iterable || []);
  }

  function getSelectedModuleIds(container) {
    return toArray(container.querySelectorAll("input[type=checkbox]:checked")).map(
      (input) => input.value
    );
  }

  function renderModuleChoices(container, modules, selectedIds = []) {
    const selection = new Set(selectedIds);
    container.innerHTML = "";
    modules.forEach((module) => {
      const wrapper = document.createElement("label");
      wrapper.className = "session-group-module-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "modules";
      input.value = module.id;
      input.checked = selection.size ? selection.has(module.id) : true;
      const span = document.createElement("span");
      span.textContent = module.title;
      wrapper.append(input, span);
      container.append(wrapper);
    });
  }

  function renderModuleToggleList(container, modules, selectedIds = []) {
    const selection = new Set(selectedIds);
    container.innerHTML = "";

    modules.forEach((module) => {
      const item = document.createElement("li");
      item.className = "session-group-module-item";

      const label = document.createElement("label");
      label.className = "session-group-toggle";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = module.id;
      input.checked = selection.has(module.id) || selection.size === 0;
      input.dataset.moduleId = module.id;

      const title = document.createElement("span");
      title.textContent = module.title;

      label.append(input, title);
      item.append(label);
      container.append(item);
    });
  }

  function showMessage(element, message) {
    if (!element) {
      return;
    }
    if (!message) {
      element.hidden = true;
      element.textContent = "";
      return;
    }
    element.textContent = message;
    element.hidden = false;
  }

  function updateSummary(group) {
    const schoolEl = document.getElementById("session-group-summary-school");
    const groupEl = document.getElementById("session-group-summary-group");
    if (schoolEl) {
      schoolEl.textContent = group.schoolName || "";
    }
    if (groupEl) {
      groupEl.textContent = group.groupName || "";
    }
  }

  function updatePassKey(group) {
    const passKeyEl = document.getElementById("session-group-passkey");
    if (passKeyEl) {
      passKeyEl.textContent = group.passKey || "";
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("session-group-form");
    const modulesContainer = document.getElementById(
      "session-group-form-modules"
    );
    const errorEl = document.getElementById("session-group-error");
    const detailsSection = document.getElementById("session-group-details");
    const moduleList = document.getElementById("session-group-module-list");
    const moduleError = document.getElementById("session-group-module-error");
    const moduleStatus = document.getElementById("session-group-module-status");
    const dashboardLink = document.getElementById(
      "session-group-dashboard-link"
    );
    const copyButton = document.getElementById("session-group-copy");

    if (!form || !modulesContainer || !moduleList) {
      return;
    }

    let modules = [];
    let currentGroup = null;
    let savingModules = false;

    function setFormDisabled(isDisabled) {
      toArray(form.elements).forEach((element) => {
        element.disabled = isDisabled;
      });
    }

    function setModuleInputsDisabled(container, isDisabled) {
      toArray(container.querySelectorAll("input[type=checkbox]")).forEach(
        (input) => {
          input.disabled = isDisabled;
        }
      );
    }

    async function loadModules() {
      try {
        modules = await fetchJson("/api/modules");
        renderModuleChoices(modulesContainer, modules);
      } catch (error) {
        showMessage(
          errorEl,
          "Kon de vraaggroepen niet laden. Vernieuw de pagina en probeer opnieuw."
        );
        setFormDisabled(true);
      }
    }

    await loadModules();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!modules.length) {
        return;
      }

      showMessage(errorEl, "");

      const formData = new FormData(form);
      const schoolName = String(formData.get("schoolName") || "").trim();
      const groupName = String(formData.get("groupName") || "").trim();
      const selectedModuleIds = getSelectedModuleIds(modulesContainer);

      setFormDisabled(true);

      try {
        const createdGroup = await fetchJson("/api/session-groups", {
          method: "POST",
          body: JSON.stringify({
            schoolName,
            groupName,
            moduleIds: selectedModuleIds
          })
        });

        currentGroup = createdGroup;
        updatePassKey(createdGroup);
        updateSummary(createdGroup);
        renderModuleToggleList(
          moduleList,
          modules,
          createdGroup.allowedModules
        );
        showMessage(moduleStatus, "Toegangscode aangemaakt. Deel deze met de klas.");
        showMessage(moduleError, "");
        if (detailsSection) {
          detailsSection.hidden = false;
        }
        if (dashboardLink && createdGroup.id) {
          dashboardLink.href = `dashboard.html?groupId=${encodeURIComponent(
            createdGroup.id
          )}`;
        }
      } catch (error) {
        showMessage(errorEl, error?.message || "Er ging iets mis bij het opslaan.");
      } finally {
        setFormDisabled(false);
      }
    });

    moduleList.addEventListener("change", async (event) => {
      const target = event.target;
      if (
        !currentGroup ||
        savingModules ||
        !(target instanceof HTMLInputElement) ||
        target.type !== "checkbox"
      ) {
        return;
      }

      const selectedIds = getSelectedModuleIds(moduleList);
      if (!selectedIds.length) {
        target.checked = true;
        showMessage(
          moduleError,
          "Laat minimaal één vraaggroep aan voor deze sessie."
        );
        return;
      }

      showMessage(moduleError, "");
      showMessage(moduleStatus, "Wijzigingen opslaan...");
      savingModules = true;
      setModuleInputsDisabled(moduleList, true);

      try {
        const updatedGroup = await fetchJson(
          `/api/session-groups/${encodeURIComponent(currentGroup.id)}/modules`,
          {
            method: "PUT",
            body: JSON.stringify({ moduleIds: selectedIds })
          }
        );

        currentGroup = updatedGroup;
        renderModuleToggleList(
          moduleList,
          modules,
          updatedGroup.allowedModules
        );
        showMessage(moduleStatus, "Vraaggroepen bijgewerkt.");
      } catch (error) {
        showMessage(
          moduleError,
          error?.message || "Opslaan van vraaggroepen is mislukt."
        );
        renderModuleToggleList(
          moduleList,
          modules,
          currentGroup.allowedModules
        );
      } finally {
        savingModules = false;
        setModuleInputsDisabled(moduleList, false);
      }
    });

    async function tryCopyToClipboard(text) {
      if (!text) {
        return false;
      }

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (error) {
          /* negeer en probeer fallback */
        }
      }

      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.append(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        textarea.remove();
        return success;
      } catch (error) {
        return false;
      }
    }

    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        const passKey = currentGroup?.passKey;
        if (!passKey) {
          return;
        }

        const originalLabel = copyButton.textContent;
        copyButton.disabled = true;
        const success = await tryCopyToClipboard(passKey);
        copyButton.disabled = false;
        copyButton.textContent = success ? "Gekopieerd!" : "Kopieer handmatig";

        window.setTimeout(() => {
          copyButton.textContent = originalLabel;
        }, success ? 2000 : 3000);
      });
    }
  });
})();
