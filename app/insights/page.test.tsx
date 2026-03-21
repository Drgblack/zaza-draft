// @vitest-environment jsdom

import "@testing-library/jest-dom"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import InsightsPage from "@/app/insights/page"

const fetchMock = vi.fn()
const pushMock = vi.fn()

const authState = {
  user: {
    uid: "teacher-1",
    displayName: "Greg",
    getIdToken: vi.fn(async () => "token"),
  },
  status: "authenticated",
}

const teacherPrefsState = {
  prefs: {
    firstName: "Greg",
    preferredTone: "Professional",
  },
}

const localeMessages: Record<string, string> = {
  "insights.title": "Your Teaching Impact, {name}",
  "insights.titleNoName": "Your insights",
  "insights.backToEditor": "Back to Editor",
  "insights.explainer": "Insights explain how your Draft usage is evolving.",
  "insights.subtitle": "Grounded signals from your writing",
  "insights.dataControl": "Your data, your control",
  "insights.downloadReport": "Download Report",
  "insights.filter.last7": "Last 7 days",
  "insights.filter.last30": "Last 30 days",
  "insights.filter.last90": "Last 90 days",
  "insights.empty.loading": "Loading insights",
  "insights.empty.loadingSubtitle": "Checking your recent Draft activity.",
  "insights.weeklyReflection.title": "Weekly Reflection",
  "insights.weeklyReflection.general": "You have recent Draft activity to build on.",
  "insights.starter.eyebrow": "Starter insights",
  "insights.starter.title": "Your insights are getting ready",
  "insights.starter.subtitle":
    "You already have a usable Draft space here. As a little more history builds, this page will turn it into grounded patterns.",
  "insights.starter.usageTitle": "Usage summary",
  "insights.starter.usageCount": "{count} drafts in this view",
  "insights.starter.usageEmpty": "Your first drafts will appear here.",
  "insights.starter.usageHint":
    "Saved drafts, recent activity, and weekly patterns will fill in automatically.",
  "insights.starter.toneTitle": "Tone guidance",
  "insights.starter.toneWithPreference": "Your current default tone is {tone}.",
  "insights.starter.toneGeneric":
    "Start with a calm, professional tone for parent-facing writing.",
  "insights.starter.toneHint": "You can adjust tone in the editor at any time.",
  "insights.starter.laterTitle": "What will appear later",
  "insights.starter.later.one": "Draft volume and recent writing patterns",
  "insights.starter.later.two": "Recurring safety and editing signals",
  "insights.starter.later.three": "Weekly reflection prompts grounded in your drafts",
  "insights.starter.nextTitle": "Recommended next step",
  "insights.starter.nextNew":
    "Create your first parent message or report comment to unlock your first personal insights.",
  "insights.starter.nextLow":
    "A few more drafts will unlock fuller trend cards and reflection summaries.",
  "insights.detail.snapshotTitle": "Usage snapshot",
  "insights.detail.snapshotDrafts": "{count} drafts in the selected period",
  "insights.detail.snapshotUpdated": "Last activity recorded: {date}",
  "insights.detail.snapshotEmpty": "Activity will appear here as soon as you create drafts.",
  "insights.detail.signalTitle": "Current signal",
  "insights.detail.signalFallback":
    "Draft is collecting patterns from your recent work so this page can stay grounded in what you actually write.",
  "insights.detail.qualityHint":
    "Quality and edit-depth signals grow stronger as more drafts are created.",
  "insights.timeSaved.title": "Time Saved",
  "insights.timeSaved.hours": "{hours} hours",
  "insights.timeSaved.thisWeek": "This period",
  "insights.timeSaved.trend": "+{percent}% from the previous period",
  "insights.timeSaved.tooltip": "Estimated from recent Draft usage.",
  "insights.timeSaved.context": "Based on {count} drafts in this period.",
  "insights.draftsCreated.title": "Drafts Created",
  "insights.draftsCreated.value": "{count} drafts",
  "insights.draftsCreated.subtitle": "{used} of {total} used without edits",
  "insights.draftsCreated.tooltip": "Shows how many drafts were created.",
  "insights.currentStreak.title": "Current Streak",
  "insights.currentStreak.days": "{count} days",
  "insights.currentStreak.subtitle": "Recent active days",
  "insights.currentStreak.tooltip": "Consecutive active days.",
  "insights.qualityScore.title": "Quality Score",
  "insights.qualityScore.value": "{score}/100",
  "insights.qualityScore.subtitle": "Edit depth score",
  "insights.qualityScore.trend": "+{points} points",
  "insights.qualityScore.tooltip": "Based on edits after generation.",
  "insights.communicationLoad.title": "Communication Load",
  "insights.communicationLoad.subtitle": "Weekly load score",
  "insights.communicationLoad.trend": "{percent}% from the previous period",
  "insights.communicationLoad.tooltip": "Based on anonymised drafting signals.",
  "insights.communicationLoad.sparklineLabel": "4 week trend",
  "insights.communicationLoad.context.lowerRiskSchoolHours":
    "Lower-risk drafting during school hours this week.",
  "insights.communicationLoad.context.down":
    "Your communication load is lower this week.",
  "insights.communicationLoad.context.afterHours":
    "More after-hours drafting increased the load signal.",
  "insights.communicationLoad.context.higherRisk":
    "More higher-risk drafts increased the load signal.",
  "insights.communicationLoad.context.stable": "Your communication load is stable.",
  "insights.suggestions.title": "Suggestions",
  "insights.suggestion.empathetic.title": "Try empathetic tone first",
  "insights.suggestion.empathetic.desc": "Use a calm tone when a message feels sensitive.",
  "insights.suggestion.empathetic.cta": "Update preferences",
  "insights.suggestion.wednesday.title": "Protect your writing block",
  "insights.suggestion.wednesday.desc": "Set aside a short weekly review slot.",
  "insights.suggestion.wednesday.cta": "Set reminder",
  "insights.suggestion.classBrain.title": "Unlock Class Brain",
  "insights.suggestion.classBrain.desc":
    "Add student context so Draft can produce more specific first drafts.",
  "insights.suggestion.classBrain.cta": "Get started",
  "insights.suggestion.badge.new": "NEW",
  "insights.suggestion.reminder.modalHint": "Set a short calendar reminder.",
  "insights.suggestion.reminder.modalFootnote": "You can remove the reminder any time.",
  "insights.suggestion.reminder.nextEvent": "Next event",
  "insights.suggestion.reminder.openCalendar": "Open calendar",
  "insights.suggestion.reminder.downloadIcs": "Download .ics",
}

