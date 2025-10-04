(function (global) {
  "use strict";

  const defaultConfig = {
    title: "Digitaal Veiligheidsrijbewijs",
    description:
      "Doorloop de modules, beantwoord de vragen en verdien het certificaat voor digitale veiligheid!",
    modules: [],
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

  class IndexedDbAdapter {
    constructor(options = {}) {
      this.dbName = options.dbName || "DigitalSafetyQuizDB";
      this.storeName = options.storeName || "dailySessions";
      this.version = 1;
      this.supported =
        typeof window !== "undefined" &&
        typeof window.indexedDB !== "undefined";
      this.db = null;
      this.ready = null;
    }

    get isSupported() {
      return this.supported;
    }

    async _openDatabase() {
      if (!this.supported) {
        return null;
      }

      if (this.db) {
        return this.db;
      }

      if (!this.ready) {
        this.ready = new Promise((resolve) => {
          try {
            const request = window.indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (event) => {
              const db = event.target.result;
              if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName, { keyPath: "dateKey" });
              }
            };
            request.onsuccess = () => {
              const db = request.result;
              db.onversionchange = () => {
                db.close();
              };
              this.db = db;
              resolve(db);
            };
            request.onerror = () => resolve(null);
          } catch (error) {
            resolve(null);
          }
        });
      }

      return this.ready;
    }

    async loadAll() {
      const db = await this._openDatabase();
      if (!db) {
        return [];
      }

      return new Promise((resolve) => {
        const records = [];
        let resolved = false;
        const finish = () => {
          if (resolved) {
            return;
          }
          resolved = true;
          resolve(
            records.map((entry) => ({
              dateKey: entry.dateKey,
              data: entry.data
            }))
          );
        };

        try {
          const tx = db.transaction(this.storeName, "readonly");
          const store = tx.objectStore(this.storeName);
          tx.onerror = finish;
          tx.onabort = finish;

          if (typeof store.getAll === "function") {
            const request = store.getAll();
            request.onsuccess = () => {
              const result = Array.isArray(request.result)
                ? request.result
                : [];
              result.forEach((entry) => {
                if (entry && entry.dateKey) {
                  records.push(entry);
                }
              });
              finish();
            };
            request.onerror = finish;
          } else {
            const request = store.openCursor();
            request.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                const value = cursor.value;
                if (value && value.dateKey) {
                  records.push(value);
                }
                cursor.continue();
              } else {
                finish();
              }
            };
            request.onerror = finish;
          }
        } catch (error) {
          finish();
        }
      });
    }

    async save(dateKey, data) {
      if (!dateKey) {
        return false;
      }

      const db = await this._openDatabase();
      if (!db) {
        return false;
      }

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(this.storeName, "readwrite");
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          tx.onabort = () => resolve(false);

          const store = tx.objectStore(this.storeName);
          store.put({ dateKey, data });
        } catch (error) {
          resolve(false);
        }
      });
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

  function shuffleArray(input = []) {
    const array = Array.isArray(input) ? [...input] : [];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function selectRandomItems(pool = [], count = pool.length) {
    if (!Array.isArray(pool) || pool.length === 0) {
      return [];
    }
    const effectiveCount = Math.min(Math.max(count, 0), pool.length);
    const shuffled = shuffleArray(pool);
    return shuffled.slice(0, effectiveCount);
  }

  function cloneQuestionWithShuffledOptions(question) {
    const clone = JSON.parse(JSON.stringify(question || {}));
    if (Array.isArray(clone.options)) {
      clone.options = shuffleArray(clone.options);
    } else {
      clone.options = [];
    }
    return clone;
  }

  const SESSION_EVENT_NAME = "dsq:sessions-updated";
  const DASHBOARD_DEFAULT_REFRESH_INTERVAL = 15000;

  class DailySessionStore {
    constructor(options = {}) {
      this.prefix = options.prefix || "digitalSafetyQuiz:sessions";
      this.apiBaseUrl = options.apiBaseUrl || "";
      this.heartbeatIntervalMs = options.heartbeatIntervalMs || 15000;
      this.database = new IndexedDbAdapter();
      this.storageEnabled = this.database.isSupported;
      this.cache = {};
      this.sessionIndex = {};
      this.remoteEnabled = typeof fetch === "function";
      this.remoteSnapshot = null;
      this._remotePollingTimer = null;
      this._heartbeatTimers = new Map();
      this._rebuildIndex();
      this._initializeFromDatabase();
      this._startRemotePolling();
    }

    _getDateKey(date = new Date()) {
      return `${this.prefix}:${date.toISOString().slice(0, 10)}`;
    }

    _initializeFromDatabase() {
      if (!this.storageEnabled) {
        return;
      }

      this.database
        .loadAll()
        .then((entries) => {
          if (!Array.isArray(entries)) {
            return;
          }

          entries.forEach((entry) => {
            if (!entry || !entry.dateKey) {
              return;
            }
            const normalized = this._normalizeRecord(entry.data);
            if (this.cache[entry.dateKey]) {
              const merged = this._mergeRecords(
                this.cache[entry.dateKey],
                normalized
              );
              this.cache[entry.dateKey] = merged;
            } else {
              this.cache[entry.dateKey] = normalized;
            }
          });

          this._rebuildIndex();
          this._broadcastChange();
        })
        .catch(() => {
          /* stil in geheugen werken */
        });
    }

    _buildUrl(path = "") {
      if (!path) {
        return this.apiBaseUrl || "";
      }
      const normalized = path.startsWith("/") ? path : `/${path}`;
      return `${this.apiBaseUrl || ""}${normalized}`;
    }

    async _sendRequest(path, options = {}) {
      if (!this.remoteEnabled) {
        return null;
      }

      try {
        const url = this._buildUrl(path);
        const fetchOptions = {
          method: options.method || "GET",
          credentials: "same-origin",
          cache: options.cache || "no-store"
        };

        const headers = { ...(options.headers || {}) };
        if (options.body !== undefined && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }

        if (Object.keys(headers).length) {
          fetchOptions.headers = headers;
        }

        if (options.body !== undefined) {
          fetchOptions.body = options.body;
        }

        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (
          response.status === 204 ||
          !contentType.toLowerCase().includes("application/json")
        ) {
          return null;
        }
        return response.json();
      } catch (error) {
        return null;
      }
    }

    _startRemotePolling() {
      if (!this.remoteEnabled || typeof window === "undefined") {
        return;
      }

      if (this._remotePollingTimer) {
        window.clearInterval(this._remotePollingTimer);
      }

      const interval = Math.max(this.heartbeatIntervalMs, 10000);
      this._refreshRemoteSnapshot();
      this._remotePollingTimer = window.setInterval(() => {
        this._refreshRemoteSnapshot();
      }, interval);
    }

    _normalizeRemoteSnapshot(data) {
      if (!data || typeof data !== "object") {
        return null;
      }
      const activeSessions = Array.isArray(data.activeSessions)
        ? data.activeSessions.map((session) => ({
            id: session.id,
            name: session.name,
            correct: Number(session.correct) || 0,
            incorrect: Number(session.incorrect) || 0,
            startTime: session.startTime,
            lastSeen: session.lastSeen
          }))
        : [];

      return {
        dateKey: this._getDateKey(),
        totals: {
          correct: Number(data.totalCorrect) || 0,
          incorrect: Number(data.totalIncorrect) || 0,
          activeParticipants: Number(data.activeParticipants) || 0
        },
        activeSessions,
        totalSessions: Number(data.totalSessions) || 0
      };
    }

    async _refreshRemoteSnapshot() {
      if (!this.remoteEnabled) {
        return;
      }
      const response = await this._sendRequest("/api/dashboard");
      if (response) {
        const normalized = this._normalizeRemoteSnapshot(response);
        if (normalized) {
          this.remoteSnapshot = normalized;
          this._broadcastChange();
        }
      }
    }

    startHeartbeat(sessionId) {
      if (
        !sessionId ||
        !this.remoteEnabled ||
        typeof window === "undefined"
      ) {
        return () => {};
      }

      this.stopHeartbeat(sessionId);

      const beat = () => {
        this._sendRequest(`/api/sessions/${sessionId}/heartbeat`, {
          method: "POST",
          body: "{}"
        });
      };

      beat();
      const timer = window.setInterval(beat, this.heartbeatIntervalMs);
      this._heartbeatTimers.set(sessionId, timer);

      return () => {
        this.stopHeartbeat(sessionId);
      };
    }

    stopHeartbeat(sessionId) {
      if (!sessionId || typeof window === "undefined") {
        return;
      }
      const timer = this._heartbeatTimers.get(sessionId);
      if (timer) {
        window.clearInterval(timer);
        this._heartbeatTimers.delete(sessionId);
      }
    }

    markSessionLeft(sessionId, options = {}) {
      if (!sessionId || !this.remoteEnabled) {
        return;
      }

      if (options.useBeacon && typeof navigator !== "undefined") {
        if (navigator.sendBeacon) {
          const url = this._buildUrl(`/api/sessions/${sessionId}/leave`);
          const payload = new Blob(["{}"], {
            type: "application/json"
          });
          navigator.sendBeacon(url, payload);
        }
        return;
      }

      this._sendRequest(`/api/sessions/${sessionId}/leave`, {
        method: "POST",
        body: "{}"
      }).then(() => {
        this._refreshRemoteSnapshot();
      });
    }

    _syncCreateSession(session) {
      if (!this.remoteEnabled || !session) {
        return;
      }
      this._sendRequest("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          id: session.id,
          name: session.name
        })
      }).then(() => {
        this._refreshRemoteSnapshot();
      });
    }

    _syncRecordAttempt(sessionId, attempt) {
      if (!this.remoteEnabled || !sessionId || !attempt) {
        return;
      }
      this._sendRequest(`/api/sessions/${sessionId}/attempt`, {
        method: "POST",
        body: JSON.stringify({
          moduleId: attempt.moduleId,
          questionId: attempt.questionId,
          selectedOptionIds: attempt.selectedAnswers || [],
          isCorrect: Boolean(attempt.isCorrect)
        })
      }).then(() => {
        this._refreshRemoteSnapshot();
      });
    }

    _syncCompleteSession(sessionId, summary) {
      if (!this.remoteEnabled || !sessionId) {
        return;
      }
      this._sendRequest(`/api/sessions/${sessionId}/complete`, {
        method: "POST",
        body: JSON.stringify({ summary })
      }).then(() => {
        this._refreshRemoteSnapshot();
      });
    }

    _normalizeRecord(record) {
      const cloned = this._cloneData(record);
      if (!Array.isArray(cloned.sessions)) {
        cloned.sessions = [];
      }
      return cloned;
    }

    _mergeRecords(target, source) {
      const targetRecord = this._normalizeRecord(target);
      const sourceRecord = this._normalizeRecord(source);
      const sessionMap = new Map();

      (targetRecord.sessions || []).forEach((session) => {
        if (session && session.id) {
          sessionMap.set(session.id, session);
        }
      });

      (sourceRecord.sessions || []).forEach((session) => {
        if (session && session.id) {
          sessionMap.set(session.id, session);
        }
      });

      return {
        ...targetRecord,
        ...sourceRecord,
        sessions: Array.from(sessionMap.values())
      };
    }

    _cloneData(data) {
      try {
        return JSON.parse(JSON.stringify(data || { sessions: [] }));
      } catch (error) {
        const fallback =
          data && typeof data === "object" ? { ...data } : { sessions: [] };
        fallback.sessions = Array.isArray(data?.sessions)
          ? [...data.sessions]
          : [];
        return fallback;
      }
    }

    _readByKey(dateKey) {
      if (!dateKey) {
        return { sessions: [] };
      }

      if (!this.cache[dateKey]) {
        this.cache[dateKey] = { sessions: [] };
      }

      return this._cloneData(this.cache[dateKey]);
    }

    _saveByKey(dateKey, data, options = {}) {
      const { merge = true } = options;
      const incoming = this._normalizeRecord(data);

      let dataToStore = incoming;

      if (merge) {
        const existing = this._readByKey(dateKey);
        const sessionMap = new Map();

        (existing.sessions || []).forEach((session) => {
          if (session && session.id) {
            sessionMap.set(session.id, session);
          }
        });

        (incoming.sessions || []).forEach((session) => {
          if (session && session.id) {
            sessionMap.set(session.id, session);
          }
        });

        dataToStore = {
          ...existing,
          ...incoming,
          sessions: Array.from(sessionMap.values())
        };
      }

      const cloned = this._cloneData(dataToStore);
      this.cache[dateKey] = cloned;

      if (this.storageEnabled) {
        this.database.save(dateKey, cloned).catch(() => {
          /* val terug op cache */
        });
      }

      this._indexSessions(dateKey, cloned.sessions);
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
      this.sessionIndex = {};
      Object.entries(this.cache).forEach(([dateKey, record]) => {
        this._indexSessions(dateKey, record.sessions);
      });
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

      this._saveByKey(dateKey, { sessions: [session] });
      this._syncCreateSession(session);
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
      this._syncRecordAttempt(sessionId, attempt);
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
      this._syncCompleteSession(sessionId, summary);
      return session;
    }

    getSnapshot() {
      if (this.remoteSnapshot) {
        return JSON.parse(JSON.stringify(this.remoteSnapshot));
      }
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
    constructor(container, store, options = {}) {
      this.container = container;
      this.store = store;
      this.elements = {};
      this.options = options || {};
      this.autoUpdate = options.autoUpdate !== false;
      this.refreshIntervalMs = this._resolveRefreshInterval(
        options.refreshIntervalMs
      );
      this.autoUpdateTimer = null;
      this.handleUpdate = this.update.bind(this);

      this.render();
      this.update();

      if (typeof window !== "undefined") {
        window.addEventListener(SESSION_EVENT_NAME, this.handleUpdate);
        this._scheduleAutoUpdate();
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

    _resolveRefreshInterval(value) {
      if (value === undefined || value === null) {
        return DASHBOARD_DEFAULT_REFRESH_INTERVAL;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
      }
      return parsed;
    }

    _scheduleAutoUpdate() {
      if (!this.autoUpdate || typeof window === "undefined") {
        return;
      }
      if (this.refreshIntervalMs <= 0) {
        return;
      }
      this._clearAutoUpdate();
      this.autoUpdateTimer = window.setInterval(
        this.handleUpdate,
        this.refreshIntervalMs
      );
    }

    _clearAutoUpdate() {
      if (this.autoUpdateTimer && typeof window !== "undefined") {
        window.clearInterval(this.autoUpdateTimer);
      }
      this.autoUpdateTimer = null;
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
      this._clearAutoUpdate();
      if (typeof window !== "undefined") {
        window.removeEventListener(SESSION_EVENT_NAME, this.handleUpdate);
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

    config.modules = config.modules.map((module) => {
      const normalizedModule = { ...module };
      if (
        !Array.isArray(normalizedModule.questionPool) &&
        Array.isArray(normalizedModule.questions)
      ) {
        normalizedModule.questionPool = normalizedModule.questions;
      }

      normalizedModule.questionPool = Array.isArray(normalizedModule.questionPool)
        ? normalizedModule.questionPool.map((question) =>
            JSON.parse(JSON.stringify(question))
          )
        : [];

      const poolLength = normalizedModule.questionPool.length;

      if (
        typeof normalizedModule.questionsPerSession !== "number" ||
        Number.isNaN(normalizedModule.questionsPerSession) ||
        normalizedModule.questionsPerSession <= 0
      ) {
        normalizedModule.questionsPerSession = Math.min(5, poolLength);
      } else {
        const desired = Math.floor(normalizedModule.questionsPerSession);
        normalizedModule.questionsPerSession =
          poolLength > 0 ? Math.max(1, Math.min(desired, poolLength)) : 0;
      }

      delete normalizedModule.questions;
      return normalizedModule;
    });

    return config;
  }

  class DigitalSafetyQuiz {
    constructor(options = {}) {
      this.apiBaseUrl = options.apiBaseUrl || "";
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
      this.sessionStore = new DailySessionStore({
        apiBaseUrl: this.apiBaseUrl,
        heartbeatIntervalMs: options.heartbeatIntervalMs
      });
      this.sessionModules = [];
      this.sessionId = null;
      this.sessionResults = new Map();
      this.participantName = "";
      this.sessionCompleted = false;
      this.currentModuleIndex = -1;
      this.currentQuestionIndex = -1;
      this.score = 0;
      this.heartbeatStopper = null;
      this.beforeUnloadHandler = null;
      this.totalQuestions = this._calculateExpectedQuestionCount(
        this.config.modules
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

    _attachBeforeUnloadListener() {
      if (typeof window === "undefined" || this.beforeUnloadHandler) {
        return;
      }
      this.beforeUnloadHandler = () => {
        if (this.sessionStore && this.sessionId) {
          this.sessionStore.markSessionLeft(this.sessionId, { useBeacon: true });
        }
      };
      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }

    _removeBeforeUnloadListener() {
      if (typeof window === "undefined" || !this.beforeUnloadHandler) {
        return;
      }
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    _cleanupSessionTracking(markInactive = false) {
      if (this.heartbeatStopper) {
        try {
          this.heartbeatStopper();
        } catch (error) {
          /* stil doorgaan */
        }
        this.heartbeatStopper = null;
      } else if (this.sessionStore && this.sessionId) {
        this.sessionStore.stopHeartbeat(this.sessionId);
      }

      if (markInactive && this.sessionStore && this.sessionId) {
        this.sessionStore.markSessionLeft(this.sessionId);
      }

      this._removeBeforeUnloadListener();
    }

    renderIntro() {
      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";
      this._cleanupSessionTracking(true);
      this.sessionId = null;
      this.sessionResults = new Map();
      this.participantName = "";
      this.sessionCompleted = false;
      this.sessionModules = [];
      this.totalQuestions = this._calculateExpectedQuestionCount(
        this.config.modules
      );

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
      if (this.sessionStore && this.sessionId && this.sessionStore.startHeartbeat) {
        this.heartbeatStopper = this.sessionStore.startHeartbeat(this.sessionId);
      }
      this._attachBeforeUnloadListener();

      this.sessionModules = this._prepareModulesForSession();
      this.totalQuestions = this._calculateExpectedQuestionCount(
        this.sessionModules
      );
      this.currentModuleIndex = 0;
      this.currentQuestionIndex = -1;
      this.score = 0;
      this.renderModuleIntro();
    }

    get currentModule() {
      const modules = this.sessionModules.length
        ? this.sessionModules
        : this.config.modules;
      return modules[this.currentModuleIndex];
    }

    _prepareModulesForSession() {
      return this.config.modules.map((module) => {
        const pool = Array.isArray(module.questionPool)
          ? module.questionPool
          : [];
        const questionsPerSession = Math.min(
          module.questionsPerSession || pool.length,
          pool.length
        );
        const selectedQuestions = selectRandomItems(
          pool,
          questionsPerSession
        ).map((question) => cloneQuestionWithShuffledOptions(question));

        return {
          ...module,
          tips: Array.isArray(module.tips) ? [...module.tips] : [],
          questions: selectedQuestions
        };
      });
    }

    _getQuestionCountForModule(module) {
      if (!module) {
        return 0;
      }
      if (Array.isArray(module.questions) && module.questions.length) {
        return module.questions.length;
      }
      const poolLength = Array.isArray(module.questionPool)
        ? module.questionPool.length
        : 0;
      if (
        typeof module.questionsPerSession === "number" &&
        module.questionsPerSession > 0
      ) {
        return Math.min(module.questionsPerSession, poolLength || 0);
      }
      return poolLength;
    }

    _calculateExpectedQuestionCount(modules = []) {
      if (!Array.isArray(modules)) {
        return 0;
      }
      return modules.reduce(
        (total, module) => total + this._getQuestionCountForModule(module),
        0
      );
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

      let hasRecordedScore = this._getAttemptCount(module.id, question.id) > 0;

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
          feedbackEl.classList.remove("dsq-feedback-correct");
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
          feedbackEl.textContent = question.feedback?.correct || this.config.strings.feedbackCorrect;
          feedbackEl.classList.remove("dsq-feedback-incorrect");
          feedbackEl.classList.add("dsq-feedback-correct");

          button.disabled = true;
          form.querySelectorAll("input").forEach((input) => {
            input.disabled = true;
          });
          nextQuestionButton.disabled = false;
          nextQuestionButton.focus();
        } else {
          feedbackEl.textContent = question.feedback?.incorrect || this.config.strings.feedbackIncorrect;
          feedbackEl.classList.remove("dsq-feedback-correct");
          feedbackEl.classList.add("dsq-feedback-incorrect");
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
        if (this.currentModuleIndex >= this.sessionModules.length) {
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
        this._cleanupSessionTracking(false);
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
      const sourceModules = this.sessionModules.length
        ? this.sessionModules
        : this.config.modules;
      const modules = sourceModules.map((module) => {
        const moduleResult = this.sessionResults.get(module.id);
        const questionList = Array.isArray(module.questions)
          ? module.questions
          : module.questionPool || [];
        const questions = questionList.map((question) => {
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
      const modules = this.sessionModules.length
        ? this.sessionModules
        : this.config.modules;
      const moduleCount = modules.length;
      let completedModules = 0;
      let completedQuestions = 0;

      if (this.currentModuleIndex >= 0 && moduleCount > 0) {
        completedModules = Math.min(
          Math.max(this.currentModuleIndex, 0),
          moduleCount
        );

        const modulesBefore = modules.slice(0, completedModules);
        completedQuestions = modulesBefore.reduce(
          (count, module) => count + this._getQuestionCountForModule(module),
          0
        );

        const currentModule = modules[this.currentModuleIndex];
        if (
          currentModule &&
          this.currentModuleIndex < moduleCount &&
          this.currentQuestionIndex > -1
        ) {
          const questionCount = this._getQuestionCountForModule(currentModule);
          completedQuestions += Math.min(this.currentQuestionIndex, questionCount);
        }
      }

      const totalForDisplay =
        this.totalQuestions || this._calculateExpectedQuestionCount(modules);

      if (isComplete) {
        completedModules = moduleCount;
        completedQuestions = totalForDisplay;
      }

      const safeTotal = totalForDisplay > 0 ? totalForDisplay : 1;
      const progressPercentage = isComplete
        ? 100
        : Math.floor((completedQuestions / safeTotal) * 100);

      const boundedCompleted = Math.min(completedQuestions, totalForDisplay);

      this.progressEl.innerHTML = `
        <div class="dsq-progress-bar">
          <div class="dsq-progress-bar-fill" style="width: ${progressPercentage}%"></div>
        </div>
        <span class="dsq-progress-text">${boundedCompleted}/${totalForDisplay} vragen afgerond</span>
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

