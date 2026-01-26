import { describe, it, expect } from "vitest"
import { DraftContext, stripUndefined } from "./draft-context"

describe("stripUndefined", () => {
  it("recursively purges undefined fields while preserving defined values", () => {
    const input: DraftContext = {
      requestId: "req-1",
      locale: "en-GB",
      mode: "parent_message",
      parentName: undefined,
      childName: "Sofia",
      panicScan: {
        scanId: "scan-1",
        summary: undefined,
        suggestedReplyBullets: [undefined, "ask for more info"],
        emotionalIndicators: [undefined, "distress"],
      },
      subject: undefined,
    }

    const result = stripUndefined(input)

    expect(result).toHaveProperty("requestId", "req-1")
    expect(result).toHaveProperty("mode", "parent_message")
    expect(result).not.toHaveProperty("parentName")
    expect(result).not.toHaveProperty("subject")
    expect(result.childName).toBe("Sofia")
    expect(result.panicScan).toEqual({
      scanId: "scan-1",
      suggestedReplyBullets: ["ask for more info"],
      emotionalIndicators: ["distress"],
    })
  })
})
