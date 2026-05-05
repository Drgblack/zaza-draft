// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DraftOutput, classifyEditDistance } from "@/components/draft-output"
import type { DraftStructure } from "@/lib/draft/format"
import type { DraftMode } from "@/lib/types"

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
    "draft.generatedTitle": "Ready to review",
    "editor.history.subjectLabel": "Subject",
    "draft.button.copy": "Copy to Clipboard",
    "draft.button.copyShort": "Copy",
    "draft.button.edit": "Edit",
    "draft.button.moreActions": "More actions",
    "draft.button.more": "More",
    "draft.action.load": "Load",
    "draft.action.delete": "Delete",
    "draft.actions.loadMore": "Load more",
    "draft.safeToSend.label": "Sending guidance",
    "draft.safeToSend.safeToSend.title": "Ready to send",
    "draft.safeToSend.safeToSend.description":
      "This message keeps your boundary clear while staying respectful.",
    "draft.safeToSend.reviewOnceMore.title": "Review once before sending",
    "draft.safeToSend.reviewOnceMore.description":
      "The message is nearly there, but one or two phrases are worth a quick final check.",
    "draft.safeToSend.sensitiveTopic.title": "Sensitive topic: refined for parent communication",
    "draft.safeToSend.sensitiveTopic.description":
      "This message handles a sensitive topic with calmer, more respectful wording.",
    "draft.teacherControl.reassurance":
      "You stay in control. Review before sending.",
    "draft.teacherDraftFeedback.heading": "What changed (and why):",
    "draft.teacherDraftFeedback.alreadyStrong":
      "Your draft reads well. We made minor copy edits only.",
    "draft.teacherDraftFeedback.already_strong.preservedTone":
      "We kept your calm, professional tone because it was already working.",
    "draft.teacherDraftFeedback.light_touch.preservedTone":
      "We kept your tone intact and only tightened a few phrases.",
    "draft.teacherDraftFeedback.maintainedBoundaries":
      "We kept your boundary and next step intact so the message still sounds like you.",
    "draft.teacherDraftFeedback.already_strong.riskChecked":
      "We checked for escalation or professional-risk wording and avoided unnecessary edits.",
    "draft.teacherDraftFeedback.light_touch.riskChecked":
      "We reduced small wording risks without adding new ideas or extra sentences.",
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
    "draft.generatedTitle": "Bereit zum Prüfen",
    "editor.history.subjectLabel": "Betreff",
    "draft.button.copy": "In die Zwischenablage kopieren",
    "draft.button.copyShort": "Kopieren",
    "draft.button.edit": "Bearbeiten",
    "draft.button.moreActions": "Weitere Aktionen",
    "draft.button.more": "Mehr",
    "draft.action.load": "Laden",
    "draft.action.delete": "Löschen",
    "draft.actions.loadMore": "Mehr laden",
    "draft.safeToSend.label": "Sendehinweis",
    "draft.safeToSend.safeToSend.title": "Bereit zum Senden",
    "draft.safeToSend.safeToSend.description":
      "Diese Nachricht wahrt Ihre Grenze und bleibt dabei respektvoll.",
    "draft.safeToSend.reviewOnceMore.title": "Vor dem Senden einmal prüfen",
    "draft.safeToSend.reviewOnceMore.description":
      "Die Nachricht ist fast fertig, aber ein oder zwei Formulierungen verdienen noch einen kurzen Blick.",
    "draft.safeToSend.sensitiveTopic.title": "Sensibles Thema: elterngerecht formuliert",
    "draft.safeToSend.sensitiveTopic.description":
      "Diese Nachricht behandelt ein sensibles Thema mit ruhigerer, respektvoller Wortwahl.",
    "draft.teacherControl.reassurance":
      "Sie behalten die Kontrolle. Vor dem Senden bitte kurz prüfen.",
    "draft.teacherDraftFeedback.heading": "Was geändert wurde (und warum):",
    "draft.teacherDraftFeedback.alreadyStrong":
      "Ihr Entwurf liest sich bereits gut. Wir haben nur kleine sprachliche Anpassungen vorgenommen.",
    "draft.teacherDraftFeedback.already_strong.preservedTone":
      "Wir haben Ihren ruhigen, professionellen Ton beibehalten, weil er bereits gut funktioniert hat.",
    "draft.teacherDraftFeedback.light_touch.preservedTone":
      "Wir haben Ihren Ton beibehalten und nur einige Formulierungen leicht gestrafft.",
    "draft.teacherDraftFeedback.maintainedBoundaries":
      "Ihre Grenze und Ihr nächster Schritt bleiben erhalten, damit die Nachricht weiter nach Ihnen klingt.",
    "draft.teacherDraftFeedback.already_strong.riskChecked":
      "Wir haben auf Eskalations- oder Berufsrisiken geprüft und unnötige Änderungen vermieden.",
    "draft.teacherDraftFeedback.light_touch.riskChecked":
      "Wir haben kleine sprachliche Risiken reduziert, ohne neue Inhalte oder zusätzliche Sätze hinzuzufügen.",
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
    modeUsed: "parent_message" as DraftMode,
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
  vi.unstubAllGlobals()
})

