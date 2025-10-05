(function () {
  "use strict";

  function findMenu(toggle) {
    const controlledId = toggle.getAttribute("aria-controls");
    if (controlledId) {
      const controlledMenu = document.getElementById(controlledId);
      if (controlledMenu) {
        return controlledMenu;
      }
    }

    const sibling = toggle.nextElementSibling;
    if (sibling && sibling.classList.contains("admin-menu-dropdown")) {
      return sibling;
    }

    return null;
  }

  function highlightCurrent(menu) {
    const currentPage = document.body?.dataset?.adminPage;
    if (!currentPage) {
      return;
    }

    const links = menu.querySelectorAll("[data-page]");
    links.forEach((link) => {
      if (link.dataset.page === currentPage) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const toggles = document.querySelectorAll(".admin-menu-toggle");
    toggles.forEach((toggle) => {
      const menu = findMenu(toggle);
      if (!menu) {
        return;
      }

      highlightCurrent(menu);
      menu.setAttribute("role", "menu");
      menu.querySelectorAll("a").forEach((link) => {
        link.setAttribute("role", "menuitem");
      });

      const closeMenu = () => {
        toggle.setAttribute("aria-expanded", "false");
        menu.hidden = true;
        document.removeEventListener("click", onDocumentClick);
        document.removeEventListener("keydown", onKeyDown);
      };

      const openMenu = () => {
        menu.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        setTimeout(() => {
          document.addEventListener("click", onDocumentClick);
        }, 0);
        document.addEventListener("keydown", onKeyDown);
      };

      const onDocumentClick = (event) => {
        if (
          event.target !== toggle &&
          !menu.contains(event.target)
        ) {
          closeMenu();
        }
      };

      const onKeyDown = (event) => {
        if (event.key === "Escape") {
          closeMenu();
          toggle.focus();
        }
      };

      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        if (expanded) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      menu.addEventListener("click", (event) => {
        const link = event.target?.closest?.(".admin-menu-link");
        if (link) {
          closeMenu();
        }
      });
    });
  });
})();
