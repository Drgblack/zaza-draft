import { describe, expect, it, vi } from "vitest"
import {
  REMINDER_BUTTON_CLASS,
  buildGoogleCalendarUrl,
  buildIcsEvent,
  getNextWednesdayAt,
  handleGetStarted,
  handleUpdatePreferences,
} from "@/app/insights/suggestion-actions"

describe("Personalized suggestions buttons", () => {
  it("keeps button text readable when hovering", () => {
    expect(REMINDER_BUTTON_CLASS).toContain("hover:text-gray-900")
    expect(REMINDER_BUTTON_CLASS).toContain("dark:hover:text-white")
    expect(REMINDER_BUTTON_CLASS).toContain("hover:!text-gray-900")
    expect(REMINDER_BUTTON_CLASS).toContain("dark:hover:!text-white")
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

  it("builds a Google Calendar event link", () => {
    const start = new Date("2026-01-07T15:30:00.000Z")
    const end = new Date("2026-01-07T15:45:00.000Z")
    const url = buildGoogleCalendarUrl({
      title: "Protected writing time - Zaza Draft",
      description: "Your Wednesday drafts have 50% fewer edits.",
      start,
      end,
    })

    expect(url).toContain("calendar.google.com")
    expect(url).toContain("text=Protected+writing+time+-+Zaza+Draft")
    expect(url).toContain("dates=20260107T153000Z%2F20260107T154500Z")
  })

  it("generates a valid ICS payload", () => {
    const start = new Date("2026-01-07T15:30:00.000Z")
    const end = new Date("2026-01-07T15:45:00.000Z")
    const ics = buildIcsEvent({
      title: "Protected writing time - Zaza Draft",
      description: "Your Wednesday drafts have 50% fewer edits.",
      start,
      end,
    })

    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("SUMMARY:Protected writing time - Zaza Draft")
    expect(ics).toContain("DTSTART:20260107T153000Z")
    expect(ics).toContain("DTEND:20260107T154500Z")
  })

  it("returns a Wednesday timestamp for the next week", () => {
    const nextWednesday = getNextWednesdayAt(15, 30)
    expect(nextWednesday.getDay()).toBe(3)
    expect(nextWednesday.getHours()).toBe(15)
    expect(nextWednesday.getMinutes()).toBe(30)
    expect(nextWednesday.getTime()).toBeGreaterThan(Date.now())
  })
})
