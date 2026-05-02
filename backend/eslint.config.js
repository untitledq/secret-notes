import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.js"],
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);