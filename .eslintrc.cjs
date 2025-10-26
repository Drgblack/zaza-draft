/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, node: true, es2023: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/stylistic",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["node_modules/", "dist/", ".build/", ".next/", "coverage/"],
  rules: {
    // keep it friendly for now
  }
};
