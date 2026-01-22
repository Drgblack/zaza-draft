import { afterEach, describe, expect, it } from "vitest"
import { getProjectId } from "@/lib/firebase/admin"

const ORIGINAL_FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
const ORIGINAL_NEXT_PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

function restoreEnv() {
  if (ORIGINAL_FIREBASE_PROJECT_ID === undefined) {
    delete process.env.FIREBASE_PROJECT_ID
  } else {
    process.env.FIREBASE_PROJECT_ID = ORIGINAL_FIREBASE_PROJECT_ID
  }

  if (ORIGINAL_NEXT_PUBLIC_PROJECT_ID === undefined) {
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  } else {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = ORIGINAL_NEXT_PUBLIC_PROJECT_ID
  }
}

afterEach(() => {
  restoreEnv()
})

describe("getProjectId", () => {
  it("returns FIREBASE_PROJECT_ID when set", () => {
    process.env.FIREBASE_PROJECT_ID = "server-project"
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "public-project"
    expect(getProjectId()).toBe("server-project")
  })

  it("falls back to NEXT_PUBLIC_FIREBASE_PROJECT_ID", () => {
    delete process.env.FIREBASE_PROJECT_ID
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "public-project"
    expect(getProjectId()).toBe("public-project")
  })

  it("throws when no project ID is configured", () => {
    delete process.env.FIREBASE_PROJECT_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    expect(getProjectId).toThrowError(/FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID/)
  })
})
