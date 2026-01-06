const nextPlugin = require("@next/eslint-plugin-next");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "out/**",
      "dist/**",
      "coverage/**",
      ".vercel/**",
      "**/*.min.*",
    ],
  },

  // Main project rules (TS/JS + React)
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // Base JS rules are too noisy for TS projects
      "no-undef": "off",
      "no-unused-vars": "off",

      // Next.js recommended rules
      ...(nextPlugin.configs?.recommended?.rules ?? {}),

      // React hooks rules - keep deps guidance, disable opinionated ones
      ...(reactHooks.configs?.recommended?.rules ?? {}),
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },

  // Node scripts (build/test utilities)
  {
    files: ["scripts/**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        Buffer: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
];
