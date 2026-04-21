// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { vi } from "vitest"
import { DraftOutput } from "@/components/draft-output"
import type { DraftStructure } from "@/lib/draft/format"

let mockSearchParams = new URLSearchParams()
const setMockSearchParams = (search = "") => {
  mockSearchParams = new URLSearchParams(search)
}

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation")
  return {
    ...actual,
    useSearchParams: () => mockSearchParams,
  }
})

type LocaleKey = "en-GB" | "de-DE"

const localeMessages: Record<LocaleKey, Record<string, string>> = {
  "en-GB": {
    "draft.generatedTitle": "Draft Generated",
    "editor.history.subjectLabel": "Subject",
    "draft.button.copy": "Copy to Clipboard",
    "draft.button.copyShort": "Copy",
    "draft.button.edit": "Edit",
    "draft.button.moreActions": "More actions",
    "draft.button.more": "More",
    "draft.action.load": "Load",
    "draft.action.delete": "Delete",
    "draft.actions.loadMore": "Load more",
    "draft.safeToSend.label": "Sending guidance:",
    "draft.safeToSend.safeToSend.title": "Ready to send",
    "draft.safeToSend.safeToSend.description":
      "The wording is calm, clear, and ready for you to send when you're happy with it.",
    "draft.safeToSend.reviewOnceMore.title": "Review once before sending",
    "draft.safeToSend.reviewOnceMore.description":
      "The draft is close, but one or two phrases may still need a quick teacher check.",
    "draft.safeToSend.sensitiveTopic.title": "Sensitive topic: refined for parent communication",
    "draft.safeToSend.sensitiveTopic.description":
      "This topic is sensitive. Draft has adjusted the wording to ensure it remains clear, respectful, and appropriate for communication with parents.",
    "draft.teacherControl.reassurance":
      "You review every message before anything is sent. Draft never sends messages for you.",
    "draft.documentation.label": "Mode:",
    "draft.documentation.badge": "Documentation Mode",
    "draft.documentation.description": "Rewritten as a neutral incident record.",
    "draft.forwardSafe.label": "Rewrite mode:",
    "draft.forwardSafe.badge": "🛡 Forward-Safe Rewrite",
    "draft.forwardSafe.description":
      "This message has been optimized to remain professional even if forwarded.",
    "tone.warm": "Warm & Encouraging",
    "tone.professional": "Professional & Neutral",
    "tone.direct": "Direct & Clear",
    "tone.empathetic": "Empathetic & Supportive",
    "editor.mode.parentMessage": "Parent message",
    "editor.mode.reportComment": "Report comment",
  },
  "de-DE": {
    "draft.generatedTitle": "Entwurf erstellt",
    "editor.history.subjectLabel": "Betreff",
    "draft.button.copy": "In die Zwischenablage kopieren",
    "draft.button.copyShort": "Kopieren",
    "draft.button.edit": "Bearbeiten",
    "draft.button.moreActions": "Weitere Aktionen",
    "draft.button.more": "Mehr",
    "draft.action.load": "Laden",
    "draft.action.delete": "Löschen",
    "draft.actions.loadMore": "Mehr laden",
    "draft.safeToSend.label": "Sendehinweis:",
    "draft.safeToSend.safeToSend.title": "Bereit zum Senden",
    "draft.safeToSend.safeToSend.description":
      "Die Formulierung ist ruhig und klar und kann gesendet werden, sobald Sie zufrieden sind.",
    "draft.safeToSend.reviewOnceMore.title": "Vor dem Senden einmal prüfen",
    "draft.safeToSend.reviewOnceMore.description":
      "Der Entwurf ist fast fertig, aber ein oder zwei Formulierungen sollten Sie noch kurz prüfen.",
    "draft.safeToSend.sensitiveTopic.title": "Sensibles Thema: elterngerecht formuliert",
    "draft.safeToSend.sensitiveTopic.description":
      "Dieses Thema ist sensibel. Draft hat die Formulierung so angepasst, dass sie klar, respektvoll und für die Kommunikation mit Eltern geeignet ist.",
    "draft.teacherControl.reassurance":
      "Sie prüfen jede Nachricht selbst, bevor etwas gesendet wird. Draft versendet nichts für Sie.",
    "draft.documentation.label": "Modus:",
    "draft.documentation.badge": "Dokumentationsmodus",
    "draft.documentation.description": "Als neutraler Vorfallsbericht umgeschrieben.",
    "draft.forwardSafe.label": "Überarbeitungsmodus:",
    "draft.forwardSafe.badge": "🛡 Forward-Safe-Überarbeitung",
    "draft.forwardSafe.description":
      "Diese Nachricht wurde so optimiert, dass sie auch beim Weiterleiten professionell bleibt.",
    "tone.warm": "Warm & ermutigend",
    "tone.professional": "Professionell & neutral",
    "tone.direct": "Direkt & klar",
    "tone.empathetic": "Einfühlsam & unterstützend",
    "editor.mode.parentMessage": "Elternnachricht",
    "editor.mode.reportComment": "Berichtskommentar",
  },
}

