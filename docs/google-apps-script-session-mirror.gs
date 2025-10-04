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

const SESSION_COLS = {
  timestamp: 0,
  id: 1,
  name: 2,
  status: 3,
  startTime: 4,
  lastSeen: 5,
  summary: 6,
  endTime: 7
};

const ATTEMPT_COLS = {
  timestamp: 0,
  sessionId: 1,
  moduleId: 2,
  questionId: 3,
  selectedOptionIds: 4,
  isCorrect: 5,
  rawPayload: 6
};

/** Entry point for GET requests */
function doGet(e) {
  return handleRequest("GET", e);
}

/** Entry point for POST requests */
function doPost(e) {
  return handleRequest("POST", e);
}

/** Entry point for OPTIONS (CORS preflight) requests */
function doOptions(e) {
  return jsonResponse({}, 200, e);
}

function handleRequest(method, e) {
  try {
    ensureSheets();
    const path = extractPath(e);
    const segments = path ? path.split("/").filter(Boolean) : [];

    if (method === "GET") {
      return handleGet(segments, e);
    }

    if (method === "POST") {
      return handlePost(segments, e);
    }

    return jsonResponse({ error: "Method not supported" }, 405, e);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error.message || "Unexpected error" }, 500, e);
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
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
}

const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "3600",
  Vary: "Origin",
  "Content-Type": "application/json"
};

function jsonResponse(body, statusCode, e) {
  const payload = JSON.stringify(body || {});
  const headers = buildCorsHeaders(e);
  const textOutput = ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);

  if (applyHeaders(textOutput, headers, statusCode)) {
    return textOutput;
  }

  const fallback = buildHtmlFallback(payload, headers, statusCode);
  return fallback || textOutput;
}

function buildCorsHeaders(e) {
  const headers = Object.assign({}, DEFAULT_CORS_HEADERS);
  const origin = extractOrigin(e);
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function extractOrigin(e) {
  if (!e) {
    return "";
  }
  if (e.headers && e.headers.origin) {
    return String(e.headers.origin);
  }
  if (e.parameter) {
    const paramOrigin = e.parameter.origin || e.parameter.Origin || e.parameter.ORIGIN;
    if (paramOrigin) {
      return String(paramOrigin);
    }
  }
  return "";
}

function applyHeaders(response, headers, statusCode) {
  if (!response || typeof response.setHeader !== "function") {
    return false;
  }

  Object.keys(headers).forEach(function (key) {
    response.setHeader(key, headers[key]);
  });

  if (statusCode && typeof response.setStatusCode === "function") {
    response.setStatusCode(statusCode);
  }

  return true;
}

function buildHtmlFallback(payload, headers, statusCode) {
  if (typeof HtmlService === "undefined") {
    return null;
  }

  const htmlOutput = HtmlService.createHtmlOutput(payload);
  if (typeof htmlOutput.getResponse !== "function") {
    return null;
  }

  const response = htmlOutput.getResponse();
  if (typeof response.setContent === "function") {
    response.setContent(payload);
  }
  if (typeof response.setMimeType === "function") {
    response.setMimeType(ContentService.MimeType.JSON);
  }

  applyHeaders(response, headers, statusCode);
  return response;
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
  Object.keys(SHEET_NAMES).forEach((key) => {
    const sheet = getSheet(SHEET_NAMES[key]);
    const headers = HEADERS[key];
    if (!headers || !headers.length) {
      return;
    }
    const existing = sheet
      .getRange(1, 1, 1, headers.length)
      .getValues()[0];
    const needsUpdate = headers.some(
      (header, index) => existing[index] !== header
    );
    if (needsUpdate) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    if (sheet.getFrozenRows() < 1) {
      sheet.setFrozenRows(1);
    }
  });
}

function handleGet(segments, e) {
  if (segments.length === 2 && segments[0] === "api" && segments[1] === "dashboard") {
    return jsonResponse(buildDashboardSnapshot(), 200, e);
  }
  return jsonResponse({ error: "Not found" }, 404, e);
}

function handlePost(segments, e) {
  if (segments.length >= 2 && segments[0] === "api" && segments[1] === "sessions") {
    if (segments.length === 2) {
      return jsonResponse(createSession(parsePayload(e)), 200, e);
    }

    const sessionId = segments[2];
    const action = segments[3];
    const payload = parsePayload(e);

    if (action === "heartbeat") {
      return jsonResponse(recordHeartbeat(sessionId), 200, e);
    }
    if (action === "attempt") {
      return jsonResponse(recordAttempt(sessionId, payload), 200, e);
    }
    if (action === "complete") {
      return jsonResponse(completeSession(sessionId, payload), 200, e);
    }
    if (action === "leave") {
      return jsonResponse(markSessionLeft(sessionId), 200, e);
    }
  }

  return jsonResponse({ error: "Not found" }, 404, e);
}

function createSession(payload) {
  const sheet = getSheet(SHEET_NAMES.sessions);
  const now = new Date();
  const iso = now.toISOString();
  const id = payload && payload.id ? String(payload.id).trim() : Utilities.getUuid();
  const name = payload && payload.name ? String(payload.name) : "";

  const row = [
    now,
    id,
    name,
    "active",
    iso,
    iso,
    "",
    ""
  ];

  sheet
    .getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.sessions.length)
    .setValues([row]);

  return {
    id,
    name,
    status: "active",
    startTime: iso,
    lastSeen: iso
  };
}

