import { describe, expect, it } from "vitest"

import { detectTopicSensitivity } from "@/src/lib/safetyEngine/topicDetector"

describe("detectTopicSensitivity", () => {
  it("returns high for bullying topics", () => {
    expect(detectTopicSensitivity("We need to talk about the bullying concerns from today.")).toBe(
      "high",
    )
  })

  it("returns medium for homework topics", () => {
    expect(detectTopicSensitivity("I wanted to follow up about homework this week.")).toBe(
      "medium",
    )
  })

  it("returns low when no topic keywords match", () => {
    expect(detectTopicSensitivity("Well done on the progress this week.")).toBe("low")
  })
})
