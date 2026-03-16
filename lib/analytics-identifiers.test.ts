import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildSchoolHash,
  buildTeacherHash,
  normalizeAnalyticsDomain,
  resolveAnalyticsHashes,
  resolveSchoolDomain,
} from "@/lib/analytics-identifiers"

describe("analytics identifiers", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("normalizes domains from emails and onboarding-style values", () => {
    expect(normalizeAnalyticsDomain("Teacher@School.Example.org")).toBe("school.example.org")
    expect(normalizeAnalyticsDomain("https://School.Example.org/portal")).toBe(
      "school.example.org",
    )
  })

  it("resolves the school domain from override before email fallback", () => {
    expect(
      resolveSchoolDomain({
        schoolDomainOverride: "district.schools.example",
        decodedEmail: "teacher@school.example.org",
      }),
    ).toBe("district.schools.example")
  })

  it("builds deterministic salted hashes without leaking plaintext identifiers", () => {
    vi.stubEnv("ANALYTICS_HASH_SALT", "unit-test-salt")

    const teacherHash = buildTeacherHash("teacher-123")
    const schoolHash = buildSchoolHash("school.example.org")

    expect(teacherHash).toHaveLength(64)
    expect(schoolHash).toHaveLength(64)
    expect(teacherHash).not.toContain("teacher-123")
    expect(schoolHash).not.toContain("school.example.org")
    expect(buildTeacherHash("teacher-123")).toBe(teacherHash)
    expect(buildSchoolHash("school.example.org")).toBe(schoolHash)
  })

  it("returns anonymized teacher and school hashes together", () => {
    vi.stubEnv("ANALYTICS_HASH_SALT", "unit-test-salt")

    expect(
      resolveAnalyticsHashes({
        uid: "teacher-123",
        decodedEmail: "teacher@school.example.org",
      }),
    ).toEqual({
      teacher_hash: buildTeacherHash("teacher-123"),
      school_hash: buildSchoolHash("school.example.org"),
    })
  })

  it("requires an explicit salt in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ANALYTICS_HASH_SALT", "")
    vi.stubEnv("FIREBASE_PROJECT_ID", "")
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "")

    expect(() => buildTeacherHash("teacher-123")).toThrow(
      "Missing ANALYTICS_HASH_SALT for production analytics hashing.",
    )
  })
})
