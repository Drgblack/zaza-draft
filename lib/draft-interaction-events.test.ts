import { describe, expect, it } from "vitest"

import {
  buildDraftInteractionEventPayload,
  buildDraftInteractionEventRecord,
  inferReactionPrediction,
  inferRegionFromLocale,
  inferRiskFlagTypes,
  inferTimeContext,
} from "@/lib/draft-interaction-events"

describe("draft interaction analytics schema", () => {
  it("accepts only the whitelisted analytics fields", () => {
    const record = buildDraftInteractionEventRecord({
      event_name: "draft_created",
      message_context: "parent_email",
      workflow_type: "new_message",
      time_context: "school_hours",
      edit_depth: 2,
      rewrite_reason: "clarity",
      timestamp: "2026-03-16T12:00:00.000Z",
      message_text: "private parent email",
      student_id: "student-123",
      parent_id: "parent-123",
    } as Record<string, unknown>)

    expect(record).toMatchObject({
      schema_name: "draft_interaction_event",
      schema_version: 3,
      source: "draft",
      event_name: "draft_created",
      message_context: "parent_email",
      workflow_type: "new_message",
      time_context: "school_hours",
      edit_depth: 2,
      rewrite_reason: "clarity",
      teacher_intent: null,
    })
    expect(record).not.toHaveProperty("message_text")
    expect(record).not.toHaveProperty("student_id")
    expect(record).not.toHaveProperty("parent_id")
  })

  it("normalizes invalid edit depth values and requires valid enums", () => {
    const payload = buildDraftInteractionEventPayload({
      event_name: "reaction_prediction_generated",
      message_context: "report_comment",
      workflow_type: "documentation_mode",
      time_context: "weekend",
      edit_depth: -4,
      timestamp: "2026-03-16T12:00:00.000Z",
      teacher_intent: "share_progress",
    })

    expect(payload?.edit_depth).toBe(0)
    expect(payload?.teacher_intent).toBe("share_progress")
    expect(
      buildDraftInteractionEventPayload({
        event_name: "unknown",
        message_context: "report_comment",
        workflow_type: "documentation_mode",
        time_context: "weekend",
      }),
    ).toBeNull()
  })

  it("infers aggregate metadata without exposing content", () => {
    expect(inferRegionFromLocale("de-DE")).toBe("EU")
    expect(inferRegionFromLocale("en-GB")).toBe("UK")
    expect(inferRegionFromLocale("en-US")).toBe("US")
    expect(
      inferReactionPrediction({
        collaborative: 20,
        concerned: 10,
        defensive: 25,
        hostile: 40,
        confused: 5,
      }),
    ).toBe("angry")
    expect(
      inferRiskFlagTypes({
        triggeredSignals: [
          { category: "escalation" },
          { category: "frustration" },
        ] as any,
        professionalRiskFlags: [{ signalId: "pro_legal_certainty" }] as any,
      }),
    ).toEqual([
      "escalation_language",
      "emotional_language",
      "unclear_documentation",
    ])
    expect(inferTimeContext(new Date("2026-03-16T09:00:00"))).toBe("school_hours")
  })
})
