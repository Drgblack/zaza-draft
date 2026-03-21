// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MiniInsightsBar } from "@/components/MiniInsightsBar"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        "insights.mini.regionLabel": "Your current Draft usage summary",
        "insights.mini.metric.draftsThisWeek": `${vars?.count ?? 0} drafts created this week`,
        "insights.mini.metric.recentDraftsAvailable": `${vars?.count ?? 0} recent drafts available`,
        "insights.mini.metric.usedThisTerm": "Used Draft this term",
        "insights.mini.metric.firstUseThisTerm": "First use this term",
        "insights.mini.metric.modeSelected": `${vars?.mode ?? ""} mode selected`,
        "insights.mini.viewInsights": "View insights",
      }

      return translations[key] ?? key
    },
  }),
}))

describe("MiniInsightsBar", () => {
  it("renders grounded usage signals instead of gamified metrics", () => {
    render(
      <MiniInsightsBar
        draftsCreatedThisWeek={4}
        recentDraftsAvailable={3}
        usedDraftThisTerm
        selectedModeLabel="Parent message"
      />,
    )

    expect(screen.getByText("4 drafts created this week")).toBeInTheDocument()
    expect(screen.getByText("3 recent drafts available")).toBeInTheDocument()
    expect(screen.getByText("Used Draft this term")).toBeInTheDocument()
    expect(screen.getByText("Parent message mode selected")).toBeInTheDocument()
    expect(screen.queryByText(/time saved|streak|boundaries kept/i)).toBeNull()
  })
})
