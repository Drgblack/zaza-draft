"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useLocale } from "@/hooks/use-locale"
import FooterSlim from "@/components/FooterSlim"
import { ZaraAssistant } from "@/components/zara-assistant"
import { DraftOutput } from "@/components/draft-output"
import { MiniInsightsBar } from "@/components/MiniInsightsBar"
import { ContextualWellbeingTip } from "@/components/ContextualWellbeingTip"
import { useAuth } from "@/hooks/use-auth"
import { logClientEvent } from "@/lib/analytics"
import type { PlanType } from "@/lib/usage"
import type { PronounPreference } from "@/lib/types"
import Link from "next/link"

const TONE_OPTIONS = [
  { id: "warm", key: "tone.warm" },
  { id: "professional", key: "tone.professional" },
  { id: "direct", key: "tone.direct" },
  { id: "empathetic", key: "tone.empathetic" },
] as const

const PRONOUN_OPTIONS: { id: PronounPreference; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "she", label: "She/her" },
  { id: "he", label: "He/him" },
  { id: "they", label: "They/them" },
  { id: "avoid", label: "Avoid pronouns" },
]

type ToneKey = (typeof TONE_OPTIONS)[number]["id"]
type LanguageChoice = "en" | "de"
const LOADING_MESSAGES = [
  "Analyzing your request...",
  "Understanding context...",
  "Selecting the best tone...",
  "Crafting your message...",
] as const

const GENERATION_ERROR_MAP: Record<
  string,
  { message: string; action: string | null }
> = {
  USAGE_LIMIT_EXCEEDED: {
    message: "You've reached your free tier limit. Upgrade to Draft Pro for unlimited drafts.",
    action: "Visit Account > Billing to upgrade.",
  },
  RATE_LIMITED: {
    message: "Too many requests in a short time. Please wait a moment and try again.",
    action: "Retry after a short break.",
  },
  INVALID_REQUEST: {
    message: "We can't generate that draft safely. Try rewording your request without sensitive details.",
    action: "Edit the prompt before generating again.",
  },
  SENSITIVE_CONTENT: {
    message: "Your prompt contained sensitive info. Remove names, emails, phones, or addresses and retry.",
    action: "Remove private identifiers and regenerate.",
  },
  AI_GENERATION_FAILED: {
    message: "The AI service is unavailable right now. Please retry in a minute.",
    action: "Try generating again shortly.",
  },
  BLOCKED_LANGUAGE: {
    message: "Please remove harmful or threatening language so the note remains professional.",
    action: "Try a calmer description and generate again.",
  },
}

const REFRAME_NOTICE_TEXT = "I softened the wording to keep it professional and parent-appropriate."

const HISTORY_PAGE_SIZE = 5
interface SnippetHistoryItem {
  id: string
  createdAt: string
  tone: string
  language: string
  wordCount: number
  contextUsed?: {
    subject?: string
    gradeLevel?: string
  }
  generatedText: string
  pronounPreference?: PronounPreference
  pronounResolution?: {
    resolvedPreference?: PronounPreference
    reason?: string | null
    source?: string | null
  }
}

