require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const { randomUUID } = require("crypto");

const {
  initializeDatabase,
  getQuizConfig,
  runQuery,
  allQuery,
  getQuery,
  db
} = require("./initializeDatabase");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || "60000", 10);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/styles", express.static(path.join(__dirname, "..", "styles")));
app.use("/src", express.static(path.join(__dirname, "..", "src")));

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sanitizeOptions(options = []) {
  if (!Array.isArray(options)) {
    return [];
  }
  return options
    .map((option) => ({
      id: option.id || randomUUID(),
      label: option.label || "",
      isCorrect: Boolean(option.isCorrect || option.is_correct)
    }))
    .filter((option) => option.label.trim().length > 0);
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null) {
    if (fallback === undefined) {
      return false;
    }
    return Boolean(fallback);
  }

  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "1", "yes", "aan"].includes(lowered)) {
      return true;
    }
    if (["false", "0", "no", "nee", "uit"].includes(lowered)) {
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

  let numericValue = value;
  if (typeof numericValue === "string") {
    numericValue = numericValue.replace(/,/g, ".");
  }

  const numeric = Number.parseFloat(numericValue);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function normalizeModuleRow(row) {
  if (!row) {
    return null;
  }

  const questionsPerSession = (() => {
    const direct = extractQuestionsPerSessionField(row);
    const numeric = Number(direct);
    return Number.isFinite(numeric) && numeric > 0
      ? Math.floor(numeric)
      : 1;
  })();

  return {
    id: row.id,
    title: row.title,
    questionsPerSession,
    questions_per_session: questionsPerSession,
    isActive: (() => {
      const rawValue =
        row.isActive ?? row.is_active ?? row.isactive ?? row.active ?? null;

      if (typeof rawValue === "boolean") {
        return rawValue;
      }

      if (typeof rawValue === "number") {
        return rawValue !== 0;
      }

      if (typeof rawValue === "string") {
        const normalized = rawValue.trim().toLowerCase();
        if (normalized === "") {
          return false;
        }
        if (["0", "false", "nee", "uit"].includes(normalized)) {
          return false;
        }
        return ["1", "true", "t", "yes", "aan", "on"].includes(
          normalized
        );
      }

      return Boolean(rawValue);
    })()
  };
}

async function getNextModulePosition() {
  const row = await getQuery(
    "SELECT COALESCE(MAX(position), -1) AS maxPosition FROM modules"
  );
  const maxPosition =
    row?.maxPosition ?? row?.max_position ?? row?.maxposition ?? -1;
  return maxPosition + 1;
}

async function getModuleById(moduleId) {
  return getQuery("SELECT * FROM modules WHERE id = ?", [moduleId]);
}

async function getQuestionWithOptions(questionId) {
  const question = await getQuery(
    "SELECT * FROM questions WHERE id = ?",
    [questionId]
  );
  if (!question) {
    return null;
  }

  const options = await allQuery(
    "SELECT * FROM options WHERE question_id = ? ORDER BY position ASC",
    [questionId]
  );

  return {
    ...question,
    options: options.map((option) => ({
      id: option.id,
      label: option.label,
      isCorrect: Boolean(option.is_correct)
    }))
  };
}

async function saveQuestionOptions(questionId, options) {
  await runQuery("DELETE FROM options WHERE question_id = ?", [questionId]);

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    await runQuery(
      `INSERT INTO options (id, question_id, label, is_correct, position)
       VALUES (?, ?, ?, ?, ?)`,
      [
        option.id || randomUUID(),
        questionId,
        option.label || "",
        option.isCorrect ? 1 : 0,
        index
      ]
    );
  }
}

app.get(
  "/api/quiz-config",
  asyncHandler(async (req, res) => {
    const config = await getQuizConfig();
    res.json(config);
  })
);

