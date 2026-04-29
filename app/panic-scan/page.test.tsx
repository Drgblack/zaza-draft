// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import PanicScanPage from "./page"

const fetchMock = vi.fn()
const getIdTokenMock = vi.fn().mockResolvedValue("firebase-token")

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("deleted=1"),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    status: "authenticated",
    getIdToken: getIdTokenMock,
  }),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    t: (key: string) => {
      const messages: Record<string, string> = {
        panicScanBackLink: "Back to Draft editor",
        panicScanTitle: "Panic Scan",
        panicScanDescription:
          "Upload a screenshot or photo of the stressful message and let Zaza Draft unpack it, classify risk, and prepare a calm reply.",
        panicScanDeleteSuccess: "Scan deleted.",
        panicScanSupportedLabel: "Supported input types",
        panicScanInstructionUpload: "Upload a screenshot or camera photo of the original message.",
        panicScanInstructionAuto: "We automatically OCR, classify tone/risk, and propose a calm reply.",
        panicScanInstructionTTL: "No media is stored long-term: screenshots expire after 24 hours.",
        panicScanDeleteNote: "Scans are temporary. You can delete them at any time.",
        panicScanUploadLabel: "Upload screenshot/photo",
        panicScanButton: "Analyze screenshot",
        "panicScan.helper.selectFile": "Select a file to enable analysis.",
        "panicScan.error.chooseFile": "Choose an image to scan.",
        loading: "Loading...",
      }

      return messages[key] ?? key
    },
  }),
}))

describe("PanicScanPage", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getIdTokenMock.mockReset()
    getIdTokenMock.mockResolvedValue("firebase-token")
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          aiConfigured: true,
        },
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows the deleted success banner after redirecting back from a scan", async () => {
    render(<PanicScanPage />)

    expect(await screen.findByText("Scan deleted.")).toBeInTheDocument()
  })
})
