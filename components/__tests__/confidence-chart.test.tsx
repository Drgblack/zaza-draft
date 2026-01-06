import { describe, expect, it } from "vitest"
import { getConfidenceValue } from "@/components/insights/confidence-chart"

describe("getConfidenceValue", () => {
  it("returns higher values for lower edit rates", () => {
    const higherConfidence = getConfidenceValue(20)
    const lowerConfidence = getConfidenceValue(80)

    expect(higherConfidence).toBeGreaterThan(lowerConfidence)
  })

  it("clamps values between 0 and 100", () => {
    expect(getConfidenceValue(-10)).toBe(100)
    expect(getConfidenceValue(110)).toBe(0)
  })
})
