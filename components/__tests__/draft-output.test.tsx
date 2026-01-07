// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen, within } from "@testing-library/react"
import { vi } from "vitest"
import { DraftOutput } from "@/components/draft-output"
import type { DraftStructure } from "@/lib/draft/format"

vi.mock("@/hooks/use-locale", () => {
  const translations: Record<string, string> = {
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
  }

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
    return translations[key] ?? key
  }

  return {
    useLocale: () => ({
      locale: "en-GB",
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

  it("does not render a subject when the report comment mode is active", () => {
    render(
      <DraftOutput
        {...baseProps}
        metadata={{ ...baseProps.metadata, modeUsed: "report_comment" }}
        structure={mockStructure}
      />,
    )
    expect(screen.queryByText("Subject: Update on homework")).not.toBeInTheDocument()
    expect(screen.getByText("Johnny has been trying hard this week.")).toBeInTheDocument()
  })

  it("matches the snapshot for structured output", () => {
    const { container } = render(<DraftOutput {...baseProps} structure={mockStructure} />)
    expect(container).toMatchSnapshot()
  })
})
