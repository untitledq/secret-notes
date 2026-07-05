export default {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/src/tests/env.js"],
  setupFilesAfterEnv: ["<rootDir>/src/db/setup.js"],
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/db/setup.js",
    "!src/tests/env.js"
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "cobertura"
  ],
};
