import js from "@eslint/js";
import tseslint from "typescript-eslint";
import playwright from "eslint-plugin-playwright";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules/", "playwright-report/", "test-results/", ".auth/"] },

  js.configs.recommended,

  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.recommended],
    rules: {
      "no-console": ["warn", { allow: ["warn"] }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
    languageOptions: { parserOptions: { projectService: true } },
  },

  {
    files: ["tests/**/*.ts"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-force-option": "error",
      "playwright/no-focused-test": "error",
      "playwright/no-skipped-test": "error",
      "playwright/expect-expect": ["error", { assertFunctionNames: ["expect"] }],
      // Playwright hooks receive fixtures first: `async ({}, testInfo) => …` is idiomatic.
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
    },
  },

  prettier,
);
