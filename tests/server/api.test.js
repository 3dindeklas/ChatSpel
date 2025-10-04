const path = require("path");
const request = require("supertest");

const { createApp } = require("../../server/app");

describe("API via Google Sheets", () => {
  let app;

  beforeAll(() => {
    process.env.GOOGLE_SHEETS_FAKE_DATA_DIR = path.join(
      __dirname,
      "..",
      "..",
      "data",
      "google-sheets"
    );
    app = createApp();
  });

  afterAll(() => {
    delete process.env.GOOGLE_SHEETS_FAKE_DATA_DIR;
  });

  test("GET /api/quiz-config levert de data uit de defaults- en modulesheets", async () => {
    const response = await request(app).get("/api/quiz-config");

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Digitaal Veiligheidsrijbewijs");
    expect(Array.isArray(response.body.modules)).toBe(true);
    expect(response.body.modules.length).toBeGreaterThan(0);
    expect(response.body.modules[0]).toHaveProperty("questionPool");
  });

  test("GET /api/questions/:id geeft details inclusief juiste antwoorden", async () => {
    const listResponse = await request(app).get("/api/questions");
    const questionId = listResponse.body[0].id;

    const response = await request(app).get(`/api/questions/${questionId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(questionId);
    expect(Array.isArray(response.body.options)).toBe(true);
    expect(response.body.options.length).toBeGreaterThan(0);
    const hasCorrect = response.body.options.some((option) => option.isCorrect);
    expect(hasCorrect).toBe(true);
  });

  test("POST /api/questions verwijst naar Google Sheets", async () => {
    const response = await request(app).post("/api/questions").send({});

    expect(response.status).toBe(501);
    expect(response.body.message).toMatch(/Google Sheets/i);
  });
});
