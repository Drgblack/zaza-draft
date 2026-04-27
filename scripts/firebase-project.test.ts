import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { prepareFirebaseScriptEnvironment } from "@/scripts/firebase-project"

describe("prepareFirebaseScriptEnvironment", () => {
  const originalArgv = [...process.argv]
  const originalProjectId = process.env.FIREBASE_PROJECT_ID

  beforeEach(() => {
    process.argv = ["node", "script"]
    delete process.env.FIREBASE_PROJECT_ID
  })

  afterEach(() => {
    process.argv = [...originalArgv]
    if (originalProjectId === undefined) {
      delete process.env.FIREBASE_PROJECT_ID
    } else {
      process.env.FIREBASE_PROJECT_ID = originalProjectId
    }
  })

  it("defaults scripts to zaza-draft-app when no project is set", () => {
    expect(
      prepareFirebaseScriptEnvironment({
        scriptName: "test-script.ts",
      }),
    ).toEqual({
      projectId: "zaza-draft-app",
      allowProjectOverride: false,
    })
  })

  it("blocks protected scripts on the legacy project by default", () => {
    process.env.FIREBASE_PROJECT_ID = "zaza-id-and-licences"

    expect(() =>
      prepareFirebaseScriptEnvironment({
        scriptName: "test-script.ts",
        mutatesProtectedUserState: true,
      }),
    ).toThrow(/Blocked by Firebase project safety guard|Protected Zaza Draft app users/)
  })

  it("allows protected scripts on the legacy project with explicit override", () => {
    process.env.FIREBASE_PROJECT_ID = "zaza-id-and-licences"
    process.argv = ["node", "script", "--allow-project-override"]

    expect(
      prepareFirebaseScriptEnvironment({
        scriptName: "test-script.ts",
        mutatesProtectedUserState: true,
      }),
    ).toEqual({
      projectId: "zaza-id-and-licences",
      allowProjectOverride: true,
    })
  })
})