let currentLocale: LocaleKey = "en-GB"

const setMockLocale = (locale: LocaleKey) => {
  currentLocale = locale
}

const getTranslation = (key: string) =>
  localeMessages[currentLocale][key] ??
  localeMessages["en-GB"][key] ??
  key

const t = (key: string, vars?: Record<string, string | number>) => {
  if (key === "draft.modeLabel") {
    return `Mode: ${vars?.mode ?? ""}`
  }
  if (key === "draft.generatedDetails") {
    return `Generated in ${vars?.seconds ?? "0"}s`
  }
  if (key === "statusBar.words") {
    return `${vars?.count ?? 0} words`
  }
  return getTranslation(key)
}

vi.mock("@/hooks/use-locale", () => {
  return {
    useLocale: () => ({
      locale: currentLocale,
      t,
    }),
  }
})

const mockStructure: DraftStructure = {
  subject: "Update on homework",
  paragraphs: [
    "Dear family,",
    "Johnny has been trying hard this week.",
    "He still struggles with focus, but he is making small steps.",
    "Best regards,\nYour teacher",
  ],
}

const baseProps = {
  draftText: "Subject: Update on homework\n\nDear family,\nJohnny has been trying hard this week.\nHe still struggles with focus, but he is making small steps.\nBest regards,\nYour teacher",
  tone: "professional",
  metadata: {
    generationTime: 1050,
    wordCount: 46,
    modeUsed: "parent_message",
  },
  onSave: vi.fn(),
  onEdit: vi.fn(),
  onRegenerate: vi.fn(),
  onRewrite: vi.fn(),
  draftsUsed: 1,
  draftsLimit: 5,
  showUsageLimit: false,
}

afterEach(() => {
  setMockLocale("en-GB")
  setMockSearchParams()
})

