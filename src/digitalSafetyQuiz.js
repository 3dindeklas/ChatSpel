(function (global) {
  "use strict";

  const defaultConfig = {
    title: "Digitaal Veiligheidsrijbewijs",
    description:
      "Doorloop de modules, beantwoord de vragen en verdien het certificaat voor digitale veiligheid!",
    modules: [
      {
        id: "wachtwoorden",
        title: "Sterke wachtwoorden",
        intro:
          "Een sterk wachtwoord is lang, uniek en bevat cijfers, letters en symbolen. Gebruik geen informatie die andere mensen makkelijk kunnen raden, zoals je naam of verjaardag.",
        tips: [
          "Maak wachtwoorden van minimaal 12 tekens",
          "Gebruik een wachtwoordmanager of een wachtwoordzin",
          "Deel je wachtwoord nooit met anderen"
        ],
        questions: [
          {
            id: "pw-1",
            text: "Welk wachtwoord is het veiligst?",
            type: "single",
            options: [
              { id: "a", label: "123456" },
              { id: "b", label: "voetbal" },
              { id: "c", label: "H0nd!sPr!ngt" }
            ],
            correct: ["c"],
            feedback: {
              correct: "Klopt! Dit wachtwoord is lang en gebruikt hoofdletters, cijfers en symbolen.",
              incorrect: "Niet helemaal. Kies een wachtwoord dat lang is en verschillende soorten tekens gebruikt."
            }
          },
          {
            id: "pw-2",
            text: "Wat is een goede manier om een wachtwoord te onthouden?",
            type: "single",
            options: [
              { id: "a", label: "Schrijf het wachtwoord op een briefje en plak het op je scherm." },
              { id: "b", label: "Gebruik een grappige zin en maak daar een wachtwoord van." },
              { id: "c", label: "Gebruik hetzelfde wachtwoord voor alles." }
            ],
            correct: ["b"],
            feedback: {
              correct: "Heel goed! Een wachtwoordzin is makkelijk te onthouden en moeilijk te raden.",
              incorrect: "Probeer een wachtwoordzin te gebruiken. Dat is veiliger dan overal hetzelfde wachtwoord."}
          }
        ]
      },
      {
        id: "delen",
        title: "Slim delen",
        intro:
          "Op internet hoef je niet alles te delen. Denk na voordat je iets plaatst of verstuurt. Vraag jezelf af: zou ik dit ook in de klas laten zien?",
        tips: [
          "Plaats geen persoonlijke gegevens zoals adressen of telefoonnummers",
          "Vraag toestemming voordat je foto's van anderen deelt",
          "Zet je profiel op privé wanneer mogelijk"
        ],
        questions: [
          {
            id: "share-1",
            text: "Je wilt een leuke foto van een klasgenoot delen. Wat doe je?",
            type: "single",
            options: [
              { id: "a", label: "Ik plaats de foto meteen." },
              { id: "b", label: "Ik vraag eerst of het mag." },
              { id: "c", label: "Ik stuur de foto naar iedereen in mijn contacten." }
            ],
            correct: ["b"],
            feedback: {
              correct: "Super! Vraag altijd toestemming voordat je iets deelt wat niet van jou is.",
              incorrect: "Vraag altijd eerst toestemming voordat je een foto deelt."}
          },
          {
            id: "share-2",
            text: "Welke informatie kun je het beste voor jezelf houden?",
            type: "multiple",
            options: [
              { id: "a", label: "Je lievelingskleur" },
              { id: "b", label: "Je thuisadres" },
              { id: "c", label: "Je geheime wachtwoord" }
            ],
            correct: ["b", "c"],
            feedback: {
              correct: "Goed gedaan! Adressen en wachtwoorden zijn privé.",
              incorrect: "Denk eraan dat persoonlijke gegevens zoals adressen en wachtwoorden geheim moeten blijven."}
          }
        ]
      },
      {
        id: "online-vrienden",
        title: "Online vrienden",
        intro:
          "Niet iedereen online is wie hij zegt dat hij is. Wees voorzichtig met nieuwe online vrienden en bespreek vreemde situaties met een volwassene die je vertrouwt.",
        tips: [
          "Accepteer geen vriendschapsverzoeken van onbekenden",
          "Praat met je ouders of leerkracht als iemand je ongemakkelijk laat voelen",
          "Spreek niet af met iemand die je alleen via internet kent"
        ],
        questions: [
          {
            id: "friends-1",
            text: "Wat doe je als iemand die je niet kent je een bericht stuurt?",
            type: "single",
            options: [
              { id: "a", label: "Ik reageer meteen en vertel veel over mezelf." },
              { id: "b", label: "Ik vertel het aan een volwassene die ik vertrouw." },
              { id: "c", label: "Ik ga met die persoon afspreken." }
            ],
            correct: ["b"],
            feedback: {
              correct: "Heel goed! Praat altijd met een volwassene als iemand je iets vreemd vraagt.",
              incorrect: "Vertel het aan een volwassene die je vertrouwt en reageer niet zomaar."}
          }
        ]
      }
    ],
    certificateMessage:
      "Gefeliciteerd! Je hebt alle modules voltooid en toont dat jij veilig en slim online kunt zijn.",
    strings: {
      startButton: "Start de quiz",
      nextModule: "Volgende module",
      continue: "Ga verder",
      checkAnswer: "Controleer antwoord",
      nextQuestion: "Volgende vraag",
      selectOptions: "Selecteer je antwoord", 
      selectMultiple: "Selecteer een of meer antwoorden",
      feedbackCorrect: "Goed gedaan!",
      feedbackIncorrect: "Probeer het nog eens.",
      moduleComplete: "Module afgerond!",
      certificateTitle: "Jouw digitale veiligheidsrijbewijs",
      enterName: "Vul je naam in voor op het certificaat",
      downloadButton: "Download als afbeelding",
      resetButton: "Opnieuw beginnen"
    }
  };

  function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) {
      el.className = options.className;
    }
    if (options.text) {
      el.textContent = options.text;
    }
    if (options.html) {
      el.innerHTML = options.html;
    }
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          el.setAttribute(key, value);
        }
      });
    }
    return el;
  }

  function storageAvailable(type = "localStorage") {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const storage = window[type];
      const testKey = "__dsq_storage_test__";
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function generateId(prefix = "id") {
    const basePrefix = prefix ? `${prefix}-` : "";
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `${basePrefix}${crypto.randomUUID()}`;
    }
    const randomPart = Math.random().toString(36).slice(2);
    return `${basePrefix}${Date.now().toString(36)}-${randomPart}`;
  }

  const SESSION_EVENT_NAME = "dsq:sessions-updated";

  class DailySessionStore {
    constructor(options = {}) {
      this.prefix = options.prefix || "digitalSafetyQuiz:sessions";
      this.storageEnabled = storageAvailable("localStorage");
      this.memoryStore = {};
      this.sessionIndex = {};
      this._rebuildIndex();
    }

    _getDateKey(date = new Date()) {
      return `${this.prefix}:${date.toISOString().slice(0, 10)}`;
    }

    _readByKey(dateKey) {
      if (!dateKey) {
        return { sessions: [] };
      }

      if (this.storageEnabled) {
        const raw = window.localStorage.getItem(dateKey);
        if (!raw) {
          return { sessions: [] };
        }
        try {
          return JSON.parse(raw);
        } catch (error) {
          return { sessions: [] };
        }
      }

      if (!this.memoryStore[dateKey]) {
        this.memoryStore[dateKey] = { sessions: [] };
      }

      return JSON.parse(JSON.stringify(this.memoryStore[dateKey]));
    }

    _saveByKey(dateKey, data) {
      const serialized = JSON.stringify(data);
      if (this.storageEnabled) {
        window.localStorage.setItem(dateKey, serialized);
      } else {
        this.memoryStore[dateKey] = JSON.parse(serialized);
      }
      this._indexSessions(dateKey, data.sessions);
      this._broadcastChange();
    }

    _indexSessions(dateKey, sessions = []) {
      sessions.forEach((session) => {
        if (session && session.id) {
          this.sessionIndex[session.id] = dateKey;
        }
      });
    }

    _rebuildIndex() {
      const todayKey = this._getDateKey();
      const data = this._readByKey(todayKey);
      this._indexSessions(todayKey, data.sessions);
    }

    _getSession(dateKey, sessionId) {
      const data = this._readByKey(dateKey);
      const session = data.sessions.find((entry) => entry.id === sessionId);
      return { data, session };
    }

    _broadcastChange() {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SESSION_EVENT_NAME));
      }
    }

    createSession(name) {
      const now = new Date();
      const dateKey = this._getDateKey(now);
      const data = this._readByKey(dateKey);
      const session = {
        id: generateId("session"),
        dateKey,
        name,
        startTime: now.toISOString(),
        status: "active",
        attempts: [],
        stats: { correct: 0, incorrect: 0 },
        summary: null,
        lastUpdated: now.toISOString()
      };

      data.sessions.push(session);
      this._saveByKey(dateKey, data);
      return session;
    }

    recordAttempt(sessionId, attempt) {
      if (!sessionId) {
        return null;
      }

      const dateKey = this.sessionIndex[sessionId] || this._getDateKey();
      const { data, session } = this._getSession(dateKey, sessionId);
      if (!session) {
        return null;
      }

      if (!Array.isArray(session.attempts)) {
        session.attempts = [];
      }
      session.attempts.push({ ...attempt });

      session.stats = session.stats || { correct: 0, incorrect: 0 };
      if (attempt.isCorrect) {
        session.stats.correct += 1;
      } else {
        session.stats.incorrect += 1;
      }

      session.lastUpdated = new Date().toISOString();
      this._saveByKey(dateKey, data);
      return session;
    }

    completeSession(sessionId, summary) {
      if (!sessionId) {
        return null;
      }

      const dateKey = this.sessionIndex[sessionId] || this._getDateKey();
      const { data, session } = this._getSession(dateKey, sessionId);
      if (!session) {
        return null;
      }

      session.status = "completed";
      session.summary = summary;
      session.endTime = new Date().toISOString();
      session.lastUpdated = session.endTime;

      this._saveByKey(dateKey, data);
      return session;
    }

    getSnapshot() {
      const todayKey = this._getDateKey();
      const data = this._readByKey(todayKey);
      const activeSessions = data.sessions.filter(
        (session) => session.status === "active"
      );

      const totals = data.sessions.reduce(
        (acc, session) => {
          const stats = session.stats || { correct: 0, incorrect: 0 };
          acc.correct += stats.correct;
          acc.incorrect += stats.incorrect;
          if (session.status === "active") {
            acc.activeParticipants += 1;
          }
          return acc;
        },
        { correct: 0, incorrect: 0, activeParticipants: 0 }
      );

      return {
        dateKey: todayKey,
        totals,
        activeSessions: activeSessions.map((session) => ({
          id: session.id,
          name: session.name,
          correct: session.stats?.correct || 0,
          incorrect: session.stats?.incorrect || 0,
          startTime: session.startTime
        })),
        totalSessions: data.sessions.length
      };
    }
  }

  class DashboardView {
    constructor(container, store) {
      this.container = container;
      this.store = store;
      this.elements = {};
      this.render();
      this.update();

      this.handleUpdate = this.update.bind(this);
      if (typeof window !== "undefined") {
        window.addEventListener(SESSION_EVENT_NAME, this.handleUpdate);
        window.addEventListener("storage", this.handleUpdate);
      }
    }

    render() {
      this.container.innerHTML = "";
      this.container.classList.add("dsq-dashboard");

      const title = createElement("h2", {
        className: "dsq-dashboard-title",
        text: "Live dashboard"
      });
      const dateEl = createElement("p", {
        className: "dsq-dashboard-date"
      });

      const metricsWrapper = createElement("div", {
        className: "dsq-dashboard-metrics"
      });

      const participantMetric = this._createMetric(
        "Actieve deelnemers",
        "0"
      );
      const correctMetric = this._createMetric("Goede antwoorden", "0");
      const incorrectMetric = this._createMetric("Foute antwoorden", "0");

      metricsWrapper.append(
        participantMetric.wrapper,
        correctMetric.wrapper,
        incorrectMetric.wrapper
      );

      const sessionTitle = createElement("h3", {
        className: "dsq-dashboard-subtitle",
        text: "Actieve sessies"
      });
      const sessionList = createElement("ul", {
        className: "dsq-dashboard-session-list"
      });

      this.container.append(title, dateEl, metricsWrapper, sessionTitle, sessionList);

      this.elements.date = dateEl;
      this.elements.participants = participantMetric.valueEl;
      this.elements.correct = correctMetric.valueEl;
      this.elements.incorrect = incorrectMetric.valueEl;
      this.elements.sessionList = sessionList;
    }

    _createMetric(label, value) {
      const wrapper = createElement("div", {
        className: "dsq-dashboard-metric"
      });
      const valueEl = createElement("span", {
        className: "dsq-dashboard-metric-value",
        text: value
      });
      const labelEl = createElement("span", {
        className: "dsq-dashboard-metric-label",
        text: label
      });
      wrapper.append(valueEl, labelEl);
      return { wrapper, valueEl, labelEl };
    }

    update() {
      if (!this.store) {
        return;
      }

      const snapshot = this.store.getSnapshot();
      const dateKey = snapshot.dateKey.split(":").pop();
      this.elements.date.textContent = `Vandaag: ${this._formatDate(dateKey)}`;
      this.elements.participants.textContent = String(
        snapshot.totals.activeParticipants || 0
      );
      this.elements.correct.textContent = String(snapshot.totals.correct || 0);
      this.elements.incorrect.textContent = String(
        snapshot.totals.incorrect || 0
      );

      this._renderSessions(snapshot.activeSessions);
    }

    _renderSessions(sessions = []) {
      const list = this.elements.sessionList;
      list.innerHTML = "";

      if (!sessions.length) {
        list.append(
          createElement("li", {
            className: "dsq-dashboard-session-empty",
            text: "Geen actieve sessies"
          })
        );
        return;
      }

      sessions.forEach((session) => {
        const item = createElement("li", {
          className: "dsq-dashboard-session-item"
        });

        const nameEl = createElement("span", {
          className: "dsq-dashboard-session-name",
          text: session.name || "Onbekend"
        });
        const statsEl = createElement("span", {
          className: "dsq-dashboard-session-stats",
          text: `${session.correct} goed • ${session.incorrect} fout`
        });
        const timeEl = createElement("span", {
          className: "dsq-dashboard-session-time",
          text: `Gestart om ${this._formatTime(session.startTime)}`
        });

        item.append(nameEl, statsEl, timeEl);
        list.append(item);
      });
    }

    _formatDate(dateString) {
      if (!dateString) {
        return "-";
      }
      const [year, month, day] = dateString.split("-");
      return `${day}-${month}-${year}`;
    }

    _formatTime(timeString) {
      if (!timeString) {
        return "--:--";
      }
      const date = new Date(timeString);
      if (Number.isNaN(date.getTime())) {
        return "--:--";
      }
      return date.toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    destroy() {
      if (typeof window !== "undefined") {
        window.removeEventListener(SESSION_EVENT_NAME, this.handleUpdate);
        window.removeEventListener("storage", this.handleUpdate);
      }
    }
  }

  function normalizeConfig(userConfig = {}) {
    const config = JSON.parse(JSON.stringify(defaultConfig));
    if (!userConfig) {
      return config;
    }

    if (userConfig.title) config.title = userConfig.title;
    if (userConfig.description) config.description = userConfig.description;
    if (userConfig.modules) config.modules = userConfig.modules;
    if (userConfig.certificateMessage) {
      config.certificateMessage = userConfig.certificateMessage;
    }
    if (userConfig.strings) {
      config.strings = { ...config.strings, ...userConfig.strings };
    }
    return config;
  }

  class DigitalSafetyQuiz {
    constructor(options = {}) {
      this.config = normalizeConfig(options.config);
      this.container =
        typeof options.container === "string"
          ? document.querySelector(options.container)
          : options.container;
      if (!this.container) {
        throw new Error(
          "DigitalSafetyQuiz: kon de container niet vinden. Geef een element of CSS-selector door."
        );
      }
      this.sessionStore = new DailySessionStore();
      this.sessionId = null;
      this.sessionResults = new Map();
      this.participantName = "";
      this.sessionCompleted = false;
      this.currentModuleIndex = -1;
      this.currentQuestionIndex = -1;
      this.score = 0;
      this.totalQuestions = this.config.modules.reduce(
        (count, module) => count + module.questions.length,
        0
      );
      this.renderBaseLayout();
    }

    renderBaseLayout() {
      this.container.innerHTML = "";
      this.container.classList.add("dsq-wrapper");

      this.headerEl = createElement("header", { className: "dsq-header" });
      const titleEl = createElement("h1", {
        className: "dsq-title",
        text: this.config.title
      });
      const descEl = createElement("p", {
        className: "dsq-description",
        text: this.config.description
      });
      this.progressEl = createElement("div", { className: "dsq-progress" });

      this.headerEl.append(titleEl, descEl, this.progressEl);

      this.mainEl = createElement("main", { className: "dsq-main" });
      this.footerEl = createElement("footer", { className: "dsq-footer" });

      this.container.append(this.headerEl, this.mainEl, this.footerEl);

      this.renderIntro();
    }

    renderIntro() {
      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";
      this.sessionId = null;
      this.sessionResults = new Map();
      this.participantName = "";
      this.sessionCompleted = false;

      const introCard = createElement("section", {
        className: "dsq-card dsq-intro"
      });
      introCard.append(
        createElement("h2", { text: "Welkom!" }),
        createElement("p", {
          text: "In deze quiz leer je hoe je veilig en slim online blijft. Ben je klaar?"
        })
      );

      const nameField = createElement("div", {
        className: "dsq-input-group"
      });
      const nameLabel = createElement("label", {
        className: "dsq-label",
        text: "Wat is je naam?",
        attrs: { for: "dsq-participant-name" }
      });
      const nameInput = createElement("input", {
        attrs: {
          id: "dsq-participant-name",
          type: "text",
          placeholder: this.config.strings.enterName,
          "aria-label": this.config.strings.enterName,
          autocomplete: "name"
        },
        className: "dsq-input"
      });
      nameField.append(nameLabel, nameInput);

      const startButton = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.startButton
      });
      startButton.disabled = true;

      const updateStartButton = () => {
        const hasName = nameInput.value.trim().length > 0;
        startButton.disabled = !hasName;
      };

      nameInput.addEventListener("input", updateStartButton);
      startButton.addEventListener("click", () => {
        const name = nameInput.value.trim();
        if (!name) {
          return;
        }
        startButton.disabled = true;
        this.startQuiz(name);
      });

      introCard.append(nameField, startButton);
      this.mainEl.append(introCard);
      this.updateProgress();
    }

    startQuiz(name) {
      if (this.sessionId) {
        return;
      }
      this.participantName = (name || "").trim();
      if (!this.participantName) {
        return;
      }

      this.sessionResults = new Map();
      this.sessionCompleted = false;
      const session = this.sessionStore.createSession(this.participantName);
      this.sessionId = session?.id || null;

      this.currentModuleIndex = 0;
      this.currentQuestionIndex = -1;
      this.score = 0;
      this.renderModuleIntro();
    }

    get currentModule() {
      return this.config.modules[this.currentModuleIndex];
    }

    renderModuleIntro() {
      const module = this.currentModule;
      if (!module) {
        this.renderCertificate();
        return;
      }

      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";

      const moduleEl = createElement("section", { className: "dsq-card" });
      moduleEl.append(
        createElement("h2", { text: module.title }),
        createElement("p", { text: module.intro })
      );

      if (module.tips && module.tips.length) {
        const tipsTitle = createElement("h3", { text: "Tips" });
        const tipsList = createElement("ul", { className: "dsq-tip-list" });
        module.tips.forEach((tip) => {
          tipsList.append(createElement("li", { text: tip }));
        });
        moduleEl.append(tipsTitle, tipsList);
      }

      const continueButton = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.continue
      });
      continueButton.addEventListener("click", () => {
        this.currentQuestionIndex = 0;
        this.renderQuestion();
      });
      moduleEl.append(continueButton);

      this.mainEl.append(moduleEl);
      this.updateProgress();
    }

    renderQuestion() {
      const module = this.currentModule;
      const question = module.questions[this.currentQuestionIndex];
      if (!question) {
        this.renderModuleComplete();
        return;
      }

      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";

      const questionCard = createElement("section", { className: "dsq-card" });
      questionCard.append(
        createElement("h2", { text: module.title }),
        createElement("h3", { text: question.text })
      );

      const instructions = question.type === "multiple"
        ? this.config.strings.selectMultiple
        : this.config.strings.selectOptions;
      questionCard.append(
        createElement("p", {
          className: "dsq-instructions",
          text: instructions
        })
      );

      const form = createElement("form", { className: "dsq-question-form" });
      const optionType = question.type === "multiple" ? "checkbox" : "radio";
      const nameAttr = `q-${module.id}-${question.id}`;

      question.options.forEach((option) => {
        const optionId = `${nameAttr}-${option.id}`;
        const wrapper = createElement("label", {
          className: "dsq-option"
        });
        const input = createElement("input", {
          attrs: {
            type: optionType,
            name: optionType === "radio" ? nameAttr : optionId,
            value: option.id,
            id: optionId
          }
        });
        const fakeControl = createElement("span", { className: "dsq-option-control" });
        const text = createElement("span", {
          className: "dsq-option-label",
          text: option.label
        });
        wrapper.append(input, fakeControl, text);
        form.append(wrapper);
      });

      const feedbackEl = createElement("div", {
        className: "dsq-feedback",
        attrs: { "aria-live": "polite", role: "status" }
      });
      const button = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.checkAnswer,
        attrs: { type: "submit" }
      });
      form.append(button);

      const nextQuestionButton = createElement("button", {
        className: "dsq-button dsq-button-secondary",
        text: this.config.strings.nextQuestion,
        attrs: { type: "button" }
      });
      nextQuestionButton.disabled = true;

      let hasRecordedScore = false;

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (form.classList.contains("dsq-question-locked")) {
          return;
        }

        const answers = Array.from(
          form.querySelectorAll("input:checked")
        ).map((input) => input.value);

        if (!answers.length) {
          feedbackEl.textContent =
            question.type === "multiple"
              ? this.config.strings.selectMultiple
              : this.config.strings.selectOptions;
          feedbackEl.classList.remove(
            "dsq-feedback-correct",
            "dsq-feedback-incorrect"
          );
          feedbackEl.classList.add("dsq-feedback-incorrect");
          return;
        }

        const isCorrect = this.evaluateAnswer(question, answers);
        this.handleQuestionAttempt(module, question, answers, isCorrect);

        feedbackEl.textContent = isCorrect
          ? question.feedback?.correct || this.config.strings.feedbackCorrect
          : question.feedback?.incorrect || this.config.strings.feedbackIncorrect;

        feedbackEl.classList.remove(
          "dsq-feedback-correct",
          "dsq-feedback-incorrect"
        );
        feedbackEl.classList.add(
          isCorrect ? "dsq-feedback-correct" : "dsq-feedback-incorrect"
        );

        if (isCorrect) {
          if (!hasRecordedScore) {
            this.score += 1;
            hasRecordedScore = true;
          }

          form.classList.add("dsq-question-locked");
          button.disabled = true;
          form.querySelectorAll("input").forEach((input) => {
            input.disabled = true;
          });

          nextQuestionButton.disabled = false;
          nextQuestionButton.focus();
        }
      });

      questionCard.append(form, feedbackEl);
      this.mainEl.append(questionCard);
      this.footerEl.innerHTML = "";
      nextQuestionButton.addEventListener("click", () => {
        if (nextQuestionButton.disabled) {
          return;
        }

        this.currentQuestionIndex += 1;
        this.renderQuestion();
      });
      this.footerEl.append(nextQuestionButton);

      this.updateProgress();
    }

    handleQuestionAttempt(module, question, answers, isCorrect) {
      if (!this.sessionResults) {
        this.sessionResults = new Map();
      }

      const attemptRecord = this._createAttemptRecord(
        module,
        question,
        answers,
        isCorrect
      );

      this._updateSessionResults(module, question, attemptRecord);

      if (this.sessionStore && this.sessionId) {
        this.sessionStore.recordAttempt(this.sessionId, attemptRecord);
      }

      return attemptRecord;
    }

    _getAttemptCount(moduleId, questionId) {
      const moduleResult = this.sessionResults.get(moduleId);
      if (!moduleResult) {
        return 0;
      }
      const questionResult = moduleResult.questions.get(questionId);
      return questionResult ? questionResult.attempts.length : 0;
    }

    _createAttemptRecord(module, question, answers, isCorrect) {
      const attemptNumber =
        this._getAttemptCount(module.id, question.id) + 1;
      const timestamp = new Date().toISOString();
      const answerLabels = answers.map((answerId) => {
        const option = question.options.find((opt) => opt.id === answerId);
        return option ? option.label : answerId;
      });

      return {
        id: generateId("attempt"),
        moduleId: module.id,
        moduleTitle: module.title,
        questionId: question.id,
        questionText: question.text,
        selectedAnswers: [...answers],
        selectedAnswerLabels: answerLabels,
        isCorrect,
        attemptNumber,
        timestamp
      };
    }

    _updateSessionResults(module, question, attemptRecord) {
      let moduleResult = this.sessionResults.get(module.id);
      if (!moduleResult) {
        moduleResult = {
          moduleId: module.id,
          moduleTitle: module.title,
          questions: new Map()
        };
        this.sessionResults.set(module.id, moduleResult);
      }

      let questionResult = moduleResult.questions.get(question.id);
      if (!questionResult) {
        questionResult = {
          questionId: question.id,
          questionText: question.text,
          attempts: []
        };
        moduleResult.questions.set(question.id, questionResult);
      }

      questionResult.attempts.push({
        attemptNumber: attemptRecord.attemptNumber,
        selectedAnswers: [...attemptRecord.selectedAnswers],
        selectedAnswerLabels: [...attemptRecord.selectedAnswerLabels],
        isCorrect: attemptRecord.isCorrect,
        timestamp: attemptRecord.timestamp
      });

      questionResult.finalCorrect = attemptRecord.isCorrect;
      questionResult.finalAnswers = [...attemptRecord.selectedAnswers];
      questionResult.finalAnswerLabels = [...attemptRecord.selectedAnswerLabels];
    }

    evaluateAnswer(question, answers) {
      if (!answers.length) {
        return false;
      }
      const expected = [...question.correct].sort();
      const received = [...answers].sort();
      return (
        expected.length === received.length &&
        expected.every((value, index) => value === received[index])
      );
    }

    renderModuleComplete() {
      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";
      const module = this.currentModule;

      const completeCard = createElement("section", { className: "dsq-card" });
      completeCard.append(
        createElement("h2", { text: module.title }),
        createElement("p", {
          text: `${this.config.strings.moduleComplete} (${this.score}/${this.totalQuestions})`
        })
      );

      const nextButton = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.nextModule
      });
      nextButton.addEventListener("click", () => {
        this.currentModuleIndex += 1;
        this.currentQuestionIndex = -1;
        if (this.currentModuleIndex >= this.config.modules.length) {
          this.renderCertificate();
        } else {
          this.renderModuleIntro();
        }
      });

      completeCard.append(nextButton);
      this.mainEl.append(completeCard);
      this.updateProgress();
    }

    renderCertificate() {
      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";

      const summary = this.getCompletionSummary();
      if (!this.sessionCompleted && this.sessionStore && this.sessionId) {
        this.sessionStore.completeSession(this.sessionId, summary);
        this.sessionCompleted = true;
      }

      const summaryCard = this.buildSummaryCard(summary);
      this.mainEl.append(summaryCard);

      const certificateCard = createElement("section", {
        className: "dsq-card dsq-certificate"
      });

      certificateCard.append(
        createElement("h2", { text: this.config.strings.certificateTitle }),
        createElement("p", { text: this.config.certificateMessage })
      );

      const nameInput = createElement("input", {
        attrs: {
          type: "text",
          placeholder: this.config.strings.enterName,
          "aria-label": this.config.strings.enterName
        },
        className: "dsq-input"
      });
      nameInput.value = this.participantName;

      const certificatePreview = createElement("div", {
        className: "dsq-certificate-preview"
      });

      const updatePreview = () => {
        const name = nameInput.value.trim() || "[Jouw naam]";
        certificatePreview.innerHTML = `
          <div class="dsq-certificate-frame">
            <h3>${this.config.title}</h3>
            <p>${this.config.certificateMessage}</p>
            <p class="dsq-certificate-name">${name}</p>
            <p class="dsq-certificate-score">Score: ${this.score}/${this.totalQuestions}</p>
          </div>
        `;
      };

      nameInput.addEventListener("input", updatePreview);
      updatePreview();

      const downloadButton = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.downloadButton
      });
      downloadButton.addEventListener("click", () => {
        this.downloadCertificate(certificatePreview);
      });

      const resetButton = createElement("button", {
        className: "dsq-button dsq-button-secondary",
        text: this.config.strings.resetButton
      });
      resetButton.addEventListener("click", () => {
        this.renderIntro();
      });

      certificateCard.append(nameInput, certificatePreview, downloadButton, resetButton);
      this.mainEl.append(certificateCard);
      this.updateProgress(true);
    }

    getCompletionSummary() {
      const modules = this.config.modules.map((module) => {
        const moduleResult = this.sessionResults.get(module.id);
        const questions = module.questions.map((question) => {
          const questionResult = moduleResult?.questions?.get
            ? moduleResult.questions.get(question.id)
            : undefined;
          const attempts = questionResult?.attempts?.map((attempt) => ({
            attemptNumber: attempt.attemptNumber,
            selectedAnswers: [...attempt.selectedAnswers],
            selectedAnswerLabels: [...attempt.selectedAnswerLabels],
            isCorrect: attempt.isCorrect,
            timestamp: attempt.timestamp
          })) || [];

          return {
            questionId: question.id,
            questionText: question.text,
            finalCorrect: Boolean(questionResult?.finalCorrect),
            finalAnswerLabels: questionResult?.finalAnswerLabels || [],
            attempts
          };
        });

        return {
          moduleId: module.id,
          moduleTitle: module.title,
          questions
        };
      });

      return {
        participant: this.participantName,
        score: this.score,
        totalQuestions: this.totalQuestions,
        modules
      };
    }

    buildSummaryCard(summary) {
      const summaryCard = createElement("section", {
        className: "dsq-card dsq-summary-card"
      });

      summaryCard.append(
        createElement("h2", { text: "Jouw resultaten" }),
        createElement("p", {
          className: "dsq-summary-intro",
          text: "Bekijk welke vragen je goed of fout hebt beantwoord."
        }),
        createElement("p", {
          className: "dsq-summary-score",
          text: `Score: ${summary.score}/${summary.totalQuestions}`
        })
      );

      summary.modules.forEach((moduleSummary) => {
        const moduleEl = createElement("div", {
          className: "dsq-summary-module"
        });
        moduleEl.append(
          createElement("h3", { text: moduleSummary.moduleTitle })
        );

        const list = createElement("ul", {
          className: "dsq-summary-list"
        });

        moduleSummary.questions.forEach((questionSummary) => {
          const item = createElement("li", {
            className: "dsq-summary-question"
          });
          const statusClass = questionSummary.finalCorrect
            ? "dsq-summary-status-correct"
            : "dsq-summary-status-incorrect";
          const statusText = questionSummary.finalCorrect ? "Goed" : "Fout";
          const statusEl = createElement("span", {
            className: `dsq-summary-status ${statusClass}`,
            text: statusText
          });
          const textEl = createElement("span", {
            className: "dsq-summary-question-text",
            text: questionSummary.questionText
          });
          const answerLabels = questionSummary.finalAnswerLabels.length
            ? questionSummary.finalAnswerLabels.join(", ")
            : "-";
          const answerEl = createElement("span", {
            className: "dsq-summary-answer",
            text: `Jouw antwoord: ${answerLabels}`
          });

          item.append(statusEl, textEl, answerEl);
          list.append(item);
        });

        moduleEl.append(list);
        summaryCard.append(moduleEl);
      });

      return summaryCard;
    }

    downloadCertificate(previewEl) {
      if (!window.html2canvas) {
        const warning = createElement("div", {
          className: "dsq-feedback dsq-feedback-incorrect",
          text: "Kan certificaat niet downloaden. Laad html2canvas voordat je deze functie gebruikt."
        });
        this.mainEl.append(warning);
        return;
      }
      html2canvas(previewEl).then((canvas) => {
        const link = document.createElement("a");
        link.download = "digitaal-veiligheidsrijbewijs.png";
        link.href = canvas.toDataURL();
        link.click();
      });
    }

    updateProgress(isComplete = false) {
      const moduleCount = this.config.modules.length;
      let completedModules = this.currentModuleIndex;
      let completedQuestions = 0;

      if (this.currentModuleIndex >= 0) {
        completedModules = Math.max(0, this.currentModuleIndex);
        const modulesBefore = this.config.modules.slice(0, this.currentModuleIndex);
        completedQuestions = modulesBefore.reduce(
          (count, module) => count + module.questions.length,
          0
        );
        if (this.currentQuestionIndex > -1) {
          completedQuestions += this.currentQuestionIndex;
        } else if (this.currentQuestionIndex === -1 && this.currentModuleIndex >= moduleCount) {
          completedQuestions = this.totalQuestions;
        }
      }

      const progressPercentage = isComplete
        ? 100
        : Math.floor((completedQuestions / this.totalQuestions) * 100);

      this.progressEl.innerHTML = `
        <div class="dsq-progress-bar">
          <div class="dsq-progress-bar-fill" style="width: ${progressPercentage}%"></div>
        </div>
        <span class="dsq-progress-text">${completedQuestions}/${this.totalQuestions} vragen afgerond</span>
      `;
    }
  }

  global.DSQDashboard = {
    ...(global.DSQDashboard || {}),
    DailySessionStore,
    DashboardView
  };

  global.DigitalSafetyQuiz = DigitalSafetyQuiz;
})(typeof window !== "undefined" ? window : this);

