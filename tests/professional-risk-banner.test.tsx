import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProfessionalRiskBanner } from "@/src/components/ProfessionalRiskBanner"

describe("ProfessionalRiskBanner", () => {
  it("renders nothing when flags are undefined", () => {
    const { container } = render(<ProfessionalRiskBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when flags are empty", () => {
    const { container } = render(<ProfessionalRiskBanner flags={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the warning banner and signal-specific guidance", () => {
    render(
      <ProfessionalRiskBanner
        flags={[
          {
            signalId: "pro_medical_speculation",
            label: "Medical or diagnostic speculation",
            matchedPhrase: "I think he might have ADHD",
          },
          {
            signalId: "pro_motive_attribution",
            label: "Motive attribution",
            matchedPhrase: "she deliberately disrupted the class",
          },
        ]}
      />,
    )

    expect(screen.getByText("⚠ Professional Risk Detected")).toBeInTheDocument()
    expect(
      screen.getByText(
        "This message contains language that may expose you to a formal complaint.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Medical or diagnostic speculation', { selector: "strong" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/"I think he might have ADHD"/)).toBeInTheDocument()
    expect(
      screen.getByText("Teachers should not speculate about diagnoses in parent messages."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("I'd recommend speaking with our SENCO about a formal assessment."),
    ).toBeInTheDocument()
    expect(screen.getByText(/"she deliberately disrupted the class"/)).toBeInTheDocument()
    expect(
      screen.getByText("Asserting intent cannot be verified and may be challenged."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Describe the action only, not the intention behind it."),
    ).toBeInTheDocument()
  })

  it("renders the psychological interpretation guidance", () => {
    render(
      <ProfessionalRiskBanner
        flags={[
          {
            signalId: "pro_psychological_interpretation",
            label: "Psychological interpretation",
            matchedPhrase: "psychological problems",
          },
        ]}
      />,
    )

    expect(
      screen.getByText("Teachers should describe observable behaviour only."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Refer to observable behaviour and suggest pastoral support."),
    ).toBeInTheDocument()
  })

  it("renders the legal certainty guidance", () => {
    render(
      <ProfessionalRiskBanner
        flags={[
          {
            signalId: "pro_legal_certainty",
            label: "Overstatement of certainty",
            matchedPhrase: "I can confirm that he hit",
          },
        ]}
      />,
    )

    expect(
      screen.getByText("Avoid stating certainty about serious incidents before formal investigation."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Use documentation channels for formal incident records."),
    ).toBeInTheDocument()
  })
})
