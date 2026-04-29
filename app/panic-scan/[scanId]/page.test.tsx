// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import PanicScanResultPage from "./page"

const pushMock = vi.fn()
const replaceMock = vi.fn()
const getIdTokenMock = vi.fn().mockResolvedValue("firebase-token")
const fetchMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useParams: () => ({ scanId: "scan-123" }),
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
    t: (key: string, vars?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        loading: "Loading...",
        panicScanResultInvalidId: "Invalid scan identifier.",
        panicScanResultAuthError: "Sign in again to view this scan.",
        panicScanResultLoadError: "Unable to load scan.",
        panicScanResultBackLink: "Upload another screenshot",
        panicScanResultTitle: "Panic Scan analysis",
        panicScanResultDescription: "Review the scan before generating.",
        panicScanResultCheckingStatus: "Checking the scan status.",
        panicScanResultStatusLabel: "Status",
        panicScanResultStatusReady: "Ready to reply",
        panicScanResultProcessingTime: `Processing time: ${vars?.ms ?? 0} ms`,
        panicScanResultReviewLabel: "Review scanned text",
        panicScanResultReviewHelper: "Please check the scanned text before generating.",
        panicScanResultReviewFieldLabel: "Scanned text for review",
        panicScanResultReviewCheckbox:
          "I checked the scanned text and want to use this version.",
        panicScanResultCopyButton: "Copy cleaned message",
        panicScanResultCleanConfidence: `OCR confidence: ${vars?.confidence ?? 0}%`,
        panicScanResultHelpButton: "Help me reply safely",
        panicScanResultHelpNote:
          "We’ll open the editor with your reviewed text in a ready-to-edit draft.",
        panicScanDeleteNow: "Delete now",
        panicScanDeleting: "Deleting...",
        panicScanDeleteSuccess: "Scan deleted.",
        panicScanDeleteFailure: "Could not delete scan. Please try again.",
        panicScanDeleteTrustHelper:
          "This scan is stored temporarily and can be deleted at any time.",
        panicScanDeleteConfirmTitle: "Delete this scan?",
        panicScanDeleteConfirmDescription:
          "Are you sure you want to delete this scan? This cannot be undone.",
        panicScanDeleteCancel: "Cancel",
        panicScanDeleteConfirmAction: "Delete scan",
        panicScanResultRawLabel: "Show raw OCR",
        panicScanResultRawSummary: "Raw OCR may include UI chrome and navigation text.",
        panicScanResultAnalysisTitle: "Analysis",
      }

      return messages[key] ?? key
    },
  }),
}))

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: ReactNode
    onClick?: () => void
  }) => <button onClick={onClick}>{children}</button>,
}))

describe("PanicScanResultPage", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    pushMock.mockReset()
    replaceMock.mockReset()
    getIdTokenMock.mockReset()
    getIdTokenMock.mockResolvedValue("firebase-token")
    window.sessionStorage.clear()
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(window, "setInterval").mockReturnValue(1 as unknown as number)
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockCompletedScan() {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          scanId: "scan-123",
          status: "completed",
          extractedText: "Raw OCR line with watermark",
          extractedTextClean: "Please call me after school.",
          cleanConfidence: 0.82,
          classification: {
            messageType: "parent_complaint",
            confidenceScore: 84,
          },
          analysis: {
            summary: "Parent wants a follow-up call.",
          },
          processingTimeMs: 1800,
        },
      }),
    })
  }

  it("shows editable reviewed text and blocks handoff before acknowledgement", async () => {
    mockCompletedScan()

    render(<PanicScanResultPage />)

    const textarea = await screen.findByLabelText("Scanned text for review")
    const helpButton = screen.getByRole("button", { name: "Help me reply safely" })
    expect(helpButton).toBeDisabled()
    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe("Please call me after school.")
    })
    expect(screen.getByRole("checkbox")).toBeEnabled()
    expect(helpButton).toBeDisabled()
  })

  it("renders a visible delete control with trust helper copy", async () => {
    mockCompletedScan()

    render(<PanicScanResultPage />)

    expect(await screen.findByRole("button", { name: "Delete now" })).toBeInTheDocument()
    expect(
      screen.getByText("This scan is stored temporarily and can be deleted at any time."),
    ).toBeInTheDocument()
  })

  it("confirms deletion and redirects back to Panic Scan home on success", async () => {
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "DELETE") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
          }),
        }
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            scanId: "scan-123",
            status: "completed",
            extractedText: "Raw OCR line with watermark",
            extractedTextClean: "Please call me after school.",
            cleanConfidence: 0.82,
            classification: {
              messageType: "parent_complaint",
              confidenceScore: 84,
            },
            analysis: {
              summary: "Parent wants a follow-up call.",
            },
            processingTimeMs: 1800,
          },
        }),
      }
    })

    render(<PanicScanResultPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Delete now" }))

    fireEvent.click(screen.getByRole("button", { name: "Delete scan" }))

    await waitFor(() => {
      expect(fetchMock.mock.calls).toEqual(
        expect.arrayContaining([
          [
            "/api/panic-scan/scan-123",
            {
              method: "DELETE",
              headers: {
                Authorization: "Bearer firebase-token",
              },
            },
          ],
        ]),
      )
    })

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/panic-scan?deleted=1")
    })
  })
})
