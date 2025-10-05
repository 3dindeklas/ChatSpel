require("dotenv").config();

const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
const shouldUsePostgres = Boolean(DATABASE_URL);

function mapPlaceholders(query = "") {
  let index = 0;
  return query.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

if (shouldUsePostgres) {
  const shouldUseSSL = process.env.DATABASE_SSL !== "false";
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined
  });

  module.exports = {
    isPostgres: true,
    run(query, params = [], callback = () => {}) {
      pool
        .query(mapPlaceholders(query), params)
        .then((result) => {
          const context = { lastID: null, changes: result.rowCount };
          callback.call(context, null);
        })
        .catch((error) => callback(error));
    },
    get(query, params = [], callback = () => {}) {
      pool
        .query(mapPlaceholders(query), params)
        .then((result) => callback(null, result.rows[0] || undefined))
        .catch((error) => callback(error));
    },
    all(query, params = [], callback = () => {}) {
      pool
        .query(mapPlaceholders(query), params)
        .then((result) => callback(null, result.rows))
        .catch((error) => callback(error));
    },
    close(callback = () => {}) {
      pool
        .end()
        .then(() => callback(null))
        .catch((error) => callback(error));
    }
  };
}

const dbPath = process.env.SQLITE_DATABASE_PATH
  ? path.resolve(process.env.SQLITE_DATABASE_PATH)
  : path.join(__dirname, "..", "data", "quiz.db");

const sqliteDb = new sqlite3.Database(dbPath);

sqliteDb.serialize(() => {
  sqliteDb.run("PRAGMA foreign_keys = ON");
});

sqliteDb.isPostgres = false;

module.exports = sqliteDb;
