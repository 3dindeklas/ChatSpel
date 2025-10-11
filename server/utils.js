const { randomUUID } = require("crypto");

function sanitizeOptions(options = []) {
  if (!Array.isArray(options)) {
    return [];
  }
  return options
    .map((option) => ({
      id: option.id || option.optionId || option.option_id || randomUUID(),
      label: option.label || option.text || option.value || "",
      isCorrect: Boolean(option.isCorrect || option.is_correct || option.correct)
    }))
    .filter((option) => option.label && String(option.label).trim().length > 0)
    .map((option) => ({
      ...option,
      label: String(option.label).trim()
    }));
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    if (fallback === undefined) {
      return false;
    }
    return Boolean(fallback);
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "aan", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "nee", "off", "uit"].includes(normalized)) {
      return false;
    }
  }

  return Boolean(value);
}

function extractQuestionsPerSessionField(source) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const candidates = [
    source.questionsPerSession,
    source.questions_per_session,
    source.questions,
    source.questionspersession
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") {
      continue;
    }

    if (Array.isArray(candidate)) {
      continue;
    }

    return candidate;
  }

  return undefined;
}

function parseQuestionsPerSession(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = typeof value === "string" ? value.replace(/,/g, ".") : value;
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function sanitizeModuleSelection(selectedIds = [], validIds = []) {
  const validSet = new Set(validIds.map((value) => String(value)));
  const selection = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
  return selection
    .map((value) => String(value || "").trim())
    .filter((value) => value.length > 0 && validSet.has(value));
}

function extractModuleIdList(source) {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return source;
  }

  if (typeof source === "string") {
    return source
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  return [];
}

module.exports = {
  sanitizeOptions,
  normalizeBoolean,
  extractQuestionsPerSessionField,
  parseQuestionsPerSession,
  sanitizeModuleSelection,
  extractModuleIdList
};
