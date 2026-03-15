import { describe, expect, it } from "vitest"

import { detectProfessionalRiskFlags } from "@/src/lib/safetyEngine/professionalRiskDetector"

describe("detectProfessionalRiskFlags", () => {
  it("fires pro_medical_speculation and captures the matched phrase", () => {
    expect(detectProfessionalRiskFlags("I think he might have ADHD.")).toEqual([
      {
        signalId: "pro_medical_speculation",
        label: "Medical or diagnostic speculation",
        matchedPhrase: "I think he might have",
      },
    ])
  })

  it("fires pro_motive_attribution", () => {
    expect(detectProfessionalRiskFlags("She deliberately disrupted the class.")).toEqual([
      {
        signalId: "pro_motive_attribution",
        label: "Motive attribution",
        matchedPhrase: "She deliberately",
      },
    ])
  })

  it("fires pro_psychological_interpretation", () => {
    expect(
      detectProfessionalRiskFlags("He seems depressed and has psychological problems."),
    ).toEqual([
      {
        signalId: "pro_psychological_interpretation",
        label: "Psychological interpretation",
        matchedPhrase: "seems depressed",
      },
    ])
  })

  it("returns an empty array when no professional risk language is present", () => {
    expect(detectProfessionalRiskFlags("I wanted to reach out about Jamie's progress.")).toEqual(
      [],
    )
  })

  it("fires all expected flags for the professional_risk_01 fixture", () => {
    const flags = detectProfessionalRiskFlags(
      "I think Jamie might have ADHD. He deliberately disrupts the class and seems to have emotional problems.",
    )

    expect(flags).toEqual([
      {
        signalId: "pro_medical_speculation",
        label: "Medical or diagnostic speculation",
        matchedPhrase: "ADHD",
      },
      {
        signalId: "pro_motive_attribution",
        label: "Motive attribution",
        matchedPhrase: "He deliberately",
      },
      {
        signalId: "pro_psychological_interpretation",
        label: "Psychological interpretation",
        matchedPhrase: "emotional problems",
      },
    ])
  })
})
