import { describe, expect, it } from "vitest"
import {
  buildFallbackInsightsSummary,
  buildInsightsSummaryFromEvents,
  buildWeeklyReflection,
  hasMeaningfulInsights,
  normalizeInsightsRangeDays,
} from "@/lib/insights/summary"

describe("insights summary helpers", () => {
  it("treats event-driven draft activity as meaningful insights data", () => {
    const summary = buildInsightsSummaryFromEvents(
      [
        {
          event_name: "draft_created",
          timestamp: "2026-03-16T10:00:00.000Z",
          message_context: "parent_email",
          workflow_type: "new_message",
          time_context: "school_hours",
          edit_depth: 0,
        },
        {
          event_name: "draft_created",
          timestamp: "2026-03-15T10:00:00.000Z",
          message_context: "parent_email",
          workflow_type: "new_message",
          time_context: "school_hours",
          edit_depth: 0,
        },
        {
          event_name: "edit_action",
          timestamp: "2026-03-15T10:05:00.000Z",
          message_context: "parent_email",
          workflow_type: "new_message",
          time_context: "school_hours",
          edit_depth: 1,
        },
      ],
      [
        {
          event_name: "draft_created",
          timestamp: "2026-03-10T10:00:00.000Z",
          message_context: "parent_email",
          workflow_type: "new_message",
          time_context: "school_hours",
          edit_depth: 0,
        },
      ],
      [],
    )

    expect(summary.draftsCreated?.total).toBe(2)
    expect(summary.draftsCreated?.usedWithoutEdits).toBe(1)
    expect(summary.timeSaved?.minutes).toBe(6)
    expect(summary.currentStreak?.days).toBe(2)
    expect(summary.qualityScore?.score).toBe(50)
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

  it("creates a school-hours weekly reflection from anonymized last-week signals", () => {
    const reflection = buildWeeklyReflection([
      {
        event_name: "draft_created",
        timestamp: "2026-03-19T10:00:00.000Z",
        message_context: "parent_email",
        workflow_type: "new_message",
        time_context: "school_hours",
        edit_depth: 0,
      },
      {
        event_name: "draft_created",
        timestamp: "2026-03-18T11:00:00.000Z",
        message_context: "report_comment",
        workflow_type: "new_message",
        time_context: "school_hours",
        edit_depth: 0,
      },
    ])

    expect(reflection?.key).toBe("insights.weeklyReflection.schoolHours")
  })

  it("prioritizes documentation reflection when documentation mode was used", () => {
    const summary = buildInsightsSummaryFromEvents(
      [
        {
          event_name: "draft_created",
          timestamp: "2026-03-19T10:00:00.000Z",
          message_context: "incident_record",
          workflow_type: "documentation_mode",
          time_context: "school_hours",
          edit_depth: 0,
        },
      ],
      [],
      [],
      [
        {
          event_name: "draft_created",
          timestamp: "2026-03-19T10:00:00.000Z",
          message_context: "incident_record",
          workflow_type: "documentation_mode",
          time_context: "school_hours",
          edit_depth: 0,
        },
        {
          event_name: "documentation_mode_enabled",
          timestamp: "2026-03-19T10:00:00.000Z",
          message_context: "incident_record",
          workflow_type: "documentation_mode",
          time_context: "school_hours",
          edit_depth: 0,
        },
      ],
    )

    expect(summary.weeklyReflection?.key).toBe("insights.weeklyReflection.documentation")
  })
})
