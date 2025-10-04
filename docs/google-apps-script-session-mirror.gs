/**
 * Google Apps Script web-app die de sessieroutes van server/app.js spiegelt.
 * Plaats dit bestand in een nieuw Apps Script-project en vul je Spreadsheet-ID in.
 */

const SPREADSHEET_ID = "PASTE_SPREADSHEET_ID_HERE"; // <-- vervang door je eigen ID
const SESSION_TIMEOUT_MS = 60000;

const SHEET_NAMES = {
  sessions: "Sessions",
  heartbeats: "Heartbeats",
  attempts: "Attempts",
  completions: "Completions"
};

const HEADERS = {
  sessions: [
    "Timestamp",
    "Session ID",
    "Name",
    "Status",
    "Start Time",
    "Last Seen",
    "Summary",
    "End Time"
  ],
  heartbeats: ["Timestamp", "Session ID", "Last Seen"],
  attempts: [
    "Timestamp",
    "Session ID",
    "Module ID",
    "Question ID",
    "Selected Option IDs",
    "Is Correct",
    "Raw Payload"
  ],
  completions: ["Timestamp", "Session ID", "End Time", "Summary"]
};

const TABLE_CONFIG = {
  sessions: {
    sheetName: SHEET_NAMES.sessions,
    headers: HEADERS.sessions,
    keys: [
      "timestamp",
      "sessionId",
      "name",
      "status",
      "startTime",
      "lastSeen",
      "summary",
      "endTime"
    ],
    keyColumn: "sessionId",
    indexPrefix: "session:"
  },
  heartbeats: {
    sheetName: SHEET_NAMES.heartbeats,
    headers: HEADERS.heartbeats,
    keys: ["timestamp", "sessionId", "lastSeen"],
    keyColumn: null,
    indexPrefix: "heartbeat:"
  },
  attempts: {
    sheetName: SHEET_NAMES.attempts,
    headers: HEADERS.attempts,
    keys: [
      "timestamp",
      "sessionId",
      "moduleId",
      "questionId",
      "selectedOptionIds",
      "isCorrect",
      "rawPayload"
    ],
    keyColumn: null,
    indexPrefix: "attempt:"
  },
  completions: {
    sheetName: SHEET_NAMES.completions,
    headers: HEADERS.completions,
    keys: ["timestamp", "sessionId", "endTime", "summary"],
    keyColumn: null,
    indexPrefix: "completion:"
  }
};

const TABLES = {
  sessions: new SheetTable(TABLE_CONFIG.sessions),
  heartbeats: new SheetTable(TABLE_CONFIG.heartbeats),
  attempts: new SheetTable(TABLE_CONFIG.attempts),
  completions: new SheetTable(TABLE_CONFIG.completions)
};

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();

function SheetTable(config) {
  this.sheetName = config.sheetName;
  this.headers = config.headers || [];
  this.keys = config.keys || [];
  this.keyColumn = config.keyColumn || null;
  this.indexPrefix = config.indexPrefix || "";
  this.cachedSheet = null;
}

SheetTable.prototype.ensure = function ensure() {
  const sheet = this.getSheet();
  if (!this.headers.length) {
    return sheet;
  }

  const width = this.headers.length;
  const existing = sheet.getRange(1, 1, 1, width).getValues()[0];
  let needsUpdate = existing.length !== width;
  if (!needsUpdate) {
    for (var index = 0; index < width; index += 1) {
      if (existing[index] !== this.headers[index]) {
        needsUpdate = true;
        break;
      }
    }
  }

  if (needsUpdate) {
    sheet.getRange(1, 1, 1, width).setValues([this.headers]);
  }

  if (sheet.getFrozenRows() < 1) {
    sheet.setFrozenRows(1);
  }

  return sheet;
};

SheetTable.prototype.getSheet = function getSheetInstance() {
  if (!this.cachedSheet) {
    this.cachedSheet = getSheet(this.sheetName);
  }
  return this.cachedSheet;
};

