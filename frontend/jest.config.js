/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  collectCoverage: false,
  collectCoverageFrom: [
    "app.js"
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "cobertura"
  ],
};

export default config;
