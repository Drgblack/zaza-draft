// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CommentBankSection } from "@/components/comment-bank-section"

const messages: Record<string, string> = {
  "commentBank.title": "Comment Bank",
  "commentBank.description":
    "Save strong report comments, tag them, and pull them back into the draft when you need them.",
  "commentBank.personalOnly": "Personal library only for now.",
  "commentBank.saveTitle": "Save current comment",
  "commentBank.saveHint": "Tag the current generated report comment before saving it.",
  "commentBank.reportOnlyHint": "Switch to report comment mode to save a generated comment here.",
  "commentBank.saveButton": "Save comment",
  "commentBank.saving": "Saving...",
  "commentBank.saved": "Comment saved to your personal bank.",
  "commentBank.searchTitle": "Search saved comments",
  "commentBank.searchPlaceholder": "Search by text or category",
  "commentBank.insertButton": "Insert into draft",
  "commentBank.loading": "Loading saved comments...",
  "commentBank.empty": "No saved comments yet.",
  "commentBank.noResults": "No saved comments match that search.",
  "commentBank.errors.auth": "Please sign in again to use the comment bank.",
  "commentBank.errors.load": "Unable to load the comment bank right now.",
  "commentBank.errors.save": "Unable to save the comment right now.",
  "commentBank.category.effort": "Effort",
  "commentBank.category.behaviour": "Behaviour",
  "commentBank.category.participation": "Participation",
  "commentBank.category.literacy": "Literacy",
  "commentBank.category.numeracy": "Numeracy",
  "commentBank.category.homework": "Homework",
  "commentBank.category.progress": "Progress",
  "editor.history.viewData": "View your data",
}

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    t: (key: string) => messages[key] ?? key,
  }),
}))

describe("CommentBankSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("saves the current comment and inserts a saved comment into the draft", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { comments: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            comment: {
              commentId: "comment-1",
              userId: "user-1",
              schoolId: null,
              commentText: "Shows strong effort and responds well to feedback.",
              categories: ["effort"],
              createdAt: "2026-03-16T12:00:00.000Z",
              updatedAt: "2026-03-16T12:00:00.000Z",
            },
          },
        }),
      })

    vi.stubGlobal("fetch", fetchMock)

    const onInsertComment = vi.fn()

    render(
      <CommentBankSection
        generatedComment="Shows strong effort and responds well to feedback."
        mode="report_comment"
        getIdToken={async () => "token"}
        onInsertComment={onInsertComment}
      />,
    )

    fireEvent.click(screen.getByText("Comment Bank"))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole("button", { name: "Save comment" }))

    await waitFor(() => {
      expect(screen.getByText("Comment saved to your personal bank.")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Insert into draft" }))
    expect(onInsertComment).toHaveBeenCalledWith(
      "Shows strong effort and responds well to feedback.",
    )
  })
})
