import { describe, expect, it } from "vitest"

import type { LicenceRecord } from "@/lib/admin/licences"
import { resolveAdminUserPlan } from "@/lib/admin/user-plan"

function buildActiveLicence(overrides?: Partial<LicenceRecord>): LicenceRecord {
  const now = Date.now()
  return {
    schoolId: "school-1",
    licenceType: "school",
    seatLimit: 25,
    seatsUsed: 1,
    status: "active",
    startDate: now - 60_000,
    endDate: now + 60_000,
    createdAt: now - 60_000,
    updatedAt: now,
    ...overrides,
  }
}

describe("resolveAdminUserPlan", () => {
  it("prefers a manual override over a school licence membership", () => {
    const result = resolveAdminUserPlan({
      uid: "teacher-1",
      userData: {
        email: "teacher@example.com",
        plan: "free",
        entitlements: {
          planOverride: "pro",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          reason: "manual upgrade",
        },
      },
      activeMembership: {
        schoolId: "school-1",
        licenceId: "licence-1",
        status: "active",
      },
      activeLicence: buildActiveLicence(),
    })

    expect(result).toMatchObject({
      effectivePlan: "pro",
      planSource: "manual_override",
      planReason: "manual upgrade",
    })
  })

  it("prefers an active subscription over a school licence membership", () => {
    const result = resolveAdminUserPlan({
      uid: "teacher-1",
      userData: {
        email: "teacher@example.com",
        subscriptionStatus: "active",
        plan: "free",
      },
      activeMembership: {
        schoolId: "school-1",
        licenceId: "licence-1",
        status: "active",
      },
      activeLicence: buildActiveLicence(),
    })

    expect(result).toMatchObject({
      plan: "pro",
      effectivePlan: "pro",
      planSource: "subscription",
    })
  })

  it("returns pro for a user with an active school licence membership", () => {
    const result = resolveAdminUserPlan({
      uid: "teacher-1",
      userData: {
        email: "teacher@example.com",
        plan: "free",
      },
      activeMembership: {
        schoolId: "school-1",
        licenceId: "licence-1",
        status: "active",
      },
      activeLicence: buildActiveLicence(),
    })

    expect(result).toMatchObject({
      plan: "free",
      effectivePlan: "pro",
      planSource: "school_licence",
      planReason: "school licence",
    })
  })

  it("returns free for a user with an expired school licence and no higher priority source", () => {
    const result = resolveAdminUserPlan({
      uid: "teacher-1",
      userData: {
        email: "teacher@example.com",
        plan: "free",
      },
      activeMembership: {
        schoolId: "school-1",
        licenceId: "licence-1",
        status: "active",
      },
      activeLicence: buildActiveLicence({
        status: "expired",
        endDate: Date.now() - 60_000,
      }),
    })

    expect(result).toMatchObject({
      effectivePlan: "free",
      planSource: "free_fallback",
      planReason: null,
    })
  })

  it("keeps the domain fallback when no membership exists", () => {
    const result = resolveAdminUserPlan({
      uid: "teacher-1",
      userData: {
        email: "teacher@school.org",
        plan: "free",
      },
      schoolLicencesByDomain: new Map([
        [
          "school.org",
          {
            domain: "school.org",
            plan: "pro",
            expiresAt: null,
            reason: "school pilot",
          },
        ],
      ]),
    })

    expect(result).toMatchObject({
      plan: "free",
      effectivePlan: "pro",
      planSource: "school_domain_licence",
      planReason: "school pilot",
    })
  })
})
