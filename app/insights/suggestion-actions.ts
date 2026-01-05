"use client"

export const REMINDER_BUTTON_CLASS =
  "w-full bg-white/20 backdrop-blur-md border-purple-200 dark:border-purple-400/30 text-gray-900 dark:text-white hover:bg-white/30 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white focus-visible:border-purple-300 focus-visible:ring-2 focus-visible:ring-purple-200/60 transition-all duration-300 shadow-sm hover:!text-gray-900 dark:hover:!text-white"

interface RouterWithPush {
  push: (url: string) => void
}

export function handleUpdatePreferences(router: RouterWithPush) {
  router.push("/settings")
}

export function handleGetStarted(router: RouterWithPush) {
  router.push("/class-brain")
}

export interface CalendarEventDetails {
  title: string
  description: string
  start: Date
  end: Date
}

const WEDNESDAY = 3

export function getNextWednesdayAt(hour = 15, minute = 30) {
  const now = new Date()
  const eventDate = new Date(now)
  eventDate.setHours(0, 0, 0, 0)

  let daysUntilWednesday = (WEDNESDAY - eventDate.getDay() + 7) % 7
  if (daysUntilWednesday === 0) {
    daysUntilWednesday = 7
  }

  eventDate.setDate(eventDate.getDate() + daysUntilWednesday)
  eventDate.setHours(hour, minute, 0, 0)

  return eventDate
}

function formatForCalendar(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0]
    .concat("Z")
}

function formatForIcs(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0]
    .concat("Z")
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n")
}

export function buildGoogleCalendarUrl(event: CalendarEventDetails) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description,
    dates: `${formatForCalendar(event.start)}/${formatForCalendar(event.end)}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildIcsEvent(event: CalendarEventDetails) {
  const dtstamp = formatForIcs(new Date())
  const uid = `zaza-draft-${dtstamp}-${Math.random().toString(36).slice(2)}`

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zaza Draft//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatForIcs(event.start)}`,
    `DTEND:${formatForIcs(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}
