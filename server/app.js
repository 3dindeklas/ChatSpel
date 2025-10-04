const express = require("express");
const path = require("path");
const cors = require("cors");

const {
  getQuizConfig,
  listModules,
  listQuestions,
  getQuestionDetail
} = require("./googleSheetsConfig");

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/styles", express.static(path.join(__dirname, "..", "styles")));
  app.use("/src", express.static(path.join(__dirname, "..", "src")));

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
      const modules = await listModules();
      res.json(modules);
    })
  );

  app.get(
    "/api/questions",
    asyncHandler(async (req, res) => {
      const questions = await listQuestions();
      res.json(questions);
    })
  );

  app.get(
    "/api/questions/:id",
    asyncHandler(async (req, res) => {
      const question = await getQuestionDetail(req.params.id);
      if (!question) {
        res.status(404).json({ message: "Vraag niet gevonden" });
        return;
      }
      res.json(question);
    })
  );

  const mutationNotSupported = (req, res) => {
    res.status(501).json({
      message:
        "Wijzigingen verlopen via Google Sheets. Pas de gegevens aan in het spreadsheet."
    });
  };

  app.post("/api/questions", mutationNotSupported);
  app.put("/api/questions/:id", mutationNotSupported);
  app.post("/api/sessions", mutationNotSupported);
  app.post("/api/sessions/:id/heartbeat", mutationNotSupported);
  app.post("/api/sessions/:id/attempt", mutationNotSupported);
  app.post("/api/sessions/:id/complete", mutationNotSupported);
  app.post("/api/sessions/:id/leave", mutationNotSupported);
  app.get("/api/dashboard", mutationNotSupported);

  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Er is iets misgegaan" });
  });

  return app;
}

module.exports = { createApp };
