import { describe, expect, it } from "vitest"

import { resolveTeacherSignatureName } from "@/lib/draft/teacher-signature"

describe("resolveTeacherSignatureName", () => {
  it("preserves the signed-in profile display name when used as the fallback signature", () => {
    expect(resolveTeacherSignatureName("Dr Greg Blackburn", "")).toBe("Dr Greg Blackburn")
  })

  it("keeps an explicit stored signature choice unchanged", () => {
    expect(resolveTeacherSignatureName("Dr Greg Blackburn", "Dr Greg Blackburn")).toBe(
      "Dr Greg Blackburn",
    )
  })

  it("falls back to the authenticated display name when the stored signature is a placeholder", () => {
    expect(resolveTeacherSignatureName("Dr Greg Blackburn", "[Your Name]")).toBe(
      "Dr Greg Blackburn",
    )
  })
})