describe("DraftOutput formatting", () => {
  it("classifies small wording changes as minor", () => {
    expect(
      classifyEditDistance(
        "I will support Lucy in class.",
        "I will continue to support Lucy sensitively in class.",
      ),
    ).toBe("minor")
  })

  it("classifies substantial changes as major", () => {
    expect(
      classifyEditDistance(
        "I will support Lucy in class during lessons today.",
        "Lucy needs a different plan because the whole lesson structure broke down and expectations changed again.",
      ),
    ).toBe("major")
  })

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

  it("does not inject metadata signature blocks into the preview when draft text is already present", () => {
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
    expect(within(body).queryByText(/Kind regards,/)).not.toBeInTheDocument()
    expect(within(body).queryByText(/Dr Greg Blackburn/)).not.toBeInTheDocument()
  })

  it("renders the typed inline teacher sign-off exactly in the preview", () => {
    const staleStructure: DraftStructure = {
      subject: "Homework update",
      paragraphs: [
        "Dear Parent/Carer,",
        "Tom forgot his homework today.",
      ],
    }
    const rawDraft = `Subject: Homework update

Dear Parent/Carer,

Tom forgot his homework today.

Thanks,
Greg`

    render(<DraftOutput {...baseProps} draftText={rawDraft} structure={staleStructure} />)

    const body = screen.getByTestId("draft-output-body")
    const signature = within(body).getByText((text) => text.includes("Thanks,") && text.includes("Greg"))
    expect(signature).toBeInTheDocument()
    expect(within(body).queryByText(/Dr Greg Blackburn/)).not.toBeInTheDocument()
  })

  it("does not rebuild a signature from metadata when the draft text is empty", () => {
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
        draftText=""
        structure={staleStructure}
        metadata={{
          ...baseProps.metadata,
          signatureBlock: "Dr Greg Blackburn",
        }}
      />,
    )

    const body = screen.getByTestId("draft-output-body")
    expect(within(body).queryByText(/Kind regards,/)).not.toBeInTheDocument()
    expect(within(body).queryByText(/Dr Greg Blackburn/)).not.toBeInTheDocument()
  })

  it("copies the assembled parent-message draft without injecting a metadata signature when the draft text is empty", async () => {
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
        draftText=""
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

I wanted to give you a clear update about today's maths lesson.`)
  })

  it("exports PDF using the literal draft text and preserves a typed signature", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("pdf-data", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="draft.pdf"',
        },
      }),
    )

    vi.stubGlobal("fetch", fetchMock)
    Object.defineProperty(window.URL, "createObjectURL", {
      value: vi.fn(() => "blob:test"),
      configurable: true,
    })
    Object.defineProperty(window.URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
    })
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      value: vi.fn(),
      configurable: true,
    })

    const rawDraft = `Subject: Homework update

Dear Parent/Carer,

Thank you for your message.

Kind regards,
Shereen P.`

    render(
      <DraftOutput
        {...baseProps}
        draftText={rawDraft}
        metadata={{
          ...baseProps.metadata,
          signatureBlock: "Persian Shirazi",
        }}
        draftAttribution="Drafted with the help of Zaza Draft."
        getIdToken={vi.fn().mockResolvedValue("token-123")}
      />,
    )

    fireEvent.click(screen.getAllByRole("button", { name: "More actions" })[0])

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Export as PDF" })[0])
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(payload.draftText).toBe(rawDraft)
    expect(payload.draftText).toContain("Kind regards,\nShereen P.")
    expect(payload.draftText).not.toContain("Persian Shirazi")
    expect(payload.draftText).not.toContain("Drafted with the help of Zaza Draft.")
  })

  it("renders a prominent advisory banner and grouped suggestion cards for teacher drafts", () => {
    render(
      <DraftOutput
        {...baseProps}
        metadata={{
          ...baseProps.metadata,
          modeUsed: "parent_message" as DraftMode,
        }}
        draftText={`Dear Mrs Chen,

I was appalled by Sally's behaviour in class.

Kind regards,
Shereen P.`}
        suggestions={[
          {
            id: "tone-1",
            original: "I was appalled by Sally's behaviour in class.",
            suggestion: "I was concerned by Sally's behaviour in class.",
            type: "tone",
          },
        ]}
        teacherDraftMode={true}
      />,
    )

    expect(screen.getByText("⚠ 1 suggestion to reduce escalation risk")).toBeInTheDocument()
    expect(screen.getByText("Suggestions before you send (1)")).toBeInTheDocument()
    expect(screen.getByText("1 flagged")).toBeInTheDocument()
    expect(screen.getByText("Original sentence")).toBeInTheDocument()
    expect(screen.getByText("Suggested rewrite")).toBeInTheDocument()
    expect(screen.getAllByText("I was appalled by Sally's behaviour in class.").length).toBeGreaterThan(0)
    expect(screen.getByText("I was concerned by Sally's behaviour in class.")).toBeInTheDocument()
  })

  it("exports the exact typed Thanks, Greg sign-off to PDF", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("pdf-data", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="draft.pdf"',
        },
      }),
    )

    vi.stubGlobal("fetch", fetchMock)
    Object.defineProperty(window.URL, "createObjectURL", {
      value: vi.fn(() => "blob:test"),
      configurable: true,
    })
    Object.defineProperty(window.URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
    })
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      value: vi.fn(),
      configurable: true,
    })

    const rawDraft = `Subject: Homework update

Dear Mrs Smith,

Tom forgot his homework.

Thanks,
Greg`

    render(
      <DraftOutput
        {...baseProps}
        draftText={rawDraft}
        metadata={{
          ...baseProps.metadata,
          signatureBlock: "Dr Greg Blackburn",
        }}
        getIdToken={vi.fn().mockResolvedValue("token-123")}
      />,
    )

    fireEvent.click(screen.getAllByRole("button", { name: "More actions" })[0])

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Export as PDF" })[0])
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(payload.draftText).toBe(rawDraft)
    expect(payload.draftText).toContain("Thanks,\nGreg")
    expect(payload.draftText).not.toContain("Dr Greg Blackburn")
  })

  it("does not append metadata signature fields to the PDF export payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("pdf-data", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="draft.pdf"',
        },
      }),
    )

    vi.stubGlobal("fetch", fetchMock)
    Object.defineProperty(window.URL, "createObjectURL", {
      value: vi.fn(() => "blob:test"),
      configurable: true,
    })
    Object.defineProperty(window.URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
    })
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      value: vi.fn(),
      configurable: true,
    })

    const rawDraft = `Subject: Homework update

Dear Parent/Carer,

Thank you for your message.`

    render(
      <DraftOutput
        {...baseProps}
        draftText={rawDraft}
        metadata={{
          ...baseProps.metadata,
          signatureBlock: "Persian Shirazi",
        }}
        getIdToken={vi.fn().mockResolvedValue("token-123")}
      />,
    )

    fireEvent.click(screen.getAllByRole("button", { name: "More actions" })[0])

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Export as PDF" })[0])
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(payload.draftText).toBe(rawDraft)
    expect(payload.draftText).not.toContain("Persian Shirazi")
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
    const label = screen.getByText("Sending guidance")
    const description = screen.getByText(
      "This message keeps your boundary clear while staying respectful.",
    )

    expect(label).toBeInTheDocument()
    expect(screen.getByText("Ready to send")).toBeInTheDocument()
    expect(description).toBeInTheDocument()
    expect(body.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("renders the teacher-control reassurance above parent message drafts only", () => {
    const { rerender } = render(<DraftOutput {...baseProps} />)

    const reassurance = screen.getByText(
      "You stay in control. Review before sending.",
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
        "You stay in control. Review before sending.",
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

  it("renders the already-strong explanation layer for high-quality teacher drafts", () => {
    render(
      <DraftOutput
        {...baseProps}
        teacherDraftFeedback={{
          verdict: "already_strong",
          level: "already_strong",
          reasons: ["preserved_tone", "maintained_boundaries", "risk_checked"],
        }}
      />,
    )

    expect(
      screen.getByText("Your draft reads well. We made minor copy edits only."),
    ).toBeInTheDocument()
    expect(screen.queryByText("What changed (and why):")).toBeNull()
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

    expect(screen.getByText("Sending guidance")).toBeInTheDocument()
    expect(screen.getByText("Sensitive topic: refined for parent communication")).toBeInTheDocument()
    expect(
      screen.getByText(
        "This message handles a sensitive topic with calmer, more respectful wording.",
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
