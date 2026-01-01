import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
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
  it("renders a separate subject line and paragraphs", () => {
    render(<DraftOutput {...baseProps} structure={mockStructure} />)
    expect(screen.getByText("Subject: Update on homework")).toBeInTheDocument()
    const paragraphs = screen.getAllByText(/Johnny|Best regards/)
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)
  })

  it("renders once with subject separated from greeting", () => {
    const { container } = render(<DraftOutput {...baseProps} structure={mockStructure} />)
    expect(container.querySelectorAll(".bg-gray-50").length).toBe(1)
    const cardText = container.querySelector(".bg-gray-50")?.textContent ?? ""
    expect(cardText).toMatch(/Subject: Update on homework[\s\S]*Dear family,/)
  })

  it("matches the snapshot for structured output", () => {
    const { container } = render(<DraftOutput {...baseProps} structure={mockStructure} />)
    expect(container).toMatchSnapshot()
  })
})
