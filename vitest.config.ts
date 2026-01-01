import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@/": `${root}/`,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["lib/**/*.test.{ts,tsx}", "components/**/*.test.tsx", "app/**/*.test.{ts,tsx}"],
  },
})
