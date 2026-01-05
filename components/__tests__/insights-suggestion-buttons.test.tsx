import { describe, expect, it, vi } from "vitest"
import { handleGetStarted, handleSetReminder, handleUpdatePreferences, REMINDER_BUTTON_CLASS } from "@/app/insights/page"

describe("Personalized suggestions buttons", () => {
  it("keeps button text readable when hovering", () => {
    expect(REMINDER_BUTTON_CLASS).toContain("hover:text-gray-900")
    expect(REMINDER_BUTTON_CLASS).toContain("dark:hover:text-white")
    expect(REMINDER_BUTTON_CLASS).not.toContain(" hover:text-white")
  })

  it("routes to /settings when preferences update is triggered", () => {
    const router = { push: vi.fn() }
    handleUpdatePreferences(router)
    expect(router.push).toHaveBeenCalledWith("/settings")
  })

  it("routes to /class-brain when getting started", () => {
    const router = { push: vi.fn() }
    handleGetStarted(router)
    expect(router.push).toHaveBeenCalledWith("/class-brain")
  })

  it("shows a toast when setting a reminder", () => {
    const toast = vi.fn()
    const t = vi.fn((key: string) => key)

    handleSetReminder(toast, t)

    expect(t).toHaveBeenCalledWith("insights.suggestion.reminderToastTitle")
    expect(t).toHaveBeenCalledWith("insights.suggestion.reminderToastDescription")
    expect(toast).toHaveBeenCalledWith({
      title: "insights.suggestion.reminderToastTitle",
      description: "insights.suggestion.reminderToastDescription",
    })
  })
})
