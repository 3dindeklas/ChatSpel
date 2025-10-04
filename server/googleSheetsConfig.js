const { fetchSheet } = require("./googleSheetsClient");

function parseNumber(value, fallback = 0) {
  if (typeof value === "number") {
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
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "true" || normalized === "ja" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "nee" || normalized === "0") {
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

function parseUrl(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value).trim();
}

function resolveSessionApiBaseUrl(defaults = {}) {
  const candidate =
    defaults.sessionApiBaseUrl ||
    defaults.sessionApiBaseURL ||
    defaults.sessionApiUrl ||
    defaults.sessionApi ||
    defaults.sessionApiEndpoint ||
    "";

  return parseUrl(candidate);
}

function resolveDashboardSettings(defaults = {}) {
  const settings = {};

  const autoUpdateValue =
    defaults.dashboardAutoUpdate ?? defaults.dashboardAutoRefresh;
  if (autoUpdateValue !== undefined) {
    settings.autoUpdate = parseBoolean(autoUpdateValue);
  }

  const refreshSource =
    defaults.dashboardRefreshIntervalMs ??
    defaults.dashboardRefreshMs ??
    defaults.dashboardRefreshInterval ??
    (defaults.dashboardRefreshSeconds
      ? Number(defaults.dashboardRefreshSeconds) * 1000
      : undefined);

  if (refreshSource !== undefined) {
    const parsed = parseNumber(refreshSource, 0);
    if (parsed > 0) {
      settings.refreshIntervalMs = parsed;
    }
  }

  return settings;
}

async function loadDefaults() {
  const rows = await fetchSheet("defaults");
  return rows.reduce((acc, row) => {
    const key = row.key || row.Key || row.sleutel || row.Sleutel;
    const rawValue = row.value ?? row.Value ?? row.waarde ?? row.Waarde ?? "";
    if (!key) {
      return acc;
    }
    const parsed = parseJsonValue(rawValue);
    acc[key] = parsed === null ? "" : parsed;
    return acc;
  }, {});
}

function buildOption(optionRow) {
  const id = optionRow.id || optionRow.ID || optionRow.Id || optionRow.optionId;
  return {
    id: id || String(optionRow.questionId || optionRow.question_id || ""),
    questionId:
      optionRow.questionId || optionRow.question_id || optionRow.question || "",
    label: optionRow.label || optionRow.Label || "",
    isCorrect: parseBoolean(
      optionRow.isCorrect || optionRow.correct || optionRow.is_correct || false
    ),
    position: parseNumber(optionRow.position || optionRow.Position || 0)
  };
}

function buildQuestion(questionRow) {
  return {
    id: questionRow.id || questionRow.ID || questionRow.Id || "",
    moduleId:
      questionRow.moduleId || questionRow.module_id || questionRow.module || "",
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

async function loadOptions() {
  const rows = await fetchSheet("options");
  return rows.map(buildOption);
}

async function loadQuestions() {
  const rows = await fetchSheet("questions");
  return rows.map(buildQuestion);
}

async function loadModules() {
  const rows = await fetchSheet("modules");
  return rows.map(buildModule);
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
    const sorted = related.sort((a, b) => a.position - b.position);
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

async function getQuizConfig() {
  const [defaults, modules, questions, options] = await Promise.all([
    loadDefaults(),
    loadModules(),
    loadQuestions(),
    loadOptions()
  ]);

  const questionsWithOptions = attachOptionsToQuestions(questions, options);
  const modulesWithQuestions = attachQuestionsToModules(
    modules,
    questionsWithOptions
  );

  const rawStrings = defaults.strings;
  let strings = {};
  if (typeof rawStrings === "string") {
    try {
      strings = JSON.parse(rawStrings);
    } catch (error) {
      strings = {};
    }
  } else if (rawStrings && typeof rawStrings === "object") {
    strings = rawStrings;
  }

  return {
    title: defaults.title || "",
    description: defaults.description || "",
    certificateMessage: defaults.certificateMessage || "",
    strings,
    modules: modulesWithQuestions,
    sessionApiBaseUrl: resolveSessionApiBaseUrl(defaults),
    dashboard: resolveDashboardSettings(defaults)
  };
}

async function listModules() {
  const config = await getQuizConfig();
  return config.modules.map(({ id, title, questionsPerSession }) => ({
    id,
    title,
    questionsPerSession
  }));
}

async function listQuestions() {
  const config = await getQuizConfig();
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

async function getQuestionDetail(questionId) {
  if (!questionId) {
    return null;
  }
  const config = await getQuizConfig();
  for (const module of config.modules) {
    const found = module.questionPool.find((question) => question.id === questionId);
    if (found) {
      return {
        id: found.id,
        moduleId: module.id,
        text: found.text,
        type: found.type,
        feedback: found.feedback,
        options: found.options.map((option) => ({
          id: option.id,
          label: option.label,
          isCorrect: found.correct.includes(option.id)
        }))
      };
    }
  }
  return null;
}

module.exports = {
  getQuizConfig,
  listModules,
  listQuestions,
  getQuestionDetail
};
