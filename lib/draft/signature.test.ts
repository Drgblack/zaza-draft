import { describe, expect, it } from "vitest"

import { applySignatureToDraft, resolveSignature, SignaturePayload } from "@/lib/draft/signature"

describe("signature helper", () => {
  it("resolves lines and placeholders with defaults", () => {
    const signature = resolveSignature({
      line1: "Sarah Lee",
      line2: "Class 8 Teacher",
      line3: "Riverside Academy",
    })

    expect(signature.lines).toEqual(["Sarah Lee", "Class 8 Teacher", "Riverside Academy"])
    expect(signature.block).toContain("Sarah Lee")
    expect(signature.placeholders["[Your Name]"]).toBe("Sarah Lee")
    expect(signature.placeholders["[Your Position]"]).toBe("Class 8 Teacher")
    expect(signature.appendForMode.parent_message).toBe(true)
    expect(signature.appendForMode.report_comment).toBe(false)
  })

  it("applies replacements and appends block for parent messages", () => {
    const signature = resolveSignature({
      line1: "Ms. Carter",
      line2: "English Lead",
      autoAppendParentMessage: true,
    })

    const text = "Dear family,\n\n[Your Name]\n [Your Position]"
    const result = applySignatureToDraft(text, signature, "parent_message")

    expect(result).toContain("Ms. Carter")
    expect(result).toContain("English Lead")
    expect(result).toMatch(/Ms\. Carter/)
  })

  it("does not append signature for report comments by default", () => {
    const signature = resolveSignature({
      line1: "Ms. Carter",
      line2: "English Lead",
    })
    const text = "Report draft"
    const result = applySignatureToDraft(text, signature, "report_comment")

    expect(result).toBe("Report draft")
  })
})
