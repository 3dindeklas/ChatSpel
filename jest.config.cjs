module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: ["server/**/*.js", "!server/database.js"],
  coverageDirectory: "coverage",
  verbose: true
};
