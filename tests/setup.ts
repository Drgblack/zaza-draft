import React from "react"
import { vi } from "vitest"

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { ...props, href }, children),
}))
