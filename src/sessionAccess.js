(function () {
  "use strict";

  async function fetchJson(url, options = {}) {
    const requestOptions = { ...options };
    requestOptions.headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (options.body !== undefined && !requestOptions.headers["Content-Type"]) {
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

  function showMessage(element, message) {
    if (!element) {
      return;
    }
    element.textContent = message;
    element.hidden = !message;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#session-access-form");
    const input = document.querySelector("#session-access-key");
    const errorEl = document.querySelector("#session-access-error");
    const infoEl = document.querySelector("#session-access-info");
    const card = document.querySelector("#session-access");
    const choiceCard = document.querySelector("#session-choice-card");
    const soloButton = document.querySelector("#session-start-solo");
    const quizContainer = document.querySelector("#quiz");

    if (!form || !input || !quizContainer) {
      return;
    }

    const submitButton = form.querySelector("button[type=submit]");
    const defaultSubmitLabel = submitButton ? submitButton.textContent : "Ga naar de quiz";
    const defaultSoloLabel = soloButton ? soloButton.textContent.trim() : "";

    let busy = false;
    let busySource = null;

    function setBusy(source, isBusy) {
      busy = isBusy;
      busySource = isBusy ? source : null;

      if (submitButton) {
        submitButton.disabled = isBusy;
        submitButton.textContent =
          isBusy && busySource === "passkey" ? "Bezig..." : defaultSubmitLabel;
      }

      if (input) {
        input.disabled = isBusy;
      }

      if (soloButton) {
        soloButton.disabled = isBusy;
        soloButton.textContent =
          isBusy && busySource === "solo" ? "Bezig..." : defaultSoloLabel;
      }
    }

    function showQuiz(config, group = null) {
      if (!config) {
        return;
      }

      if (choiceCard) {
        choiceCard.hidden = true;
      }

      if (card) {
        card.hidden = true;
      }

      quizContainer.hidden = false;
      quizContainer.innerHTML = "";

      new DigitalSafetyQuiz({
        container: quizContainer,
        config,
        apiBaseUrl: "",
        sessionGroupId: group?.id || null,
        sessionGroup: group || null
      });
    }

    function resetMessages() {
      showMessage(errorEl, "");
      if (infoEl) {
        infoEl.hidden = true;
        infoEl.textContent = "";
      }
    }

    input.addEventListener("input", () => {
      if (errorEl && !errorEl.hidden) {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) {
        return;
      }

      resetMessages();
      const passKey = input.value.trim();
      if (!passKey) {
        showMessage(errorEl, "Vul een toegangscode in");
        input.focus();
        return;
      }

      setBusy("passkey", true);

      try {
        const group = await fetchJson(
          `/api/session-groups/passkey/${encodeURIComponent(passKey)}`
        );
        const config = await fetchJson(
          `/api/quiz-config?sessionGroupId=${encodeURIComponent(group.id)}`
        );

        if (infoEl) {
          const school = group.schoolName || "";
          const groupName = group.groupName || "";
          const parts = [school, groupName].filter((part) => part && part.length);
          infoEl.textContent = parts.length
            ? `Welkom ${parts.join(" – ")}!`
            : "Sessiesleutel gevonden. Veel succes!";
          infoEl.hidden = false;
        }

        showQuiz(config, group);
        return;
      } catch (error) {
        showMessage(
          errorEl,
          error?.message || "Kon de sessie niet vinden. Controleer de code."
        );
        setBusy(null, false);
        input.focus();
        input.select();
        return;
      } finally {
        if (!quizContainer.hidden) {
          setBusy(null, false);
        }
      }
    });

    if (soloButton) {
      soloButton.addEventListener("click", async () => {
        if (busy) {
          return;
        }

        resetMessages();
        setBusy("solo", true);

        try {
          const config = await fetchJson("/api/quiz-config");
          if (infoEl) {
            infoEl.textContent = "De losse quiz wordt geladen. Veel succes!";
            infoEl.hidden = false;
          }
          showQuiz(config, null);
        } catch (error) {
          showMessage(
            errorEl,
            error?.message ||
              "Kon de quiz niet laden. Vernieuw de pagina en probeer opnieuw."
          );
          setBusy(null, false);
        } finally {
          if (!quizContainer.hidden) {
            setBusy(null, false);
          }
        }
      });
    }
  });
})();
