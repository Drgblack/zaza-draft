// @vitest-environment happy-dom

import "@testing-library/jest-dom"

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { formatDiagnosticsLastRun } from "@/lib/text/format-last-run"
import { useLocale } from "@/hooks/use-locale"

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "de-DE",
    setLocale: vi.fn(),
    t: (key: string) => (key === "diagnostics.lastRunNever" ? "Noch nicht" : key),
    formatDate: () => "01.01.2026, 12:00",
    formatNumber: () => "",
  }),
}))

function DiagnosticsSample({ lastRunAt }: { lastRunAt: { seconds?: number; nanoseconds?: number } | null }) {
  const { t, formatDate } = useLocale()
  const value = formatDiagnosticsLastRun(lastRunAt, formatDate) ?? t("diagnostics.lastRunNever")
  return <p>{value}</p>
}

describe("Diagnostics last run display", () => {
  it("renders Noch nicht when last run is epoch", () => {
    render(<DiagnosticsSample lastRunAt={{ seconds: 0 }} />)
    expect(screen.getByText("Noch nicht")).toBeInTheDocument()
  })

  it("formats a valid timestamp", () => {
    const formatted = formatDiagnosticsLastRun({ seconds: 1_700_000_000 }, () => "Test")
    expect(formatted).toBe("Test")
  })
})
