// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen, within } from "@testing-library/react"
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
  draftsLimit: 10,
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
