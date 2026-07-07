import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "coverage/**",
      "node_modules/**",
      ".sonar/**",
      ".npm-cache/**"
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error"
    }
  },
]);