SheetTable.prototype.getKeyColumnIndex = function getKeyColumnIndex() {
  if (!this.keyColumn) {
    return -1;
  }
  const index = this.keys.indexOf(this.keyColumn);
  return index === -1 ? -1 : index + 1;
};

SheetTable.prototype.lookupIndex = function lookupIndex(keyValue) {
  if (!this.indexPrefix || !keyValue) {
    return 0;
  }
  const propertyKey = this.indexPrefix + String(keyValue);
  const stored = SCRIPT_PROPERTIES.getProperty(propertyKey);
  const number = stored ? parseInt(stored, 10) : 0;
  return Number.isNaN(number) ? 0 : number;
};

SheetTable.prototype.saveIndex = function saveIndex(keyValue, rowNumber) {
  if (!this.indexPrefix || !keyValue || !rowNumber) {
    return;
  }
  const propertyKey = this.indexPrefix + String(keyValue);
  SCRIPT_PROPERTIES.setProperty(propertyKey, String(rowNumber));
};

SheetTable.prototype.clearIndex = function clearIndex(keyValue) {
  if (!this.indexPrefix || !keyValue) {
    return;
  }
  const propertyKey = this.indexPrefix + String(keyValue);
  SCRIPT_PROPERTIES.deleteProperty(propertyKey);
};

SheetTable.prototype.recordFromRow = function recordFromRow(rowValues) {
  const record = {};
  for (var index = 0; index < this.keys.length; index += 1) {
    record[this.keys[index]] = rowValues[index];
  }
  return record;
};

SheetTable.prototype.buildRow = function buildRow(record) {
  const row = [];
  for (var index = 0; index < this.keys.length; index += 1) {
    var key = this.keys[index];
    row.push(record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : "");
  }
  return row;
};

SheetTable.prototype.findRowNumber = function findRowNumber(sheet, keyValue) {
  if (!this.keyColumn || !keyValue) {
    return 0;
  }

  const keyColumnIndex = this.getKeyColumnIndex();
  if (keyColumnIndex < 1) {
    return 0;
  }

  const indexedRow = this.lookupIndex(keyValue);
  if (indexedRow > 1) {
    const cellValue = sheet.getRange(indexedRow, keyColumnIndex, 1, 1).getValue();
    if (String(cellValue) === String(keyValue)) {
      return indexedRow;
    }
    this.clearIndex(keyValue);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 0;
  }

  const range = sheet.getRange(2, keyColumnIndex, lastRow - 1, 1);
  const values = range.getValues();
  for (var index = 0; index < values.length; index += 1) {
    if (String(values[index][0]) === String(keyValue)) {
      const rowNumber = index + 2;
      this.saveIndex(keyValue, rowNumber);
      return rowNumber;
    }
  }

  return 0;
};

SheetTable.prototype.getByKey = function getByKey(keyValue) {
  if (!this.keyColumn) {
    return null;
  }
  const sheet = this.ensure();
  const rowNumber = this.findRowNumber(sheet, keyValue);
  if (!rowNumber) {
    return null;
  }
  const rowValues = sheet.getRange(rowNumber, 1, 1, this.keys.length).getValues()[0];
  return {
    row: rowNumber,
    record: this.recordFromRow(rowValues)
  };
};

SheetTable.prototype.upsert = function upsert(record) {
  if (!this.keyColumn) {
    throw new Error("Key column is not configured for sheet " + this.sheetName);
  }

  const keyValue = String(record[this.keyColumn] || "").trim();
  if (!keyValue) {
    throw new Error("Missing key value for sheet " + this.sheetName);
  }

  const sheet = this.ensure();
  const rowValues = this.buildRow(record);
  const existing = this.findRowNumber(sheet, keyValue);
  const targetRow = existing || sheet.getLastRow() + 1;

  sheet.getRange(targetRow, 1, 1, this.keys.length).setValues([rowValues]);
  this.saveIndex(keyValue, targetRow);

  return {
    row: targetRow,
    record: this.recordFromRow(rowValues)
  };
};

