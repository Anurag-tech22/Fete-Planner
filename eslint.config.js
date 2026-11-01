import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  { ignores: ["playwright-report", "test-results", "dist", "dist-server", "coverage", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly", URL: "readonly" } },
  },
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        URL: "readonly",
        location: "readonly",
        fetch: "readonly",
      },
    },
  },
  {
    files: ["client/**/*.{ts,tsx}", "server/**/*.ts", "shared/**/*.ts"],
    ignores: ["**/*.test.*"],
    rules: {
      complexity: ["error", 12],
      "max-lines": ["error", { max: 260, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 90, skipBlankLines: true, skipComments: true }],
      "max-depth": ["error", 3],
      "max-params": ["error", 5],
      eqeqeq: "error",
      curly: ["error", "multi-line"],
    },
  },
  { files: ["**/*.test.*", "e2e/**"], rules: { "@typescript-eslint/no-non-null-assertion": "off" } },
  { files: ["**/*.{ts,tsx}"], rules: { "no-console": ["error", { allow: ["error", "log"] }] } },
);
