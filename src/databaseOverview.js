(function () {
  "use strict";

  const dutchDateFormatter =
    typeof Intl !== "undefined" && Intl.DateTimeFormat
      ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" })
      : null;

  const adminUI = (window.ChatSpel && window.ChatSpel.adminUI) || {};
  const { createElement } = adminUI;

  if (typeof createElement !== "function") {
    throw new Error("Admin UI helpers zijn niet geladen");
  }

  async function fetchDatabaseInfo() {
    const response = await fetch("/api/database-info");
    if (!response.ok) {
      throw new Error("Kon de database-informatie niet ophalen");
    }
    return response.json();
  }

  function normalizeQuestionCount(category) {
    if (!category || typeof category !== "object") {
      return 0;
    }

    const countCandidates = [
      category.questionCount,
      category.question_count,
      category.questioncount,
      category.questionsCount,
      category.questions_count,
      category.questionscount
    ];

    for (const candidate of countCandidates) {
      if (candidate === undefined || candidate === null || candidate === "") {
        continue;
      }

      const numericCount = Number(candidate);
      if (Number.isFinite(numericCount) && numericCount >= 0) {
        return numericCount;
      }
    }

    if (Array.isArray(category.questionPool)) {
      return category.questionPool.length;
    }

    if (Array.isArray(category.questions)) {
      return category.questions.length;
    }

    return 0;
  }

  function normalizeConfiguredQuestions(category) {
    if (!category || typeof category !== "object") {
      return 0;
    }

    const candidates = [
      category.questionsPerSession,
      category.questions_per_session,
      category.questions,
      category.questionspersession
    ];

    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null || candidate === "") {
        continue;
      }

      const numeric = Number(candidate);
      if (Number.isFinite(numeric) && numeric > 0) {
        return Math.floor(numeric);
      }
    }

    return 0;
  }

  function renderCategories(container, categories, totalQuestions) {
    const section = createElement("section", {
      className: "database-overview__section"
    });

    section.append(
      createElement("h2", {
        className: "database-overview__heading",
        text: "Vragen per categorie"
      })
    );

    const table = createElement("table", {
      className: "database-overview__table"
    });
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.append(
      createElement("th", { text: "Categorie" }),
      createElement("th", {
        text: "Beschikbare vragen",
        className: "database-overview__number"
      }),
      createElement("th", {
        text: "Vragen per sessie",
        className: "database-overview__number"
      })
    );
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement("tbody");
    const sanitizedCategories = categories.map((category) => ({
      ...category,
      questionCount: normalizeQuestionCount(category),
      questionsPerSession: normalizeConfiguredQuestions(category)
    }));

    sanitizedCategories.forEach((category) => {
      const row = document.createElement("tr");
      const nameCell = createElement("td");
      const nameContent = category.title || "Onbekende categorie";
      nameCell.append(createElement("span", { text: nameContent }));
      if (!category.isActive) {
        nameCell.append(" ");
        nameCell.append(
          createElement("span", {
            className: "admin-tag admin-tag--muted",
            text: "Inactief"
          })
        );
      }

      row.append(
        nameCell,
        createElement("td", {
          text: String(category.questionCount),
          className: "database-overview__number"
        }),
        createElement("td", {
          text:
            category.questionsPerSession > 0
              ? String(category.questionsPerSession)
              : "—",
          className: "database-overview__number"
        })
      );
      tbody.append(row);
    });
    table.append(tbody);
    section.append(table);

    const aggregatedCategoryTotal = sanitizedCategories.reduce(
      (sum, category) => sum + category.questionCount,
      0
    );

    const numericTotal = Number(totalQuestions);
    const displayTotal =
      Number.isFinite(numericTotal) && numericTotal >= aggregatedCategoryTotal
        ? numericTotal
        : aggregatedCategoryTotal;

    section.append(
      createElement("p", {
        className: "database-overview__total",
        text: `Totaal aantal vragen: ${displayTotal}`
      })
    );

    container.append(section);
  }

  function formatDate(value) {
    if (!value) {
      return "Onbekende datum";
    }
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      if (dutchDateFormatter) {
        return dutchDateFormatter.format(date);
      }
      return date.toLocaleDateString();
    } catch (error) {
      return value;
    }
  }

  function renderDailyPerformance(container, stats) {
    const section = createElement("section", {
      className: "database-overview__section"
    });

    section.append(
      createElement("h2", {
        className: "database-overview__heading",
        text: "Beantwoorde vragen per dag"
      })
    );

    if (!Array.isArray(stats) || !stats.length) {
      section.append(
        createElement("p", {
          className: "database-overview__empty",
          text: "Er zijn nog geen beantwoorde vragen gevonden."
        })
      );
      container.append(section);
      return;
    }

    const table = createElement("table", {
      className: "database-overview__table"
    });
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.append(
      createElement("th", { text: "Datum" }),
      createElement("th", { text: "Juist", className: "database-overview__number" }),
      createElement("th", { text: "Onjuist", className: "database-overview__number" }),
      createElement("th", { text: "Sessies", className: "database-overview__number" })
    );
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement("tbody");
    stats.forEach((item) => {
      const row = document.createElement("tr");
      row.append(
        createElement("td", {
          text: formatDate(item.date),
          className: "database-overview__date"
        }),
        createElement("td", {
          text: String(item.correct ?? 0),
          className: "database-overview__number"
        }),
        createElement("td", {
          text: String(item.incorrect ?? 0),
          className: "database-overview__number"
        }),
        createElement("td", {
          text: String(item.sessions ?? 0),
          className: "database-overview__number"
        })
      );
      tbody.append(row);
    });
    table.append(tbody);

    section.append(table);
    container.append(section);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("database-overview");
    if (!container) {
      return;
    }

    container.innerHTML = "";
    container.append(
      createElement("p", { text: "Gegevens worden geladen...", className: "database-overview__loading" })
    );

    fetchDatabaseInfo()
      .then((info) => {
        container.innerHTML = "";

        container.append(
          createElement("p", {
            className: "database-overview__type",
            text: `Verbonden database: ${info.databaseType}`
          })
        );

        const categories = Array.isArray(info.categories) ? info.categories : [];
        if (!categories.length) {
          container.append(
            createElement("p", {
              className: "database-overview__empty",
              text: "Er zijn nog geen categorieën met vragen gevonden."
            })
          );
        } else {
          renderCategories(container, categories, info.totalQuestions || 0);
        }

        const dailyStats = Array.isArray(info.dailyPerformance)
          ? info.dailyPerformance
          : [];
        renderDailyPerformance(container, dailyStats);
      })
      .catch((error) => {
        container.innerHTML = "";
        container.append(
          createElement("div", {
            className: "database-overview__error",
            text:
              error.message ||
              "Er ging iets mis bij het ophalen van de database-informatie."
          })
        );
      });
  });
})();
