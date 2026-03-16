import { describe, expect, it } from "vitest"

import { resolveTeacherSignatureName } from "@/lib/draft/teacher-signature"

describe("resolveTeacherSignatureName", () => {
  it("removes academic titles from display-name fallbacks by default", () => {
    expect(resolveTeacherSignatureName("Dr Greg Blackburn", "")).toBe("Greg Blackburn")
  })

  it("keeps an explicit stored signature choice unchanged", () => {
    expect(resolveTeacherSignatureName("Dr Greg Blackburn", "Dr Greg Blackburn")).toBe(
      "Dr Greg Blackburn",
    )
  })
})
