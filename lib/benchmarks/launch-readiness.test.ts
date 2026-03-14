import { describe, expect, it } from "vitest"

import { LAUNCH_READINESS_BENCHMARKS } from "./launch-readiness.fixtures"
import { evaluateEnglishBoutiqueQualityGate, evaluateLaunchBenchmarkOutput } from "./launch-readiness"

describe("launch readiness benchmark suite", () => {
  it("covers the launch-critical categories with EN and DE examples", () => {
    const categories = new Set(LAUNCH_READINESS_BENCHMARKS.map((benchmark) => benchmark.category))
    const locales = new Set(LAUNCH_READINESS_BENCHMARKS.map((benchmark) => benchmark.locale))
    const sources = new Set(LAUNCH_READINESS_BENCHMARKS.map((benchmark) => benchmark.source))

    expect(LAUNCH_READINESS_BENCHMARKS.length).toBeGreaterThanOrEqual(8)
    expect(categories).toEqual(
      new Set([
        "angry_parent_message",
        "teacher_notes_to_parent",
        "report_comment",
        "panic_scan_ocr",
        "high_risk_complaint",
      ]),
    )
    expect(locales).toEqual(new Set(["en", "de"]))
    expect(sources).toEqual(new Set(["typed", "ocr", "voice"]))
  })

  it("passes the gold-standard benchmark outputs", () => {
    for (const benchmark of LAUNCH_READINESS_BENCHMARKS) {
      const result = evaluateLaunchBenchmarkOutput(benchmark, benchmark.sampleGoodOutput)
      expect(result.passed, `${benchmark.id}: ${result.failures.join(" | ")}`).toBe(true)
    }
  })

  it("rejects the obvious failure outputs", () => {
    for (const benchmark of LAUNCH_READINESS_BENCHMARKS) {
      const result = evaluateLaunchBenchmarkOutput(benchmark, benchmark.sampleBadOutput)
      expect(result.passed, benchmark.id).toBe(false)
      expect(result.failures.length, benchmark.id).toBeGreaterThan(0)
    }
  })

  it("fails the English boutique gate on unnatural greeting, support-bot phrasing, and missing closing", () => {
    const benchmark = LAUNCH_READINESS_BENCHMARKS.find((item) => item.id === "en-panic-scan-angry-ocr")
    expect(benchmark).toBeDefined()

    const output = [
      "Subject: Follow-up on your message",
      "",
      "Hello Jordan Lee,",
      "",
      "Thank you for sharing your concerns. I will gather the details and prepare a practical plan.",
    ].join("\n")

    const result = evaluateEnglishBoutiqueQualityGate(benchmark!, output)
    expect(result.passed).toBe(false)
    expect(result.failures).toContain(
      "English greeting uses 'Hello Firstname Lastname,' instead of a natural parent-facing form.",
    )
    expect(result.failures).toContain("English parent message uses support-bot phrasing.")
    expect(result.failures).toContain("English parent message uses abstract managerial next-step language.")
    expect(result.failures).toContain("English parent message is missing the required closing block.")
  })

  it("fails the English boutique gate when report comments leak email framing", () => {
    const benchmark = LAUNCH_READINESS_BENCHMARKS.find((item) => item.id === "en-report-comment-fast")
    expect(benchmark).toBeDefined()

    const output = [
      "Subject: Progress update",
      "",
      "Hello,",
      "",
      "Luca contributes more consistently during discussion.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n")

    const result = evaluateEnglishBoutiqueQualityGate(benchmark!, output)
    expect(result.passed).toBe(false)
    expect(result.failures).toContain(
      "English report comment leaks email framing such as a subject, greeting, or sign-off.",
    )
  })

  it("keeps the English boutique gate neutral for German regression cases", () => {
    const benchmark = LAUNCH_READINESS_BENCHMARKS.find((item) => item.id === "de-panic-scan-low-confidence")
    expect(benchmark).toBeDefined()

    const result = evaluateEnglishBoutiqueQualityGate(benchmark!, benchmark!.sampleGoodOutput)
    expect(result).toEqual({ passed: true, failures: [] })
  })
})
