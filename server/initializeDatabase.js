const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const db = require("./database");

function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function createSchema() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS quiz_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      intro TEXT,
      tips TEXT,
      questions_per_session INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    )
  `);

  try {
    await runQuery("ALTER TABLE modules ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (!message.includes("duplicate") && !message.includes("exists")) {
      throw error;
    }
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL,
      feedback_correct TEXT,
      feedback_incorrect TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      label TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      start_time TEXT NOT NULL,
      end_time TEXT,
      last_seen TEXT NOT NULL,
      summary TEXT
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS session_attempts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      module_id TEXT,
      question_id TEXT,
      selected_options TEXT,
      is_correct INTEGER NOT NULL DEFAULT 0,
      answered_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
    )
  `);
}

async function seedFromFile() {
  const row = await getQuery("SELECT COUNT(*) AS count FROM modules");
  if (row && row.count > 0) {
    return;
  }

  const dataPath = path.join(__dirname, "..", "data", "quizData.json");
  const raw = fs.readFileSync(dataPath, "utf8");
  const parsed = JSON.parse(raw);

  const { modules = [], strings = {}, title, description, certificateMessage } = parsed;

  await runQuery("DELETE FROM quiz_settings");

  const settingsEntries = [
    ["title", title || ""],
    ["description", description || ""],
    ["certificateMessage", certificateMessage || ""],
    ["strings", JSON.stringify(strings || {})]
  ];

  for (const [key, value] of settingsEntries) {
    await runQuery("INSERT INTO quiz_settings (key, value) VALUES (?, ?)", [
      key,
      value
    ]);
  }

  for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
    const module = modules[moduleIndex];
    const moduleId = module.id || randomUUID();

    await runQuery(
      `INSERT INTO modules (id, title, intro, tips, questions_per_session, position)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        moduleId,
        module.title || "", 
        module.intro || "",
        JSON.stringify(module.tips || []),
        module.questionsPerSession || 0,
        moduleIndex
      ]
    );

    const questions = Array.isArray(module.questionPool) ? module.questionPool : [];
    for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
      const question = questions[questionIndex];
      const questionId = question.id || randomUUID();

      await runQuery(
        `INSERT INTO questions (id, module_id, text, type, feedback_correct, feedback_incorrect, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          questionId,
          moduleId,
          question.text || "",
          question.type || "single",
          question.feedback?.correct || "",
          question.feedback?.incorrect || "",
          questionIndex
        ]
      );

      const options = Array.isArray(question.options) ? question.options : [];
      for (let optionIndex = 0; optionIndex < options.length; optionIndex += 1) {
        const option = options[optionIndex];
        const optionKey = option.id || randomUUID();
        const optionId = `${questionId}-${optionKey}`;
        const isCorrect = (question.correct || []).includes(option.id);

        await runQuery(
          `INSERT INTO options (id, question_id, label, is_correct, position)
           VALUES (?, ?, ?, ?, ?)`,
          [
            optionId,
            questionId,
            option.label || "",
            isCorrect ? 1 : 0,
            optionIndex
          ]
        );
      }
    }
  }
}

async function initializeDatabase() {
  await createSchema();
  await seedFromFile();
}

async function getQuizConfig() {
  const settingsRows = await allQuery("SELECT key, value FROM quiz_settings");
  const settings = {};
  settingsRows.forEach(({ key, value }) => {
    if (key === "strings") {
      try {
        settings[key] = JSON.parse(value);
      } catch (error) {
        settings[key] = {};
      }
    } else {
      settings[key] = value;
    }
  });

  const modules = await allQuery(
    "SELECT * FROM modules ORDER BY position ASC"
  );

  const moduleIds = modules.map((module) => module.id);
  let questions = [];
  if (moduleIds.length) {
    questions = await allQuery(
      `SELECT * FROM questions WHERE module_id IN (${moduleIds
        .map(() => "?")
        .join(",")}) ORDER BY position ASC`,
      moduleIds
    );
  }

  const questionIds = questions.map((question) => question.id);
  let options = [];
  if (questionIds.length) {
    const placeholderList = questionIds.map(() => "?").join(",");
    options = await allQuery(
      `SELECT * FROM options WHERE question_id IN (${placeholderList}) ORDER BY position ASC`,
      questionIds
    );
  }

  const optionMap = options.reduce((acc, option) => {
    if (!acc[option.question_id]) {
      acc[option.question_id] = [];
    }
    acc[option.question_id].push(option);
    return acc;
  }, {});

  const questionMap = questions.reduce((acc, question) => {
    if (!acc[question.module_id]) {
      acc[question.module_id] = [];
    }
    const relatedOptions = optionMap[question.id] || [];
    acc[question.module_id].push({
      id: question.id,
      text: question.text,
      type: question.type,
      options: relatedOptions.map((option) => ({
        id: option.id,
        label: option.label
      })),
      correct: relatedOptions.filter((option) => option.is_correct).map((option) => option.id),
      feedback: {
        correct: question.feedback_correct || "",
        incorrect: question.feedback_incorrect || ""
      }
    });
    return acc;
  }, {});

  const normalizedModules = modules.map((module) => ({
    id: module.id,
    title: module.title,
    intro: module.intro,
    tips: JSON.parse(module.tips || "[]"),
    questionsPerSession: module.questions_per_session,
    questions_per_session: module.questions_per_session,
    isActive: module.is_active === 1 || module.is_active === true,
    questionPool: questionMap[module.id] || []
  }));

  return {
    title: settings.title || "",
    description: settings.description || "",
    certificateMessage: settings.certificateMessage || "",
    strings: settings.strings || {},
    modules: normalizedModules.filter((module) => module.isActive)
  };
}

module.exports = {
  initializeDatabase,
  getQuizConfig,
  db,
  runQuery,
  getQuery,
  allQuery
};
