(function (global) {
  "use strict";

  function parseGroupId() {
    if (typeof window === "undefined") {
      return null;
    }
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("groupId") ||
      params.get("sessionGroupId") ||
      params.get("session_group_id") ||
      null
    );
  }

  async function fetchJson(url) {
    const response = await fetch(url, { credentials: "same-origin" });
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

    return data || {};
  }

  function formatCount(value) {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric.toLocaleString("nl-NL") : "0";
  }

  function renderMetric(label) {
    const wrapper = document.createElement("div");
    wrapper.className = "session-dashboard-metric";

    const valueEl = document.createElement("span");
    valueEl.className = "session-dashboard-metric-value";
    valueEl.textContent = "0";

    const labelEl = document.createElement("span");
    labelEl.className = "session-dashboard-metric-label";
    labelEl.textContent = label;

    wrapper.append(valueEl, labelEl);
    return { wrapper, valueEl, labelEl };
  }

  function createCopyButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "session-dashboard-passkey-copy dsq-button-secondary";
    button.textContent = "Kopieer code";
    button.disabled = true;
    return button;
  }

  async function copyToClipboard(text) {
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

  function renderGroupDashboard(container) {
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "session-dashboard";

    const header = document.createElement("div");
    header.className = "session-dashboard-header";

    const passKeyWrapper = document.createElement("div");
    passKeyWrapper.className = "session-dashboard-passkey";

    const passKeyLabel = document.createElement("span");
    passKeyLabel.className = "session-dashboard-passkey-label";
    passKeyLabel.textContent = "Toegangscode:";

    const passKeyValue = document.createElement("code");
    passKeyValue.className = "session-dashboard-passkey-value";
    passKeyValue.textContent = "—";

    const passKeyButton = createCopyButton();

    passKeyWrapper.append(passKeyLabel, passKeyValue, passKeyButton);

    const titleEl = document.createElement("h2");
    titleEl.className = "session-dashboard-title";
    titleEl.textContent = "Sessiestatistieken";

    header.append(passKeyWrapper, titleEl);

    const metricsWrapper = document.createElement("div");
    metricsWrapper.className = "session-dashboard-metrics";
    const participantMetric = renderMetric("Actieve deelnemers");
    const correctMetric = renderMetric("Goede antwoorden");
    const incorrectMetric = renderMetric("Foute antwoorden");
    metricsWrapper.append(
      participantMetric.wrapper,
      correctMetric.wrapper,
      incorrectMetric.wrapper
    );

    const listSection = document.createElement("div");
    listSection.className = "session-dashboard-list-section";

    const listTitle = document.createElement("h3");
    listTitle.textContent = "Actieve leerlingen";

    const list = document.createElement("ul");
    list.className = "dsq-dashboard-session-list";

    const errorEl = document.createElement("p");
    errorEl.className = "session-dashboard-error";
    errorEl.hidden = true;

    listSection.append(listTitle, list);

    wrapper.append(header, metricsWrapper, listSection, errorEl);
    container.append(wrapper);

    return {
      titleEl,
      passKey: {
        wrapper: passKeyWrapper,
        value: passKeyValue,
        button: passKeyButton,
        current: "",
        defaultLabel: passKeyButton.textContent,
        resetTimer: null
      },
      metrics: {
        participants: participantMetric.valueEl,
        correct: correctMetric.valueEl,
        incorrect: incorrectMetric.valueEl
      },
      list,
      errorEl
    };
  }

  function updateActiveList(list, sessions) {
    list.innerHTML = "";
    if (!sessions || !sessions.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "dsq-dashboard-session-empty";
      emptyItem.textContent = "Geen actieve leerlingen";
      list.append(emptyItem);
      return;
    }

    const sortedSessions = [...sessions].sort((a, b) => {
      const correctDiff = (b.correct || 0) - (a.correct || 0);
      if (correctDiff !== 0) {
        return correctDiff;
      }
      const incorrectDiff = (a.incorrect || 0) - (b.incorrect || 0);
      if (incorrectDiff !== 0) {
        return incorrectDiff;
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "nl");
    });

    sortedSessions.forEach((session) => {
      const item = document.createElement("li");
      item.className = "dsq-dashboard-session-item";

      const nameEl = document.createElement("span");
      nameEl.className = "dsq-dashboard-session-name";
      nameEl.textContent = session.name || "Onbekende deelnemer";

      const statsEl = document.createElement("span");
      statsEl.className = "dsq-dashboard-session-stats";
      statsEl.textContent = `${formatCount(session.correct || 0)} goed • ${formatCount(
        session.incorrect || 0
      )} fout`;

      const timeEl = document.createElement("span");
      timeEl.className = "dsq-dashboard-session-time";
      let startLabel = "--:--";
      if (session.startTime) {
        const startDate = new Date(session.startTime);
        if (!Number.isNaN(startDate.getTime())) {
          startLabel = startDate.toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit"
          });
        }
      }
      timeEl.textContent = `Gestart om ${startLabel}`;

      item.append(nameEl, statsEl, timeEl);
      list.append(item);
    });
  }

  function updateGroupDashboard(state, data) {
    const group = data.group || {};
    const titleParts = [];
    if (group.groupName) {
      titleParts.push(group.groupName);
    }
    if (group.schoolName) {
      titleParts.push(group.schoolName);
    }
    state.titleEl.textContent = titleParts.length
      ? `Sessiestatistieken – ${titleParts.join(" • ")}`
      : "Sessiestatistieken";

    const passKey = group.passKey || "";
    if (state.passKey.resetTimer) {
      window.clearTimeout(state.passKey.resetTimer);
      state.passKey.resetTimer = null;
    }
    state.passKey.button.textContent = state.passKey.defaultLabel;
    state.passKey.value.textContent = passKey || "—";
    state.passKey.button.disabled = !passKey;
    state.passKey.current = passKey;

    state.metrics.participants.textContent = formatCount(
      data.activeParticipants || 0
    );
    state.metrics.correct.textContent = formatCount(data.totalCorrect || 0);
    state.metrics.incorrect.textContent = formatCount(data.totalIncorrect || 0);

    updateActiveList(state.list, data.activeSessions || []);
    state.errorEl.hidden = true;
  }

  function showDashboardError(state, message) {
    state.errorEl.textContent = message;
    state.errorEl.hidden = false;
  }

  function renderComparisonRow(label, stats) {
    const row = document.createElement("div");
    row.className = "session-comparison-row";

    const labelEl = document.createElement("div");
    labelEl.className = "session-comparison-label";
    labelEl.textContent = label;

    const bar = document.createElement("div");
    bar.className = "session-comparison-bar";
    const correctValue = Math.max(0, Number(stats.correct) || 0);
    const incorrectValue = Math.max(0, Number(stats.incorrect) || 0);
    const total = correctValue + incorrectValue;

    const correctSegment = document.createElement("div");
    correctSegment.className =
      "session-comparison-segment session-comparison-segment--correct";
    correctSegment.style.flex = correctValue ? String(correctValue) : "0";

    const incorrectSegment = document.createElement("div");
    incorrectSegment.className =
      "session-comparison-segment session-comparison-segment--incorrect";
    incorrectSegment.style.flex = incorrectValue ? String(incorrectValue) : "0";

    bar.append(correctSegment, incorrectSegment);
    if (!total) {
      bar.classList.add("session-comparison-bar--empty");
    }

    const counts = document.createElement("div");
    counts.className = "session-comparison-counts";
    counts.innerHTML = `
      <span class="good">${formatCount(stats.correct)} goed</span>
      <span class="bad">${formatCount(stats.incorrect)} fout</span>
      <span class="total">${formatCount(total)} vragen</span>
    `;

    row.append(labelEl, bar, counts);
    return row;
  }

  function updateComparisonSection(state, data) {
    const comparison = data.comparison;
    const section = state.comparison.section;
    if (!comparison || !section) {
      if (section) {
        section.hidden = true;
      }
      return;
    }

    const chart = state.comparison.chart;
    const description = state.comparison.description;
    const emptyMessage = state.comparison.empty;

    section.hidden = false;

    if (description) {
      const group = data.group || {};
      const parts = [];
      if (group.groupName) {
        parts.push(group.groupName);
      }
      if (group.schoolName) {
        parts.push(group.schoolName);
      }
      const label = parts.length ? parts.join(" • ") : "deze sessie";
      description.textContent = `Vergelijking van ${label} met overige sessies vandaag.`;
    }

    const currentTotal =
      (comparison.current?.correct || 0) +
      (comparison.current?.incorrect || 0);
    const otherTotal =
      (comparison.others?.correct || 0) +
      (comparison.others?.incorrect || 0);

    if (!currentTotal && !otherTotal) {
      if (emptyMessage) {
        emptyMessage.hidden = false;
      }
      if (chart) {
        chart.innerHTML = "";
      }
      return;
    }

    if (emptyMessage) {
      emptyMessage.hidden = true;
    }

    if (chart) {
      chart.innerHTML = "";
      chart.append(
        renderComparisonRow("Deze sessie", comparison.current || {}),
        renderComparisonRow("Overige sessies", comparison.others || {})
      );
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const groupId = parseGroupId();
    if (!groupId) {
      if (typeof global.createDigitalSafetyDashboard === "function") {
        global.createDigitalSafetyDashboard({ container: "#dashboard" });
      }
      return;
    }

    const container = document.querySelector("#dashboard");
    if (!container) {
      return;
    }

    const view = renderGroupDashboard(container);
    const state = {
      groupId,
      titleEl: view.titleEl,
      passKey: view.passKey,
      metrics: view.metrics,
      list: view.list,
      errorEl: view.errorEl,
      comparison: {
        section: document.getElementById("session-comparison"),
        chart: document.getElementById("session-comparison-chart"),
        description: document.getElementById("session-comparison-description"),
        empty: document.getElementById("session-comparison-empty")
      }
    };

    if (state.passKey?.button) {
      state.passKey.button.addEventListener("click", async () => {
        const passKey = state.passKey.current;
        if (!passKey) {
          return;
        }

        if (state.passKey.resetTimer) {
          window.clearTimeout(state.passKey.resetTimer);
          state.passKey.resetTimer = null;
        }

        state.passKey.button.disabled = true;
        const success = await copyToClipboard(passKey);
        state.passKey.button.disabled = !state.passKey.current;

        state.passKey.button.textContent = success
          ? "Gekopieerd!"
          : "Kopieer handmatig";

        state.passKey.resetTimer = window.setTimeout(() => {
          state.passKey.button.textContent = state.passKey.defaultLabel;
          state.passKey.button.disabled = !state.passKey.current;
          state.passKey.resetTimer = null;
        }, success ? 2000 : 3000);
      });
    }

    async function refresh() {
      try {
        const data = await fetchJson(
          `/api/dashboard?groupId=${encodeURIComponent(state.groupId)}`
        );
        updateGroupDashboard(state, data);
        updateComparisonSection(state, data);
      } catch (error) {
        showDashboardError(state, error.message);
      }
    }

    refresh();
    window.setInterval(refresh, 15000);
  });
})(typeof window !== "undefined" ? window : this);
