import { describe, expect, it } from "vitest"
import {
  appendDraftAttribution,
  getDraftAttributionLine,
  resolveDraftSignatureEnabled,
  shouldShowDraftAttribution,
} from "./draft-attribution"

describe("draft attribution helper", () => {
  it("defaults the Draft signature on for free users and off for paid users", () => {
    expect(resolveDraftSignatureEnabled(undefined, "free")).toBe(true)
    expect(resolveDraftSignatureEnabled(undefined, "pro")).toBe(false)
    expect(resolveDraftSignatureEnabled(false, "free")).toBe(false)
    expect(resolveDraftSignatureEnabled(true, "pro")).toBe(true)
  })

  it("only shows attribution for non-documentation parent messages", () => {
    expect(
      shouldShowDraftAttribution({
        enabled: true,
        mode: "parent_message",
        documentationMode: false,
      }),
    ).toBe(true)
    expect(
      shouldShowDraftAttribution({
        enabled: true,
        mode: "report_comment",
        documentationMode: false,
      }),
    ).toBe(false)
    expect(
      shouldShowDraftAttribution({
        enabled: true,
        mode: "parent_message",
        documentationMode: true,
      }),
    ).toBe(false)
  })

  it("appends the attribution line once", () => {
    const line = getDraftAttributionLine("en")
    const appended = appendDraftAttribution("Hello families,", line)

    expect(appended).toBe(`Hello families,\n\n${line}`)
    expect(appendDraftAttribution(appended, line)).toBe(appended)
  })
})