SheetTable.prototype.append = function append(record) {
  const sheet = this.ensure();
  const rowValues = this.buildRow(record);
  const targetRow = sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 1, 1, this.keys.length).setValues([rowValues]);
  return {
    row: targetRow,
    record: this.recordFromRow(rowValues)
  };
};

SheetTable.prototype.getAll = function getAll() {
  const sheet = this.ensure();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }
  const values = sheet.getRange(2, 1, lastRow - 1, this.keys.length).getValues();
  const records = [];
  for (var index = 0; index < values.length; index += 1) {
    const record = this.recordFromRow(values[index]);
    if (!this.keyColumn) {
      records.push(record);
      continue;
    }
    const keyValue = String(record[this.keyColumn] || "").trim();
    if (keyValue) {
      this.saveIndex(keyValue, index + 2);
      records.push(record);
    }
  }
  return records;
};

function withLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

/** Entry point for GET requests */
function doGet(e) {
  return handleRequest("GET", e);
}

/** Entry point for POST requests */
function doPost(e) {
  return handleRequest("POST", e);
}

/** Entry point for OPTIONS (CORS preflight) requests */
function doOptions() {
  return emptyResponse();
}

function handleRequest(method, e) {
  try {
    ensureSheets();
    const path = extractPath(e);
    const segments = path ? path.split("/").filter(Boolean) : [];

    const actualMethod = resolveMethodOverride(method, e);

    if (actualMethod === "GET") {
      return handleGet(segments, e);
    }

    if (actualMethod === "POST") {
      return handlePost(segments, e);
    }

    return jsonResponse({ error: "Method not supported" }, e);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error.message || "Unexpected error" }, e);
  }
}

function extractPath(e) {
  if (e && typeof e.pathInfo === "string") {
    return e.pathInfo.replace(/^\/+|\/+$/g, "");
  }
  if (e && e.parameter && typeof e.parameter.path === "string") {
    return e.parameter.path.replace(/^\/+|\/+$/g, "");
  }
  return "";
}

function parsePayload(e) {
  if (e && e.parameter && typeof e.parameter.payload === "string") {
    try {
      return JSON.parse(e.parameter.payload);
    } catch (error) {
      // ignore and fall through to postData parsing
    }
  }

  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
}

function resolveMethodOverride(method, request) {
  if (method !== "GET" || !request || !request.parameter) {
    return method;
  }

  const override = request.parameter.method || request.parameter._method;
  if (!override) {
    return method;
  }

  const normalized = String(override).trim().toUpperCase();
  if (normalized === "POST") {
    return "POST";
  }

  return method;
}