describe("DraftOutput formatting", () => {
  it("renders the subject, structured paragraphs, and signature once", () => {
    render(<DraftOutput {...baseProps} structure={mockStructure} />)
    const body = screen.getByTestId("draft-output-body")
    const subjectRows = within(body).getAllByText("Subject: Update on homework")
    expect(subjectRows).toHaveLength(1)
    expect(within(body).getByText("Dear family,")).toBeInTheDocument()
    expect(within(body).getByText("Johnny has been trying hard this week.")).toBeInTheDocument()
    expect(
      within(body).getByText("He still struggles with focus, but he is making small steps."),
    ).toBeInTheDocument()
    const signature = within(body).getByText(/Best regards,/)
    expect(signature).toBeInTheDocument()
    expect(signature.className).toContain("border-t")
  })

  it("combines split closing and sender lines into one rendered signature block", () => {
    const splitSignatureStructure: DraftStructure = {
      subject: "Homework update",
      paragraphs: [
        "Dear family,",
        "Johnny has been trying hard this week.",
        "Kind regards,",
        "Dr Greg Blackburn",
      ],
    }

    render(<DraftOutput {...baseProps} structure={splitSignatureStructure} />)
    const body = screen.getByTestId("draft-output-body")
    const signature = within(body).getByText((text) => text.includes("Kind regards,") && text.includes("Dr Greg Blackburn"))
    expect(signature).toBeInTheDocument()
    expect(signature.className).toContain("border-t")
    expect(within(body).queryByText(/^Dr Greg Blackburn$/)).not.toBeInTheDocument()
  })

  it("renders canonical closing blocks from raw draft text for parent messages", () => {
    const rawDraft = `Subject: Homework update

Dear family,

Johnny has been trying hard this week.

Kind regards,
Dr Greg Blackburn`

    render(<DraftOutput {...baseProps} draftText={rawDraft} structure={undefined} />)
    const body = screen.getByTestId("draft-output-body")
    const signature = within(body).getByText((text) => text.includes("Kind regards,") && text.includes("Dr Greg Blackburn"))
    expect(signature).toBeInTheDocument()
    expect(signature.className).toContain("border-t")
  })

  it("falls back to the raw draft text signature when a stale structure omits the signoff", () => {
    const staleStructure: DraftStructure = {
      subject: "Homework update",
      paragraphs: [
        "Hello,",
        "I wanted to give you a clear update about today's maths lesson.",
      ],
    }
    const rawDraft = `Subject: Homework update

Hello,

I wanted to give you a clear update about today's maths lesson.

Kind regards,
Dr Greg Blackburn`

    render(<DraftOutput {...baseProps} draftText={rawDraft} structure={staleStructure} />)
    const body = screen.getByTestId("draft-output-body")
    const signature = within(body).getByText((text) => text.includes("Kind regards,") && text.includes("Dr Greg Blackburn"))
    expect(signature).toBeInTheDocument()
  })

  it("rebuilds the signature from metadata when neither the structure nor raw text exposes it cleanly", () => {
    const staleStructure: DraftStructure = {
      subject: "Homework update",
      paragraphs: [
        "Dear Parent/Carer,",
        "I wanted to give you a clear update about today's maths lesson.",
      ],
    }

    render(
      <DraftOutput
        {...baseProps}
        draftText={`Subject: Homework update

Dear Parent/Carer,

I wanted to give you a clear update about today's maths lesson.`}
        structure={staleStructure}
        metadata={{
          ...baseProps.metadata,
          signatureBlock: "Dr Greg Blackburn",
        }}
      />,
    )

    const body = screen.getByTestId("draft-output-body")
    const signature = within(body).getByText((text) => text.includes("Kind regards,") && text.includes("Dr Greg Blackburn"))
    expect(signature).toBeInTheDocument()
  })

  it("copies the fully assembled parent-message draft including the final teacher sign-off", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })

    const staleStructure: DraftStructure = {
      subject: "Homework update",
      paragraphs: [
        "Dear Parent/Carer,",
        "I wanted to give you a clear update about today's maths lesson.",
      ],
    }

    render(
      <DraftOutput
        {...baseProps}
        draftText={`Subject: Homework update

Dear Parent/Carer,

I wanted to give you a clear update about today's maths lesson.`}
        structure={staleStructure}
        metadata={{
          ...baseProps.metadata,
          signatureBlock: "Dr Greg Blackburn",
        }}
      />,
    )

    const copyButton = screen.getAllByRole("button", { name: "Copy to Clipboard" })[0]
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(writeText).toHaveBeenCalledWith(`Subject: Homework update

Dear Parent/Carer,

I wanted to give you a clear update about today's maths lesson.
Kind regards,
Dr Greg Blackburn`)
  })

  it("renders the repaired unknown-recipient greeting as its own line in the final output", () => {
    const rawDraft = `Subject: Homework update

Dear Parent/Carer,

I wanted to give you a clear update about today's maths lesson. I will check the lesson notes and speak with Theo again tomorrow morning before I follow up with you.

    Kind regards,
Dr Greg Blackburn`

    render(<DraftOutput {...baseProps} draftText={rawDraft} structure={undefined} />)
    const body = screen.getByTestId("draft-output-body")
    expect(within(body).getByText("Dear Parent/Carer,")).toBeInTheDocument()
    expect(
      within(body).getByText((text) =>
        text.includes("I wanted to give you a clear update about today's maths lesson."),
      ),
    ).toBeInTheDocument()
    expect(
      within(body).getByText((text) =>
        text.includes(
          "I will check the lesson notes and speak with Theo again tomorrow morning before I follow up with you.",
        ),
      ),
    ).toBeInTheDocument()
    expect(
      within(body).getByText((text) => text.includes("Kind regards,") && text.includes("Dr Greg Blackburn")),
    ).toBeInTheDocument()
  })

  it("does not render a subject when the report comment mode is active", () => {
    render(
      <DraftOutput
        {...baseProps}
        metadata={{ ...baseProps.metadata, modeUsed: "report_comment" }}
        structure={mockStructure}
      />,
    )
    expect(screen.queryByText("Subject: Update on homework")).not.toBeInTheDocument()
    expect(screen.getByText(/Johnny has been trying hard this week\./)).toBeInTheDocument()
  })

  it("strips greeting and signature residue when rendering report comments", () => {
    const contaminatedStructure: DraftStructure = {
      subject: "Update on homework",
      paragraphs: [
        "Dear family,",
        "Johnny has been trying hard this week.",
        "Kind regards,",
        "Dr Greg Blackburn",
      ],
    }

    render(
      <DraftOutput
        {...baseProps}
        metadata={{ ...baseProps.metadata, modeUsed: "report_comment" }}
        structure={contaminatedStructure}
      />,
    )

    const body = screen.getByTestId("draft-output-body")
    expect(within(body).queryByText("Dear family,")).not.toBeInTheDocument()
    expect(within(body).queryByText(/Kind regards,/)).not.toBeInTheDocument()
    expect(within(body).queryByText("Dr Greg Blackburn")).not.toBeInTheDocument()
    expect(within(body).getByText("Johnny has been trying hard this week.")).toBeInTheDocument()
  })

  it("matches the snapshot for structured output", () => {
    const { container } = render(<DraftOutput {...baseProps} structure={mockStructure} />)
    expect(container).toMatchSnapshot()
  })

  it("renders German subject label and distinct paragraphs", () => {
    setMockLocale("de-DE")
    const germanStructure: DraftStructure = {
      subject: "Wochenbericht Mathematik",
      paragraphs: [
        "Liebe Eltern,",
        "Wir beobachten Fortschritte beim Lesen.",
        "Mit freundlichen Grüßen,\nFrau Müller",
      ],
    }

    render(<DraftOutput {...baseProps} structure={germanStructure} />)
    const body = screen.getByTestId("draft-output-body")
    expect(within(body).getByText("Betreff: Wochenbericht Mathematik")).toBeInTheDocument()
    expect(within(body).getByText("Liebe Eltern,")).toBeInTheDocument()
    expect(within(body).getByText("Wir beobachten Fortschritte beim Lesen.")).toBeInTheDocument()
    expect(
      within(body).getByText((text) => text.includes("Mit freundlichen Grüßen")),
    ).toBeInTheDocument()
  })

  it("parses German draft text with Betreff: and renders split paragraphs", () => {
    setMockLocale("de-DE")
    const germanDraftText = `Betreff: Wochenbericht Mathematik

Liebe Eltern,

Wir beobachten Fortschritte beim Lesen.

Mit freundlichen Gruessen,
Frau Mueller`

    render(<DraftOutput {...baseProps} draftText={germanDraftText} />)
    const body = screen.getByTestId("draft-output-body")
    const paragraphNodes = Array.from(body.querySelectorAll("p"))
    expect(paragraphNodes[0].textContent?.trim()).toBe("Betreff: Wochenbericht Mathematik")
    expect(paragraphNodes[1].textContent?.trim()).toBe("Liebe Eltern,")
    expect(paragraphNodes[2].textContent?.trim()).toBe("Wir beobachten Fortschritte beim Lesen.")
    expect(paragraphNodes.length).toBeGreaterThanOrEqual(4)
  })

  it("renders multiple paragraphs when German output is a single blob", () => {
    setMockLocale("de-DE")
    const germanBlob = `Betreff: Wochenbericht Mathematik Liebe Eltern, die Klasse hat diese Woche am Projekt gearbeitet. Wir sehen ruhigeres Verhalten und mehr Kooperation bei der Gruppenarbeit. Ich freue mich auf weitere Fortschritte und hoffe auf Ihr Feedback. Herzliche Grüße, Frau Müller`

    render(<DraftOutput {...baseProps} draftText={germanBlob} />)
    const body = screen.getByTestId("draft-output-body")
    const paragraphNodes = Array.from(body.querySelectorAll("p"))
    expect(paragraphNodes[0].textContent?.trim()).toBe("Betreff: Wochenbericht Mathematik")
    expect(paragraphNodes.length).toBeGreaterThanOrEqual(4)
    expect(paragraphNodes.some((paragraph) => paragraph.textContent?.includes("Liebe Eltern"))).toBe(true)
  })

  it("shows diagnostics only when the debug param is present", () => {
    setMockSearchParams("debug=1")
    render(<DraftOutput {...baseProps} />)
    expect(screen.getByText("Formatter diagnostics")).toBeInTheDocument()
    expect(screen.getByText(/Paragraph count:/)).toBeInTheDocument()
    expect(screen.getByText("Subject detected: yes")).toBeInTheDocument()
  })

  it("hides diagnostics when debug mode is off", () => {
    setMockSearchParams()
    render(<DraftOutput {...baseProps} />)
    expect(screen.queryByText("Formatter diagnostics")).not.toBeInTheDocument()
  })

  it("renders the safe to send indicator below the generated message", () => {
    render(
      <DraftOutput
        {...baseProps}
        safeToSend={{
          status: "READY_TO_SEND",
          titleKey: "draft.safeToSend.safeToSend.title",
          descriptionKey: "draft.safeToSend.safeToSend.description",
        }}
      />,
    )

    const body = screen.getByTestId("draft-output-body")
    const label = screen.getByText("Sending guidance:")
    const description = screen.getByText(
      "The wording is calm, clear, and ready for you to send when you're happy with it.",
    )

    expect(label).toBeInTheDocument()
    expect(screen.getByText("Ready to send")).toBeInTheDocument()
    expect(description).toBeInTheDocument()
    expect(body.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("renders the teacher-control reassurance above parent message drafts only", () => {
    const { rerender } = render(<DraftOutput {...baseProps} />)

    const reassurance = screen.getByText(
      "You review every message before anything is sent. Draft never sends messages for you.",
    )
    const body = screen.getByTestId("draft-output-body")

    expect(reassurance).toBeInTheDocument()
    expect(reassurance.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    rerender(
      <DraftOutput
        {...baseProps}
        metadata={{ ...baseProps.metadata, modeUsed: "report_comment" }}
      />,
    )

    expect(
      screen.queryByText(
        "You review every message before anything is sent. Draft never sends messages for you.",
      ),
    ).toBeNull()
  })

  it("renders a compact rewrite summary above the draft body only when adjustments occurred", () => {
    const { rerender } = render(
      <DraftOutput
        {...baseProps}
        rewriteSummary="Draft replaced judgmental wording with observation-based phrasing and added a collaborative next step."
      />,
    )

    const summary = screen.getByText(
      "Draft replaced judgmental wording with observation-based phrasing and added a collaborative next step.",
    )
    const body = screen.getByTestId("draft-output-body")

    expect(summary).toBeInTheDocument()
    expect(summary.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    rerender(<DraftOutput {...baseProps} rewriteSummary={null} />)

    expect(
      screen.queryByText(
        "Draft replaced judgmental wording with observation-based phrasing and added a collaborative next step.",
      ),
    ).toBeNull()
  })

  it("renders clearer sensitive-topic guidance copy", () => {
    render(
      <DraftOutput
        {...baseProps}
        safeToSend={{
          status: "SENSITIVE_TOPIC",
          titleKey: "draft.safeToSend.sensitiveTopic.title",
          descriptionKey: "draft.safeToSend.sensitiveTopic.description",
        }}
      />,
    )

    expect(screen.getByText("Sending guidance:")).toBeInTheDocument()
    expect(screen.getByText("Sensitive topic: refined for parent communication")).toBeInTheDocument()
    expect(
      screen.getByText(
        "This topic is sensitive. Draft has adjusted the wording to ensure it remains clear, respectful, and appropriate for communication with parents.",
      ),
    ).toBeInTheDocument()
  })

  it("renders the documentation mode notice above the generated message", () => {
    render(
      <DraftOutput
        {...baseProps}
        documentationMode
        draftText={`Incident Record\n\nDate: 2026-03-16\nLocation: Not specified\nObserved behaviour: The student left the room.\nTeacher response: The teacher recorded the incident.\nFollow-up action: No follow-up action recorded.`}
      />,
    )

    const body = screen.getByTestId("draft-output-body")
    const label = screen.getByText("Mode:")
    const badge = screen.getByText("Documentation Mode")
    const description = screen.getByText("Rewritten as a neutral incident record.")

    expect(label).toBeInTheDocument()
    expect(badge).toBeInTheDocument()
    expect(description).toBeInTheDocument()
    expect(description.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("renders a light draft attribution line below the message body when provided", () => {
    render(
      <DraftOutput
        {...baseProps}
        draftAttribution="Drafted with the help of Zaza Draft."
      />,
    )

    const body = screen.getByTestId("draft-output-body")
    const attribution = screen.getByText("Drafted with the help of Zaza Draft.")

    expect(attribution).toBeInTheDocument()
    expect(attribution.className).toContain("text-xs")
    expect(attribution.className).toContain("text-gray-400")
    expect(body).toContainElement(attribution)
  })

  it("renders the forward-safe rewrite notice below the generated message", () => {
    render(
      <DraftOutput
        {...baseProps}
        metadata={{
          ...baseProps.metadata,
          forwardSafeRewrite: true,
        }}
      />,
    )

    const body = screen.getByTestId("draft-output-body")
    const label = screen.getByText("Rewrite mode:")
    const badge = screen.getByText("🛡 Forward-Safe Rewrite")
    const description = screen.getByText(
      "This message has been optimized to remain professional even if forwarded.",
    )

    expect(label).toBeInTheDocument()
    expect(badge).toBeInTheDocument()
    expect(description).toBeInTheDocument()
    expect(body.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("honors the NEXT_PUBLIC_DEBUG_UI flag when set", () => {
    const originalFlag = process.env.NEXT_PUBLIC_DEBUG_UI
    process.env.NEXT_PUBLIC_DEBUG_UI = "1"
    try {
      setMockSearchParams()
      render(<DraftOutput {...baseProps} />)
      expect(screen.getByText("Formatter diagnostics")).toBeInTheDocument()
    } finally {
      process.env.NEXT_PUBLIC_DEBUG_UI = originalFlag
    }
  })
})
