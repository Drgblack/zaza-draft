import { describe, expect, it } from "vitest"

import {
  buildFirestoreOnboardingData,
  normalizeOnboardingProfile,
  onboardingProfileFromFirestore,
} from "@/lib/onboarding-profile"

describe("normalizeOnboardingProfile", () => {
  it("keeps the new education-context buckets", () => {
    expect(
      normalizeOnboardingProfile({
        region: "international_school",
      }).region,
    ).toBe("international_school")
  })

  it("maps legacy DACH region values into the new shared bucket", () => {
    expect(
      normalizeOnboardingProfile({
        region: "germany",
      }).region,
    ).toBe("germany_austria_switzerland")
  })

  it("builds the canonical Firestore onboarding shape", () => {
    expect(
      buildFirestoreOnboardingData({
        role: "teacher",
        schoolType: "primary",
        mainUseCase: "both",
        writingStressPoint: "tone",
        tonePreference: "professional",
        region: "usa_canada",
      }),
    ).toEqual({
      role: "teacher",
      schoolType: "primary",
      region: "usa_canada",
      tonePreference: "professional",
      useCase: "both",
      painPoints: ["tone"],
      version: "v1",
    })
  })

  it("maps the Firestore onboarding shape back into the UI profile", () => {
    expect(
      onboardingProfileFromFirestore({
        role: "teacher",
        schoolType: "primary",
        region: "usa_canada",
        tonePreference: "professional",
        useCase: "both",
        painPoints: ["tone"],
        version: "v1",
      }),
    ).toEqual({
      role: "teacher",
      schoolType: "primary",
      mainUseCase: "both",
      writingStressPoint: "tone",
      tonePreference: "professional",
      region: "usa_canada",
    })
  })
})