function translate(key: string, vars?: Record<string, string | number>) {
  const template = localeMessages[key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, token) => String(vars?.[token] ?? `{${token}}`))
}

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    t: translate,
  }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}))

vi.mock("@/hooks/use-teacher-prefs", () => ({
  useTeacherPrefs: () => teacherPrefsState,
}))

vi.mock("@/hooks/use-analytics-consent", () => ({
  useAnalyticsConsent: () => ({
    analyticsConsent: true,
    setAnalyticsConsent: vi.fn(),
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

vi.mock("@/components/insights/stat-card", () => ({
  StatCard: ({ title, value, subtitle }: { title: string; value: string; subtitle: string }) => (
    <div data-testid="stat-card">
      <h3>{title}</h3>
      <p>{value}</p>
      <p>{subtitle}</p>
    </div>
  ),
}))

vi.mock("@/components/insights/data-controls-explainer", () => ({
  default: () => <div data-testid="data-controls">Data controls</div>,
}))

vi.mock("@/components/FooterSlim", () => ({
  default: () => <div data-testid="footer">Footer</div>,
}))

vi.mock("@/app/insights/suggestion-actions", () => ({
  REMINDER_BUTTON_CLASS: "reminder-button",
  buildGoogleCalendarUrl: () => "https://calendar.example.com",
  buildIcsEvent: () => "BEGIN:VCALENDAR",
  getNextWednesdayAt: () => new Date("2026-03-25T15:30:00.000Z"),
  handleGetStarted: vi.fn(),
  handleUpdatePreferences: vi.fn(),
}))

describe("InsightsPage", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    pushMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders a starter state for a brand-new user with no history", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        summary: {
          dataSource: "empty",
          draftsCreated: { total: 0, usedWithoutEdits: 0, percentage: 0 },
          timeSaved: { minutes: 0, hours: 0, trend: 0, trendDirection: "up", contextCount: 0 },
          currentStreak: { days: 0 },
          qualityScore: { score: 0, trend: 0 },
          communicationLoad: {
            score: 0,
            trend: 0,
            trendDirection: "down",
            improvementIndicator: "stable",
            fourWeekTrend: [0, 0, 0, 0],
          },
          weeklyReflection: null,
          updatedAt: null,
        },
      }),
    })

    render(<InsightsPage />)

    expect(await screen.findByText("Your insights are getting ready")).toBeInTheDocument()
    expect(screen.getByText("Your first drafts will appear here.")).toBeInTheDocument()
    expect(screen.getByText("Tone guidance")).toBeInTheDocument()
    expect(screen.queryByText("Time Saved")).toBeNull()
  })

  it("renders the starter state for a low-data user instead of an empty state", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        summary: {
          dataSource: "usage_fallback",
          draftsCreated: { total: 1, usedWithoutEdits: 0, percentage: 0 },
          timeSaved: { minutes: 3, hours: 0.1, trend: 0, trendDirection: "up", contextCount: 1 },
          currentStreak: { days: 0 },
          qualityScore: { score: 0, trend: 0 },
          communicationLoad: {
            score: 0,
            trend: 0,
            trendDirection: "down",
            improvementIndicator: "stable",
            fourWeekTrend: [0, 0, 0, 0],
          },
          weeklyReflection: null,
          updatedAt: "2026-03-20T10:00:00.000Z",
        },
      }),
    })

    render(<InsightsPage />)

    expect(await screen.findByText("Your insights are getting ready")).toBeInTheDocument()
    expect(screen.getByText("1 drafts in this view")).toBeInTheDocument()
    expect(screen.getByText("Recommended next step")).toBeInTheDocument()
    expect(screen.queryByText("Not enough data yet")).toBeNull()
    expect(screen.queryByText("Time Saved")).toBeNull()
  })

  it("renders the full insights layout for a normal-data user", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        summary: {
          dataSource: "events",
          draftsCreated: { total: 4, usedWithoutEdits: 2, percentage: 0.5 },
          timeSaved: { minutes: 12, hours: 0.2, trend: 25, trendDirection: "up", contextCount: 4 },
          currentStreak: { days: 3 },
          qualityScore: { score: 75, trend: 5 },
          communicationLoad: {
            score: 22,
            trend: -12,
            trendDirection: "down",
            improvementIndicator: "improving",
            fourWeekTrend: [28, 24, 23, 22],
          },
          weeklyReflection: { key: "insights.weeklyReflection.general" },
          updatedAt: "2026-03-20T10:00:00.000Z",
        },
      }),
    })

    render(<InsightsPage />)

    expect(await screen.findByText("Time Saved")).toBeInTheDocument()
    expect(screen.getByText("Usage snapshot")).toBeInTheDocument()
    expect(screen.getByText("Current signal")).toBeInTheDocument()
    expect(screen.queryByText("Your insights are getting ready")).toBeNull()
  })
})
