import { describe, expect, it } from "vitest"

import {
  assertZazaDraftProject,
  FirebaseProjectSafetyError,
  ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID,
} from "@/lib/firebase/project-policy"

describe("assertZazaDraftProject", () => {
  it("passes for zaza-draft-app", () => {
    expect(
      assertZazaDraftProject({
        context: "test route",
        projectId: ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID,
      }),
    ).toEqual({
      projectId: ZAZA_DRAFT_PRODUCTION_FIREBASE_PROJECT_ID,
      overrideApplied: false,
    })
  })

  it("blocks non-production projects by default", () => {
    expect(() =>
      assertZazaDraftProject({
        context: "test route",
        projectId: "zaza-id-and-licences",
      }),
    ).toThrow(FirebaseProjectSafetyError)
  })

  it("permits script override when explicitly allowed", () => {
    expect(
      assertZazaDraftProject({
        context: "test script",
        mode: "script",
        projectId: "zaza-id-and-licences",
        allowOverrideFlag: true,
        mutatesProtectedUserState: true,
      }),
    ).toEqual({
      projectId: "zaza-id-and-licences",
      overrideApplied: true,
    })
  })

  it("does not permit route override behavior", () => {
    expect(() =>
      assertZazaDraftProject({
        context: "test route",
        mode: "route",
        projectId: "zaza-id-and-licences",
        allowOverrideFlag: true,
        mutatesProtectedUserState: true,
      }),
    ).toThrow(FirebaseProjectSafetyError)
  })
})