function recordHeartbeat(sessionId) {
  if (!sessionId) {
    return { error: "sessionId ontbreekt" };
  }

  const sheet = getSheet(SHEET_NAMES.sessions);
  const record = getSessionRow(sheet, sessionId);
  const now = new Date();
  const iso = now.toISOString();

  const values = record ? record.values.slice() : new Array(HEADERS.sessions.length).fill("");
  values[SESSION_COLS.timestamp] = now;
  values[SESSION_COLS.id] = sessionId;
  values[SESSION_COLS.status] = values[SESSION_COLS.status] === "completed" ? "completed" : "active";
  values[SESSION_COLS.lastSeen] = iso;
  if (!values[SESSION_COLS.startTime]) {
    values[SESSION_COLS.startTime] = iso;
  }

  const rowIndex = record ? record.row : sheet.getLastRow() + 1;
  sheet.getRange(rowIndex, 1, 1, HEADERS.sessions.length).setValues([values]);

  const heartbeatSheet = getSheet(SHEET_NAMES.heartbeats);
  heartbeatSheet
    .getRange(heartbeatSheet.getLastRow() + 1, 1, 1, HEADERS.heartbeats.length)
    .setValues([[now, sessionId, iso]]);

  return { lastSeen: iso };
}

function recordAttempt(sessionId, payload) {
  if (!sessionId) {
    return { error: "sessionId ontbreekt" };
  }

  const sheet = getSheet(SHEET_NAMES.sessions);
  const record = getSessionRow(sheet, sessionId);
  if (record) {
    const now = new Date();
    const iso = now.toISOString();
    const values = record.values.slice();
    values[SESSION_COLS.timestamp] = now;
    values[SESSION_COLS.lastSeen] = iso;
    values[SESSION_COLS.status] = values[SESSION_COLS.status] === "completed" ? "completed" : "active";
    sheet
      .getRange(record.row, 1, 1, HEADERS.sessions.length)
      .setValues([values]);
  }

  const attemptSheet = getSheet(SHEET_NAMES.attempts);
  const now = new Date();
  const iso = now.toISOString();
  const selected = payload && Array.isArray(payload.selectedOptionIds)
    ? payload.selectedOptionIds
    : [];

  const row = [
    now,
    sessionId,
    payload && payload.moduleId ? String(payload.moduleId) : "",
    payload && payload.questionId ? String(payload.questionId) : "",
    JSON.stringify(selected),
    payload && payload.isCorrect ? 1 : 0,
    JSON.stringify(payload || {})
  ];

  attemptSheet
    .getRange(attemptSheet.getLastRow() + 1, 1, 1, HEADERS.attempts.length)
    .setValues([row]);

  return {};
}

