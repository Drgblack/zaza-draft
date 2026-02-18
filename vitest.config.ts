import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@/generated": `${root}/src/generated`,
      "@/lib": `${root}/lib`,
      "@/": `${root}/`,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "lib/**/*.test.{ts,tsx}",
      "components/**/*.test.tsx",
      "app/**/*.test.{ts,tsx}",
      "hooks/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["test/setup/test-setup.ts"],
  },
})
