const express = require("express");
const path = require("path");

function createApp() {
  const app = express();
  const rootDir = path.join(__dirname, "..");

  app.use(express.static(path.join(rootDir, "public")));
  app.use("/styles", express.static(path.join(rootDir, "styles")));
  app.use("/src", express.static(path.join(rootDir, "src")));
  app.use("/data", express.static(path.join(rootDir, "data")));

  app.use((req, res) => {
    res.status(404).json({
      message:
        "Endpoint niet gevonden. Alle dynamische data wordt uit Google Sheets geladen."
    });
  });

  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Er is iets misgegaan" });
  });

  return app;
}

module.exports = { createApp };
