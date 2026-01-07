import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@/generated": `${root}/src/generated`,
      "@/": `${root}/`,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "lib/**/*.test.{ts,tsx}",
      "components/**/*.test.tsx",
      "app/**/*.test.{ts,tsx}",
      "hooks/**/*.test.{ts,tsx}",
    ],
  },
})
