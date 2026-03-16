"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useLocale } from "@/hooks/use-locale"
import FooterSlim from "@/components/FooterSlim"
import { ZaraAssistant } from "@/components/zara-assistant"
import { DraftOutput } from "@/components/draft-output"
import { CommentBankSection } from "@/components/comment-bank-section"
import { DeescalationBanner } from "@/components/deescalation-banner"
import { MiniInsightsBar } from "@/components/MiniInsightsBar"
import { ContextualWellbeingTip } from "@/components/ContextualWellbeingTip"
import { ReframeExplanation } from "@/components/reframe-explanation"
import { SafetyBadge } from "@/src/components/SafetyBadge"
import { TriggerList } from "@/src/components/TriggerList"
import { ReactionForecast } from "@/src/components/ReactionForecast"
import { ExplanationPanel } from "@/src/components/ExplanationPanel"
import { ProfessionalRiskBanner } from "@/src/components/ProfessionalRiskBanner"
import { DocumentationModeButton } from "@/src/components/DocumentationModeButton"
import { useAuth } from "@/hooks/use-auth"
import { logClientEvent, logDraftInteractionEvent } from "@/lib/analytics"
import type { PlanType } from "@/lib/usage"
import type { DeescalationSummary } from "@/lib/deescalation/types"
import type { DraftStructure } from "@/lib/draft/format"
import { cleanStudentName } from "@/lib/draft/student-name"
import { resolveLanguageChoiceFromLocale } from "@/lib/draft/language"
import type { DraftLanguage, DraftMode, PronounPreference } from "@/lib/types"
import { MODE_LABEL_KEYS, DEFAULT_DRAFT_MODE } from "@/lib/draft-mode"
import { isValidDraftRequest, OUT_OF_SCOPE_REDIRECT_MESSAGE } from "@/lib/draft/scope-guard"
import type { GreetingSource, NameConfidenceLevel } from "@/lib/draft/greeting-resolution"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Camera, FileText, Image, Info, Mail, MessageCircle, Mic, Sun, Target, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { formatGreetingDisplay } from "@/lib/text/greeting-display"
import { saveLastRunTimestamp } from "@/lib/diagnostics/local-storage"
import { resolveTeacherSignatureName } from "@/lib/draft/teacher-signature"
import { assessSafeToSend } from "@/lib/safe-to-send"
import {
  appendDraftAttribution,
  getDraftAttributionLine,
  resolveDraftSignatureEnabled,
  shouldShowDraftAttribution,
} from "@/lib/draft/draft-attribution"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"
import {
  inferDraftMessageContext,
  inferDraftWorkflowType,
  inferReactionPrediction,
  inferRegionFromLocale,
  inferRewriteReason,
  inferRiskFlagTypes,
  inferTimeContext,
  type DraftInteractionEventPayload,
  type DraftInteractionRewriteReason,
  type DraftInteractionTeacherIntent,
  type DraftInteractionWorkflowType,
} from "@/lib/draft-interaction-events"

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

type ModeKey = DraftMode

const MODE_SEGMENT_OPTIONS = [
  {
    id: "parent_message" as ModeKey,
    labelKey: MODE_LABEL_KEYS.parent_message,
    icon: Mail,
  },
  {
    id: "report_comment" as ModeKey,
    labelKey: MODE_LABEL_KEYS.report_comment,
    icon: MessageCircle,
  },
]

type ToneKey = (typeof TONE_OPTIONS)[number]["id"]
type RewriteMode = "standard" | "forward_safe"

const TONE_STYLES: Record<
  ToneKey,
  { icon: LucideIcon; base: string; ring: string }
> = {
  warm: {
    icon: Sun,
    base: "bg-orange-100 border-orange-400 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:border-orange-600 dark:text-orange-200",
    ring: "ring-orange-400 dark:ring-orange-200",
  },
  professional: {
    icon: FileText,
    base: "bg-blue-100 border-blue-400 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-200",
    ring: "ring-blue-400 dark:ring-blue-200",
  },
  direct: {
    icon: Target,
    base: "bg-indigo-100 border-indigo-400 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-600 dark:text-indigo-200",
    ring: "ring-indigo-400 dark:ring-indigo-200",
  },
  empathetic: {
    icon: Users,
    base: "bg-purple-100 border-purple-400 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:border-purple-600 dark:text-purple-200",
    ring: "ring-purple-400 dark:ring-purple-200",
  },
}

type EnforcedGreeting = {
  text: string
  final: boolean
  confidence: NameConfidenceLevel
  name?: string | null
  source?: GreetingSource | null
}
type SourceFlow = "safe_draft" | "panic_scan" | "voice_to_calm"

type PanicScanHandoffState = {
  sourceFlow: "panic_scan"
  originalContent: string
  bannerVisible: boolean
  greeting?: EnforcedGreeting | null
}

const LOADING_MESSAGES = [
  "Analyzing your request...",
  "Understanding context...",
  "Selecting the best tone...",
  "Crafting your message...",
] as const

const PREFILL_STORAGE_KEY = "zazaDraftPrefill"

type InputModeCardDefinition = {
  id: string
  titleKey: string
  descriptionKey: string
  icon: LucideIcon
  action: { type: "focus"; labelKey: string } | { type: "link"; href: string; labelKey: string }
}

const INPUT_MODE_CARD_DEFINITIONS: InputModeCardDefinition[] = [
  {
    id: "safe-draft",
    titleKey: "homeSafeDraftTitle",
    descriptionKey: "homeSafeDraftDescription",
    icon: FileText,
    action: { type: "focus", labelKey: "homeSafeDraftAction" },
  },
  {
    id: "panic-scan",
    titleKey: "panicScanTitle",
    descriptionKey: "panicScanDescription",
    icon: Image,
    action: { type: "link", href: "/panic-scan", labelKey: "homePanicScanAction" },
  },
  {
    id: "voice-to-calm",
    titleKey: "voiceTitle",
    descriptionKey: "voiceDescription",
    icon: Mic,
    action: { type: "link", href: "/voice", labelKey: "homeVoiceAction" },
  },
]

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
  mode?: ModeKey
  pronounResolution?: {
    resolvedPreference?: PronounPreference
    reason?: string | null
    source?: string | null
  }
}

