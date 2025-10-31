import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist", ".next", "coverage"],
    onConsoleLog(log) {
      if (log.includes("Retry attempt")) return false; // mute retry noise
    }
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname
    }
  }
});
