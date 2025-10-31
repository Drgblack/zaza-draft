import { defineConfig } from "vitest/config";

export default defineConfig({
  onConsoleLog(log){ if (typeof log === "string" && log.includes("Retry attempt")) return false; },
  test: {
    include: ["**/*.test.{ts,tsx,js,jsx}"],
    exclude: ["e2e/**", "**/*.e2e.*", "node_modules/**", "dist/**", ".next/**"],
    reporters: "dot",
    globals: true,
    environment: "node",
  },
});