export function MainEditor() {
  const [content, setContent] = useState("")
  const [selectedTone, setSelectedTone] = useState<ToneKey>("warm")
  const [usage, setUsage] = useState<{
    plan: PlanType
    currentMonthUsage: number
    limit: number | null
    remaining: number | null
  }>({
    plan: "free",
    currentMonthUsage: 8,
    limit: 10,
    remaining: 2,
  })
  const draftsUsed = usage.currentMonthUsage
  const draftsLimit = usage.limit ?? 0
  const { prefs } = useTeacherPrefs()
  const { t, locale } = useLocale()
  const { user, getIdToken, signOut } = useAuth()

  const [greeting, setGreeting] = useState("Good morning")
  const [userName, setUserName] = useState("")
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null)
  const [draftMetadata, setDraftMetadata] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [subject, setSubject] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [studentFirstName, setStudentFirstName] = useState("")
  const [languageChoice, setLanguageChoice] = useState<LanguageChoice>("en")
  const [pronounPreference, setPronounPreference] = useState<PronounPreference>("auto")
  const [inputReframeTier, setInputReframeTier] = useState<"tier1" | "tier2" | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [sensitivePreview, setSensitivePreview] = useState<string | null>(null)
  const [generationAction, setGenerationAction] = useState<string | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  const [showWellbeingInsights, setShowWellbeingInsights] = useState(true)
  const isDocumentDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const [history, setHistory] = useState<SnippetHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyCursor, setHistoryCursor] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [onboardingVisible, setOnboardingVisible] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(true)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadAccountUsage = async () => {
      try {
        const token = await getIdToken()
        if (!token) {
          return
        }

        const response = await fetch("/api/account/status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 401) {
          await signOut()
          return
        }

        const payload = await response.json()
        if (payload?.success && payload?.data?.usage && isMounted) {
          setUsage(payload.data.usage)
        }
      } catch (error) {
        console.error("[v0] Failed to load account usage", error)
      }
    }

    loadAccountUsage()

    return () => {
      isMounted = false
    }
  }, [getIdToken, signOut])

  useEffect(() => {
    let isMounted = true

    const loadOnboarding = async () => {
      setOnboardingLoading(true)
      try {
        const token = await getIdToken()
        if (!token) {
          return
        }
        const response = await fetch("/api/onboarding", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!isMounted) {
          return
        }
        if (!response.ok) {
          throw new Error("Failed to fetch onboarding status.")
        }

        const payload = await response.json()
        if (payload?.success) {
          setOnboardingVisible(!payload.data.dismissed)
          setOnboardingError(null)
        } else {
          setOnboardingError("Unable to load onboarding tips.")
        }
      } catch (error) {
        console.error("[v0] Failed to load onboarding", error)
        if (isMounted) {
          setOnboardingError("Unable to load onboarding.")
        }
      } finally {
        if (isMounted) {
          setOnboardingLoading(false)
        }
      }
    }

    loadOnboarding()

    return () => {
      isMounted = false
    }
  }, [getIdToken])

  const dismissOnboarding = async () => {
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Unable to save preference.")
      }
      setOnboardingVisible(false)
      setOnboardingError(null)
    } catch (error) {
      console.error("[v0] Failed to dismiss onboarding", error)
      setOnboardingError("We couldn't save your onboarding preference.")
    }
  }

  useEffect(() => {
    const handleSettingsChange = (e: CustomEvent) => {
      setShowWellbeingInsights(e.detail.enabled)
    }

    window.addEventListener("wellbeingSettingsChanged", handleSettingsChange as EventListener)

    // Check initial setting
    const savedSetting = localStorage.getItem("show_wellbeing_insights")
    if (savedSetting !== null) {
      setShowWellbeingInsights(savedSetting === "true")
    }

    return () => {
      window.removeEventListener("wellbeingSettingsChanged", handleSettingsChange as EventListener)
    }
  }, [])

  useEffect(() => {
    const resolvedName = user?.displayName ?? prefs.firstName
    if (resolvedName) {
      setUserName(resolvedName)
    }
  }, [user?.displayName, prefs.firstName])

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting(locale === "de-DE" ? "Guten Morgen" : "Good morning")
    } else if (hour < 17) {
      setGreeting(locale === "de-DE" ? "Guten Tag" : "Good afternoon")
    } else {
      setGreeting(locale === "de-DE" ? "Guten Abend" : "Good evening")
    }
  }, [locale])

  useEffect(() => {
    if (!isGenerating) {
      setLoadingMessageIndex(0)
      return
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 1500)

    return () => clearInterval(interval)
  }, [isGenerating])

  const handleGenerate = async (options: { rewrite?: boolean; previousDraft?: string } = {}) => {
    if (!content.trim() || isGenerating) {
      return
    }

    setIsGenerating(true)
    setGenerationError(null)
    setGenerationAction(null)
    setSensitivePreview(null)
    setGeneratedDraft(null)
    setDraftMetadata(null)
    setInputReframeTier(null)

    const payload: Record<string, unknown> = {
      situation: content.trim(),
      tone: selectedTone,
      language: languageChoice,
    }

    const context: Record<string, string> = {}

    if (subject.trim()) {
      context.subject = subject.trim()
    }

    if (gradeLevel.trim()) {
      context.gradeLevel = gradeLevel.trim()
    }

    if (Object.keys(context).length > 0) {
      payload.context = context
    }

    const trimmedStudentFirstName = studentFirstName.trim()
    if (trimmedStudentFirstName) {
      payload.studentFirstName = trimmedStudentFirstName
    }

    payload.pronounPreference = pronounPreference

    if (options.rewrite) {
      payload.rewrite = true
    }

    if (options.previousDraft) {
      payload.previousDraft = options.previousDraft
    }

    logClientEvent("draft_generate_requested", {
      tone: selectedTone,
      language: languageChoice,
      pronounPreference,
      studentFirstNameProvided: Boolean(trimmedStudentFirstName),
    })

    try {
      const token = await getIdToken()
      if (!token) {
        setGenerationError("Please sign in again to continue.")
        return
      }

      const response = await fetch("/api/draft/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      const responseMeta = data?.data?.meta ?? null

      if (response.status === 401) {
        setGenerationError("Session expired, please sign in again.")
        await signOut()
        return
      }

      if (!response.ok || !data?.success) {
        const code: string | null = data?.error?.code ?? null
        const mapped = code ? GENERATION_ERROR_MAP[code] : null
        setGenerationError(
          mapped?.message || data?.error?.message || "We couldn't generate a draft right now.",
        )
        setGenerationAction(mapped?.action ?? null)
        if (data?.data?.redactedPreview) {
          setSensitivePreview(data.data.redactedPreview)
        }
        logClientEvent("draft_generate_failed", {
          code: code ?? "UNKNOWN_ERROR",
        })

        return
      }

      logClientEvent("draft_generate_succeeded", {
        tone: selectedTone,
        language: languageChoice,
        wordCount: data.data.metadata.wordCount,
        pronounPreference,
        resolvedPronounPreference: data.data.metadata.pronounResolution?.resolvedPreference ?? pronounPreference,
        inputReframed: Boolean(responseMeta?.inputReframed),
        inputReframedTier: responseMeta?.inputReframedTier ?? null,
      })

      if (responseMeta?.inputReframed) {
        setInputReframeTier(responseMeta.inputReframedTier ?? null)
      } else {
        setInputReframeTier(null)
      }

      setGeneratedDraft(data.data.generatedDraft)
      setDraftMetadata(data.data.metadata)
      setUsage(data.data.usage)
      setGenerationAction(null)
    } catch (error) {
      console.error("[v1] Draft generation failed", error)
      setGenerationError("Something went wrong; please try again in a moment.")
      setGenerationAction("Retry the generation in a few minutes.")
    } finally {
      setIsGenerating(false)
    }
  }

  const refreshHistory = async (cursor?: string, append = false) => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const queryParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
      const response = await fetch(`/api/snippets?limit=${HISTORY_PAGE_SIZE}${queryParam}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Unable to load history.")
      }
      const nextCursor = payload?.data?.nextCursor ?? null
      setHistoryCursor(nextCursor)
      setHistory((prev) => (append ? [...prev, ...(payload.data.snippets ?? [])] : payload.data.snippets ?? []))
    } catch (error) {
      console.error("[v1] Failed to load snippet history", error)
      setHistoryError("Unable to load history right now.")
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    refreshHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (draftMetadata?.generatedAt) {
      refreshHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftMetadata?.generatedAt])

  const loadSnippet = (snippet: SnippetHistoryItem) => {
    setContent(snippet.generatedText)
    setSelectedTone(snippet.tone as ToneKey)
    setLanguageChoice(snippet.language as LanguageChoice)
    setSubject(snippet.contextUsed?.subject ?? "")
    setGradeLevel(snippet.contextUsed?.gradeLevel ?? "")
    setStudentFirstName("")
    setPronounPreference(snippet.pronounPreference ?? "auto")
  }

  const deleteSnippet = async (snippetId: string) => {
    try {
      const response = await fetch(`/api/snippets/${snippetId}`, {
        method: "DELETE",
      })
      const payload = await response.json()
      if (response.ok && payload.success) {
        setHistory((prev) => prev.filter((item) => item.id !== snippetId))
      } else {
        throw new Error(payload?.error?.message || "Unable to delete draft.")
      }
    } catch (error) {
      console.error("[v1] Failed to delete snippet", error)
      alert("Unable to delete draft right now.")
    }
  }

  const handleSaveDraft = (tags: string[]) => {
    // TODO: Implement actual save to library functionality
    alert(`Draft saved with tags: ${tags.join(", ")}`)
  }

  const handleEditDraft = () => {
    setIsEditing(true)
    // TODO: Implement inline editing functionality
  }

  const handleRegenerateDraft = () => {
    handleGenerate()
  }

  const handleRewriteDraft = () => {
    if (!generatedDraft) {
      return
    }

    handleGenerate({ rewrite: true, previousDraft: generatedDraft })
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        {/* Main Content Area */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            {greeting}, {userName || (locale === "de-DE" ? "da" : "there")}
          </h1>
          <p className="text-lg text-white/95 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)]">
            {locale === "de-DE"
              ? "Lassen Sie uns präzise und professionell bleiben."
              : "Let's keep it crisp and professional."}
          </p>
        </div>

        {usage.plan === "free" && usage.remaining === 0 && (
          <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-200 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-100 space-y-3">
            <p>{t("account.billing.paywallMessage")}</p>
            <Link href="/account">
              <Button variant="outline" className="text-amber-900 dark:text-amber-200">
                {t("account.billing.upgradeButton")}
              </Button>
            </Link>
          </div>
        )}

        {showWellbeingInsights && <MiniInsightsBar />}

        <div className="glass shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] rounded-2xl p-8 mb-6 transition-all duration-200 hover:shadow-[0_16px_48px_rgba(0,0,0,0.2),0_6px_16px_rgba(255,255,255,0.12)] hover:-translate-y-0.5 border border-white/40 dark:border-white/30 bg-white/90 dark:bg-white/15 backdrop-blur-[32px]">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              locale === "de-DE"
                ? `Beschreiben Sie die Situation...

Beispiele:
• Schüler der 6. Klasse mit Schwierigkeiten bei Brüchen, braucht ermutigendes Feedback
• Eltern-E-Mail zu Hausaufgaben, professioneller und einfühlsamer Ton
• Zeugniskommentar für hervorragende Fortschritte beim Leseverständnis`
                : `Describe the situation...

Examples:
• Year 6 student struggling with fractions, needs encouraging feedback
• Parent email about homework concerns, professional and empathetic tone
• Report card comment for excellent progress in reading comprehension`
            }
            className="w-full h-96 text-lg text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0 resize-none placeholder:text-gray-600 dark:placeholder:text-white/60 leading-relaxed font-medium"
            style={{
              color: isDocumentDark ? "#ffffff" : undefined,
            }}
            aria-label={
              locale === "de-DE" ? "Beschreiben Sie die Situation" : "Describe the situation you need help with"
            }
          />
          <p className="mt-3 text-xs text-white/80">
            {locale === "de-DE"
              ? "Geben Sie keine vollständigen Namen, E-Mails, Telefonnummern oder Adressen ein."
              : "Do not include student full names, email addresses, phone numbers, or street addresses."}
          </p>
        </div>

        {showWellbeingInsights && <ContextualWellbeingTip />}

        <div className="flex flex-wrap gap-3 mb-6">
          {TONE_OPTIONS.map((tone) => {
            const isSelected = selectedTone === tone.id
            const isDark = isDocumentDark

            return (
              <button
                key={tone.id}
                onClick={() => setSelectedTone(tone.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${
                  isSelected
                    ? "bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white shadow-[0_8px_24px_rgba(124,58,237,0.4),inset_0_1px_3px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)] border border-white/20 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,58,237,0.5),inset_0_2px_4px_rgba(255,255,255,0.35)]"
                    : "glass shadow-soft hover:bg-white/90 dark:hover:bg-white/20 hover:-translate-y-0.5 border border-white/40 dark:border-white/30 bg-white/85 dark:bg-white/10 backdrop-blur-[24px] text-gray-900 dark:text-white"
                }`}
                aria-pressed={isSelected}
              >
                {t(tone.key)}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          <select
            value={languageChoice}
            onChange={(event) => setLanguageChoice(event.target.value as LanguageChoice)}
            className="bg-white/90 dark:bg-white/10 rounded-xl border border-white/40 dark:border-white/30 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
          <select
            value={pronounPreference}
            onChange={(event) => setPronounPreference(event.target.value as PronounPreference)}
            className="bg-white/90 dark:bg-white/10 rounded-xl border border-white/40 dark:border-white/30 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            {PRONOUN_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={studentFirstName}
            onChange={(event) => setStudentFirstName(event.target.value)}
            placeholder="Student first name (optional)"
            className="bg-white/90 dark:bg-white/10 rounded-xl border border-white/40 dark:border-white/30 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          />
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Subject (optional)"
            className="bg-white/90 dark:bg-white/10 rounded-xl border border-white/40 dark:border-white/30 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          />
          <input
            value={gradeLevel}
            onChange={(event) => setGradeLevel(event.target.value)}
            placeholder="Grade level (optional)"
            className="bg-white/90 dark:bg-white/10 rounded-xl border border-white/40 dark:border-white/30 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          />
        </div>

        <Button
          onClick={() => handleGenerate()}
          disabled={!content.trim() || isGenerating}
          className="w-full bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] hover:shadow-[0_20px_56px_rgba(124,58,237,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)] text-white dark:text-white text-lg font-bold py-6 rounded-xl transition-all duration-200 shadow-[0_12px_32px_rgba(124,58,237,0.4),inset_0_1px_3px_rgba(255,255,255,0.25),inset_0_-1px_2px_rgba(0,0,0,0.1)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100 border border-white/20"
          aria-label={t("button.generate")}
        >
          {isGenerating ? (locale === "de-DE" ? "Generiere Entwurf…" : "Generating snippet…") : t("button.generate")}
        </Button>

        <div className="text-center mt-4 text-sm text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)] font-medium">
          {usage.plan === "free" ? (
            <>{t("insights.draftsUsed", { used: draftsUsed, limit: draftsLimit })}</>
          ) : (
            <>{t("insights.unlimitedDrafts")}</>
          )}
        </div>
        <div className="text-center mt-3">
          <Link href="/account">
            <Button
              className="bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white border-transparent shadow-[0_8px_20px_rgba(124,58,237,0.35)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.5)] hover:from-[#9333ea] hover:to-[#6b21a8]"
            >
              {t("account.billing.upgrade")}
            </Button>
          </Link>
        </div>
        {onboardingVisible && !onboardingLoading && (
          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-inner text-sm text-white">
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Welcome to Zaza Draft</p>
              <p>
                Do not include student full names, emails, phone numbers, or addresses. Learn more in{" "}
                <Link href="/privacy" className="underline">
                  Privacy
                </Link>{" "}
                or{" "}
                <Link href="/account/privacy" className="underline">
                  Privacy & Safety
                </Link>
                .
              </p>
              <button
                onClick={dismissOnboarding}
                className="self-start rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-white/30 transition"
              >
                Got it
              </button>
            </div>
            {onboardingError && <p className="text-xs text-rose-200 mt-2">{onboardingError}</p>}
          </div>
        )}

        <details className="mt-10 rounded-2xl bg-white/10 p-4 backdrop-blur border border-white/20 text-white">
          <summary className="text-lg font-semibold cursor-pointer">Recent drafts</summary>
          <p className="text-sm text-white/70 mt-2">Load a previous draft or remove it from history.</p>
          <p className="text-xs text-white/50 mt-1">
            What we store: snippet text, tone, language, and timestamps. No student identifiers are saved.{" "}
            <Link href="/account/data" className="underline">
              View your data
            </Link>
          </p>
          {historyLoading && (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-xl bg-white/10 border border-white/10 p-4 flex flex-col gap-2 animate-pulse"
                >
                  <div className="h-3 w-1/2 bg-white/30 rounded-full"></div>
                  <div className="h-3 w-1/3 bg-white/30 rounded-full"></div>
                  <div className="h-3 w-3/4 bg-white/10 rounded-full"></div>
                </div>
              ))}
            </div>
          )}
          {historyError && <p className="text-sm text-rose-200 mt-2">{historyError}</p>}
          {!historyLoading && !history.length && (
            <p className="text-sm text-white/60 mt-2">No drafts saved yet.</p>
          )}
          <ul className="mt-4 space-y-3">
            {history.map((item) => (
              <li
                key={item.id}
                className="rounded-xl bg-white/20 p-3 border border-white/20 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-sm text-white/80">
                  <span>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </span>
                  <span className="uppercase tracking-wide text-xs">{item.tone}</span>
                </div>
                <p className="text-sm text-white/90">Language: {item.language.toUpperCase()}</p>
                <p className="text-sm text-white/90">Words: {item.wordCount}</p>
                {(item.contextUsed?.subject || item.contextUsed?.gradeLevel) && (
                  <p className="text-sm text-white/80">
                    {item.contextUsed?.subject ? `Subject: ${item.contextUsed.subject}` : ""}
                    {item.contextUsed?.gradeLevel ? ` | Grade: ${item.contextUsed.gradeLevel}` : ""}
                </p>
              )}
              {item.pronounResolution?.resolvedPreference && (
                <p className="text-xs text-white/60 uppercase tracking-wide">
                  Pronouns: {item.pronounResolution.resolvedPreference}
                </p>
              )}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => loadSnippet(item)}>
                    Load
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-200" onClick={() => deleteSnippet(item.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {historyCursor && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 text-white border-white/60"
              onClick={() => refreshHistory(historyCursor, true)}
              disabled={historyLoading}
            >
              Load more
            </Button>
          )}
        </details>

        {isGenerating && (
          <div className="mt-4 rounded-2xl bg-white/10 border border-white/20 p-4 text-sm text-white/90 shadow-inner">
            <p className="font-semibold text-white">
              {locale === "de-DE" ? "Generiere deinen Entwurf…" : "Generating your snippet…"}
            </p>
            <p>{LOADING_MESSAGES[loadingMessageIndex]}</p>
            <div className="mt-3 grid gap-2">
              <div className="h-3 w-5/6 bg-white/20 rounded-full animate-pulse"></div>
              <div className="h-3 w-4/6 bg-white/20 rounded-full animate-pulse"></div>
              <div className="h-3 w-2/3 bg-white/20 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}

        {generationError && (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/40 p-4 text-sm text-red-900">
            <p className="font-semibold">{generationError}</p>
            {sensitivePreview && (
              <p className="mt-2 text-xs text-red-800">
                {locale === "de-DE" ? "Bearbeitete Vorschau:" : "Redacted preview:"} {sensitivePreview}
              </p>
            )}
            {generationAction && (
              <p className="mt-2 text-xs text-red-700">
                {generationAction}
              </p>
            )}
          </div>
        )}

        {generatedDraft && draftMetadata && (
          <div className="mt-8">
            <DraftOutput
              draftText={generatedDraft}
              tone={draftMetadata.toneUsed ?? selectedTone}
              metadata={draftMetadata}
              onSave={handleSaveDraft}
              onEdit={handleEditDraft}
              onRegenerate={handleRegenerateDraft}
              onRewrite={handleRewriteDraft}
              draftsUsed={draftsUsed}
              draftsLimit={draftsLimit}
              showUsageLimit={usage.plan === "free"}
            />
          </div>
        )}
        {generatedDraft && draftMetadata && inputReframeTier && (
        <div className="mt-4 rounded-2xl bg-blue-50/80 dark:bg-slate-900/60 border border-blue-200 dark:border-blue-500/40 p-4 text-sm text-blue-900 dark:text-blue-200 shadow-inner">
          <p>{REFRAME_NOTICE_TEXT}</p>
        </div>
        )}
      </main>

      <div className="main-editor-footer">
        <FooterSlim />
      </div>

      <ZaraAssistant />
    </div>
  )
}
