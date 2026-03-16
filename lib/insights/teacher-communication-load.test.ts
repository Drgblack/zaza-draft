import { describe, expect, it } from "vitest"

import {
  buildTeacherCommunicationLoadMetricDelta,
  buildTeacherCommunicationLoadSummary,
  calculateTeacherCommunicationLoad,
} from "@/lib/insights/teacher-communication-load"

describe("teacher communication load helpers", () => {
  it("calculates TCL from anonymized weekly counters", () => {
    expect(
      calculateTeacherCommunicationLoad({
        drafts_created: 3,
        rewrites: 2,
        risk_flags_triggered: 1,
        after_hours_drafts: 1,
        weekend_drafts: 0,
      }),
    ).toBe(21)
  })

  it("creates weekly deltas from draft interaction events without storing content", () => {
    const delta = buildTeacherCommunicationLoadMetricDelta({
      schema_name: "draft_interaction_event",
      schema_version: 3,
      source: "draft",
      event_name: "risk_flag_triggered",
      message_context: "parent_email",
      edit_depth: 3,
      time_context: "after_hours",
      workflow_type: "new_message",
      timestamp: "2026-03-16T18:30:00.000Z",
      risk_flag: "escalation_language",
    })

    expect(delta.metrics.risk_flags_triggered).toBe(1)
    expect(delta.metrics.after_hours_drafts).toBe(0)
    expect(delta.metrics.edit_depth_total).toBe(3)
    expect(delta.metrics.teacher_communication_load).toBe(5)
  })

  it("builds weekly trends and improvement indicators", () => {
    const summary = buildTeacherCommunicationLoadSummary([
      { week_start: "2026-03-10", teacher_communication_load: 18 },
      { week_start: "2026-03-03", teacher_communication_load: 22 },
      { week_start: "2026-02-24", teacher_communication_load: 16 },
      { week_start: "2026-02-17", teacher_communication_load: 25 },
    ])

    expect(summary.score).toBe(18)
    expect(summary.trend).toBe(-18)
    expect(summary.trendDirection).toBe("down")
    expect(summary.improvementIndicator).toBe("improving")
    expect(summary.fourWeekTrend).toEqual([25, 16, 22, 18])
  })
})
