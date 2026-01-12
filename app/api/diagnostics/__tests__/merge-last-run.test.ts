import { describe, expect, it } from "vitest"

import {
  FirestoreTimestamp,
  mergeDiagnosticsWithLastRun,
} from "@/lib/diagnostics/merge-last-run"

const timestamp: FirestoreTimestamp = { seconds: 1_700_000_000, nanoseconds: 0 }

describe("mergeDiagnosticsWithLastRun", () => {
  it("returns diagnostics document when it already has lastRunAt", () => {
    const document = { lastRunAt: timestamp, otherField: "value" }
    const merged = mergeDiagnosticsWithLastRun(document)
    expect(merged).toEqual(document)
  })

  it("returns fallback timestamp when diagnostics doc is missing", () => {
    const merged = mergeDiagnosticsWithLastRun(null, timestamp)
    expect(merged).toEqual({ lastRunAt: timestamp })
  })

  it("injects fallback when diagnostics doc lacks lastRunAt", () => {
    const document = { other: "data" }
    const merged = mergeDiagnosticsWithLastRun(document, timestamp)
    expect(merged).toEqual({ other: "data", lastRunAt: timestamp })
  })
})