export function resolveExplanationTier(
  inputReframeTier: "tier1" | "tier2" | null,
  deescalationSummary: DeescalationSummary | null,
) {
  if (inputReframeTier) {
    return inputReframeTier
  }

  const hasToneSoftening =
    deescalationSummary &&
    (deescalationSummary.wasDeescalated || (deescalationSummary.flaggedPhrases?.length ?? 0) > 0)
  if (hasToneSoftening) {
    return "tier1"
  }

  return null
}

interface MainEditorProps {
  canExport?: boolean
}

export function MainEditor({ canExport = true }: MainEditorProps = {}) {
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
  const [isQaUser, setIsQaUser] = useState(false)
  const isLimitedUser = usage.plan === "free" && !isQaUser
  const { prefs } = useTeacherPrefs()
  const { t, locale } = useLocale()
  const searchParams = useSearchParams()
  const isReturningFromPanicScan = searchParams.get("panicScanReturn") === "1"
  const { user, getIdToken, signOut } = useAuth()
  const teacherSignatureName = useMemo(
    () => resolveTeacherSignatureName(user?.displayName, prefs.signatureLine1),
    [user?.displayName, prefs.signatureLine1],
  )
  const toneControlOptions = useMemo(
    () =>
      TONE_OPTIONS.map((tone) => {
        const Icon = TONE_STYLES[tone.id].icon
        return {
          value: tone.id,
          label: t(tone.key),
          icon: <Icon className="h-4 w-4" aria-hidden="true" />,
          ariaLabel: t(tone.key),
        }
      }),
    [t],
  )
  const modeControlOptions = useMemo(
    () =>
      MODE_SEGMENT_OPTIONS.map((option) => {
        const Icon = option.icon
        return {
          value: option.id,
          label: t(option.labelKey),
          icon: <Icon size={16} aria-hidden="true" />,
          ariaLabel: t(option.labelKey),
        }
      }),
    [t],
  )

  const [greeting, setGreeting] = useState("Good morning")
  const [userName, setUserName] = useState("")
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null)
  const [draftMetadata, setDraftMetadata] = useState<any>(null)
  const [draftStructure, setDraftStructure] = useState<DraftStructure | null>(null)
  const [deescalationSummary, setDeescalationSummary] = useState<DeescalationSummary | null>(null)
  const [safetyAnalysis, setSafetyAnalysis] = useState<SafetyEngineOutput | null>(null)
  const [documentationModeActive, setDocumentationModeActive] = useState(false)
  const [enforcedGreeting, setEnforcedGreeting] = useState<EnforcedGreeting | null>(null)
  const [sourceFlow, setSourceFlow] = useState<SourceFlow>("safe_draft")
  const [panicScanHandoff, setPanicScanHandoff] = useState<PanicScanHandoffState | null>(null)
  const [lastGenerationSignature, setLastGenerationSignature] = useState<{
    content: string
    mode: ModeKey
  } | null>(null)
  const [subject, setSubject] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [studentFirstNameInput, setStudentFirstNameInput] = useState("")
  const displayedStudentFirstName = useMemo(
    () => cleanStudentName(studentFirstNameInput),
    [studentFirstNameInput],
  )
  const [languageChoice, setLanguageChoice] = useState<DraftLanguage>(
    () => resolveLanguageChoiceFromLocale(locale),
  )
  const [languageWasManuallySet, setLanguageWasManuallySet] = useState(false)
  useEffect(() => {
    if (languageWasManuallySet) {
      return
    }
    setLanguageChoice(resolveLanguageChoiceFromLocale(locale))
  }, [languageWasManuallySet, locale])
  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLanguageChoice(event.target.value as DraftLanguage)
    setLanguageWasManuallySet(true)
  }
  const [pronounPreference, setPronounPreference] = useState<PronounPreference>("auto")
  const [mode, setMode] = useState<ModeKey>("parent_message")
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>("standard")
  const [inputReframeTier, setInputReframeTier] = useState<"tier1" | "tier2" | null>(null)
  const explanationTier = useMemo(
    () => resolveExplanationTier(inputReframeTier, deescalationSummary),
    [inputReframeTier, deescalationSummary],
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [sensitivePreview, setSensitivePreview] = useState<string | null>(null)
  const [generationAction, setGenerationAction] = useState<string | null>(null)
  const [blockedLanguageContext, setBlockedLanguageContext] = useState<{
    teacherNote: string
    safeAlternatives: string[]
  } | null>(null)
  const [outOfScopeNotice, setOutOfScopeNotice] = useState(false)
  const [outOfScopeMessage, setOutOfScopeMessage] = useState("")
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const safeToSendAssessment = useMemo(
    () =>
      assessSafeToSend({
        safetyAnalysis,
        deescalationSummary,
      }),
    [deescalationSummary, safetyAnalysis],
  )
  const includeDraftSignature = useMemo(
    () => resolveDraftSignatureEnabled(prefs.includeDraftSignature, usage.plan),
    [prefs.includeDraftSignature, usage.plan],
  )
  const draftAttributionLine = useMemo(() => {
    if (
      !shouldShowDraftAttribution({
        enabled: includeDraftSignature,
        mode,
        documentationMode: documentationModeActive,
      })
    ) {
      return null
    }

    return getDraftAttributionLine(languageChoice)
  }, [documentationModeActive, includeDraftSignature, languageChoice, mode])
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const draftEditDepthRef = useRef(0)
  const draftModificationLoggedRef = useRef(false)
  const rewriteSuggestionPendingRef = useRef(false)
  const rewriteReasonRef = useRef<DraftInteractionRewriteReason | null>(null)
  const teacherIntentRef = useRef<DraftInteractionTeacherIntent | null>(null)
  const workflowTypeRef = useRef<DraftInteractionWorkflowType>("new_message")
  const sendDraftInteraction = useCallback(
    (event: Partial<DraftInteractionEventPayload>) => {
      const nextWorkflowType = event.workflow_type ?? workflowTypeRef.current
      void logDraftInteractionEvent(getIdToken, {
        message_context: inferDraftMessageContext(
          mode,
          Boolean(nextWorkflowType === "documentation_mode"),
        ),
        time_context: inferTimeContext(new Date()),
        workflow_type: nextWorkflowType,
        edit_depth: draftEditDepthRef.current,
        region: inferRegionFromLocale(locale),
        teacher_intent: teacherIntentRef.current,
        timestamp: new Date().toISOString(),
        ...event,
      })
    },
    [getIdToken, locale, mode],
  )
  const resetGeneratedOutput = useCallback(() => {
    setGeneratedDraft(null)
    setDraftMetadata(null)
    setDraftStructure(null)
    setDeescalationSummary(null)
    setSafetyAnalysis(null)
    setDocumentationModeActive(false)
    setInputReframeTier(null)
    setLastGenerationSignature(null)
    draftEditDepthRef.current = 0
    draftModificationLoggedRef.current = false
    rewriteSuggestionPendingRef.current = false
    rewriteReasonRef.current = null
    teacherIntentRef.current = null
    workflowTypeRef.current = "new_message"
  }, [])

  const clearPanicScanHandoff = useCallback(() => {
    setPanicScanHandoff(null)
    setEnforcedGreeting(null)
    setSourceFlow("safe_draft")
  }, [])

  const showOutOfScopeNotice = (message: string, code = "OUT_OF_SCOPE") => {
    setOutOfScopeMessage(message)
    setOutOfScopeNotice(true)
    resetGeneratedOutput()
    setBlockedLanguageContext(null)
    setSensitivePreview(null)
    setGenerationError(null)
    setGenerationAction(null)
    setIsGenerating(false)
    logClientEvent("draft_generate_out_of_scope", { code })
  }

  const [showWellbeingInsights, setShowWellbeingInsights] = useState(true)
  const isDocumentDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const [history, setHistory] = useState<SnippetHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyCursor, setHistoryCursor] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [onboardingVisible, setOnboardingVisible] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(true)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)
  const [dontShowWelcome, setDontShowWelcome] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const focusEditor = useCallback(() => {
    textareaRef.current?.focus()
  }, [])
  const [prefillApplied, setPrefillApplied] = useState(false)
  const [panicScanReturnHandled, setPanicScanReturnHandled] = useState(false)
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const minHeight = 160
    const maxHeight = 360
    const nextHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)
    el.style.height = `${nextHeight}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [content, adjustTextareaHeight])

  useEffect(() => {
    if (prefillApplied) {
      return
    }

    if (content.trim()) {
      setPrefillApplied(true)
      return
    }

    if (typeof window === "undefined") {
      return
    }

    const stored = sessionStorage.getItem(PREFILL_STORAGE_KEY)
    if (stored) {
      let parsed: unknown
      try {
        parsed = JSON.parse(stored)
      } catch {
        setContent(stored)
        sessionStorage.removeItem(PREFILL_STORAGE_KEY)
        setPrefillApplied(true)
        return
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const maybePayload = parsed as { cleaned?: string; raw?: string; greeting?: EnforcedGreeting }
        if (typeof maybePayload.cleaned === "string") {
          setContent(maybePayload.cleaned)
          setPanicScanHandoff({
            sourceFlow: "panic_scan",
            originalContent: maybePayload.cleaned,
            bannerVisible: true,
            greeting: maybePayload.greeting ?? null,
          })
          setSourceFlow("panic_scan")
          setMode("parent_message")
        } else {
          setContent(stored)
        }
        if (maybePayload.greeting?.text) {
          setEnforcedGreeting(maybePayload.greeting)
        }
      } else {
        setContent(stored)
      }
      sessionStorage.removeItem(PREFILL_STORAGE_KEY)
    }

    setPrefillApplied(true)
  }, [content, prefillApplied])

  const handleContentChange = (nextContent: string) => {
    const nextTrimmed = nextContent.trim()

    if (panicScanHandoff && nextTrimmed !== panicScanHandoff.originalContent.trim()) {
      clearPanicScanHandoff()
    }

    if (lastGenerationSignature && nextTrimmed !== lastGenerationSignature.content) {
      draftEditDepthRef.current += 1
      if (!draftModificationLoggedRef.current) {
        sendDraftInteraction({
          event_name: "edit_action",
          edit_depth: draftEditDepthRef.current,
        })
        sendDraftInteraction({
          event_name: "draft_modified",
          workflow_type:
            workflowTypeRef.current === "new_message" ? "new_message" : "rewrite_existing",
          edit_depth: draftEditDepthRef.current,
          rewrite_reason: rewriteReasonRef.current,
        })
        draftModificationLoggedRef.current = true
      }
      if (rewriteSuggestionPendingRef.current || workflowTypeRef.current !== "new_message") {
        sendDraftInteraction({
          event_name: "rewrite_modified",
          workflow_type: "rewrite_existing",
          rewrite_reason: rewriteReasonRef.current,
          edit_depth: draftEditDepthRef.current,
        })
        rewriteSuggestionPendingRef.current = false
      }
      resetGeneratedOutput()
      setGenerationError(null)
      setGenerationAction(null)
      setSensitivePreview(null)
      setBlockedLanguageContext(null)
      setOutOfScopeNotice(false)
      setOutOfScopeMessage("")
    }

    setContent(nextContent)
  }

  const handleModeChange = (nextMode: ModeKey) => {
    if (nextMode === mode) {
      return
    }

    if (panicScanHandoff && nextMode !== "parent_message") {
      clearPanicScanHandoff()
    }

    if (lastGenerationSignature && lastGenerationSignature.mode !== nextMode) {
      resetGeneratedOutput()
      setGenerationError(null)
      setGenerationAction(null)
      setSensitivePreview(null)
      setBlockedLanguageContext(null)
      setOutOfScopeNotice(false)
      setOutOfScopeMessage("")
    }

    setMode(nextMode)
  }

  const dismissPanicScanBanner = () => {
    clearPanicScanHandoff()
  }

  useEffect(() => {
    if (!isReturningFromPanicScan || panicScanReturnHandled || !panicScanHandoff?.bannerVisible) {
      return
    }
    if (!prefillApplied || !content.trim()) {
      return
    }
    const textarea = textareaRef.current
    textarea?.focus()
    if (textarea) {
      textarea.selectionStart = 0
      textarea.selectionEnd = 0
      textarea.scrollTop = 0
    }
    textarea?.scrollIntoView({ behavior: "smooth", block: "center" })
    setPanicScanReturnHandled(true)
  }, [content, isReturningFromPanicScan, panicScanHandoff?.bannerVisible, panicScanReturnHandled, prefillApplied])

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
              setIsQaUser(Boolean(payload.data.isQaUser))
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

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return
    }
    const savedDismissal = localStorage.getItem("zazaDraftWelcomeDismissed")
    setWelcomeDismissed(savedDismissal === "true")
  }, [])

  const showWelcomeBox = onboardingVisible && !onboardingLoading && !welcomeDismissed

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

  const handleDontShowAgain = (event: ChangeEvent<HTMLInputElement>) => {
    setDontShowWelcome(event.target.checked)
  }

  const handleWelcomeDismiss = async () => {
    if (dontShowWelcome && typeof localStorage !== "undefined") {
      localStorage.setItem("zazaDraftWelcomeDismissed", "true")
      setWelcomeDismissed(true)
    }
    await dismissOnboarding()
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

  const handleGenerate = async (
    options: { rewrite?: boolean; previousDraft?: string; documentationMode?: boolean } = {},
  ) => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isGenerating) {
      return
    }

    const nextWorkflowType = inferDraftWorkflowType({
      rewrite: Boolean(options.rewrite || options.previousDraft),
      documentationMode: Boolean(options.documentationMode),
      toneAdjustment: Boolean(options.rewrite),
    })

    if (
      generatedDraft &&
      rewriteSuggestionPendingRef.current &&
      !options.rewrite &&
      !options.documentationMode
    ) {
      sendDraftInteraction({
        event_name: "rewrite_rejected",
        workflow_type: "rewrite_existing",
        rewrite_reason: rewriteReasonRef.current,
      })
      rewriteSuggestionPendingRef.current = false
    }

    workflowTypeRef.current = nextWorkflowType

    const fallbackOutOfScopeMessage = t("editor.outOfScope.body")
    if (!isValidDraftRequest(trimmedContent, mode)) {
      const precheckMessage =
        locale === "de-DE" ? fallbackOutOfScopeMessage : OUT_OF_SCOPE_REDIRECT_MESSAGE
      showOutOfScopeNotice(precheckMessage, "CLIENT_PRECHECK")
      return
    }

    setIsGenerating(true)
    setGenerationError(null)
    setGenerationAction(null)
    setSensitivePreview(null)
    setGeneratedDraft(null)
    setDraftMetadata(null)
    setDraftStructure(null)
    setDeescalationSummary(null)
    setInputReframeTier(null)
    setDocumentationModeActive(Boolean(options.documentationMode))
    setBlockedLanguageContext(null)
    setOutOfScopeNotice(false)
    setOutOfScopeMessage("")

    const signaturePayload = {
      line1: teacherSignatureName,
      line2: prefs.signatureLine2?.trim() || undefined,
      line3: prefs.signatureLine3?.trim() || undefined,
      autoAppendParentMessage: prefs.autoAppendSignatureParentMessage,
      autoAppendReportComment: prefs.autoAppendSignatureReportComment,
    }

    const payload: Record<string, unknown> = {
      situation: trimmedContent,
      tone: selectedTone,
      language: languageChoice,
      outputLanguage: languageChoice,
      preferredLanguage: prefs.preferredLanguage,
      uiLocale: locale,
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

    const sanitizedStudentFirstName = displayedStudentFirstName.trim()
    if (sanitizedStudentFirstName) {
      payload.studentFirstName = sanitizedStudentFirstName
    }

    payload.pronounPreference = pronounPreference
    payload.mode = mode

    payload.signature = signaturePayload

    if (enforcedGreeting?.text?.trim()) {
      payload.greeting = {
        text: enforcedGreeting.text,
        name: enforcedGreeting.name ?? undefined,
      }
      payload.greetingFinal = enforcedGreeting.final
      payload.greetingConfidence = enforcedGreeting.confidence
      if (enforcedGreeting.source) {
        payload.greetingSource = enforcedGreeting.source
      }
    }

    payload.situationRaw = trimmedContent

    if (options.rewrite) {
      payload.rewrite = true
    }

    if (options.previousDraft) {
      payload.previousDraft = options.previousDraft
    }

    payload.documentationMode = Boolean(options.documentationMode)
    payload.forwardSafeRewrite = Boolean(options.rewrite && rewriteMode === "forward_safe")

    logClientEvent("draft_generate_requested", {
      tone: selectedTone,
      language: languageChoice,
      pronounPreference,
      mode,
      sourceFlow,
      studentFirstNameProvided: Boolean(sanitizedStudentFirstName),
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

      const responseCode: string | null = data?.error?.code ?? data?.code ?? null
      const responseMessage: string | null = data?.error?.message ?? data?.message ?? null
      if (responseCode === "OUT_OF_SCOPE") {
        const fallbackMessage = t("editor.outOfScope.body")
        const noticeMessage =
          locale === "de-DE" ? fallbackMessage : responseMessage ?? fallbackMessage
        showOutOfScopeNotice(noticeMessage, responseCode ?? "OUT_OF_SCOPE")
        return
      }

      if (!response.ok || !data?.success) {
        const mapped = responseCode ? GENERATION_ERROR_MAP[responseCode] : null
        setGenerationError(
          mapped?.message || data?.error?.message || "We couldn't generate a draft right now.",
        )
        setGenerationAction(mapped?.action ?? null)
        const blockedLanguagePayload = data?.data?.blockedLanguage ?? null
        if (blockedLanguagePayload) {
          setBlockedLanguageContext(blockedLanguagePayload)
        } else {
          setBlockedLanguageContext(null)
        }
        if (data?.data?.redactedPreview) {
          setSensitivePreview(data.data.redactedPreview)
        }
        logClientEvent("draft_generate_failed", {
          code: responseCode ?? "UNKNOWN_ERROR",
        })

        return
      }
      setBlockedLanguageContext(null)
      setOutOfScopeNotice(false)
      setOutOfScopeMessage("")

      logClientEvent("draft_generate_succeeded", {
        tone: selectedTone,
        language: languageChoice,
        sourceFlow,
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

      const nextSafetyOutput = data.data.safetyAnalysis ?? null
      const nextDeescalationSummary = data.data.deescalationSummary ?? null
      const nextDocumentationModeActive = Boolean(data.data.documentationModeActive)
      const rewriteReason = inferRewriteReason({
        deescalationSummary: nextDeescalationSummary,
        safetyAnalysis: nextSafetyOutput,
        documentationMode: nextDocumentationModeActive,
        inputReframed: Boolean(responseMeta?.inputReframed),
      })
      const reactionPrediction = inferReactionPrediction(nextSafetyOutput?.reactionForecast)
      const riskFlagTypes = inferRiskFlagTypes(nextSafetyOutput)

      draftEditDepthRef.current = 0
      rewriteReasonRef.current = rewriteReason
      teacherIntentRef.current = data.data.metadata.teacherIntent ?? null
      rewriteSuggestionPendingRef.current = Boolean(rewriteReason)

      setGeneratedDraft(data.data.generatedDraft)
      setDraftMetadata(data.data.metadata)
      setDraftStructure(data.data.formattedDraft ?? null)
      setDeescalationSummary(nextDeescalationSummary)
      setSafetyAnalysis(nextSafetyOutput)
      console.log("safetyOutput", nextSafetyOutput)
      setDocumentationModeActive(nextDocumentationModeActive)
      setEnforcedGreeting(data.data.greeting ?? null)
      setLastGenerationSignature({
        content: trimmedContent,
        mode,
      })
      setUsage(data.data.usage)
      const now = new Date()
      saveLastRunTimestamp(now)
      if (typeof window !== "undefined") {
        const event =
          typeof window.CustomEvent === "function"
            ? new CustomEvent("zaza:diagnostics-updated", { detail: { timestamp: now } })
            : new Event("zaza:diagnostics-updated")
        window.dispatchEvent(event)
      }
      setGenerationAction(null)

      sendDraftInteraction({
        event_name: "draft_created",
        workflow_type: nextWorkflowType,
        message_context: inferDraftMessageContext(mode, nextDocumentationModeActive),
      })

      if (rewriteReason) {
        sendDraftInteraction({
          event_name: "rewrite_suggested",
          workflow_type: nextWorkflowType,
          message_context: inferDraftMessageContext(mode, nextDocumentationModeActive),
          rewrite_reason: rewriteReason,
        })
      }

      for (const riskFlagType of riskFlagTypes) {
        sendDraftInteraction({
          event_name: "risk_flag_triggered",
          workflow_type: nextWorkflowType,
          message_context: inferDraftMessageContext(mode, nextDocumentationModeActive),
          risk_flag: riskFlagType,
          rewrite_reason: rewriteReason,
        })
      }

      if (reactionPrediction) {
        sendDraftInteraction({
          event_name: "reaction_prediction_generated",
          workflow_type: nextWorkflowType,
          message_context: inferDraftMessageContext(mode, nextDocumentationModeActive),
          reaction_prediction: reactionPrediction,
        })
      }
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
      const token = await getIdToken()
      const response = await fetch(`/api/snippets?limit=${HISTORY_PAGE_SIZE}${queryParam}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Unable to load history.")
      }
      const nextCursor = payload?.data?.nextCursor ?? null
      setHistoryCursor(nextCursor)
      setHistory((prev) => (append ? [...prev, ...(payload.data.snippets ?? [])] : payload.data.snippets ?? []))
    } catch (error) {
      console.error("[v1] Failed to load snippet history", error)
      setHistoryError(t("editor.history.error"))
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
    clearPanicScanHandoff()
    resetGeneratedOutput()
    setLastGenerationSignature(null)
    setContent(snippet.generatedText)
    setSelectedTone(snippet.tone as ToneKey)
    setLanguageChoice(snippet.language as DraftLanguage)
    setSubject(snippet.contextUsed?.subject ?? "")
    setGradeLevel(snippet.contextUsed?.gradeLevel ?? "")
    setStudentFirstNameInput("")
    setPronounPreference(snippet.pronounPreference ?? "auto")
    setMode(snippet.mode ?? "parent_message")
  }

  const deleteSnippet = async (snippetId: string) => {
    try {
      const token = await getIdToken()
      if (!token) throw new Error("Missing auth token")

      const response = await fetch(`/api/snippets/${snippetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const handleInsertCommentBankComment = (commentText: string) => {
    clearPanicScanHandoff()
    resetGeneratedOutput()
    setLastGenerationSignature(null)
    setContent((current) => {
      const trimmedCurrent = current.trim()
      return trimmedCurrent ? `${trimmedCurrent}\n\n${commentText}` : commentText
    })
    setMode("report_comment")
    focusEditor()
  }

  const handleEditDraft = () => {
    if (!generatedDraft) {
      return
    }
    if (rewriteSuggestionPendingRef.current) {
      sendDraftInteraction({
        event_name: "rewrite_rejected",
        workflow_type: "rewrite_existing",
        rewrite_reason: rewriteReasonRef.current,
      })
      workflowTypeRef.current = "rewrite_existing"
      rewriteSuggestionPendingRef.current = false
    }
    clearPanicScanHandoff()
    setContent(appendDraftAttribution(generatedDraft, draftAttributionLine))
    focusEditor()
  }

  const handleRegenerateDraft = () => {
    handleGenerate()
  }

  const handleRewriteDraft = () => {
    if (!generatedDraft) {
      return
    }

    sendDraftInteraction({
      event_name: "rewrite_accepted",
      workflow_type: "tone_adjustment",
      rewrite_reason: rewriteReasonRef.current ?? "clarity",
    })
    rewriteSuggestionPendingRef.current = false
    handleGenerate({ rewrite: true, previousDraft: generatedDraft })
  }

  const handleActivateDocumentationMode = () => {
    sendDraftInteraction({
      event_name: "documentation_mode_enabled",
      workflow_type: "documentation_mode",
      message_context: inferDraftMessageContext(mode, true),
      rewrite_reason: "documentation_precision",
    })
    rewriteSuggestionPendingRef.current = false
    void handleGenerate({ documentationMode: true })
  }

  const buildSha =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    "local"
  const showBuildInfo = process.env.NODE_ENV !== "production"

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      <main
        className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full"
        data-build-stamp={buildSha}
      >
        {/* Main Content Area */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              {formatGreetingDisplay(greeting, userName)}
            </h1>
            <p className="text-base sm:text-lg text-white/95 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)]">
              {locale === "de-DE"
                ? "Lassen Sie uns präzise und professionell bleiben."
                : "Let's keep it crisp and professional."}
            </p>
          </div>
          {panicScanHandoff?.bannerVisible && (
            <div className="rounded-2xl border border-white/20 bg-purple-900/40 px-4 py-3 text-sm text-white/90">
              <div className="flex items-start justify-between gap-3">
                <p>{t("panicScanReturnNote")}</p>
                <button
                  type="button"
                  onClick={dismissPanicScanBanner}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70 hover:text-white"
                  aria-label={locale === "de-DE" ? "Panic-Scan-Hinweis schließen" : "Dismiss Panic Scan handoff"}
                >
                  {locale === "de-DE" ? "Schließen" : "Dismiss"}
                </button>
              </div>
            </div>
          )}

        {isLimitedUser && usage.remaining === 0 && (
          <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-200 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-100 space-y-3">
            <p>{t("account.billing.paywallMessage")}</p>
            <Link href="/account">
              <Button variant="outline" className="text-amber-900 dark:text-amber-200">
                {t("account.billing.upgradeButton")}
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-6">
          {showWellbeingInsights && <MiniInsightsBar />}

          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
            {INPUT_MODE_CARD_DEFINITIONS.map((card) => {
              const Icon = card.icon
              const title = t(card.titleKey)
              const description = t(card.descriptionKey)
              const buttonLabel = t(card.action.labelKey)
              const tileButtonClass =
                "w-full rounded-xl px-4 py-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-transparent bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-700 disabled:text-white/70 disabled:cursor-not-allowed"
              return (
                <article
                  key={card.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/30 bg-white/90 p-4 text-sm text-slate-900 shadow-lg shadow-black/30 backdrop-blur transition duration-200 hover:-translate-y-0.5 dark:border-white/20 dark:bg-white/10 dark:text-white"
                >
                  <div className="space-y-2">
                    <Icon className="h-6 w-6 text-indigo-600 dark:text-purple-300" aria-hidden="true" />
                    <p className="text-base font-semibold">{title}</p>
                    <p className="text-xs text-slate-600 dark:text-white/70">{description}</p>
                  </div>
                  <div>
                    {card.action.type === "focus" ? (
                      <Button size="sm" variant="ghost" onClick={focusEditor} className={tileButtonClass}>
                        {buttonLabel}
                      </Button>
                    ) : (
                      <Link href={card.action.href}>
                        <Button size="sm" variant="ghost" className={tileButtonClass}>
                          {buttonLabel}
                        </Button>
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
            </div>
          <section className="glass shadow-lg rounded-xl p-6 sm:p-8 transition-all duration-200 border border-white/40 dark:border-white/30 bg-white/90 dark:bg-white/15 backdrop-blur-[32px]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onInput={adjustTextareaHeight}
                placeholder={
                  locale === "de-DE"
                    ? `Beschreiben Sie die Situation...

Beispiele:
- Schüler der 6. Klasse mit Schwierigkeiten bei Brüchen, braucht ermutigendes Feedback
- Eltern-E-Mail zu Hausaufgaben, professioneller und einfühlsamer Ton
- Zeugniskommentar für hervorragende Fortschritte beim Leseverständnis`
                    : `Describe the situation...

Examples:
- Year 6 student struggling with fractions, needs encouraging feedback
- Parent email about homework concerns, professional and empathetic tone
- Report card comment for excellent progress in reading comprehension`
                }
                className="w-full min-h-[80px] max-h-[320px] text-base sm:text-lg text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0 resize-none placeholder:text-gray-600 dark:placeholder:text-white/60 leading-relaxed font-medium"
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
            </section>
            {safetyAnalysis && (
              <TriggerList
                triggeredSignals={safetyAnalysis.triggeredSignals as any}
                riskLevel={safetyAnalysis.riskLevel}
              />
            )}
          </section>

          {outOfScopeNotice && (
            <div className="mt-4 rounded-2xl border border-white/30 bg-white/10 p-4 shadow-lg text-sm text-white space-y-2">
              <div className="flex items-start gap-3">
                <Info className="text-white" size={20} />
                <div className="space-y-1">
                  <p className="font-semibold text-white text-sm">{t("editor.outOfScope.title")}</p>
                  <p className="text-xs text-white/80">
                    {outOfScopeMessage || t("editor.outOfScope.body")}
                  </p>
                  <p className="text-[11px] text-white/60">{t("editor.outOfScope.helper")}</p>
                </div>
              </div>
            </div>
          )}

          {!outOfScopeNotice && showWellbeingInsights && <ContextualWellbeingTip />}

          <section className="space-y-3">
            <SegmentedControl
              options={toneControlOptions}
              value={selectedTone}
              onChange={(value) => setSelectedTone(value as ToneKey)}
              className="bg-white/10 border-white/20 dark:bg-white/5 dark:border-white/10 shadow-inner"
            />
          </section>

          <section className="space-y-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {t("editor.rewriteMode.label")}
            </span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {t("editor.rewriteMode.helper")}
            </p>
            <div className="bg-white/10 border border-white/20 dark:bg-white/5 dark:border-white/10 rounded-xl p-1 shadow-inner">
              <SegmentedControl
                options={[
                  {
                    value: "standard",
                    label: t("editor.rewriteMode.standard"),
                    ariaLabel: t("editor.rewriteMode.standard"),
                  },
                  {
                    value: "forward_safe",
                    label: t("editor.rewriteMode.forwardSafe"),
                    ariaLabel: t("editor.rewriteMode.forwardSafe"),
                  },
                ]}
                value={rewriteMode}
                onChange={(value) => setRewriteMode(value as RewriteMode)}
                ariaLabel={t("editor.rewriteMode.label")}
                className="border-none bg-transparent p-0 shadow-none"
              />
            </div>
          </section>

          <section className="space-y-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{t("editor.mode.label")}</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{t("editor.mode.helper")}</p>
            <div className="bg-white/10 border border-white/20 dark:bg-white/5 dark:border-white/10 rounded-xl p-1 shadow-inner">
              <SegmentedControl
                options={modeControlOptions}
                value={mode}
                onChange={(value) => handleModeChange(value as ModeKey)}
                ariaLabel={t("editor.mode.label")}
                className="border-none bg-transparent p-0 shadow-none"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={languageChoice}
              onChange={handleLanguageChange}
              aria-label={t("languageDropdown.label")}
              className="bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600 shadow-sm rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
            <select
              value={pronounPreference}
              onChange={(event) => setPronounPreference(event.target.value as PronounPreference)}
              className="bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600 shadow-sm rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
            >
              {PRONOUN_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </section>

          <section>
            <details className="rounded-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-semibold text-white/90">
                <span>{t("editor.details.summaryTitle")}</span>
                <span className="text-xs text-white/60">{t("editor.details.summaryHint")}</span>
              </summary>
              <div className="px-4 pb-4">
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="min-w-[200px] space-y-1">
                    <input
                      value={studentFirstNameInput}
                      onChange={(event) => setStudentFirstNameInput(event.target.value)}
                      placeholder={t("editor.studentName.placeholder")}
                      className="w-full bg-white/90 dark:bg-white/10 rounded-xl border border-white/40 dark:border-white/30 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
                    />
                    {displayedStudentFirstName && (
                      <p className="text-xs text-white/60">
                        {t("editor.studentName.display", { name: displayedStudentFirstName })}
                      </p>
                    )}
                  </div>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder={t("editor.placeholder.subject")}
                    className="bg-white/90 dark:bg-white/10 rounded-xl border border-white/40 dark:border-white/30 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
                  />
                  <input
                    value={gradeLevel}
                    onChange={(event) => setGradeLevel(event.target.value)}
                    placeholder={t("editor.placeholder.gradeLevel")}
                    className="bg-white/90 dark:bg-white/10 rounded-xl border border-white/40 dark:border-white/30 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
                  />
                </div>
              </div>
            </details>
          </section>

          <section className="space-y-3 text-center">
            <Button
              onClick={() => handleGenerate()}
              disabled={!content.trim() || isGenerating}
              className="w-full bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] text-white dark:text-white text-base sm:text-lg font-bold py-5 sm:py-6 min-h-[52px] rounded-xl transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_48px_rgba(124,58,237,0.45)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_22px_56px_rgba(124,58,237,0.55)] hover:-translate-y-1 hover:scale-[1.02] active:translate-y-[1px] active:scale-[0.99] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_12px_28px_rgba(124,58,237,0.5)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 border-2 border-white/30 motion-reduce:transition-none motion-reduce:transform-none"
              aria-label={t("button.generate")}
            >
              {isGenerating ? t("editor.generating.message") : t("button.generate")}
            </Button>
            <div className="text-sm text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)] font-medium">
              {isLimitedUser ? (
                <>{t("insights.draftsUsed", { used: draftsUsed, limit: draftsLimit })}</>
              ) : (
                <>{t("insights.unlimitedDrafts")}</>
              )}
            </div>
            {isLimitedUser && (
              <div>
                <Link href="/account">
                  <Button
                    className="bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white border-transparent shadow-[0_8px_20px_rgba(124,58,237,0.35)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.5)] hover:from-[#9333ea] hover:to-[#6b21a8]"
                  >
                {t("account.billing.upgrade")}
              </Button>
            </Link>
          </div>
        )}
      </section>

        {showWelcomeBox && !outOfScopeNotice && (
          <div className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg text-sm text-white">
            <div className="flex flex-col gap-2">
              <p className="font-semibold">{t("editor.welcome.title")}</p>
              <p>
                {t("editor.welcome.warning")} {t("editor.welcome.learnMorePrefix")}{" "}
                <Link href="/privacy" className="underline">
                  {t("link.privacy")}
                </Link>{" "}
                {t("editor.welcome.learnMoreMiddle")}{" "}
                <Link href="/account/privacy" className="underline">
                  {t("link.privacySafety")}
                </Link>
                {t("editor.welcome.learnMoreSuffix")}
              </p>
              <Button
                onClick={handleWelcomeDismiss}
                variant="tertiary"
                size="md"
                aria-label={t("editor.welcome.dismiss")}
                className="self-start h-11 px-4 text-xs font-semibold uppercase tracking-[0.1em] rounded-full transition focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {t("editor.welcome.dismiss")}
              </Button>
              <label className="flex items-center gap-2 text-sm text-white/90 mt-2">
                <input
                  type="checkbox"
                  checked={dontShowWelcome}
                  onChange={handleDontShowAgain}
                  className="rounded"
                />
                {t("welcome.dontShowAgain")}
              </label>
            </div>
            {onboardingError && <p className="text-xs text-rose-200 mt-2">{onboardingError}</p>}
          </div>
        )}
        </div>

        {!outOfScopeNotice && (
          <details className="mt-10 rounded-xl bg-white/10 p-4 backdrop-blur border border-white/20 text-white shadow-lg">
          <summary className="text-lg font-semibold cursor-pointer flex items-center">
            {t("editor.history.title")}
            <span className="ml-1.5 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full">
              {history.length}
            </span>
          </summary>
          <p className="text-sm text-white/70 mt-2">{t("editor.history.description")}</p>
          <p className="text-xs text-white/50 mt-1">
            {t("editor.history.storage")}{" "}
            <Link href="/account/data" className="underline">
              {t("editor.history.viewData")}
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
            <p className="text-sm text-white/60 mt-2">{t("editor.history.empty")}</p>
          )}
          <ul className="mt-4 space-y-4">
            {history.map((item) => {
              const historyModeKey = (item.mode ?? DEFAULT_DRAFT_MODE) as ModeKey
              return (
                <li
                  key={item.id}
                  className="rounded-xl bg-white/20 p-3 border border-white/20 flex flex-col gap-1 shadow-sm"
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
                  <p className="text-sm text-white/90">
                    {t("editor.history.language")}: {item.language.toUpperCase()}
                  </p>
                  <p className="text-sm text-white/90">
                    {t("editor.history.words")}: {item.wordCount}
                  </p>
                  <p className="text-xs text-white/60 uppercase tracking-wide">
                    {t("editor.history.mode")} {t(MODE_LABEL_KEYS[historyModeKey])}
                  </p>
                  {(item.contextUsed?.subject || item.contextUsed?.gradeLevel) && (
                    <p className="text-sm text-white/80">
                      {item.contextUsed?.subject
                        ? `${t("editor.history.subjectLabel")}: ${item.contextUsed.subject}`
                        : ""}
                      {item.contextUsed?.gradeLevel
                        ? ` | ${t("editor.history.gradeLabel")}: ${item.contextUsed.gradeLevel}`
                        : ""}
                    </p>
                  )}
                  {item.pronounResolution?.resolvedPreference && (
                    <p className="text-xs text-white/60 uppercase tracking-wide">
                      {t("editor.history.pronouns", { value: item.pronounResolution.resolvedPreference })}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => loadSnippet(item)}>
                      {t("draft.action.load")}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-200" onClick={() => deleteSnippet(item.id)}>
                      {t("draft.action.delete")}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          {historyCursor && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 text-white border-white/60"
              onClick={() => refreshHistory(historyCursor, true)}
              disabled={historyLoading}
            >
              {t("editor.history.loadMore")}
            </Button>
          )}
          </details>
        )}

        {!outOfScopeNotice && (
          <CommentBankSection
            generatedComment={mode === "report_comment" ? generatedDraft : null}
            mode={mode}
            getIdToken={getIdToken}
            onInsertComment={handleInsertCommentBankComment}
          />
        )}

        {isGenerating && (
          <div className="mt-4 rounded-xl bg-white/10 border border-white/20 p-4 text-sm text-white/90 shadow-lg space-y-3">
            <p className="font-semibold text-white">
              {t("editor.generating.message")}
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
            {blockedLanguageContext && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-sm text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100">
                <p className="font-semibold">{blockedLanguageContext.teacherNote}</p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-blue-800 dark:text-blue-200">
                  {blockedLanguageContext.safeAlternatives.map((alternative, idx) => (
                    <li key={idx}>{alternative}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {generatedDraft && draftMetadata && (
          <div className="mt-8 space-y-3">
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
              showUsageLimit={isLimitedUser}
              buildSha={buildSha}
              structure={draftStructure ?? undefined}
              canExport={canExport}
              getIdToken={getIdToken}
              headerBadge={<SafetyBadge riskLevel={safetyAnalysis?.riskLevel} />}
              headerBanner={<ProfessionalRiskBanner flags={safetyAnalysis?.professionalRiskFlags} />}
              resultModeBadge={
                documentationModeActive
                  ? t("draft.documentation.badge")
                  : draftMetadata?.forwardSafeRewrite
                    ? t("editor.rewriteMode.forwardSafeBadge")
                    : null
              }
              documentationMode={documentationModeActive}
              draftAttribution={draftAttributionLine}
              safeToSend={safeToSendAssessment}
            />
            {safetyAnalysis && (
              <ReactionForecast
                forecast={safetyAnalysis.reactionForecast}
                riskLevel={safetyAnalysis.riskLevel}
              />
            )}
            {safetyAnalysis && (
              <ExplanationPanel
                explanationLines={safetyAnalysis.explanationLines}
                riskLevel={safetyAnalysis.riskLevel}
              />
            )}
            {deescalationSummary?.wasDeescalated && (
              <DeescalationBanner summary={deescalationSummary} />
            )}
            <DocumentationModeButton
              available={Boolean(safetyAnalysis?.documentationModeAvailable)}
              onActivate={handleActivateDocumentationMode}
            />
          </div>
        )}
        {generatedDraft && draftMetadata && explanationTier && (
          <ReframeExplanation tier={explanationTier} />
        )}
      </main>

      <div className="main-editor-footer">
        <FooterSlim />
        {showBuildInfo && (
          <div className="mt-2 text-center text-[11px] text-white/60 uppercase tracking-[0.2em]">
            Build {buildSha} • {process.env.NODE_ENV ?? "dev"}
          </div>
        )}
      </div>

      <ZaraAssistant />
    </div>
  )
}





