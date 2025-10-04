const {
  loadQuizConfig,
  loadSessionSettings,
  listQuestions,
  getQuestionDetail,
  clearCache
} = require("../src/googleSheetsConfigClient");

const defaults = require("../data/google-sheets/defaults.json");
const modules = require("../data/google-sheets/modules.json");
const questions = require("../data/google-sheets/questions.json");
const options = require("../data/google-sheets/options.json");

const sheetsData = { defaults, modules, questions, options };

describe("googleSheetsConfigClient", () => {
  afterEach(() => {
    clearCache();
  });

  test("stelt de quizconfiguratie samen uit Google Sheets", async () => {
    const config = await loadQuizConfig({ sheetsData });

    expect(config.title).toBe("Digitaal Veiligheidsrijbewijs");
    expect(config.modules).toHaveLength(modules.length);
    expect(config.modules[0].id).toBe("wachtwoorden");
    expect(config.modules[0].questionPool).toHaveLength(8);
    expect(config.modules[1].questionPool[0].options).toHaveLength(4);
    expect(config.sessionApiBaseUrl).toBe(
      "https://script.google.com/macros/s/demo-id/exec"
    );
    expect(config.dashboard.refreshIntervalMs).toBe(20000);
    expect(config.dashboard.autoUpdate).toBe(false);
    expect(config.strings.startButton).toBe("Start de quiz");
    expect(config.strings.checkAnswer).toBe("Controleer antwoord");

    expect(global.__CHAT_SPEL_DEFAULTS_CONFIG__).toMatchObject({
      normalized: expect.objectContaining({
        title: "Digitaal Veiligheidsrijbewijs"
      }),
      strings: expect.objectContaining({
        startButton: "Start de quiz"
      })
    });
  });

  test("leest sessie-instellingen uit defaults", async () => {
    const settings = await loadSessionSettings({ sheetsData });

    expect(settings.sessionApiBaseUrl).toBe(
      "https://script.google.com/macros/s/demo-id/exec"
    );
    expect(settings.dashboard.refreshIntervalMs).toBe(20000);
    expect(settings.dashboard.autoUpdate).toBe(false);
  });

  test("geeft een vlakke lijst met vragen terug", async () => {
    const rows = await listQuestions({ sheetsData });
    expect(rows).toHaveLength(questions.length);
    const multipleChoice = rows.find((row) => row.id === "share-privé");
    expect(multipleChoice.type).toBe("multiple");
    expect(multipleChoice.moduleTitle).toBe("Slim delen");
  });

  test("haalt een vraagdetail met juiste antwoorden op", async () => {
    const detail = await getQuestionDetail("share-privé", { sheetsData });
    expect(detail).not.toBeNull();
    expect(detail.options).toHaveLength(4);
    const correctOptions = detail.options.filter((option) => option.isCorrect);
    expect(correctOptions.map((option) => option.id).sort()).toEqual([
      "share-privé-b",
      "share-privé-c"
    ]);
  });
});
