import { describe, expect, it, beforeEach, afterEach } from "vitest"

import { isProOrQa } from "./is-pro-or-qa"

const QA_UID = "sarah-qa-uid"

describe("isProOrQa", () => {
  let originalQaList: string | undefined

  beforeEach(() => {
    originalQaList = process.env.INTERNAL_QA_UIDS
  })

  afterEach(() => {
    process.env.INTERNAL_QA_UIDS = originalQaList
  })

  it("returns true when the plan is pro", () => {
    expect(isProOrQa("pro", "anyone")).toBe(true)
  })

  it("returns true when the UID is listed in INTERNAL_QA_UIDS", () => {
    process.env.INTERNAL_QA_UIDS = QA_UID
    expect(isProOrQa("free", QA_UID)).toBe(true)
  })

  it("returns false when plan is free and UID is not allowed", () => {
    process.env.INTERNAL_QA_UIDS = ""
    expect(isProOrQa("free", "unknown")).toBe(false)
  })
})
