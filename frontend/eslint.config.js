import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jest from "eslint-plugin-jest";

export default defineConfig([
  {
    ignores: [
      "coverage/**",
      "node_modules/**"
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        gsap: "readonly",
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
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.jest,
        ...globals.node,
      },
    },
  },
]);
