// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { InstantDraftTest } from "@/components/marketing/instant-draft-test"

const messages: Record<string, string> = {
  "auth.instant.badge": "Instant Draft Test",
  "auth.instant.title": "Try Draft instantly",
  "auth.instant.description":
    "Paste a parent email or report comment and see how Draft rewrites it safely.",
  "auth.instant.placeholder":
    "Paste a parent email or report comment here. We'll return a calmer, safer rewrite.",
  "auth.instant.button": "Rewrite safely",
  "auth.instant.limitHint": "One anonymous rewrite",
  "auth.instant.privacyHint":
    "Anonymous trial messages are processed for the rewrite only and are not stored in analytics.",
  "auth.instant.resultTitle": "Safer rewrite",
  "auth.instant.ctaTitle": "Create a free account to continue writing safely.",
  "auth.instant.ctaDescription":
    "Unlock unlimited rewrites, saved drafts, and full teacher workflow tools.",
  "auth.instant.createAccount": "Create free account",
  "auth.instant.error": "Unable to generate an instant rewrite right now.",
  "editor.mode.parentMessage": "Parent message",
  "editor.mode.reportComment": "Report comment",
}

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    t: (key: string) => messages[key] ?? key,
  }),
}))

describe("InstantDraftTest", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("shows the rewritten draft and account CTA after one anonymous rewrite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            rewrittenText: "A calmer rewritten draft.",
            modeUsed: "parent_message",
            limitReached: true,
          },
        }),
      }),
    )

    const onCreateAccount = vi.fn()
    render(<InstantDraftTest onCreateAccount={onCreateAccount} />)

    fireEvent.change(screen.getByPlaceholderText(messages["auth.instant.placeholder"]), {
      target: { value: "Please rewrite this parent email safely." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Rewrite safely" }))

    await waitFor(() => {
      expect(screen.getByText("A calmer rewritten draft.")).toBeInTheDocument()
    })

    expect(screen.getByText("Parent message")).toBeInTheDocument()
    expect(
      screen.getByText("Create a free account to continue writing safely."),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Create free account" }))
    expect(onCreateAccount).toHaveBeenCalledTimes(1)
  })
})
