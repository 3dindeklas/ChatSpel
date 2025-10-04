const path = require("path");

describe("server/googleSheetsConfig", () => {
  const originalFakeDataDir = process.env.GOOGLE_SHEETS_FAKE_DATA_DIR;

  beforeEach(() => {
    jest.resetModules();
    process.env.GOOGLE_SHEETS_FAKE_DATA_DIR = path.join(
      __dirname,
      "..",
      "data",
      "google-sheets"
    );
  });

  afterEach(() => {
    jest.resetModules();
    if (originalFakeDataDir) {
      process.env.GOOGLE_SHEETS_FAKE_DATA_DIR = originalFakeDataDir;
    } else {
      delete process.env.GOOGLE_SHEETS_FAKE_DATA_DIR;
    }
  });

  test("leest defaults uit de sheet in de configuratie", async () => {
    const { getQuizConfig } = require("../server/googleSheetsConfig");

    const config = await getQuizConfig();

    expect(config.title).toBe("Digitaal Veiligheidsrijbewijs");
    expect(config.sessionApiBaseUrl).toBe(
      "https://script.google.com/macros/s/demo-id/exec"
    );
    expect(config.dashboard.refreshIntervalMs).toBe(20000);
    expect(config.dashboard.autoUpdate).toBe(false);
  });
});