app.get(
  "/api/modules",
  asyncHandler(async (req, res) => {
    const modules = await allQuery(
      `SELECT id,
              title,
              questions_per_session AS questionsPerSession,
              is_active AS isActive
         FROM modules
        ORDER BY position ASC`
    );
    res.json(modules.map((module) => normalizeModuleRow(module)));
  })
);

app.post(
  "/api/modules",
  asyncHandler(async (req, res) => {
    const title = (req.body?.title || "").trim();
    const questionsPerSession = parseQuestionsPerSession(
      extractQuestionsPerSessionField(req.body),
      null
    );
    const isActive = normalizeBoolean(req.body?.isActive, true);

    if (!title) {
      res.status(400).json({ message: "Titel is verplicht" });
      return;
    }

    if (!questionsPerSession) {
      res.status(400).json({
        message: "Vul een positief aantal vragen per sessie in"
      });
      return;
    }

    const position = await getNextModulePosition();
    const moduleId = randomUUID();

    await runQuery(
      `INSERT INTO modules (id, title, intro, tips, questions_per_session, position, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        moduleId,
        title,
        "",
        JSON.stringify([]),
        questionsPerSession,
        position,
        isActive ? 1 : 0
      ]
    );

    const created = await getModuleById(moduleId);
    res.status(201).json(normalizeModuleRow(created));
  })
);

app.put(
  "/api/modules/:id",
  asyncHandler(async (req, res) => {
    const moduleId = req.params.id;
    const existing = await getModuleById(moduleId);
    if (!existing) {
      res.status(404).json({ message: "Categorie niet gevonden" });
      return;
    }

    const requestedTitle = typeof req.body?.title === "string"
      ? req.body.title.trim()
      : "";
    const title = requestedTitle || existing.title || "";

    if (!title) {
      res.status(400).json({ message: "Titel is verplicht" });
      return;
    }

    const existingQuestionsPerSession = parseQuestionsPerSession(
      extractQuestionsPerSessionField(existing),
      1
    );

    const questionsPerSession = parseQuestionsPerSession(
      extractQuestionsPerSessionField(req.body),
      existingQuestionsPerSession
    );

    if (!questionsPerSession) {
      res.status(400).json({
        message: "Vul een positief aantal vragen per sessie in"
      });
      return;
    }

    const isActive = normalizeBoolean(
      req.body?.isActive,
      existing.is_active === 1 || existing.is_active === true
    );

    await runQuery(
      `UPDATE modules
       SET title = ?, questions_per_session = ?, is_active = ?
       WHERE id = ?`,
      [title, questionsPerSession, isActive ? 1 : 0, moduleId]
    );

    const updated = await getModuleById(moduleId);
    res.json(normalizeModuleRow(updated));
  })
);

app.delete(
  "/api/modules/:id",
  asyncHandler(async (req, res) => {
    const moduleId = req.params.id;
    const existing = await getModuleById(moduleId);
    if (!existing) {
      res.status(404).json({ message: "Categorie niet gevonden" });
      return;
    }

    await runQuery("DELETE FROM modules WHERE id = ?", [moduleId]);
    res.status(204).send();
  })
);

app.get(
  "/api/database-info",
  asyncHandler(async (req, res) => {
    const databaseType = db?.isPostgres ? "PostgreSQL" : "SQLite";

    const categories = await allQuery(
      `SELECT m.id,
              m.title,
              m.position,
              m.is_active AS isActive,
              m.questions_per_session AS questionsPerSession,
              CASE
                WHEN LOWER(COALESCE(CAST(m.is_active AS TEXT), '0')) IN ('1', 'true', 't')
                THEN (
                  SELECT COUNT(q_inner.id)
                    FROM questions q_inner
                   WHERE q_inner.module_id = m.id
                )
                ELSE 0
              END AS questionCount
         FROM modules m
        ORDER BY m.position ASC`
    );

    const normalizedCategories = categories.map((category) => ({
      id: category.id,
      title: category.title || "Onbekende categorie",
      questionCount: Number(category.questionCount) || 0,
      questionsPerSession: (() => {
        const raw =
          category.questionsPerSession ??
          category.questions_per_session ??
          category.questionspersession ??
          0;
        const numeric = Number(raw);
        return Number.isFinite(numeric) && numeric > 0
          ? Math.floor(numeric)
          : 0;
      })(),
      isActive: (() => {
        const raw =
          category.isActive ??
          category.is_active ??
          category.isactive ??
          false;
        if (raw === true || raw === 1) {
          return true;
        }
        if (raw === false || raw === 0) {
          return false;
        }
        const normalized = String(raw).trim().toLowerCase();
        return ["1", "true", "t", "yes", "aan"].includes(normalized);
      })()
    }));

    const totalQuestionsRow = await getQuery(
      `SELECT COUNT(q.id) AS total
         FROM questions q
         INNER JOIN modules m ON m.id = q.module_id
        WHERE LOWER(COALESCE(CAST(m.is_active AS TEXT), '0')) IN ('1', 'true', 't')`
    );

    const totalQuestions = Number(
      totalQuestionsRow?.total ??
        totalQuestionsRow?.count ??
        normalizedCategories.reduce(
          (sum, category) => sum + category.questionCount,
          0
        )
    );

    const answeredDayExpression = db?.isPostgres
      ? "DATE(answered_at::timestamptz)"
      : "DATE(answered_at)";

    const dailyRows = await allQuery(
      `SELECT ${answeredDayExpression} AS answer_day,
              COUNT(*) AS total_attempts,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_attempts,
              SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS incorrect_attempts,
              COUNT(DISTINCT session_id) AS session_count
         FROM session_attempts
        WHERE answered_at IS NOT NULL
        GROUP BY ${answeredDayExpression}
        ORDER BY answer_day DESC
        LIMIT 30`
    );

    const dailyPerformance = dailyRows.map((row) => ({
      date: row.answer_day,
      totalAttempts:
        Number(row.total_attempts ?? row.totalAttempts ?? 0) || 0,
      correct: Number(row.correct_attempts ?? row.correctAttempts ?? 0) || 0,
      incorrect:
        Number(row.incorrect_attempts ?? row.incorrectAttempts ?? 0) || 0,
      sessions: Number(row.session_count ?? row.sessionCount ?? 0) || 0
    }));

    res.json({
      databaseType,
      totalQuestions,
      categories: normalizedCategories,
      dailyPerformance
    });
  })
);

app.get(
  "/api/questions",
  asyncHandler(async (req, res) => {
    const rows = await allQuery(
      `SELECT q.id, q.text, q.type, q.module_id AS moduleId, q.position,
              m.title AS moduleTitle
       FROM questions q
       INNER JOIN modules m ON q.module_id = m.id
       ORDER BY m.position ASC, q.position ASC`
    );

    const normalized = rows.map((row) => {
      const moduleId = row.moduleId || row.module_id || row.moduleid || null;
      const moduleTitle =
        row.moduleTitle ||
        row.module_title ||
        row.moduletitle ||
        "Onbekende module";

      return {
        id: row.id,
        text: row.text,
        type: row.type,
        moduleId,
        moduleTitle,
        position: row.position
      };
    });

    res.json(normalized);
  })
);

app.get(
  "/api/questions/:id",
  asyncHandler(async (req, res) => {
    const question = await getQuestionWithOptions(req.params.id);
    if (!question) {
      res.status(404).json({ message: "Vraag niet gevonden" });
      return;
    }
    res.json({
      id: question.id,
      moduleId: question.module_id,
      text: question.text,
      type: question.type,
      feedback: {
        correct: question.feedback_correct || "",
        incorrect: question.feedback_incorrect || ""
      },
      options: question.options
    });
  })
);

app.post(
  "/api/questions",
  asyncHandler(async (req, res) => {
    const { moduleId, text, type = "single", feedback = {}, options = [] } =
      req.body || {};

    if (!moduleId || !text) {
      res.status(400).json({ message: "moduleId en text zijn verplicht" });
      return;
    }

    const module = await getModuleById(moduleId);
    if (!module) {
      res.status(404).json({ message: "Module niet gevonden" });
      return;
    }

    const sanitizedOptions = sanitizeOptions(options);
    if (!sanitizedOptions.length) {
      res.status(400).json({ message: "Voeg minimaal één antwoordoptie toe" });
      return;
    }

    const hasCorrect = sanitizedOptions.some((option) => option.isCorrect);
    if (!hasCorrect) {
      res.status(400).json({ message: "Markeer minimaal één juist antwoord" });
      return;
    }

    const now = Date.now();
    const positionRow = await getQuery(
      "SELECT COALESCE(MAX(position), -1) AS maxPosition FROM questions WHERE module_id = ?",
      [moduleId]
    );
    const nextPosition = (positionRow?.maxPosition || -1) + 1;

    const questionId = randomUUID();
    await runQuery(
      `INSERT INTO questions (id, module_id, text, type, feedback_correct, feedback_incorrect, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        questionId,
        moduleId,
        text,
        type,
        feedback.correct || "",
        feedback.incorrect || "",
        nextPosition
      ]
    );

    await saveQuestionOptions(questionId, sanitizedOptions);

    res.status(201).json({ id: questionId });
  })
);

