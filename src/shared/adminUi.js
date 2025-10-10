(function (global) {
  "use strict";

  function applyAttributes(element, attrs) {
    if (!attrs) {
      return;
    }

    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      element.setAttribute(key, value);
    });
  }

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
      element.className = options.className;
    }
    if (options.text !== undefined) {
      element.textContent = options.text;
    }
    if (options.html !== undefined) {
      element.innerHTML = options.html;
    }
    applyAttributes(element, options.attrs);

    return element;
  }

  const ICON_SVGS = {
    edit:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.232 5.232a2.5 2.5 0 0 0-3.536 0l-7.5 7.5a1 1 0 0 0-.263.465l-1 3.5a1 1 0 0 0 1.263 1.263l3.5-1a1 1 0 0 0 .465-.263l7.5-7.5a2.5 2.5 0 0 0 0-3.536l-1.5-1.5Zm-2.122 1.414 1.5 1.5-6.95 6.95-1.5-1.5 6.95-6.95Z"/><path d="M5.586 17H4a1 1 0 0 1-1-1v-1.586a1 1 0 0 1 .293-.707l2 2a1 1 0 0 1-.707.293Z"/></svg>',
    delete:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2h3a1 1 0 1 1 0 2h-1v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6H3a1 1 0 1 1 0-2h4Zm6 2H7v11h6V6Zm-4 3a1 1 0 0 1 2 0v5a1 1 0 1 1-2 0V9Zm4 0a1 1 0 0 1 2 0v5a1 1 0 0 1-2 0V9Z"/></svg>'
  };

  function createIcon(type) {
    const svg = ICON_SVGS[type];
    if (!svg) {
      return null;
    }
    const wrapper = document.createElement("span");
    wrapper.className = "admin-button__icon";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = svg;
    return wrapper;
  }

  function clearFeedback(container) {
    if (container) {
      container.innerHTML = "";
    }
  }

  function showFeedback(container, message, variant = "error") {
    if (!container) {
      return;
    }
    clearFeedback(container);
    const box = createElement("div", {
      className: variant === "error" ? "admin-error" : "admin-success",
      text: message
    });
    container.append(box);
  }

  function resolveHasItems(collection) {
    if (Array.isArray(collection)) {
      return collection.length > 0;
    }
    if (typeof collection === "number") {
      return collection > 0;
    }
    return Boolean(collection);
  }

  function setListVisibility(table, emptyState, collection) {
    const hasItems = resolveHasItems(collection);
    if (table) {
      table.hidden = !hasItems;
    }
    if (emptyState) {
      emptyState.hidden = hasItems;
    }
  }

  const adminUI = {
    createElement,
    createIcon,
    showFeedback,
    clearFeedback,
    setListVisibility
  };

  if (!global.ChatSpel) {
    global.ChatSpel = {};
  }

  global.ChatSpel.adminUI = adminUI;
})(typeof window !== "undefined" ? window : globalThis);
