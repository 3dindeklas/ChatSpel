const fs = require("fs/promises");
const path = require("path");

const DEFAULT_SHEET_ID = "1-mU_hGc-GLgu1QD_s1gyYW7iZ992srYMdGeQ-nicuRc";

function resolveSheetId() {
  return process.env.GOOGLE_SHEETS_ID || DEFAULT_SHEET_ID;
}

function toHeaderName(value, index) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return `column${index}`;
}

function normalizeCellValue(cell) {
  if (!cell || typeof cell.v === "undefined" || cell.v === null) {
    return "";
  }
  return cell.v;
}

async function fetchFromGoogleVisualization(sheetId, sheetName) {
  const encodedSheet = encodeURIComponent(sheetName);
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodedSheet}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Kon sheet '${sheetName}' niet laden (status ${response.status})`);
  }
  const raw = await response.text();
  const match = raw.match(/google\.visualization\.Query\.setResponse\((.*)\);?/s);
  if (!match) {
    throw new Error(`Onverwacht antwoordformaat voor sheet '${sheetName}'`);
  }

  const parsed = JSON.parse(match[1]);
  const table = parsed.table || {};
  const cols = (table.cols || []).map((col, index) =>
    toHeaderName(col.label || col.id || "", index)
  );

  return (table.rows || []).map((row) => {
    const values = row.c || [];
    const entry = {};
    cols.forEach((header, index) => {
      entry[header] = normalizeCellValue(values[index]);
    });
    return entry;
  });
}

async function fetchFromFixture(sheetName) {
  const dir = process.env.GOOGLE_SHEETS_FAKE_DATA_DIR;
  if (!dir) {
    return null;
  }
  const filePath = path.join(dir, `${sheetName}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchSheet(sheetName) {
  const fixture = await fetchFromFixture(sheetName);
  if (fixture) {
    return fixture;
  }

  const sheetId = resolveSheetId();
  return fetchFromGoogleVisualization(sheetId, sheetName);
}

module.exports = {
  fetchSheet,
  resolveSheetId
};