app.put(
  "/api/questions/:id",
  asyncHandler(async (req, res) => {
    const { moduleId, text, type = "single", feedback = {}, options = [] } =
      req.body || {};

    if (!moduleId || !text) {
      res.status(400).json({ message: "moduleId en text zijn verplicht" });
      return;
    }

    const existing = await getQuestionWithOptions(req.params.id);
    if (!existing) {
      res.status(404).json({ message: "Vraag niet gevonden" });
      return;
    }

    const module = await getModuleById(moduleId);
    if (!module) {
      res.status(404).json({ message: "Module niet gevonden" });
      return;
    }

    const sanitizedOptions = sanitizeOptions(options);
    if (!sanitizedOptions.length) {
      res.status(400).json({ message: "Voeg minimaal één antwoordoptie toe" });
      return;
    }

    const hasCorrect = sanitizedOptions.some((option) => option.isCorrect);
    if (!hasCorrect) {
      res.status(400).json({ message: "Markeer minimaal één juist antwoord" });
      return;
    }

    await runQuery(
      `UPDATE questions
       SET module_id = ?, text = ?, type = ?, feedback_correct = ?, feedback_incorrect = ?
       WHERE id = ?`,
      [
        moduleId,
        text,
        type,
        feedback.correct || "",
        feedback.incorrect || "",
        req.params.id
      ]
    );

    await saveQuestionOptions(req.params.id, sanitizedOptions);

    res.json({ id: req.params.id });
  })
);