function completeSession(sessionId, payload) {
  if (!sessionId) {
    return { error: "sessionId ontbreekt" };
  }

  const sheet = getSheet(SHEET_NAMES.sessions);
  const record = getSessionRow(sheet, sessionId);
  const now = new Date();
  const iso = now.toISOString();
  const summary = payload && payload.summary ? JSON.stringify(payload.summary) : "";

  const values = record ? record.values.slice() : new Array(HEADERS.sessions.length).fill("");
  values[SESSION_COLS.timestamp] = now;
  values[SESSION_COLS.id] = sessionId;
  values[SESSION_COLS.status] = "completed";
  if (!values[SESSION_COLS.startTime]) {
    values[SESSION_COLS.startTime] = iso;
  }
  values[SESSION_COLS.lastSeen] = iso;
  values[SESSION_COLS.summary] = summary;
  values[SESSION_COLS.endTime] = iso;

  const rowIndex = record ? record.row : sheet.getLastRow() + 1;
  sheet.getRange(rowIndex, 1, 1, HEADERS.sessions.length).setValues([values]);

  const completionSheet = getSheet(SHEET_NAMES.completions);
  completionSheet
    .getRange(completionSheet.getLastRow() + 1, 1, 1, HEADERS.completions.length)
    .setValues([[now, sessionId, iso, summary]]);

  return { endTime: iso };
}

function markSessionLeft(sessionId) {
  if (!sessionId) {
    return { error: "sessionId ontbreekt" };
  }

  const sheet = getSheet(SHEET_NAMES.sessions);
  const record = getSessionRow(sheet, sessionId);
  const now = new Date();
  const iso = now.toISOString();

  const values = record ? record.values.slice() : new Array(HEADERS.sessions.length).fill("");
  values[SESSION_COLS.timestamp] = now;
  values[SESSION_COLS.id] = sessionId;
  const isCompleted = values[SESSION_COLS.status] === "completed";
  values[SESSION_COLS.status] = isCompleted ? "completed" : "inactive";
  if (!values[SESSION_COLS.startTime]) {
    values[SESSION_COLS.startTime] = iso;
  }
  values[SESSION_COLS.lastSeen] = iso;
  if (!values[SESSION_COLS.endTime]) {
    values[SESSION_COLS.endTime] = iso;
  }

  const rowIndex = record ? record.row : sheet.getLastRow() + 1;
  sheet.getRange(rowIndex, 1, 1, HEADERS.sessions.length).setValues([values]);

  return {};
}

function getSessionRow(sheet, sessionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.sessions.length);
  const values = range.getValues();
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][SESSION_COLS.id]) === sessionId) {
      return {
        row: index + 2,
        values: values[index]
      };
    }
  }
  return null;
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
  const sheet = getSheet(SHEET_NAMES.sessions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.sessions.length);
  const values = range.getValues();

  return values
    .map((row) => {
      const id = String(row[SESSION_COLS.id] || "").trim();
      if (!id) {
        return null;
      }
      return {
        id,
        name: String(row[SESSION_COLS.name] || ""),
        status: String(row[SESSION_COLS.status] || ""),
        startTime: normalizeIso(row[SESSION_COLS.startTime]),
        lastSeen: normalizeIso(row[SESSION_COLS.lastSeen])
      };
    })
    .filter(Boolean);
}

function readAttemptStats(validSessionIds) {
  const stats = new Map();
  if (!validSessionIds || !validSessionIds.size) {
    return stats;
  }

  const sheet = getSheet(SHEET_NAMES.attempts);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return stats;
  }

  const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.attempts.length);
  const values = range.getValues();

  values.forEach((row) => {
    const sessionId = String(row[ATTEMPT_COLS.sessionId] || "").trim();
    if (!sessionId || !validSessionIds.has(sessionId)) {
      return;
    }
    const isCorrect = parseBoolean(row[ATTEMPT_COLS.isCorrect]);
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
