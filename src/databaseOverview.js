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
    return element;
  }

  async function fetchDatabaseInfo() {
    const response = await fetch("/api/database-info");
    if (!response.ok) {
      throw new Error("Kon de database-informatie niet ophalen");
    }
    return response.json();
  }

  function renderCategories(container, categories, totalQuestions) {
    const table = createElement("table", {
      className: "database-overview__table"
    });
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.append(
      createElement("th", { text: "Categorie" }),
      createElement("th", { text: "Aantal vragen", className: "database-overview__number" })
    );
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement("tbody");
    categories.forEach((category) => {
      const row = document.createElement("tr");
      row.append(
        createElement("td", { text: category.title || "Onbekende categorie" }),
        createElement("td", {
          text: String(category.questionCount),
          className: "database-overview__number"
        })
      );
      tbody.append(row);
    });
    table.append(tbody);
    container.append(table);

    container.append(
      createElement("p", {
        className: "database-overview__total",
        text: `Totaal aantal vragen: ${totalQuestions}`
      })
    );
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
          return;
        }

        renderCategories(container, categories, info.totalQuestions || 0);
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
