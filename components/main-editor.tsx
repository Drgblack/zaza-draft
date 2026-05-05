"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useLocale } from "@/hooks/use-locale"
import { useAnalyticsConsent } from "@/hooks/use-analytics-consent"
import FooterSlim from "@/components/FooterSlim"
import { ZaraAssistant } from "@/components/zara-assistant"
import { DraftOutput, classifyEditDistance } from "@/components/draft-output"
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
import {
  logClientEvent,
  logClientEventOnce,
  logDraftInteractionEvent,
  TRUST_FUNNEL_EVENTS,
} from "@/lib/analytics"
import { emitClientSignal } from "@/lib/analytics/client-signal-emitter"
import { FREE_TIER_LIMIT, type PlanType } from "@/lib/usage"
import type { DeescalationSummary } from "@/lib/deescalation/types"
import type { DraftStructure } from "@/lib/draft/format"
import { cleanStudentName } from "@/lib/draft/student-name"
import { resolveEditableTextLang, resolveLanguageChoiceFromLocale } from "@/lib/draft/language"
import type { DraftLanguage, DraftMode, PronounPreference } from "@/lib/types"
import { MODE_LABEL_KEYS, DEFAULT_DRAFT_MODE } from "@/lib/draft-mode"
import { isValidDraftRequest, OUT_OF_SCOPE_REDIRECT_MESSAGE } from "@/lib/draft/scope-guard"
import type { GreetingSource, NameConfidenceLevel } from "@/lib/draft/greeting-resolution"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Camera, FileText, Image, Info, Mail, MessageCircle, Mic, Sun, Target, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { formatGreetingDisplay } from "@/lib/text/greeting-display"
import { looksLikeHumanDisplayName } from "@/lib/text/human-display-name"
import { saveLastRunTimestamp } from "@/lib/diagnostics/local-storage"
import { resolveTeacherSignatureName } from "@/lib/draft/teacher-signature"
import {
  buildDraftAdjustmentReasons,
  buildSaferDraftCategories,
  buildDraftAdjustmentSummary,
  shouldShowToneSofteningExplanation,
  type SaferDraftCategory,
} from "@/lib/draft/adjustment-reasons"
import type { TeacherDraftFeedback } from "@/lib/draft/teacher-draft-feedback"
import type { TeacherDraftSuggestion } from "@/lib/draft/teacher-draft-advisory"
import type { DraftProfessionalJudgementMeta } from "@/components/draft-judgement-strip"
import { assessSafeToSend } from "@/lib/safe-to-send"
import { buildObservationOnlyRecoveryInput } from "@/lib/draft/diagnostic-recovery"
import {
  appendDraftAttribution,
  getDraftAttributionLine,
  resolveDraftSignatureEnabled,
  shouldShowDraftAttribution,
} from "@/lib/draft/draft-attribution"
import {
  countAnsweredOnboardingFields,
  EMPTY_ONBOARDING_PROFILE,
  type OnboardingMainUseCase,
  type OnboardingProfile,
  type OnboardingRegion,
  type OnboardingRole,
  type OnboardingSchoolType,
  type OnboardingTonePreference,
  type OnboardingWritingStressPoint,
} from "@/lib/onboarding-profile"
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
import {
  looksLikeIncomingParentMessage,
  looksLikeIncomingParentEmail,
  looksLikeTeacherAuthoredDraft,
  type ParentMessageInputType,
} from "@/lib/generation/classification"
import { cn } from "@/lib/utils"

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
type ParentInputMode = ParentMessageInputType

type ToneKey = (typeof TONE_OPTIONS)[number]["id"]
type RewriteMode = "standard" | "forward_safe"
type DisplayModeKey = DraftMode | "documentation_mode"

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

type InputModeMismatchSuggestion = {
  id: string
  message: string
  action: string
  nextMode: ParentInputMode
}