function jsonResponse(body, request) {
  const payload = JSON.stringify(body || {});
  const callback = extractJsonpCallback(request);

  if (callback) {
    return ContentService.createTextOutput(`${callback}(${payload});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

function emptyResponse() {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}

function extractJsonpCallback(request) {
  if (!request || !request.parameter) {
    return "";
  }

  const raw = request.parameter.callback || request.parameter.cb;
  if (!raw) {
    return "";
  }

  const callback = String(raw).trim();
  if (!callback) {
    return "";
  }

  if (!/^[$A-Z_][0-9A-Z_.$]*$/i.test(callback)) {
    return "";
  }

  return callback;
}

function getSpreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === "PASTE_SPREADSHEET_ID_HERE") {
    throw new Error("Stel SPREADSHEET_ID in op het ID van je Google Sheet.");
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  return sheet;
}

function ensureSheets() {
  Object.keys(TABLES).forEach(function (key) {
    TABLES[key].ensure();
  });
}

function handleGet(segments, request) {
  if (segments.length === 2 && segments[0] === "api" && segments[1] === "dashboard") {
    return jsonResponse(buildDashboardSnapshot(), request);
  }
  return jsonResponse({ error: "Not found" }, request);
}

function handlePost(segments, e) {
  if (segments.length >= 2 && segments[0] === "api" && segments[1] === "sessions") {
    if (segments.length === 2) {
      return jsonResponse(createSession(parsePayload(e)), e);
    }

    const sessionId = segments[2];
    const action = segments[3];
    const payload = parsePayload(e);

    if (action === "heartbeat") {
      return jsonResponse(recordHeartbeat(sessionId), e);
    }
    if (action === "attempt") {
      return jsonResponse(recordAttempt(sessionId, payload), e);
    }
    if (action === "complete") {
      return jsonResponse(completeSession(sessionId, payload), e);
    }
    if (action === "leave") {
      return jsonResponse(markSessionLeft(sessionId), e);
    }
  }

  return jsonResponse({ error: "Not found" }, e);
}

function createSession(payload) {
  return withLock(function () {
    const now = new Date();
    const iso = now.toISOString();
    const id = payload && payload.id ? String(payload.id).trim() : Utilities.getUuid();
    const name = payload && payload.name ? String(payload.name) : "";

    const sessionRecord = {
      timestamp: now,
      sessionId: id,
      name,
      status: "active",
      startTime: iso,
      lastSeen: iso,
      summary: "",
      endTime: ""
    };

    TABLES.sessions.upsert(sessionRecord);
    TABLES.heartbeats.append({
      timestamp: now,
      sessionId: id,
      lastSeen: iso
    });

    return {
      id,
      name,
      status: "active",
      startTime: iso,
      lastSeen: iso
    };
  });
}

function recordHeartbeat(sessionId) {
  if (!sessionId) {
    return { error: "sessionId ontbreekt" };
  }

  return withLock(function () {
    const existing = TABLES.sessions.getByKey(sessionId);
    const now = new Date();
    const iso = now.toISOString();
    const record = existing ? existing.record : {};
    const status = record.status === "completed" ? "completed" : "active";

    const updated = {
      timestamp: now,
      sessionId,
      name: record.name || "",
      status,
      startTime: record.startTime || iso,
      lastSeen: iso,
      summary: record.summary || "",
      endTime: record.endTime || ""
    };

    TABLES.sessions.upsert(updated);
    TABLES.heartbeats.append({
      timestamp: now,
      sessionId,
      lastSeen: iso
    });

    return { lastSeen: iso };
  });
}

function recordAttempt(sessionId, payload) {
  if (!sessionId) {
    return { error: "sessionId ontbreekt" };
  }

  return withLock(function () {
    const existing = TABLES.sessions.getByKey(sessionId);
    const now = new Date();
    const iso = now.toISOString();
    const record = existing ? existing.record : {};

    const updated = {
      timestamp: now,
      sessionId,
      name: record.name || "",
      status: record.status === "completed" ? "completed" : "active",
      startTime: record.startTime || iso,
      lastSeen: iso,
      summary: record.summary || "",
      endTime: record.endTime || ""
    };

    TABLES.sessions.upsert(updated);

    const selected = payload && Array.isArray(payload.selectedOptionIds)
      ? payload.selectedOptionIds
      : [];

    TABLES.attempts.append({
      timestamp: now,
      sessionId,
      moduleId: payload && payload.moduleId ? String(payload.moduleId) : "",
      questionId: payload && payload.questionId ? String(payload.questionId) : "",
      selectedOptionIds: JSON.stringify(selected),
      isCorrect: payload && payload.isCorrect ? 1 : 0,
      rawPayload: JSON.stringify(payload || {})
    });

    return {};
  });
}

function completeSession(sessionId, payload) {
  if (!sessionId) {
    return { error: "sessionId ontbreekt" };
  }

  return withLock(function () {
    const existing = TABLES.sessions.getByKey(sessionId);
    const now = new Date();
    const iso = now.toISOString();
    const record = existing ? existing.record : {};
    const summary = payload && payload.summary ? JSON.stringify(payload.summary) : "";

    const updated = {
      timestamp: now,
      sessionId,
      name: record.name || "",
      status: "completed",
      startTime: record.startTime || iso,
      lastSeen: iso,
      summary,
      endTime: iso
    };

    TABLES.sessions.upsert(updated);
    TABLES.completions.append({
      timestamp: now,
      sessionId,
      endTime: iso,
      summary
    });

    return { endTime: iso };
  });
}

function markSessionLeft(sessionId) {
  if (!sessionId) {
    return { error: "sessionId ontbreekt" };
  }

  return withLock(function () {
    const existing = TABLES.sessions.getByKey(sessionId);
    const now = new Date();
    const iso = now.toISOString();
    const record = existing ? existing.record : {};
    const isCompleted = record.status === "completed";

    const updated = {
      timestamp: now,
      sessionId,
      name: record.name || "",
      status: isCompleted ? "completed" : "inactive",
      startTime: record.startTime || iso,
      lastSeen: iso,
      summary: record.summary || "",
      endTime: isCompleted ? record.endTime || iso : iso
    };

    TABLES.sessions.upsert(updated);

    return {};
  });
}

function buildDashboardSnapshot() {
  const sessions = readSessionRecords();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();

  const todaySessions = sessions.filter((session) => {
    const start = parseDate(session.startTime);
    return start && start.getTime() >= startMs;
  });

  if (!todaySessions.length) {
    return {
      totalSessions: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      activeParticipants: 0,
      activeSessions: []
    };
  }

  const sessionIdSet = new Set(todaySessions.map((session) => session.id));
  const attemptStats = readAttemptStats(sessionIdSet);

  let totalCorrect = 0;
  let totalIncorrect = 0;
  attemptStats.forEach((stats) => {
    totalCorrect += stats.correct;
    totalIncorrect += stats.incorrect;
  });

  const cutoff = now.getTime() - SESSION_TIMEOUT_MS;
  const activeSessions = todaySessions
    .map((session) => {
      const stats = attemptStats.get(session.id) || { correct: 0, incorrect: 0 };
      return {
        id: session.id,
        name: session.name,
        correct: stats.correct,
        incorrect: stats.incorrect,
        startTime: session.startTime,
        lastSeen: session.lastSeen,
        status: session.status
      };
    })
    .filter((session) => {
      const lastSeenDate = parseDate(session.lastSeen);
      return (
        session.status === "active" &&
        lastSeenDate &&
        lastSeenDate.getTime() >= cutoff
      );
    })
    .map((session) => ({
      id: session.id,
      name: session.name,
      correct: session.correct,
      incorrect: session.incorrect,
      startTime: session.startTime,
      lastSeen: session.lastSeen
    }));

  return {
    totalSessions: todaySessions.length,
    totalCorrect,
    totalIncorrect,
    activeParticipants: activeSessions.length,
    activeSessions
  };
}

function readSessionRecords() {
  return TABLES.sessions.getAll()
    .map(function (record) {
      const id = String(record.sessionId || "").trim();
      if (!id) {
        return null;
      }
      return {
        id,
        name: String(record.name || ""),
        status: String(record.status || ""),
        startTime: normalizeIso(record.startTime),
        lastSeen: normalizeIso(record.lastSeen)
      };
    })
    .filter(function (record) {
      return Boolean(record);
    });
}

function readAttemptStats(validSessionIds) {
  const stats = new Map();
  if (!validSessionIds || !validSessionIds.size) {
    return stats;
  }

  const attempts = TABLES.attempts.getAll();
  attempts.forEach(function (attempt) {
    const sessionId = String(attempt.sessionId || "").trim();
    if (!sessionId || !validSessionIds.has(sessionId)) {
      return;
    }
    const isCorrect = parseBoolean(attempt.isCorrect);
    const current = stats.get(sessionId) || { correct: 0, incorrect: 0 };
    if (isCorrect) {
      current.correct += 1;
    } else {
      current.incorrect += 1;
    }
    stats.set(sessionId, current);
  });

  return stats;
}

function normalizeIso(value) {
  const date = parseDate(value);
  if (date) {
    return date.toISOString();
  }
  const stringValue = String(value || "").trim();
  return stringValue;
}

function parseDate(value) {
  if (!value && value !== 0) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function parseBoolean(value) {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0) {
    return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
}
