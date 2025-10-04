(function (global) {
  "use strict";

  const DEFAULT_SHEET_ID = "1-mU_hGc-GLgu1QD_s1gyYW7iZ992srYMdGeQ-nicuRc";

  function toHeaderName(value, index) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    return `column${index}`;
  }

  function normalizeCellValue(cell) {
    if (!cell || typeof cell.v === "undefined" || cell.v === null) {
      return "";
    }
    return cell.v;
  }

  function deepClone(value) {
    if (value === null || typeof value === "undefined") {
      return value;
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function parseNumber(value, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      return fallback;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return parsed;
  }

  function parseBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    if (["true", "1", "ja", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "nee", "no"].includes(normalized)) {
      return false;
    }
    return Boolean(value);
  }

  function parseJsonValue(value) {
    if (value === null || typeof value === "undefined") {
      return null;
    }
    if (typeof value === "object") {
      return value;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        return trimmed;
      }
    }
    return trimmed;
  }

  function sanitizeSheetId(value) {
    if (!value) {
      return "";
    }
    return String(value).trim();
  }

  function getFetch(options) {
    if (options && typeof options.fetchImpl === "function") {
      return options.fetchImpl;
    }
    if (typeof fetch === "function") {
      return fetch.bind(global);
    }
    throw new Error(
      "DSQGoogleSheets: fetch is niet beschikbaar. Gebruik een moderne browser of geef fetchImpl mee."
    );
  }

  async function fetchFromGoogleVisualization(sheetId, sheetName, options) {
    const fetchImpl = getFetch(options);
    const encodedSheet = encodeURIComponent(sheetName);
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodedSheet}`;
    const response = await fetchImpl(url);
    if (!response || !response.ok) {
      throw new Error(
        `Kon sheet '${sheetName}' niet laden (status ${response ? response.status : "onbekend"})`
      );
    }
    const raw = await response.text();
    const match = raw.match(/google\.visualization\.Query\.setResponse\((.*)\);?/s);
    if (!match) {
      throw new Error(`Onverwacht antwoordformaat voor sheet '${sheetName}'`);
    }
    const parsed = JSON.parse(match[1]);
    const table = parsed.table || {};
    const cols = (table.cols || []).map((col, index) =>
      toHeaderName(col.label || col.id || "", index)
    );
    return (table.rows || []).map((row) => {
      const values = row.c || [];
      const entry = {};
      cols.forEach((header, index) => {
        entry[header] = normalizeCellValue(values[index]);
      });
      return entry;
    });
  }

  async function fetchSheet(sheetName, options = {}) {
    const sheetId = sanitizeSheetId(options.sheetId) || DEFAULT_SHEET_ID;
    const overrides = options.sheetsData || {};
    if (Array.isArray(overrides[sheetName])) {
      return deepClone(overrides[sheetName]);
    }
    if (!sheetId) {
      throw new Error("Geen Google Sheet ID ingesteld voor de quizgegevens.");
    }
    return fetchFromGoogleVisualization(sheetId, sheetName, options);
  }

  function buildOption(optionRow) {
    const id =
      optionRow.id || optionRow.ID || optionRow.Id || optionRow.optionId || "";
    return {
      id: id || String(optionRow.questionId || optionRow.question_id || ""),
      questionId:
        optionRow.questionId ||
        optionRow.question_id ||
        optionRow.question ||
        "",
      label: optionRow.label || optionRow.Label || "",
      isCorrect: parseBoolean(
        optionRow.isCorrect ||
          optionRow.correct ||
          optionRow.is_correct ||
          false
      ),
      position: parseNumber(optionRow.position || optionRow.Position || 0)
    };
  }

  function buildQuestion(questionRow) {
    return {
      id: questionRow.id || questionRow.ID || questionRow.Id || "",
      moduleId:
        questionRow.moduleId ||
        questionRow.module_id ||
        questionRow.module ||
        "",
      text: questionRow.text || questionRow.Text || "",
      type: questionRow.type || questionRow.Type || "single",
      feedback: {
        correct:
          questionRow.feedbackCorrect ||
          questionRow.feedback_correct ||
          questionRow.feedbackCorrectNl ||
          questionRow.feedback_correct_nl ||
          "",
        incorrect:
          questionRow.feedbackIncorrect ||
          questionRow.feedback_incorrect ||
          questionRow.feedbackIncorrectNl ||
          questionRow.feedback_incorrect_nl ||
          ""
      },
      position: parseNumber(questionRow.position || questionRow.Position || 0)
    };
  }

  function buildModule(moduleRow) {
    return {
      id: moduleRow.id || moduleRow.ID || moduleRow.Id || "",
      title: moduleRow.title || moduleRow.Title || "",
      intro: moduleRow.intro || moduleRow.Intro || "",
      tips: parseJsonValue(moduleRow.tips || moduleRow.Tips) || [],
      questionsPerSession: parseNumber(
        moduleRow.questionsPerSession ||
          moduleRow.questions_per_session ||
          moduleRow.vragenPerSessie ||
          0
      ),
      position: parseNumber(moduleRow.position || moduleRow.Position || 0)
    };
  }

  function attachOptionsToQuestions(questions, options) {
    const optionMap = options.reduce((acc, option) => {
      if (!option.questionId) {
        return acc;
      }
      if (!acc[option.questionId]) {
        acc[option.questionId] = [];
      }
      acc[option.questionId].push(option);
      return acc;
    }, {});

    return questions.map((question) => {
      const related = optionMap[question.id] || [];
      const sorted = related.slice().sort((a, b) => a.position - b.position);
      const optionList = sorted.map((option) => ({
        id: option.id,
        label: option.label
      }));
      const correct = sorted
        .filter((option) => option.isCorrect)
        .map((option) => option.id);

      return {
        ...question,
        options: optionList,
        correct
      };
    });
  }

  function attachQuestionsToModules(modules, questions) {
    const questionMap = questions.reduce((acc, question) => {
      if (!question.moduleId) {
        return acc;
      }
      if (!acc[question.moduleId]) {
        acc[question.moduleId] = [];
      }
      acc[question.moduleId].push(question);
      return acc;
    }, {});

    return modules
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((module) => ({
        ...module,
        tips: Array.isArray(module.tips) ? module.tips : [],
        questionPool: (questionMap[module.id] || [])
          .slice()
          .sort((a, b) => a.position - b.position)
      }));
  }

  function normalizeStrings(rawStrings) {
    if (typeof rawStrings === "string") {
      try {
        return JSON.parse(rawStrings);
      } catch (error) {
        return {};
      }
    }
    if (rawStrings && typeof rawStrings === "object") {
      return { ...rawStrings };
    }
    return {};
  }

  function normalizeDefaults(rows) {
    if (!Array.isArray(rows)) {
      return {};
    }

    return rows.reduce((acc, row) => {
      const key = row.key || row.Key || row.sleutel || row.Sleutel;
      const rawValue =
        row.value ?? row.Value ?? row.waarde ?? row.Waarde ?? "";
      if (!key) {
        return acc;
      }
      const parsed = parseJsonValue(rawValue);
      acc[key] = parsed === null ? "" : parsed;
      return acc;
    }, {});
  }

  function buildQuizConfigFromDataset(dataset) {
    const defaults = normalizeDefaults(dataset.defaults);
    const modules = (dataset.modules || []).map(buildModule);
    const questions = (dataset.questions || []).map(buildQuestion);
    const options = (dataset.answerOptions || []).map(buildOption);

    const questionsWithOptions = attachOptionsToQuestions(questions, options);
    const modulesWithQuestions = attachQuestionsToModules(
      modules,
      questionsWithOptions
    );

    return {
      title: defaults.title || "",
      description: defaults.description || "",
      certificateMessage: defaults.certificateMessage || "",
      strings: normalizeStrings(defaults.strings),
      modules: modulesWithQuestions
    };
  }

  function getCacheKey(params) {
    return JSON.stringify({
      sheetId: params.sheetId,
      defaultsSheet: params.defaultsSheet,
      modulesSheet: params.modulesSheet,
      questionsSheet: params.questionsSheet,
      optionsSheet: params.optionsSheet
    });
  }

  const datasetCache = new Map();

  async function loadDataset(options = {}) {
    const params = {
      sheetId: sanitizeSheetId(options.sheetId) || DEFAULT_SHEET_ID,
      defaultsSheet: options.defaultsSheet || "defaults",
      modulesSheet: options.modulesSheet || "modules",
      questionsSheet: options.questionsSheet || "questions",
      optionsSheet: options.optionsSheet || "options"
    };

    const hasOverrides =
      options.sheetsData && Object.keys(options.sheetsData).length > 0;
    const cacheKey = getCacheKey(params);

    if (!hasOverrides && datasetCache.has(cacheKey)) {
      return deepClone(datasetCache.get(cacheKey));
    }

    const [defaults, modules, questions, answerOptions] = await Promise.all([
      fetchSheet(params.defaultsSheet, options),
      fetchSheet(params.modulesSheet, options),
      fetchSheet(params.questionsSheet, options),
      fetchSheet(params.optionsSheet, options)
    ]);

    const dataset = {
      params,
      defaults,
      modules,
      questions,
      answerOptions
    };

    if (!hasOverrides) {
      datasetCache.set(cacheKey, deepClone(dataset));
    }

    return deepClone(dataset);
  }

  function buildQuestionIndex(config) {
    const map = new Map();
    config.modules.forEach((module, moduleIndex) => {
      module.questionPool.forEach((question, questionIndex) => {
        map.set(question.id, {
          moduleId: module.id,
          moduleTitle: module.title,
          modulePosition: moduleIndex,
          questionPosition: questionIndex,
          question
        });
      });
    });
    return map;
  }

  async function loadQuizConfig(options = {}) {
    const dataset = await loadDataset(options);
    const config = buildQuizConfigFromDataset(dataset);
    return deepClone(config);
  }

  async function listModules(options = {}) {
    const config = await loadQuizConfig(options);
    return config.modules.map(({ id, title, questionsPerSession }) => ({
      id,
      title,
      questionsPerSession
    }));
  }

  async function listQuestions(options = {}) {
    const config = await loadQuizConfig(options);
    const rows = [];
    config.modules.forEach((module, moduleIndex) => {
      module.questionPool.forEach((question, questionIndex) => {
        rows.push({
          id: question.id,
          text: question.text,
          type: question.type,
          moduleId: module.id,
          moduleTitle: module.title,
          position: questionIndex,
          modulePosition: moduleIndex
        });
      });
    });
    return rows;
  }

  async function getQuestionDetail(questionId, options = {}) {
    if (!questionId) {
      return null;
    }
    const config = await loadQuizConfig(options);
    const index = buildQuestionIndex(config);
    const entry = index.get(questionId);
    if (!entry) {
      return null;
    }
    return {
      id: entry.question.id,
      moduleId: entry.moduleId,
      text: entry.question.text,
      type: entry.question.type,
      feedback: deepClone(entry.question.feedback),
      options: entry.question.options.map((option) => ({
        id: option.id,
        label: option.label,
        isCorrect: entry.question.correct.includes(option.id)
      }))
    };
  }

  function clearCache() {
    datasetCache.clear();
  }

  const api = {
    DEFAULT_SHEET_ID,
    loadQuizConfig,
    listModules,
    listQuestions,
    getQuestionDetail,
    fetchSheet,
    clearCache
  };

  global.DSQGoogleSheets = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
