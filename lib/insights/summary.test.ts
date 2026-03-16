import { describe, expect, it } from "vitest"
import {
  buildFallbackInsightsSummary,
  buildInsightsSummaryFromSnippets,
  hasMeaningfulInsights,
  normalizeInsightsRangeDays,
} from "@/lib/insights/summary"

describe("insights summary helpers", () => {
  it("treats generated snippet activity as meaningful insights data", () => {
    const summary = buildInsightsSummaryFromSnippets(
      [
        { createdAt: "2026-03-16T10:00:00.000Z" },
        { createdAt: "2026-03-15T10:00:00.000Z" },
      ],
      [{ createdAt: "2026-03-10T10:00:00.000Z" }],
    )

    expect(summary.draftsCreated?.total).toBe(2)
    expect(summary.timeSaved?.minutes).toBe(6)
    expect(summary.currentStreak?.days).toBe(2)
    expect(hasMeaningfulInsights(summary)).toBe(true)
  })

  it("keeps the empty state only when all metrics are effectively zero", () => {
    expect(hasMeaningfulInsights(buildFallbackInsightsSummary(0))).toBe(false)
    expect(hasMeaningfulInsights(buildFallbackInsightsSummary(1))).toBe(true)
  })

  it("normalizes unsupported date ranges to the safer default", () => {
    expect(normalizeInsightsRangeDays("7")).toBe(7)
    expect(normalizeInsightsRangeDays("999")).toBe(30)
    expect(normalizeInsightsRangeDays(null)).toBe(30)
  })
})