app.post(
  "/api/sessions",
  asyncHandler(async (req, res) => {
    const name = req.body?.name || null;
    const requestedId = req.body?.id;
    const now = new Date();
    const id = requestedId || randomUUID();
    const iso = now.toISOString();

    await runQuery(
      `INSERT INTO sessions (id, name, status, start_time, last_seen)
       VALUES (?, ?, 'active', ?, ?)`,
      [id, name, iso, iso]
    );

    res.status(201).json({
      id,
      name,
      status: "active",
      startTime: iso,
      lastSeen: iso
    });
  })
);

app.post(
  "/api/sessions/:id/heartbeat",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const now = new Date().toISOString();
    await runQuery(
      `UPDATE sessions
       SET last_seen = ?, status = CASE WHEN status = 'completed' THEN status ELSE 'active' END
       WHERE id = ?`,
      [now, id]
    );
    res.json({ lastSeen: now });
  })
);

app.post(
  "/api/sessions/:id/attempt",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { moduleId, questionId, selectedOptionIds = [], isCorrect = false } =
      req.body || {};

    const now = new Date().toISOString();
    const attemptId = randomUUID();
    await runQuery(
      `INSERT INTO session_attempts (id, session_id, module_id, question_id, selected_options, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        attemptId,
        id,
        moduleId || null,
        questionId || null,
        JSON.stringify(selectedOptionIds || []),
        isCorrect ? 1 : 0,
        now
      ]
    );

    await runQuery(
      `UPDATE sessions
       SET last_seen = ?, status = CASE WHEN status = 'completed' THEN status ELSE 'active' END
       WHERE id = ?`,
      [now, id]
    );

    res.status(201).json({});
  })
);

app.post(
  "/api/sessions/:id/complete",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const summary = req.body?.summary || null;
    const now = new Date().toISOString();

    await runQuery(
      `UPDATE sessions
       SET status = 'completed', summary = ?, end_time = ?, last_seen = ?
       WHERE id = ?`,
      [summary ? JSON.stringify(summary) : null, now, now, id]
    );

    res.json({ endTime: now });
  })
);

app.post(
  "/api/sessions/:id/leave",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const now = new Date().toISOString();
    await runQuery(
      `UPDATE sessions
       SET status = CASE WHEN status = 'completed' THEN status ELSE 'inactive' END,
           end_time = COALESCE(end_time, ?),
           last_seen = ?
       WHERE id = ?`,
      [now, now, id]
    );
    res.json({});
  })
);

app.delete(
  "/api/questions/:id",
  asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const existing = await getQuery(
      "SELECT id FROM questions WHERE id = ?",
      [questionId]
    );

    if (!existing) {
      res.status(404).json({ message: "Vraag niet gevonden" });
      return;
    }

    await runQuery("DELETE FROM questions WHERE id = ?", [questionId]);
    res.status(204).send();
  })
);

app.get(
  "/api/dashboard",
  asyncHandler(async (req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    const sessions = await allQuery(
      `SELECT * FROM sessions WHERE start_time >= ? ORDER BY start_time DESC`,
      [startIso]
    );

    if (!sessions.length) {
      res.json({
        totalSessions: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        activeParticipants: 0,
        activeSessions: []
      });
      return;
    }

    const sessionIds = sessions.map((session) => session.id);
    const attemptRows = await allQuery(
      `SELECT session_id AS sessionId,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
              SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS incorrect
       FROM session_attempts
       WHERE session_id IN (${sessionIds.map(() => "?").join(",")})
       GROUP BY session_id`,
      sessionIds
    );

    const attemptsMap = attemptRows.reduce((acc, row) => {
      const sessionId = row.sessionId || row.session_id || row.sessionid;
      if (!sessionId) {
        return acc;
      }

      const correct = Number(
        row.correct ?? row.correct_attempts ?? row.correctattempts ?? 0
      );
      const incorrect = Number(
        row.incorrect ?? row.incorrect_attempts ?? row.incorrectattempts ?? 0
      );

      acc[sessionId] = {
        correct: Number.isFinite(correct) ? correct : 0,
        incorrect: Number.isFinite(incorrect) ? incorrect : 0
      };
      return acc;
    }, {});

    const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const activeSessions = [];

    sessions.forEach((session) => {
      const stats = attemptsMap[session.id] || { correct: 0, incorrect: 0 };
      totalCorrect += stats.correct;
      totalIncorrect += stats.incorrect;

      if (
        session.status === "active" &&
        session.last_seen &&
        session.last_seen >= cutoff
      ) {
        activeSessions.push({
          id: session.id,
          name: session.name,
          correct: stats.correct,
          incorrect: stats.incorrect,
          startTime: session.start_time,
          lastSeen: session.last_seen
        });
      }
    });

    res.json({
      totalSessions: sessions.length,
      totalCorrect,
      totalIncorrect,
      activeParticipants: activeSessions.length,
      activeSessions
    });
  })
);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: "Er is iets misgegaan" });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server gestart op poort ${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Database-initialisatie mislukt", error);
    process.exit(1);
  });