function looksLikeCompleteTeacherDraftForModeSuggestion(text: string) {
  const normalized = text.replace(/\r/g, "").trim()
  if (!normalized) {
    return false
  }

  if (looksLikeTeacherAuthoredDraft(normalized)) {
    return true
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) {
    return false
  }

  const firstLine = lines[0] ?? ""
  const greetingLine = /^subject:|^betreff:/i.test(firstLine) ? (lines[1] ?? "") : firstLine
  const lastLine = lines[lines.length - 1] ?? ""
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const hasGreeting = /^(?:dear|hello|hi|guten tag|liebe(?:r|n)?|sehr geehrte)\b/i.test(greetingLine)
  const hasClosingBlock =
    /(?:^|\n)\s*(?:Regards|Kind regards|Best regards|Best wishes|Yours sincerely|Sincerely|Mit freundlichen Gr[üu]ßen|Herzliche Gr[üu]ße|Freundliche Gr[üu]ße),?\s*\n\s*[\p{L}][\p{L}.' -]*\s*$/iu.test(
      normalized,
    )
  const hasTeacherPerspectiveSignal =
    /\b(?:your child|your son|your daughter|in my class|in class|at school|learning environment|i have|i wanted to let you know|i wanted to update you|i would like your support|please speak with|please remind|follow instructions|settled start)\b/i.test(
      normalized,
    )
  const hasParentRelationshipSignoff =
    /\b(?:dad|mum|mom|mother|father|parent|carer|guardian|grandma|grandmother|grandad|grandfather)\b/i.test(
      lastLine,
    ) || /\b[\p{L}]+['’]s\s+(?:dad|mum|mom|mother|father|parent|carer|guardian)\b/iu.test(lastLine)

  return (
    hasGreeting &&
    hasClosingBlock &&
    hasTeacherPerspectiveSignal &&
    paragraphs.length >= 3 &&
    !looksLikeIncomingParentMessage(normalized) &&
    !hasParentRelationshipSignoff
  )
}

function hasTeacherDraftAuthoredEnvelopeForScopeBypass(text: string) {
  const normalized = text.replace(/\r/g, "").trim()
  if (!normalized) {
    return false
  }

  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  if (paragraphs.length < 3) {
    return false
  }

  const firstParagraph = paragraphs.find((paragraph) => !/^(subject|betreff):/i.test(paragraph))
  const greetingParagraph = firstParagraph
    ? firstParagraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
    : ""
  const hasGreeting = /^(?:dear|hi|hello|guten tag|hallo|liebe(?:r|n)?|sehr geehrte(?:r)?)/i.test(
    greetingParagraph,
  )
  const hasClosingBlock =
    /(?:^|\n)\s*(?:Regards|Kind regards|Best regards|Best wishes|Yours sincerely|Sincerely|Mit freundlichen Gr[üu]ßen|Herzliche Gr[üu]ße|Freundliche Gr[üu]ße),?\s*\n\s*[\p{L}][\p{L}.' -]*\s*$/iu.test(
      normalized,
    )
  if (!hasGreeting || !hasClosingBlock) {
    return false
  }

  const bodyParagraphs = paragraphs.slice(1, -1)
  return bodyParagraphs.some((paragraph) => paragraph.length > 20)
}

const LOADING_MESSAGES = [
  "Analyzing your request...",
  "Understanding context...",
  "Selecting the best tone...",
  "Crafting your message...",
] as const

const PREFILL_STORAGE_KEY = "zazaDraftPrefill"
const FIRST_VALUE_SAMPLE_STORAGE_KEY = "zaza:first-value-sample"
const FIRST_VALUE_SAMPLE_SEEN_STORAGE_KEY = "zaza:first-value-sample-seen"
const PARENT_INPUT_MODE_STORAGE_KEY = "zaza:parent-input-mode"

type FirstValueSample = {
  subject: string
  content: string
}

type InputModeCardDefinition = {
  id: string
  titleKey: string
  descriptionKey: string
  icon: LucideIcon
  action: { type: "focus"; labelKey: string } | { type: "link"; href: string; labelKey: string }
}

type OnboardingFeatureCard = {
  id: string
  titleKey: string
  descriptionKey: string
  icon: LucideIcon
}

type OnboardingState = {
  onboardingCompleted: boolean
  onboardingSkipped: boolean
  onboardingProfile: OnboardingProfile
  welcomeEmailSent: boolean
  firstLogin: boolean
}

type OnboardingStepId = "context" | "use_case" | "stress" | "tone" | "region"

const ONBOARDING_ROLE_OPTIONS: NonNullable<OnboardingRole>[] = [
  "teacher",
  "school_leader",
  "senc_support",
  "admin_staff",
  "other",
]

const ONBOARDING_SCHOOL_TYPE_OPTIONS: NonNullable<OnboardingSchoolType>[] = [
  "primary",
  "secondary",
  "all_through",
  "international_private",
  "other",
]

const ONBOARDING_USE_CASE_OPTIONS: NonNullable<OnboardingMainUseCase>[] = [
  "parent_messages",
  "reports",
  "both",
]

const ONBOARDING_STRESS_OPTIONS: NonNullable<OnboardingWritingStressPoint>[] = [
  "deescalation",
  "clarity",
  "tone",
  "speed",
  "difficult_conversations",
]

const ONBOARDING_TONE_OPTIONS: NonNullable<OnboardingTonePreference>[] = [
  "warm",
  "professional",
  "direct",
  "empathetic",
]

const ONBOARDING_REGION_OPTIONS: NonNullable<OnboardingRegion>[] = [
  "germany_austria_switzerland",
  "uk_ireland",
  "usa_canada",
  "australia_new_zealand",
  "international_school",
  "other_europe",
  "latin_america",
  "middle_east_africa",
  "asia_pacific",
  "other_prefer_not_to_say",
]

const FIRST_VALUE_SAMPLES: Record<"en" | "de", FirstValueSample> = {
  en: {
    subject: "Homework concern follow-up",
    content:
      "A parent emailed late last night saying they are frustrated because their child keeps coming home upset about homework. They wrote that the workload feels unreasonable, the instructions are often unclear, and they are considering escalating the issue to the head teacher if this continues. I want to reply calmly, acknowledge the concern, and suggest a constructive next step without sounding defensive.",
  },
  de: {
    subject: "Rückmeldung zu Hausaufgaben",
    content:
      "Ein Elternteil hat gestern spät geschrieben, dass das Kind wegen der Hausaufgaben wiederholt belastet nach Hause kommt. In der Nachricht steht, die Arbeitsmenge wirke zu hoch, die Aufträge seien nicht immer klar und man erwäge, das Thema an die Schulleitung weiterzugeben, wenn sich nichts ändere. Ich möchte ruhig antworten, die Sorge ernst nehmen und einen konstruktiven nächsten Schritt vorschlagen, ohne defensiv zu wirken.",
  },
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

const PARENT_INPUT_SEGMENT_OPTIONS = [
  {
    id: "parent_message" as ParentInputMode,
    labelKey: "editor.inputMode.parentMessage",
    descriptionKey: "editor.inputMode.parentMessageDescription",
    icon: Mail,
  },
  {
    id: "teacher_draft" as ParentInputMode,
    labelKey: "editor.inputMode.teacherDraft",
    descriptionKey: "editor.inputMode.teacherDraftDescription",
    icon: FileText,
  },
]

const ONBOARDING_FEATURE_CARDS: OnboardingFeatureCard[] = [
  {
    id: "safe-draft",
    titleKey: "homeSafeDraftTitle",
    descriptionKey: "onboarding.feature.safeDraft",
    icon: FileText,
  },
  {
    id: "panic-scan",
    titleKey: "panicScanTitle",
    descriptionKey: "onboarding.feature.panicScan",
    icon: Image,
  },
  {
    id: "report-comment",
    titleKey: "editor.mode.reportComment",
    descriptionKey: "onboarding.feature.reportComment",
    icon: MessageCircle,
  },
]

const SAFE_GENERATION_ERROR_MESSAGE =
  "Draft generation is temporarily unavailable. Please try again in a few seconds."
const SAFE_GENERATION_FALLBACK_MESSAGE =
  "We could not generate your draft just now. Please try again."

const GENERATION_ERROR_MAP: Record<
  string,
  { message: string; action: string | null }
> = {
  USAGE_LIMIT_EXCEEDED: {
    message: `You've used all ${FREE_TIER_LIMIT} free drafts for this month. Upgrade to Draft Pro for unlimited drafts.`,
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
    message: SAFE_GENERATION_ERROR_MESSAGE,
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
    currentMonthUsage: Math.max(FREE_TIER_LIMIT - 1, 0),
    limit: FREE_TIER_LIMIT,
    remaining: Math.max(FREE_TIER_LIMIT - Math.max(FREE_TIER_LIMIT - 1, 0), 0),
  })
  const draftsUsed = usage.currentMonthUsage
  const draftsLimit = usage.limit ?? 0
  const [isQaUser, setIsQaUser] = useState(false)
  const isLimitedUser = usage.plan === "free" && !isQaUser
  const { prefs } = useTeacherPrefs()
  const { analyticsConsent } = useAnalyticsConsent()
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
  const [greeting, setGreeting] = useState("Good morning")
  const [userName, setUserName] = useState("")
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null)
  const [draftMetadata, setDraftMetadata] = useState<any>(null)
  const [draftResponseMeta, setDraftResponseMeta] = useState<{
    requestId?: string
    uidHash?: string
    professionalJudgement?: DraftProfessionalJudgementMeta | null
  } | null>(null)
  const [draftStructure, setDraftStructure] = useState<DraftStructure | null>(null)
  const [deescalationSummary, setDeescalationSummary] = useState<DeescalationSummary | null>(null)
  const [safetyAnalysis, setSafetyAnalysis] = useState<SafetyEngineOutput | null>(null)
  const [outputSafetyAnalysis, setOutputSafetyAnalysis] = useState<SafetyEngineOutput | null>(null)
  const [teacherDraftFeedback, setTeacherDraftFeedback] = useState<TeacherDraftFeedback | null>(null)
  const [teacherDraftSuggestions, setTeacherDraftSuggestions] = useState<TeacherDraftSuggestion[]>([])
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
  const editableTextLang = useMemo(() => resolveEditableTextLang(locale), [locale])
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
  const [parentInputMode, setParentInputMode] = useState<ParentInputMode>("parent_message")
  const [parentInputModeReady, setParentInputModeReady] = useState(false)
  const [dismissedInputModeMismatchId, setDismissedInputModeMismatchId] = useState<string | null>(null)
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>("standard")
  const [inputReframeTier, setInputReframeTier] = useState<"tier1" | "tier2" | null>(null)
  const [inputWasReframed, setInputWasReframed] = useState(false)
  const explanationTier = useMemo(
    () => resolveExplanationTier(inputReframeTier, deescalationSummary),
    [inputReframeTier, deescalationSummary],
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [sensitivePreview, setSensitivePreview] = useState<string | null>(null)
  const [generationAction, setGenerationAction] = useState<string | null>(null)
  const [blockedLanguageContext, setBlockedLanguageContext] = useState<{
    title?: string
    teacherNote: string
    safeAlternatives: string[]
    actionLabel?: string
    variant?: "default" | "diagnostic_speculation"
  } | null>(null)
  const [outOfScopeNotice, setOutOfScopeNotice] = useState(false)
  const [outOfScopeMessage, setOutOfScopeMessage] = useState("")
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const displaySafetyAnalysis = outputSafetyAnalysis ?? safetyAnalysis
  const adjustmentReasons = useMemo(
    () =>
      buildDraftAdjustmentReasons({
        inputSafetyAnalysis: safetyAnalysis,
        outputSafetyAnalysis,
        deescalationSummary,
      }),
    [deescalationSummary, outputSafetyAnalysis, safetyAnalysis],
  )
  const safeToSendAssessment = useMemo(
    () =>
      assessSafeToSend({
        safetyAnalysis: displaySafetyAnalysis,
        deescalationSummary,
      }),
    [deescalationSummary, displaySafetyAnalysis],
  )
  const draftAdjustmentSummary = useMemo(
    () => buildDraftAdjustmentSummary(adjustmentReasons),
    [adjustmentReasons],
  )
  const saferDraftCategories = useMemo<SaferDraftCategory[]>(
    () =>
      buildSaferDraftCategories({
        inputSafetyAnalysis: safetyAnalysis,
        outputSafetyAnalysis,
        deescalationSummary,
        inputReframed: inputWasReframed,
      }),
    [deescalationSummary, inputWasReframed, outputSafetyAnalysis, safetyAnalysis],
  )
  const blockedDiagnosticVisible =
    blockedLanguageContext?.variant === "diagnostic_speculation"
  const blockedForSafety = Boolean(blockedLanguageContext)
  const diagnosticRecovery = useMemo(
    () =>
      blockedDiagnosticVisible
        ? buildObservationOnlyRecoveryInput(content)
        : null,
    [blockedDiagnosticVisible, content],
  )
  const diagnosticSafeExample = useMemo(() => {
    if (!blockedDiagnosticVisible || !blockedLanguageContext) {
      return null
    }

    return (
      blockedLanguageContext.safeAlternatives.find((alternative) =>
        alternative.toLowerCase().startsWith("safer:"),
      ) ??
      blockedLanguageContext.safeAlternatives[0] ??
      null
    )
  }, [blockedDiagnosticVisible, blockedLanguageContext])
  const diagnosticSafeExampleText = diagnosticSafeExample?.replace(/^Safer:\s*/i, "").trim() ?? null
  const showToneSofteningExplanation = useMemo(
    () => shouldShowToneSofteningExplanation(explanationTier, adjustmentReasons),
    [adjustmentReasons, explanationTier],
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
  const parentInputModeButtonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const draftEditDepthRef = useRef(0)
  const pendingTeacherDraftEditRef = useRef<{
    originalDraft: string
    displayedAt: number
    sessionId: string
    uidHash: string
    locale: string
    qualityVerdict?: string | null
    professionalJudgement?: DraftProfessionalJudgementMeta | null
  } | null>(null)
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
  const emitPendingTeacherDraftEditSignal = useCallback(
    async (editedText: string) => {
      const pendingEdit = pendingTeacherDraftEditRef.current
      if (!pendingEdit) {
        return
      }

      pendingTeacherDraftEditRef.current = null
      const editDistanceCategory = classifyEditDistance(pendingEdit.originalDraft, editedText)
      const signalType =
        editDistanceCategory === "none"
          ? "draft_accepted"
          : editDistanceCategory === "minor"
            ? "draft_edited_minor"
            : "draft_edited_major"
      const interactionType =
        editDistanceCategory === "none"
          ? "accepted"
          : editDistanceCategory === "minor"
            ? "edited_minor"
            : "edited_major"

      await emitClientSignal({
        sessionId: pendingEdit.sessionId,
        uidHash: pendingEdit.uidHash,
        signalType,
        payload: {
          interactionType,
          timeToActionMs: Date.now() - pendingEdit.displayedAt,
          sendConfidenceScore: pendingEdit.professionalJudgement?.sendConfidenceScore,
          verdictAtAction: pendingEdit.qualityVerdict ?? undefined,
          editDistanceCategory,
        },
        locale: pendingEdit.locale,
      })
    },
    [],
  )
  const resetGeneratedOutput = useCallback(() => {
    setGeneratedDraft(null)
    setDraftMetadata(null)
    setDraftResponseMeta(null)
    setDraftStructure(null)
    setDeescalationSummary(null)
    setSafetyAnalysis(null)
    setOutputSafetyAnalysis(null)
    setTeacherDraftFeedback(null)
    setTeacherDraftSuggestions([])
    setDocumentationModeActive(false)
    setInputReframeTier(null)
    setInputWasReframed(false)
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
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null)
  const [onboardingVisible, setOnboardingVisible] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(true)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)
  const [onboardingSaving, setOnboardingSaving] = useState(false)
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0)
  const [onboardingForm, setOnboardingForm] = useState<OnboardingProfile>(EMPTY_ONBOARDING_PROFILE)
  const welcomeEmailRequestedRef = useRef(false)
  const onboardingBannerLoggedRef = useRef<string | null>(null)
  const [firstValueSampleLoaded, setFirstValueSampleLoaded] = useState(false)
  const [firstValueSampleSeen, setFirstValueSampleSeen] = useState(false)
  const firstValueSample = useMemo(
    () => (locale === "de-DE" ? FIRST_VALUE_SAMPLES.de : FIRST_VALUE_SAMPLES.en),
    [locale],
  )
  const isFirstRunFreeUser = Boolean(onboardingState?.firstLogin && usage.plan === "free")
  const isFirstValueSampleActive =
    firstValueSampleLoaded && content.trim() === firstValueSample.content.trim()
  const onboardingAnsweredCount = countAnsweredOnboardingFields(onboardingForm)
  const onboardingSteps = useMemo<
    Array<{ id: OnboardingStepId; title: string; description: string }>
  >(
    () => [
      {
        id: "context",
        title: t("onboarding.capture.step.context.title"),
        description: t("onboarding.capture.step.context.description"),
      },
      {
        id: "use_case",
        title: t("onboarding.capture.step.useCase.title"),
        description: t("onboarding.capture.step.useCase.description"),
      },
      {
        id: "stress",
        title: t("onboarding.capture.step.stress.title"),
        description: t("onboarding.capture.step.stress.description"),
      },
      {
        id: "tone",
        title: t("onboarding.capture.step.tone.title"),
        description: t("onboarding.capture.step.tone.description"),
      },
      {
        id: "region",
        title: t("onboarding.capture.step.region.title"),
        description: t("onboarding.capture.step.region.description"),
      },
    ],
    [t],
  )
  const activeOnboardingStep = onboardingSteps[onboardingStepIndex] ?? onboardingSteps[0]
  const focusEditor = useCallback(() => {
    textareaRef.current?.focus()
  }, [])
  const [prefillApplied, setPrefillApplied] = useState(false)
  const [panicScanReturnHandled, setPanicScanReturnHandled] = useState(false)
  const draftsCreatedThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return history.filter((item) => {
      const timestamp = new Date(item.createdAt).getTime()
      return Number.isFinite(timestamp) && timestamp >= weekAgo
    }).length
  }, [history])
  const recentDraftsAvailable = history.length
  const usedDraftThisTerm = recentDraftsAvailable > 0 || usage.currentMonthUsage > 0
  const documentationDisplayActive = documentationModeActive && mode === "parent_message"
  const effectiveDisplayMode: DisplayModeKey = documentationDisplayActive
    ? "documentation_mode"
    : mode
  const selectedModeLabel = useMemo(
    () => {
      if (effectiveDisplayMode === "documentation_mode") {
        return t("draft.documentation.badge")
      }
      if (effectiveDisplayMode === "report_comment") {
        return t(MODE_LABEL_KEYS.report_comment)
      }
      return parentInputMode === "teacher_draft"
        ? t("editor.inputMode.teacherDraft")
        : t(MODE_LABEL_KEYS.parent_message)
    },
    [effectiveDisplayMode, parentInputMode, t],
  )
  const modeSwitchButtonLabel = documentationDisplayActive
    ? t("editor.mode.switchToMessage")
    : t("editor.mode.switchToDocumentation")
  const selectedModeLabelForInsights = useMemo(
    () => {
      if (mode === "report_comment") {
        return t(MODE_LABEL_KEYS.report_comment)
      }
      return parentInputMode === "teacher_draft"
        ? t("editor.inputMode.teacherDraft")
        : t(MODE_LABEL_KEYS.parent_message)
    },
    [mode, parentInputMode, t],
  )
  const parentInputPromise = useMemo(() => {
    if (mode !== "parent_message") {
      return null
    }
    return parentInputMode === "teacher_draft"
      ? t("editor.inputMode.teacherDraftPromise")
      : t("editor.inputMode.parentMessagePromise")
  }, [mode, parentInputMode, t])
  const inputModeMismatchSuggestion = useMemo<InputModeMismatchSuggestion | null>(() => {
    if (mode !== "parent_message") {
      return null
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length < 40) {
      return null
    }

    if (
      parentInputMode === "teacher_draft" &&
      !looksLikeCompleteTeacherDraftForModeSuggestion(trimmedContent) &&
      (looksLikeIncomingParentEmail(trimmedContent) || looksLikeIncomingParentMessage(trimmedContent))
    ) {
      return {
        id: `parent_message:${parentInputMode}:${trimmedContent}`,
        message: t("editor.inputMode.mismatch.parentMessage"),
        action: t("editor.inputMode.mismatch.switchToParentMessage"),
        nextMode: "parent_message" as ParentInputMode,
      }
    }

    if (
      parentInputMode === "parent_message" &&
      looksLikeCompleteTeacherDraftForModeSuggestion(trimmedContent)
    ) {
      return {
        id: `teacher_draft:${parentInputMode}:${trimmedContent}`,
        message: t("editor.inputMode.mismatch.teacherDraft"),
        action: t("editor.inputMode.mismatch.switchToTeacherDraft"),
        nextMode: "teacher_draft" as ParentInputMode,
      }
    }

    return null
  }, [content, mode, parentInputMode, t])
  const editorPlaceholder = useMemo(() => {
    if (mode === "parent_message") {
      return parentInputMode === "teacher_draft"
        ? t("editor.inputMode.teacherDraftPlaceholder")
        : t("editor.inputMode.parentMessagePlaceholder")
    }
    return locale === "de-DE"
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
  }, [locale, mode, parentInputMode, t])
  const generateButtonLabel = useMemo(() => {
    if (mode === "report_comment") {
      return t("button.generate.reportComment")
    }

    return parentInputMode === "teacher_draft"
      ? t("button.generate.teacherDraft")
      : t("button.generate.parentMessage")
  }, [mode, parentInputMode, t])
  const greetingHeading = useMemo(() => {
    if (looksLikeHumanDisplayName(userName, user?.email)) {
      return formatGreetingDisplay(greeting, userName)
    }

    return t("editor.greetingFallback")
  }, [greeting, t, user?.email, userName])
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
    if (typeof window === "undefined") {
      return
    }

    const storedParentInputMode = window.localStorage.getItem(PARENT_INPUT_MODE_STORAGE_KEY)
    if (storedParentInputMode === "parent_message" || storedParentInputMode === "teacher_draft") {
      setParentInputMode(storedParentInputMode)
    }
    setParentInputModeReady(true)

    if (window.sessionStorage.getItem(FIRST_VALUE_SAMPLE_STORAGE_KEY) === "1") {
      setFirstValueSampleLoaded(true)
    }
    if (window.sessionStorage.getItem(FIRST_VALUE_SAMPLE_SEEN_STORAGE_KEY) === "1") {
      setFirstValueSampleSeen(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !parentInputModeReady) {
      return
    }

    window.localStorage.setItem(PARENT_INPUT_MODE_STORAGE_KEY, parentInputMode)
  }, [parentInputMode, parentInputModeReady])

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
          setParentInputMode("parent_message")
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

  const loadFirstValueSample = useCallback(
    ({ focus = false }: { focus?: boolean } = {}) => {
      setSubject(firstValueSample.subject)
      setContent(firstValueSample.content)
      setSelectedTone("professional")
      setMode("parent_message")
      setParentInputMode("parent_message")
      setFirstValueSampleLoaded(true)
      setFirstValueSampleSeen(true)
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(FIRST_VALUE_SAMPLE_STORAGE_KEY, "1")
        window.sessionStorage.setItem(FIRST_VALUE_SAMPLE_SEEN_STORAGE_KEY, "1")
      }
      if (focus) {
        requestAnimationFrame(() => {
          focusEditor()
        })
      }
    },
    [firstValueSample.content, firstValueSample.subject, focusEditor],
  )

  const clearFirstValueSample = useCallback(() => {
    if (content.trim() === firstValueSample.content.trim()) {
      setContent("")
    }
    if (subject.trim() === firstValueSample.subject.trim()) {
      setSubject("")
    }
    setFirstValueSampleLoaded(false)
    setFirstValueSampleSeen(true)
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(FIRST_VALUE_SAMPLE_STORAGE_KEY)
      window.sessionStorage.setItem(FIRST_VALUE_SAMPLE_SEEN_STORAGE_KEY, "1")
    }
    requestAnimationFrame(() => {
      focusEditor()
    })
  }, [content, firstValueSample.content, firstValueSample.subject, focusEditor, subject])

  useEffect(() => {
    if (!prefillApplied || !isFirstRunFreeUser || content.trim() || panicScanHandoff) {
      return
    }

    if (firstValueSampleLoaded || !firstValueSampleSeen) {
      loadFirstValueSample()
    }
  }, [
    content,
    firstValueSampleLoaded,
    firstValueSampleSeen,
    isFirstRunFreeUser,
    loadFirstValueSample,
    panicScanHandoff,
    prefillApplied,
  ])

  const handleContentChange = (nextContent: string) => {
    const nextTrimmed = nextContent.trim()

    if (firstValueSampleLoaded && nextTrimmed !== firstValueSample.content.trim()) {
      setFirstValueSampleLoaded(false)
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(FIRST_VALUE_SAMPLE_STORAGE_KEY)
      }
    }

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

  const handleParentInputModeChange = (nextInputMode: ParentInputMode) => {
    if (nextInputMode === parentInputMode) {
      return
    }

    if (lastGenerationSignature) {
      resetGeneratedOutput()
      setGenerationError(null)
      setGenerationAction(null)
      setSensitivePreview(null)
      setBlockedLanguageContext(null)
      setOutOfScopeNotice(false)
      setOutOfScopeMessage("")
    }

    setParentInputMode(nextInputMode)
    setDismissedInputModeMismatchId(null)
  }

  const handleParentInputModeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const lastIndex = PARENT_INPUT_SEGMENT_OPTIONS.length - 1
    let nextIndex = currentIndex

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1
    } else {
      return
    }

    const nextMode = PARENT_INPUT_SEGMENT_OPTIONS[nextIndex]?.id
    if (!nextMode) {
      return
    }

    handleParentInputModeChange(nextMode)
    parentInputModeButtonRefs.current[nextIndex]?.focus()
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
          const nextState: OnboardingState = {
            onboardingCompleted: Boolean(
              payload.data?.onboardingCompleted ?? payload.data?.dismissed ?? false,
            ),
            onboardingSkipped: Boolean(payload.data?.onboardingSkipped),
            onboardingProfile:
              payload.data?.onboardingProfile && typeof payload.data.onboardingProfile === "object"
                ? {
                    ...EMPTY_ONBOARDING_PROFILE,
                    ...payload.data.onboardingProfile,
                  }
                : EMPTY_ONBOARDING_PROFILE,
            welcomeEmailSent: Boolean(payload.data?.welcomeEmailSent),
            firstLogin: Boolean(payload.data?.firstLogin),
          }
          console.info("[onboarding] first-login detection", {
            uid: user?.uid ?? null,
            firstLogin: nextState.firstLogin,
            onboardingCompleted: nextState.onboardingCompleted,
            onboardingSkipped: nextState.onboardingSkipped,
            welcomeEmailSent: nextState.welcomeEmailSent,
          })
          setOnboardingState(nextState)
          setOnboardingForm(nextState.onboardingProfile)
          setOnboardingStepIndex(0)
          setOnboardingVisible(!nextState.onboardingCompleted)
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
  }, [getIdToken, user?.uid])

  useEffect(() => {
    if (
      onboardingLoading ||
      !onboardingState ||
      onboardingState.onboardingCompleted ||
      !onboardingState.firstLogin ||
      onboardingState.welcomeEmailSent ||
      welcomeEmailRequestedRef.current
    ) {
      return
    }

    let isMounted = true
    welcomeEmailRequestedRef.current = true

    void (async () => {
      try {
        const token = await getIdToken()
        if (!token) {
          welcomeEmailRequestedRef.current = false
          return
        }

        console.info("[onboarding] welcome-email trigger", {
          uid: user?.uid ?? null,
          firstLogin: onboardingState.firstLogin,
        })

        const response = await fetch("/api/onboarding/welcome", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message ?? "Unable to send welcome email.")
        }

        console.info("[onboarding] welcome-email result", {
          uid: user?.uid ?? null,
          sent: Boolean(payload.data?.sent),
          alreadySent: Boolean(payload.data?.alreadySent),
        })

        if (isMounted) {
          setOnboardingState((current) =>
            current
              ? {
                  ...current,
                  welcomeEmailSent: true,
                }
              : current,
          )
        }
      } catch (error) {
        welcomeEmailRequestedRef.current = false
        console.error("[onboarding] welcome-email trigger failed", error)
        if (isMounted) {
          setOnboardingError("Unable to send the welcome email.")
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [getIdToken, onboardingLoading, onboardingState, user?.uid])

  const showWelcomeBox = onboardingVisible && !onboardingLoading
  const shouldLogOnboardingPersistence = process.env.NODE_ENV !== "production"

  useEffect(() => {
    if (!showWelcomeBox || !user?.uid || onboardingState?.onboardingCompleted) {
      return
    }

    if (onboardingBannerLoggedRef.current === user.uid) {
      return
    }

    onboardingBannerLoggedRef.current = user.uid

    logClientEventOnce(TRUST_FUNNEL_EVENTS.onboardingBannerShown, {
      payload: {
        surface: "main_editor",
      },
      scopeKey: user.uid,
    })
  }, [onboardingState?.onboardingCompleted, showWelcomeBox, user?.uid])

  const updateOnboardingField = useCallback(
    <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) => {
      setOnboardingForm((current) => ({
        ...current,
        [key]: value,
      }))
    },
    [],
  )

  const applyOnboardingPersonalization = useCallback((profile: OnboardingProfile) => {
    if (profile.mainUseCase === "reports") {
      setMode("report_comment")
    } else if (profile.mainUseCase === "parent_messages") {
      setMode("parent_message")
      setParentInputMode("parent_message")
    }

    if (profile.tonePreference) {
      setSelectedTone(profile.tonePreference)
    }
  }, [])

  const finalizeOnboardingLocally = useCallback(
    (action: "complete" | "skip") => {
      if (action === "skip") {
        logClientEvent(TRUST_FUNNEL_EVENTS.onboardingDismissed, {
          surface: "main_editor",
        })
      }
      logClientEvent(TRUST_FUNNEL_EVENTS.onboardingCompleted, {
        surface: "main_editor",
      })
      if (shouldLogOnboardingPersistence) {
        console.info("[onboarding] onboarding-completed state", {
          uid: user?.uid ?? null,
          onboardingCompleted: true,
          onboardingSkipped: action === "skip",
          answeredFields: onboardingAnsweredCount,
        })
      }
      setOnboardingState((current) =>
        current
          ? {
              ...current,
              onboardingCompleted: true,
              onboardingSkipped: action === "skip",
              onboardingProfile: onboardingForm,
            }
          : {
              onboardingCompleted: true,
              onboardingSkipped: action === "skip",
              onboardingProfile: onboardingForm,
              welcomeEmailSent: false,
              firstLogin: false,
            },
      )
      applyOnboardingPersonalization(onboardingForm)
      setOnboardingVisible(false)
      setOnboardingError(null)
    },
    [
      applyOnboardingPersonalization,
      onboardingAnsweredCount,
      onboardingForm,
      shouldLogOnboardingPersistence,
      user?.uid,
    ],
  )

  const completeOnboarding = async (action: "complete" | "skip") => {
    try {
      setOnboardingSaving(true)
      const token = await getIdToken()
      if (!token) {
        throw new Error("Missing authentication token.")
      }

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          profile: onboardingForm,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Unable to save preference.")
      }
      finalizeOnboardingLocally(action)
    } catch (error) {
      if (shouldLogOnboardingPersistence) {
        console.error("[v0] Failed to save onboarding", error)
      }
      finalizeOnboardingLocally(action)
    } finally {
      setOnboardingSaving(false)
    }
  }

  const goToPreviousOnboardingStep = () => {
    setOnboardingStepIndex((current) => Math.max(current - 1, 0))
  }

  const goToNextOnboardingStep = () => {
    setOnboardingStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1))
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
    if (!user?.uid || !isLimitedUser || usage.remaining !== 0) {
      return
    }

    logClientEventOnce(TRUST_FUNNEL_EVENTS.paywallShown, {
      payload: {
        surface: "editor_usage_state",
      },
      scopeKey: user.uid,
      storage: "session",
    })
  }, [isLimitedUser, usage.remaining, user?.uid])

  const handleTryFirstValueRewrite = async () => {
    if (!isFirstValueSampleActive) {
      loadFirstValueSample()
    }
    await handleGenerate({ overrideSituation: firstValueSample.content })
  }

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
    options: {
      rewrite?: boolean
      previousDraft?: string
      documentationMode?: boolean
      overrideSituation?: string
    } = {},
  ) => {
    const trimmedContent = content.trim()
    const requestSituation = options.overrideSituation?.trim() || trimmedContent
    if (!requestSituation || isGenerating) {
      return
    }

    if (!options.rewrite && !options.documentationMode && !options.overrideSituation) {
      await emitPendingTeacherDraftEditSignal(requestSituation)
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

    const selectedRequestMode: ParentInputMode | ModeKey =
      mode === "parent_message" ? parentInputMode : mode
    const selectedInputIntent: ParentInputMode | null =
      mode === "parent_message"
        ? selectedRequestMode === "teacher_draft"
          ? "teacher_draft"
          : "parent_message"
        : null
    const shouldBypassClientScopePrecheck =
      mode === "parent_message" &&
      selectedRequestMode === "teacher_draft" &&
      (looksLikeTeacherAuthoredDraft(trimmedContent) ||
        hasTeacherDraftAuthoredEnvelopeForScopeBypass(trimmedContent))

    const fallbackOutOfScopeMessage = t("editor.outOfScope.body")
    if (
      !options.overrideSituation &&
      !shouldBypassClientScopePrecheck &&
      !isValidDraftRequest(trimmedContent, mode)
    ) {
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
    setDraftResponseMeta(null)
    setDraftStructure(null)
    setDeescalationSummary(null)
    setInputReframeTier(null)
    setInputWasReframed(false)
    setTeacherDraftSuggestions([])
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
      situation: requestSituation,
      tone: selectedTone,
      language: languageChoice,
      outputLanguage: languageChoice,
      preferredLanguage: prefs.preferredLanguage,
      uiLocale: locale,
      analyticsConsent,
      requestedMode: selectedRequestMode,
      activeMode: selectedRequestMode,
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
    if (selectedInputIntent) {
      payload.inputIntent = selectedInputIntent
    }

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
      mode: selectedRequestMode,
      inputIntent: selectedInputIntent,
      sourceFlow,
      studentFirstNameProvided: Boolean(sanitizedStudentFirstName),
    })

    try {
      const token = await getIdToken()
      if (!token) {
        setGenerationError("Please sign in again to continue.")
        return
      }

      if (user?.uid) {
        logClientEventOnce(TRUST_FUNNEL_EVENTS.firstDraftStarted, {
          payload: {
            mode,
            sourceFlow,
          },
          scopeKey: user.uid,
        })
      }

      const response = await fetch("/api/draft/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()
      let data: any = null
      if (responseText) {
        try {
          data = JSON.parse(responseText)
        } catch {
          data = null
        }
      }
      const responseSuggestions = Array.isArray(data?.data?.suggestions)
        ? data.data.suggestions
        : Array.isArray(data?.suggestions)
          ? data.suggestions
          : []
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
        const blockedLanguagePayload = data?.data?.blockedLanguage ?? null
        setGenerationError(
          blockedLanguagePayload?.title ||
            mapped?.message ||
            data?.error?.message ||
            SAFE_GENERATION_ERROR_MESSAGE,
        )
        setGenerationAction(
          blockedLanguagePayload?.variant === "diagnostic_speculation"
            ? null
            : mapped?.action ?? null,
        )
        if (blockedLanguagePayload) {
          setBlockedLanguageContext(blockedLanguagePayload)
        } else {
          setBlockedLanguageContext(null)
        }
        if (data?.data?.redactedPreview) {
          setSensitivePreview(data.data.redactedPreview)
        }
        if (responseCode === "USAGE_LIMIT_EXCEEDED" && user?.uid) {
          logClientEventOnce(TRUST_FUNNEL_EVENTS.paywallShown, {
            payload: {
              surface: "editor_limit_error",
            },
            scopeKey: user.uid,
            storage: "session",
          })
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

      if (user?.uid) {
        logClientEventOnce(TRUST_FUNNEL_EVENTS.firstDraftGenerated, {
          payload: {
            mode,
            sourceFlow,
          },
          scopeKey: user.uid,
        })
      }

      if (responseMeta?.inputReframed) {
        setInputWasReframed(true)
        setInputReframeTier(responseMeta.inputReframedTier ?? null)
      } else {
        setInputWasReframed(false)
        setInputReframeTier(null)
      }

      const nextSafetyOutput = data.data.safetyAnalysis ?? null
      const nextOutputSafetyAnalysis = data.data.outputSafetyAnalysis ?? null
      const nextDeescalationSummary = data.data.deescalationSummary ?? null
      const nextDocumentationModeActive = Boolean(data.data.documentationModeActive)
      const rewriteReason = inferRewriteReason({
        deescalationSummary: nextDeescalationSummary,
        safetyAnalysis: nextOutputSafetyAnalysis ?? nextSafetyOutput,
        documentationMode: nextDocumentationModeActive,
        inputReframed: Boolean(responseMeta?.inputReframed),
      })
      const reactionPrediction = inferReactionPrediction(
        (nextOutputSafetyAnalysis ?? nextSafetyOutput)?.reactionForecast,
      )
      const riskFlagTypes = inferRiskFlagTypes(nextOutputSafetyAnalysis ?? nextSafetyOutput)

      draftEditDepthRef.current = 0
      rewriteReasonRef.current = rewriteReason
      teacherIntentRef.current = data.data.metadata.teacherIntent ?? null
      rewriteSuggestionPendingRef.current = Boolean(rewriteReason)

      setGeneratedDraft(data.data.generatedDraft)
      setDraftMetadata(data.data.metadata)
      setDraftResponseMeta(responseMeta)
      setDraftStructure(data.data.formattedDraft ?? null)
      setDeescalationSummary(nextDeescalationSummary)
      setSafetyAnalysis(nextSafetyOutput)
      setOutputSafetyAnalysis(nextOutputSafetyAnalysis)
      setTeacherDraftFeedback(data.data.teacherDraftFeedback ?? null)
      setTeacherDraftSuggestions(responseSuggestions)
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
      setGenerationError(SAFE_GENERATION_FALLBACK_MESSAGE)
      setGenerationAction(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDiagnosticRecoveryGenerate = async () => {
    if (!diagnosticRecovery || isGenerating) {
      return
    }

    logClientEvent("draft_generate_blocked_recovery_requested", {
      tone: selectedTone,
      language: languageChoice,
      sourceFlow,
      mode,
      recoveryType: "diagnostic_speculation",
    })

    await handleGenerate({ overrideSituation: diagnosticRecovery.generationPrompt })
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
    const nextMode = snippet.mode ?? "parent_message"
    setMode(nextMode)
    setParentInputMode(nextMode === "parent_message" ? "teacher_draft" : "parent_message")
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
    const nextEditorContent = appendDraftAttribution(generatedDraft, draftAttributionLine)
    resetGeneratedOutput()
    setContent(nextEditorContent)
    if (mode === "parent_message") {
      setParentInputMode("teacher_draft")
    }
    focusEditor()
  }

  const handleApplyTeacherDraftSuggestion = useCallback((suggestionId: string) => {
    setTeacherDraftSuggestions((currentSuggestions) => {
      const suggestion = currentSuggestions.find((item) => item.id === suggestionId)
      if (!suggestion) {
        return currentSuggestions
      }

      setGeneratedDraft((currentDraft) => {
        if (!currentDraft || !currentDraft.includes(suggestion.original)) {
          return currentDraft
        }

        const nextDraft = currentDraft.replace(suggestion.original, suggestion.suggestion)
        setDraftStructure(null)
        setDraftMetadata((currentMetadata: any) =>
          currentMetadata
            ? {
                ...currentMetadata,
                wordCount: nextDraft.trim().split(/\s+/).filter(Boolean).length,
              }
            : currentMetadata,
        )
        return nextDraft
      })

      return currentSuggestions.filter((item) => item.id !== suggestionId)
    })
  }, [])

  const handleDismissTeacherDraftSuggestion = useCallback((suggestionId: string) => {
    setTeacherDraftSuggestions((currentSuggestions) =>
      currentSuggestions.filter((item) => item.id !== suggestionId),
    )
  }, [])

  const handleBeginEditSession = useCallback(
    (displayedAt: number) => {
      if (!generatedDraft || !draftResponseMeta?.requestId || !draftResponseMeta?.uidHash) {
        return
      }

      pendingTeacherDraftEditRef.current = {
        originalDraft: generatedDraft,
        displayedAt,
        sessionId: draftResponseMeta.requestId,
        uidHash: draftResponseMeta.uidHash,
        locale,
        qualityVerdict: teacherDraftFeedback?.verdict ?? teacherDraftFeedback?.level ?? null,
        professionalJudgement: draftResponseMeta.professionalJudgement ?? null,
      }
    },
    [draftResponseMeta?.professionalJudgement, draftResponseMeta?.requestId, draftResponseMeta?.uidHash, generatedDraft, locale, teacherDraftFeedback?.level, teacherDraftFeedback?.verdict],
  )

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

  const handleSwitchToMessageMode = () => {
    rewriteSuggestionPendingRef.current = false
    void handleGenerate()
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
              {greetingHeading}
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
          {showWellbeingInsights && (
            <MiniInsightsBar
              draftsCreatedThisWeek={draftsCreatedThisWeek}
              recentDraftsAvailable={recentDraftsAvailable}
              usedDraftThisTerm={usedDraftThisTerm}
              selectedModeLabel={selectedModeLabelForInsights}
            />
          )}

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
              {isFirstValueSampleActive && (
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-sky-300/25 bg-sky-400/10 p-4 text-slate-900 dark:text-white sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex rounded-full border border-sky-200/50 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:border-sky-200/20 dark:bg-white/10 dark:text-sky-100">
                      {t("editor.firstValue.badge")}
                    </span>
                    <p className="text-sm font-semibold">{t("editor.firstValue.title")}</p>
                    <p className="text-xs leading-5 text-slate-700 dark:text-white/75">
                      {t("editor.firstValue.description")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFirstValueSample}
                    className="rounded-full border border-slate-300/70 bg-white/70 text-slate-900 hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    {t("editor.firstValue.clear")}
                  </Button>
                </div>
              )}
              {mode === "parent_message" ? (
                <div className="mb-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-white/75">
                      {t("editor.inputMode.heading")}
                    </span>
                    <div
                      role="tablist"
                      aria-label={t("editor.inputMode.heading")}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/50 p-1 dark:border-white/12 dark:bg-white/6"
                    >
                      {PARENT_INPUT_SEGMENT_OPTIONS.map((option, index) => {
                        const selected = option.id === parentInputMode

                        return (
                          <button
                            key={option.id}
                            ref={(element) => {
                              parentInputModeButtonRefs.current[index] = element
                            }}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-label={t(option.labelKey)}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => handleParentInputModeChange(option.id)}
                            onKeyDown={(event) => handleParentInputModeKeyDown(event, index)}
                            className={cn(
                              "inline-flex min-h-[34px] items-center justify-center rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/55 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                              selected
                                ? "border-sky-300/70 bg-sky-500/10 font-semibold text-slate-900 dark:border-sky-300/30 dark:bg-sky-400/12 dark:text-white"
                                : "border-transparent bg-transparent font-medium text-slate-500 hover:text-slate-800 dark:text-white/55 dark:hover:text-white/85",
                            )}
                          >
                            <span>{t(option.labelKey)}</span>
                          </button>
                        )
                      })}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleModeChange("report_comment")}
                      className="h-8 rounded-full px-3 text-xs font-medium text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white/85"
                    >
                      {t("editor.mode.reportCommentShortcut")}
                    </Button>
                  </div>
                  {parentInputPromise ? (
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-white/72">
                      {parentInputPromise}
                    </p>
                  ) : null}
                  {inputModeMismatchSuggestion &&
                  dismissedInputModeMismatchId !== inputModeMismatchSuggestion.id ? (
                    <div className="rounded-2xl border border-amber-300/45 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-200/15 dark:bg-amber-300/10 dark:text-amber-50">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">{inputModeMismatchSuggestion.message}</p>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleParentInputModeChange(inputModeMismatchSuggestion.nextMode)}
                            className="h-9 rounded-full border border-amber-400/35 bg-white/70 px-4 text-amber-950 hover:bg-white dark:border-amber-100/15 dark:bg-white/10 dark:text-amber-50 dark:hover:bg-white/15"
                          >
                            {inputModeMismatchSuggestion.action}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDismissedInputModeMismatchId(inputModeMismatchSuggestion.id)}
                            className="h-9 rounded-full px-3 text-amber-950 hover:bg-white/60 dark:text-amber-50 dark:hover:bg-white/10"
                          >
                            {t("dismiss")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mb-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-white/75">
                      {t("editor.mode.outputLabel")}
                    </span>
                    <span className="inline-flex min-h-[34px] items-center rounded-full border border-slate-300/70 bg-slate-500/10 px-3.5 py-1.5 text-sm font-semibold text-slate-900 dark:border-white/15 dark:bg-white/8 dark:text-white">
                      {t("editor.mode.reportComment")}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleModeChange("parent_message")}
                      className="h-8 rounded-full px-3 text-xs font-medium text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white/85"
                    >
                      {t("editor.mode.returnToParentMessage")}
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-white/72">
                    {t("editor.mode.reportCommentHelper")}
                  </p>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onInput={adjustTextareaHeight}
                lang={editableTextLang}
                placeholder={editorPlaceholder}
                className="w-full min-h-[80px] max-h-[320px] text-base sm:text-lg text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0 resize-none placeholder:text-gray-600 dark:placeholder:text-white/60 leading-relaxed font-medium"
                style={{
                  color: isDocumentDark ? "#ffffff" : undefined,
                }}
                aria-label={
                  mode === "parent_message"
                    ? parentInputMode === "teacher_draft"
                      ? locale === "de-DE"
                        ? "Fügen Sie Ihren Antwortentwurf ein"
                        : "Paste your draft reply"
                      : locale === "de-DE"
                        ? "Fügen Sie die Nachricht der Eltern ein"
                        : "Paste the parent’s message here"
                    : locale === "de-DE"
                      ? "Beschreiben Sie die Situation"
                      : "Describe the situation you need help with"
                }
              />
              <div className="mt-4 space-y-1">
                <p className="text-xs text-white/80">
                  {locale === "de-DE"
                    ? "Geben Sie keine vollständigen Namen, E-Mails, Telefonnummern oder Adressen ein."
                    : "Do not include student full names, email addresses, phone numbers, or street addresses."}
                </p>
              </div>
            </section>
            {safetyAnalysis && (
              <TriggerList
                triggeredSignals={safetyAnalysis.triggeredSignals as any}
                professionalRiskFlags={safetyAnalysis.professionalRiskFlags}
                riskLevel={safetyAnalysis.riskLevel}
              />
            )}
            {blockedDiagnosticVisible && blockedLanguageContext ? (
              <div
                data-testid="diagnostic-safety-card"
                className="rounded-2xl border border-amber-300/60 bg-amber-50/95 p-5 text-sm text-amber-950 shadow-lg"
              >
                <div className="space-y-2">
                  <SafetyBadge status="BLOCKED_FOR_SAFETY" />
                  <p className="text-lg font-semibold">
                    {blockedLanguageContext.title ?? generationError}
                  </p>
                  <p className="max-w-3xl leading-relaxed">
                    {blockedLanguageContext.teacherNote}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-amber-200 bg-white/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                      {locale === "de-DE" ? "Sicheres Beispiel" : "Safer example"}
                    </p>
                    {diagnosticSafeExampleText ? (
                      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-800">
                        <p>{diagnosticSafeExampleText}</p>
                      </div>
                    ) : null}
                  </div>

                  {diagnosticRecovery ? (
                    <div className="rounded-xl border border-amber-200 bg-white/85 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                        {locale === "de-DE"
                          ? "Elternsichere Version"
                          : "Parent-safe version"}
                      </p>
                      <p
                        data-testid="diagnostic-recovery-preview"
                        className="mt-2 text-sm leading-relaxed text-slate-800"
                      >
                        {diagnosticRecovery.observationText}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => void handleDiagnosticRecoveryGenerate()}
                    disabled={isGenerating}
                    className="bg-amber-900 text-white hover:bg-amber-950"
                  >
                    {isGenerating
                      ? t("editor.generating.message")
                      : blockedLanguageContext.actionLabel ?? "Create a parent-safe version"}
                  </Button>
                  <p className="text-xs text-amber-800">
                    {locale === "de-DE"
                      ? "Ihre ursprünglichen Notizen bleiben im Editor. Draft erstellt stattdessen eine sichere, beobachtungsbasierte Version."
                      : "Your original notes stay in the editor. Draft will generate from the safe observation version instead."}
                  </p>
                </div>
              </div>
            ) : null}
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

          {!outOfScopeNotice && showWellbeingInsights && !blockedDiagnosticVisible && <ContextualWellbeingTip />}

          <section>
            <details className="rounded-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-semibold text-white/90">
                <span>{t("editor.advanced.summaryTitle")}</span>
                <span className="text-xs text-white/60">{t("editor.advanced.summaryHint")}</span>
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-5">
                <section className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">
                    {t("editor.advanced.toneSection")}
                  </p>
                  <SegmentedControl
                    options={toneControlOptions}
                    value={selectedTone}
                    onChange={(value) => setSelectedTone(value as ToneKey)}
                    className="bg-white/10 border-white/20 dark:bg-white/5 dark:border-white/10 shadow-inner"
                  />
                </section>

                <section className="space-y-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {t("editor.rewriteMode.label")}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
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

                <section className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">
                    {t("editor.advanced.languageSection")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">
                      {t("editor.details.summaryTitle")}
                    </p>
                    <span className="text-xs text-white/60">{t("editor.details.summaryHint")}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                </section>
              </div>
            </details>
          </section>

          <section className="space-y-3 text-center">
            <Button
              onClick={() => handleGenerate()}
              disabled={!content.trim() || isGenerating}
              className="w-full min-h-[52px] rounded-2xl border border-slate-900/10 bg-slate-950 px-6 py-4 text-base font-semibold text-white transition-colors duration-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              aria-label={generateButtonLabel}
            >
              {isGenerating ? t("editor.generating.message") : generateButtonLabel}
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
          <div className="rounded-2xl border border-white/20 bg-slate-950/30 p-5 shadow-xl text-white backdrop-blur">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/80">
                    {t("onboarding.eyebrow")}
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    {t("onboarding.title")}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-100/85">
                    {t("onboarding.description")}
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <span className="text-xs text-slate-100/70">
                    {t("onboarding.capture.optional")}
                  </span>
                  <Button
                    type="button"
                    onClick={() => void completeOnboarding("skip")}
                    variant="secondary"
                    size="md"
                    disabled={onboardingSaving}
                    aria-label={t("onboarding.capture.skip")}
                    className="h-11 rounded-full border border-white/20 bg-white/95 px-5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 hover:bg-white disabled:opacity-60"
                  >
                    {t("onboarding.capture.skip")}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/80">
                      {t("onboarding.capture.progress", {
                        current: onboardingStepIndex + 1,
                        total: onboardingSteps.length,
                      })}
                    </p>
                    <p className="text-base font-semibold text-white">{activeOnboardingStep.title}</p>
                    <p className="max-w-2xl text-sm leading-6 text-slate-100/80">
                      {activeOnboardingStep.description}
                    </p>
                  </div>
                  <span className="text-xs text-slate-100/70">
                    {t("onboarding.capture.answered", {
                      answered: onboardingAnsweredCount,
                      total: 6,
                    })}
                  </span>
                </div>

                {activeOnboardingStep.id === "context" && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">
                        {t("onboarding.capture.field.role")}
                      </p>
                      <div className="grid gap-2">
                        {ONBOARDING_ROLE_OPTIONS.map((option) => {
                          const selected = onboardingForm.role === option
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => updateOnboardingField("role", option)}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                selected
                                  ? "border-sky-200 bg-sky-300/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                                  : "border-white/15 bg-white/5 text-slate-100/80 hover:border-white/25 hover:bg-white/10"
                              }`}
                            >
                              <span className="text-sm font-semibold">
                                {t(`onboarding.capture.option.role.${option}`)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">
                        {t("onboarding.capture.field.schoolType")}
                      </p>
                      <div className="grid gap-2">
                        {ONBOARDING_SCHOOL_TYPE_OPTIONS.map((option) => {
                          const selected = onboardingForm.schoolType === option
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => updateOnboardingField("schoolType", option)}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                selected
                                  ? "border-sky-200 bg-sky-300/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                                  : "border-white/15 bg-white/5 text-slate-100/80 hover:border-white/25 hover:bg-white/10"
                              }`}
                            >
                              <span className="text-sm font-semibold">
                                {t(`onboarding.capture.option.schoolType.${option}`)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeOnboardingStep.id === "use_case" && (
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    {ONBOARDING_USE_CASE_OPTIONS.map((option) => {
                      const selected = onboardingForm.mainUseCase === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateOnboardingField("mainUseCase", option)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? "border-sky-200 bg-sky-300/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                              : "border-white/15 bg-white/5 text-slate-100/80 hover:border-white/25 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-sm font-semibold">
                            {t(`onboarding.capture.option.mainUseCase.${option}`)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {activeOnboardingStep.id === "stress" && (
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {ONBOARDING_STRESS_OPTIONS.map((option) => {
                      const selected = onboardingForm.writingStressPoint === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateOnboardingField("writingStressPoint", option)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? "border-sky-200 bg-sky-300/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                              : "border-white/15 bg-white/5 text-slate-100/80 hover:border-white/25 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-sm font-semibold">
                            {t(`onboarding.capture.option.writingStressPoint.${option}`)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {activeOnboardingStep.id === "tone" && (
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {ONBOARDING_TONE_OPTIONS.map((option) => {
                      const selected = onboardingForm.tonePreference === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateOnboardingField("tonePreference", option)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? "border-sky-200 bg-sky-300/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                              : "border-white/15 bg-white/5 text-slate-100/80 hover:border-white/25 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-sm font-semibold">
                            {t(`onboarding.capture.option.tonePreference.${option}`)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {activeOnboardingStep.id === "region" && (
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {ONBOARDING_REGION_OPTIONS.map((option) => {
                      const selected = onboardingForm.region === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateOnboardingField("region", option)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? "border-sky-200 bg-sky-300/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                              : "border-white/15 bg-white/5 text-slate-100/80 hover:border-white/25 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-sm font-semibold">
                            {t(`onboarding.capture.option.region.${option}`)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-100/70">{t("onboarding.capture.helper")}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goToPreviousOnboardingStep}
                      disabled={onboardingStepIndex === 0 || onboardingSaving}
                      className="rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                    >
                      {t("onboarding.capture.back")}
                    </Button>
                    {onboardingStepIndex < onboardingSteps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={goToNextOnboardingStep}
                        disabled={onboardingSaving}
                        className="rounded-full bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
                      >
                        {t("onboarding.capture.next")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => void completeOnboarding("complete")}
                        disabled={onboardingSaving}
                        className="rounded-full bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
                      >
                        {onboardingSaving
                          ? t("onboarding.capture.saving")
                          : t("onboarding.capture.finish")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {isFirstRunFreeUser && (
                <div className="rounded-2xl border border-sky-300/25 bg-sky-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <span className="inline-flex rounded-full border border-sky-200/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100">
                        {t("onboarding.demo.badge")}
                      </span>
                      <p className="text-base font-semibold text-white">{t("onboarding.demo.title")}</p>
                      <p className="max-w-2xl text-sm leading-6 text-slate-100/80">
                        {t("onboarding.demo.description")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => void handleTryFirstValueRewrite()}
                        className="rounded-full bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        {t("onboarding.demo.action")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearFirstValueSample}
                        className="rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/15"
                      >
                        {t("onboarding.demo.clear")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                {ONBOARDING_FEATURE_CARDS.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={feature.id}
                      className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-400/20 text-sky-100">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <p className="font-semibold text-white">{t(feature.titleKey)}</p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-100/80">
                        {t(feature.descriptionKey)}
                      </p>
                    </div>
                  )
                })}
              </div>
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

        {generationError && !blockedDiagnosticVisible && (
          <div
            className={
              blockedLanguageContext?.variant === "diagnostic_speculation"
                ? "mt-4 rounded-2xl border border-amber-300/60 bg-amber-50/90 p-4 text-sm text-amber-950"
                : "mt-4 rounded-2xl bg-red-500/10 border border-red-500/40 p-4 text-sm text-red-900"
            }
          >
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
              <div
                className={
                  blockedLanguageContext.variant === "diagnostic_speculation"
                    ? "mt-3 rounded-lg border border-amber-200 bg-white/80 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100"
                    : "mt-3 rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-sm text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100"
                }
              >
                <p className="font-semibold">{blockedLanguageContext.teacherNote}</p>
                <ul
                  className={
                    blockedLanguageContext.variant === "diagnostic_speculation"
                      ? "mt-2 space-y-1 list-disc list-inside text-xs text-amber-900 dark:text-amber-200"
                      : "mt-2 space-y-1 list-disc list-inside text-xs text-blue-800 dark:text-blue-200"
                  }
                >
                  {blockedLanguageContext.safeAlternatives.map((alternative, idx) => (
                    <li key={idx}>{alternative}</li>
                  ))}
                </ul>
                {blockedLanguageContext.actionLabel ? (
                  <p
                    className={
                      blockedLanguageContext.variant === "diagnostic_speculation"
                        ? "mt-3 text-xs font-semibold text-amber-900 dark:text-amber-100"
                        : "mt-3 text-xs font-semibold text-blue-900 dark:text-blue-100"
                    }
                  >
                    {blockedLanguageContext.actionLabel}
                  </p>
                ) : null}
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
              headerBadge={<SafetyBadge status={safeToSendAssessment?.status} />}
              headerBanner={<ProfessionalRiskBanner flags={displaySafetyAnalysis?.professionalRiskFlags} />}
              resultModeBadge={
                documentationDisplayActive
                  ? null
                  : draftMetadata?.forwardSafeRewrite
                    ? t("editor.rewriteMode.forwardSafeBadge")
                    : null
              }
              modeLabelOverride={selectedModeLabel}
              documentationMode={documentationModeActive}
              draftAttribution={draftAttributionLine}
              rewriteSummary={teacherDraftFeedback ? null : draftAdjustmentSummary}
              safeToSend={safeToSendAssessment}
              teacherDraftFeedback={teacherDraftFeedback}
              suggestions={teacherDraftSuggestions}
              onApplySuggestion={handleApplyTeacherDraftSuggestion}
              onDismissSuggestion={handleDismissTeacherDraftSuggestion}
              teacherDraftMode={parentInputMode === "teacher_draft"}
              professionalJudgement={draftResponseMeta?.professionalJudgement ?? null}
              professionalJudgementLoading={
                isGenerating && parentInputMode === "teacher_draft"
              }
              analyticsContext={
                draftResponseMeta?.requestId && draftResponseMeta?.uidHash
                  ? {
                      sessionId: draftResponseMeta.requestId,
                      uidHash: draftResponseMeta.uidHash,
                      locale,
                    }
                  : null
              }
              onBeginEditSession={handleBeginEditSession}
            />
            {isFirstRunFreeUser && saferDraftCategories.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/60">
                    {t("editor.saferSummary.eyebrow")}
                  </p>
                  <p className="text-base font-semibold">{t("editor.saferSummary.title")}</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-white/70">
                    {t("editor.saferSummary.description")}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {saferDraftCategories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/85"
                    >
                      {t(`editor.saferSummary.category.${category}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!blockedForSafety && displaySafetyAnalysis && (
              <ReactionForecast
                forecast={displaySafetyAnalysis.reactionForecast}
                riskLevel={displaySafetyAnalysis.riskLevel}
              />
            )}
            {displaySafetyAnalysis && (
              <ExplanationPanel lines={adjustmentReasons} />
            )}
            {deescalationSummary?.wasDeescalated && (
              <DeescalationBanner summary={deescalationSummary} />
            )}
            <DocumentationModeButton
              visible={
                mode === "parent_message" &&
                (documentationDisplayActive || Boolean(safetyAnalysis?.documentationModeAvailable))
              }
              label={modeSwitchButtonLabel}
              onActivate={
                documentationDisplayActive
                  ? handleSwitchToMessageMode
                  : handleActivateDocumentationMode
              }
            />
          </div>
        )}
        {generatedDraft && draftMetadata && showToneSofteningExplanation && (
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





