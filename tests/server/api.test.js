process.env.DATABASE_PATH = ":memory:";

const request = require("supertest");
const { randomUUID } = require("crypto");

const { createApp } = require("../../server/app");
const {
  initializeDatabase,
  runQuery,
  allQuery,
  getQuery,
  db
} = require("../../server/initializeDatabase");

async function resetDatabase() {
  const tables = [
    "session_attempts",
    "sessions",
    "options",
    "questions",
    "modules",
    "quiz_settings"
  ];

  for (const table of tables) {
    await runQuery(`DELETE FROM ${table}`);
  }

  await initializeDatabase();
}

describe("API integratie", () => {
  let app;

  beforeAll(async () => {
    await initializeDatabase();
    app = createApp();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll((done) => {
    db.close(done);
  });

  test("GET /api/quiz-config geeft de standaardconfiguratie terug", async () => {
    const response = await request(app).get("/api/quiz-config");
    expect(response.status).toBe(200);
    expect(response.body.title).toBeTruthy();
    expect(Array.isArray(response.body.modules)).toBe(true);
    expect(response.body.modules.length).toBeGreaterThan(0);
    expect(response.body.modules[0]).toHaveProperty("questionPool");
  });

  test("POST /api/questions valideert verplichte velden", async () => {
    const response = await request(app)
      .post("/api/questions")
      .send({ text: "Vraag zonder module" });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/moduleId/i);
  });

  test("POST /api/questions slaat een nieuwe vraag met opties op", async () => {
    const [moduleRow] = await allQuery(
      "SELECT id FROM modules ORDER BY position ASC LIMIT 1"
    );
    const moduleId = moduleRow.id;

    const payload = {
      moduleId,
      text: "Hoe test je deze API?",
      type: "single",
      feedback: {
        correct: "Goed gedaan!",
        incorrect: "Probeer het opnieuw."
      },
      options: [
        { label: "Met Jest", isCorrect: true },
        { label: "Met potlood en papier", isCorrect: false }
      ]
    };

    const response = await request(app).post("/api/questions").send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    const questionId = response.body.id;

    const storedQuestion = await getQuery(
      "SELECT text, module_id AS moduleId FROM questions WHERE id = ?",
      [questionId]
    );
    expect(storedQuestion).not.toBeNull();
    expect(storedQuestion.text).toBe(payload.text);
    expect(storedQuestion.moduleId).toBe(moduleId);

    const storedOptions = await allQuery(
      "SELECT label, is_correct AS isCorrect FROM options WHERE question_id = ? ORDER BY position ASC",
      [questionId]
    );
    expect(storedOptions).toHaveLength(2);
    expect(storedOptions[0].label).toBe("Met Jest");
    expect(storedOptions.some((option) => option.isCorrect === 1)).toBe(true);
  });

  test("GET /api/dashboard aggregeert sessiestatistieken", async () => {
    const activeSessionId = randomUUID();
    const inactiveSessionId = randomUUID();
    const now = new Date();
    const isoNow = now.toISOString();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    await runQuery(
      `INSERT INTO sessions (id, name, status, start_time, last_seen)
       VALUES (?, ?, 'active', ?, ?)`,
      [activeSessionId, "Tester", isoNow, isoNow]
    );

    await runQuery(
      `INSERT INTO session_attempts (session_id, module_id, question_id, selected_options, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [activeSessionId, null, null, "[]", 1, isoNow]
    );
    await runQuery(
      `INSERT INTO session_attempts (session_id, module_id, question_id, selected_options, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [activeSessionId, null, null, "[]", 0, isoNow]
    );

    await runQuery(
      `INSERT INTO sessions (id, name, status, start_time, last_seen)
       VALUES (?, ?, 'active', ?, ?)`,
      [inactiveSessionId, "Inactief", isoNow, fiveMinutesAgo]
    );

    await runQuery(
      `INSERT INTO session_attempts (session_id, module_id, question_id, selected_options, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [inactiveSessionId, null, null, "[]", 1, fiveMinutesAgo]
    );

    const response = await request(app).get("/api/dashboard");

    expect(response.status).toBe(200);
    expect(response.body.totalSessions).toBe(2);
    expect(response.body.totalCorrect).toBe(2);
    expect(response.body.totalIncorrect).toBe(1);
    expect(response.body.activeParticipants).toBe(1);
    expect(response.body.activeSessions).toHaveLength(1);
    expect(response.body.activeSessions[0].id).toBe(activeSessionId);
  });
});
