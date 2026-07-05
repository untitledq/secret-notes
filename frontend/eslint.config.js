import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jest from "eslint-plugin-jest";

export default defineConfig([
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        posthog: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
  {
    files: ["**/*.test.js"],
    ...jest.configs["flat/recommended"],
  },
]);