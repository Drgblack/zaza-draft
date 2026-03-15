import { describe, expect, it, beforeEach, afterEach } from "vitest"

import { isProOrQa } from "./is-pro-or-qa"
import { refreshInternalUidLists } from "@/lib/auth/internal-qa"
import { refreshForcedProUserIds } from "@/lib/dev/forced-pro-users"

const QA_UID = "sarah-qa-uid"
const FORCED_PRO_UID = "Zht5UDJoSjhXAW8aKnDSd5IViDk1"

describe("isProOrQa", () => {
  let originalQaList: string | undefined
  let originalForcedProList: string | undefined
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalQaList = process.env.INTERNAL_QA_UIDS
    originalForcedProList = process.env.FORCE_PRO_USER_IDS
    originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "development"
    refreshInternalUidLists()
    refreshForcedProUserIds()
  })

  afterEach(() => {
    process.env.INTERNAL_QA_UIDS = originalQaList
    process.env.FORCE_PRO_USER_IDS = originalForcedProList
    process.env.NODE_ENV = originalNodeEnv
    refreshInternalUidLists()
    refreshForcedProUserIds()
  })

  it("returns true when the plan is pro", () => {
    expect(isProOrQa("pro", "anyone")).toBe(true)
  })

  it("returns true when the UID is listed in INTERNAL_QA_UIDS", () => {
    process.env.INTERNAL_QA_UIDS = QA_UID
    refreshInternalUidLists()
    expect(isProOrQa("free", QA_UID)).toBe(true)
  })

  it("returns true when the UID is listed in FORCE_PRO_USER_IDS during development", () => {
    process.env.FORCE_PRO_USER_IDS = FORCED_PRO_UID
    refreshForcedProUserIds()
    expect(isProOrQa("free", FORCED_PRO_UID)).toBe(true)
  })

  it("returns false when plan is free and UID is not allowed", () => {
    process.env.INTERNAL_QA_UIDS = ""
    process.env.FORCE_PRO_USER_IDS = ""
    refreshInternalUidLists()
    refreshForcedProUserIds()
    expect(isProOrQa("free", "unknown")).toBe(false)
  })
})
