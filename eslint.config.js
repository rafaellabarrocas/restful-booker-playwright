import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginCypress from "eslint-plugin-cypress";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules/", "cypress/screenshots/", "cypress/videos/"] },

  js.configs.recommended,

  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.recommended],
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-namespace": "off",
    },
  },

  {
    files: ["cypress/**/*.ts"],
    extends: [pluginCypress.configs.recommended],
    rules: {
      "cypress/no-unnecessary-waiting": "error",
      "cypress/no-async-tests": "error",
      "cypress/no-pause": "error",
      "cypress/no-force": "error",
      "cypress/assertion-before-screenshot": "warn",
    },
  },

  prettier,
);
