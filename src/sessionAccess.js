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
    const quizContainer = document.querySelector("#quiz");

    if (!form || !input || !quizContainer) {
      return;
    }

    let loading = false;

    function setLoading(isLoading) {
      loading = isLoading;
      const submitButton = form.querySelector("button[type=submit]");
      if (submitButton) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? "Bezig..." : "Ga naar de quiz";
      }
      input.disabled = isLoading;
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
      if (loading) {
        return;
      }

      resetMessages();
      const passKey = input.value.trim();
      if (!passKey) {
        showMessage(errorEl, "Vul een toegangscode in");
        input.focus();
        return;
      }

      setLoading(true);

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

        if (card) {
          card.hidden = true;
        }

        quizContainer.hidden = false;

        new DigitalSafetyQuiz({
          container: quizContainer,
          config,
          apiBaseUrl: "",
          sessionGroupId: group.id,
          sessionGroup: group
        });
        setLoading(false);
        return;
      } catch (error) {
        showMessage(
          errorEl,
          error?.message || "Kon de sessie niet vinden. Controleer de code."
        );
        setLoading(false);
        input.focus();
        input.select();
        return;
      }
    });
  });
})();
