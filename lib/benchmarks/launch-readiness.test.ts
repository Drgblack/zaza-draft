import { describe, expect, it } from "vitest"

import { LAUNCH_READINESS_BENCHMARKS } from "./launch-readiness.fixtures"
import { evaluateLaunchBenchmarkOutput } from "./launch-readiness"

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
})

