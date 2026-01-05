import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { ZaraAssistant } from "@/components/zara-assistant"

const toastMock = vi.fn()
const authMock = {
  getIdToken: vi.fn().mockResolvedValue("token"),
  status: "authenticated" as const,
}

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    t: (key: string) => {
      const translations: Record<string, string> = {
        "zara.greeting": "Hi! I'm Zara, your teaching assistant.",
        "zara.description": "I can help you with communication tips and pedagogical guidance.",
        "zara.tip.empathetic.title": "How to write empathetic feedback",
        "zara.tip.empathetic.subtitle": "Balance warmth with constructive guidance",
        "zara.tip.parent.title": "Example parent email templates",
        "zara.tip.parent.subtitle": "Ready-to-use templates for common scenarios",
        "zara.tip.difficult.title": "Tips for difficult conversations",
        "zara.tip.difficult.subtitle": "Navigate challenging topics with confidence",
        "zara.error.title": "Something went wrong",
        "zara.error.description": "I couldn't send your question. Please try again.",
        "zara.error.authRequiredTitle": "Sign in required",
        "zara.error.authRequiredDescription": "Please sign in to chat with Zara.",
      }
      return translations[key] ?? key
    },
    formatNumber: () => "",
    formatDate: () => "",
    setLocale: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
    toasts: [],
    dismiss: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authMock,
}))

describe("ZaraAssistant", () => {
  afterEach(() => {
    toastMock.mockReset()
    vi.restoreAllMocks()
    authMock.getIdToken.mockReset()
    authMock.getIdToken.mockResolvedValue("token")
    authMock.status = "authenticated"
  })

  it("clears the input, keeps the transcript, and shows an error toast when the chat request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"))
    vi.stubGlobal("fetch", fetchMock)

    render(<ZaraAssistant />)
    fireEvent.click(screen.getByLabelText("Toggle Zara Assistant"))

    const input = screen.getByPlaceholderText("Ask Zara anything...")
    fireEvent.change(input, { target: { value: "Hello Zara" } })
    fireEvent.click(screen.getByLabelText("Send message"))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(input.value).toBe("")
    await waitFor(() => expect(screen.getAllByText("Hello Zara").length).toBeGreaterThan(0))
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Something went wrong",
        variant: "destructive",
      }),
    )
  })

  it("prompts unauthenticated users to sign in", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    authMock.status = "unauthenticated"

    render(<ZaraAssistant />)
    fireEvent.click(screen.getByLabelText("Toggle Zara Assistant"))

    const input = screen.getByPlaceholderText("Ask Zara anything...")
    fireEvent.change(input, { target: { value: "Hello Zara" } })
    fireEvent.click(screen.getByLabelText("Send message"))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sign in required",
          description: "Please sign in to chat with Zara.",
          variant: "destructive",
        }),
      ),
    )

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
