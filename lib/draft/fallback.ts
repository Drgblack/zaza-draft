import { generateDraft, ProviderMeta, ProviderResult } from "@/lib/ai/provider"
import type { PronounPreference } from "@/lib/types"
import { DraftMode } from "@/lib/types"
import { buildStudentInstruction, buildStudentNameForFallback } from "@/lib/draft/student-policy"

export const ALLOWED_TONES = ["warm", "professional", "direct", "empathetic"] as const
export const ALLOWED_LANGUAGES = ["en", "de"] as const
export type ToneKey = (typeof ALLOWED_TONES)[number]
export type LanguageKey = (typeof ALLOWED_LANGUAGES)[number]

interface DraftFallbackContext {
  mode: DraftMode
  tone: ToneKey
  language: LanguageKey
  requestId: string
  uidHash: string
  studentFirstName?: string
  studentPronounPreference: PronounPreference
  teacherSignatureName?: string
}

function buildClosingBlock(language: LanguageKey, teacherSignatureName?: string) {
  if (language === "de") {
    const closing = "Mit freundlichen Grüßen"
    return teacherSignatureName ? `${closing}\n${teacherSignatureName}` : closing
  }
  const closing = teacherSignatureName ? "Best regards," : "Kind regards,"
  return teacherSignatureName ? `${closing}\n${teacherSignatureName}` : closing
}

const FALLBACK_TONE_TEXT: Record<
  LanguageKey,
  Record<ToneKey, { parent: string; report: string }>
> = {
  en: {
    warm: {
      parent: "I appreciate the steady effort the student has shown and would love to keep building on that momentum.",
      report: "The student is making steady progress and responding well to the current plan.",
    },
    professional: {
      parent: "Thank you for your partnership. Your child consistently focuses on the learning goals.",
      report: "The student is operating at a dependable level and continuing to meet expectations.",
    },
    direct: {
      parent: "Here is the plain update: the student completed the essential tasks and would benefit from a short follow-up.",
      report: "The student met the standards, and sharpening daily habits will help maintain this pace.",
    },
    empathetic: {
      parent: "I see how hard the student is working; staying on this path will bring more confidence and calm.",
      report: "The student is progressing with care and could use encouragement to keep building momentum.",
    },
  },
  de: {
    warm: {
      parent: "Die stetige Anstrengung Ihres Kindes f\u00e4llt positiv auf, und ich m\u00f6chte gerne daran ankn\u00fcpfen.",
      report: "Das Kind macht kontinuierliche Fortschritte und reagiert gut auf den aktuellen Plan.",
    },
    professional: {
      parent: "Danke f\u00fcr die Zusammenarbeit. Ihr Kind bleibt fokussiert auf die Lernziele.",
      report: "Der Lernende arbeitet verl\u00e4sslich und erf\u00fcllt weiterhin die Erwartungen.",
    },
    direct: {
      parent: "Hier die klare Einsch\u00e4tzung: Die wesentlichen Aufgaben wurden erledigt, und ein kurzes Nachfassen w\u00e4re sinnvoll.",
      report: "Der Lernende erf\u00fcllt die Standards, und ein gezielter Schliff der t\u00e4glichen Gewohnheiten bleibt hilfreich.",
    },
    empathetic: {
      parent: "Ich sehe, wie hart Ihr Kind arbeitet; gemeinsam schaffen wir mehr Sicherheit und Selbstvertrauen.",
      report: "Der Lernende macht bedacht Fortschritte und k\u00f6nnte etwas Unterst\u00fctzung gebrauchen, um das Tempo zu halten.",
    },
  },
}

const FALLBACK_LANGUAGE_COPY: Record<
  LanguageKey,
  {
    subject: string
    parentGreeting: string
    nextStep: string
    reportSuffix: string
  }
> = {
  en: {
    subject: "Subject: Your child's progress",
    parentGreeting: "Dear parent(s),",
    nextStep: "Please feel free to reach out if you'd like to discuss this further.",
    reportSuffix: "I will continue to keep you posted.",
  },
  de: {
    subject: "Betreff: R\u00fcckmeldung zum Lernen",
    parentGreeting: "Liebe Eltern,",
    nextStep: "Melden Sie sich gern, wenn Sie sich austauschen m\u00f6chten.",
    reportSuffix: "Ich werde Sie weiter informieren.",
  },
}

function buildNameLine(context: DraftFallbackContext, studentProps: { firstName?: string; pronoun: PronounPreference }) {
  if (context.language === "de") {
    if (context.studentFirstName) {
      const displayName = buildStudentNameForFallback(studentProps)
      return `Ich beziehe mich auf ${displayName} und halte mich an die gew\u00e4hlte Pronomenpr\u00e4ferenz.`
    }
    return "Ich beziehe mich auf Ihr Kind und bleibe in der Wortwahl professionell und neutral."
  }
  if (context.studentFirstName) {
    return `I'm referring to ${buildStudentNameForFallback(studentProps)} and following the ${context.studentPronounPreference} pronoun preference.`
  }
  return "I'm referring to your child and keeping the wording professional and neutral."
}

function buildInstructionLine(context: DraftFallbackContext, studentProps: { firstName?: string; pronoun: PronounPreference }) {
  if (context.language === "de") {
    const pronounClause =
      context.studentPronounPreference === "avoid"
        ? "nutzen Sie m\u00f6glichst neutrale Formulierungen"
        : "achten Sie auf die gew\u00e4hlte Pronomenpr\u00e4ferenz"
    return `Bleiben Sie bei den Formulierungen ruhig und sachlich, ${pronounClause}, und vermeiden Sie unn\u00f6tige Wiederholungen.`
  }
  return buildStudentInstruction(studentProps)
}

export function buildFallbackDraft(context: DraftFallbackContext) {
  const toneText = FALLBACK_TONE_TEXT[context.language][context.tone]
  const langCopy = FALLBACK_LANGUAGE_COPY[context.language]
  const studentProps = {
    firstName: context.studentFirstName,
    pronoun: context.studentPronounPreference,
  }
  const nameLine = buildNameLine(context, studentProps)
  const instruction = buildInstructionLine(context, studentProps)
  const closingBlock = buildClosingBlock(context.language, context.teacherSignatureName)
  if (context.mode === "parent_message") {
    return `${langCopy.subject}\n${langCopy.parentGreeting}\n${nameLine}\n${instruction}\n${toneText.parent}\n${langCopy.nextStep}\n${closingBlock}`
  }
  return `${nameLine}\n${instruction}\n${toneText.report} ${langCopy.reportSuffix}`
}

interface ProviderRequestInput {
  situation: string
  signatureBlock?: string
  originalSituation?: string
  tone: ToneKey
  language: LanguageKey
  context?: {
    subject?: string
    gradeLevel?: string
  }
  rewrite?: boolean
  previousDraft?: string
  pronounPreference: PronounPreference
  mode: DraftMode
  studentFirstName?: string
  resolvedPronounPreference?: PronounPreference
  forceLanguage?: boolean
  uiLocale?: string
  teacherSignatureName?: string
}

interface ProviderFallbackResult {
  result: ProviderResult
  usedFallback: boolean
  errorCode: string | null
}

export async function generateDraftWithFallback(
  input: ProviderRequestInput,
  context: DraftFallbackContext,
  runner: (input: ProviderRequestInput) => Promise<ProviderResult> = generateDraft,
): Promise<ProviderFallbackResult> {
  const start = Date.now()
  try {
    const result = await runner(input)
    return {
      result,
      usedFallback: false,
      errorCode: null,
    }
  } catch (error) {
    const duration = Date.now() - start
    const fallbackMeta: ProviderMeta = {
      modelUsed: "fallback",
      latencyMs: duration,
    }
    const errorCode = error instanceof Error && error.name !== "Error" ? error.name : "PROVIDER_ERROR"
    const fallbackResult: ProviderResult = {
      text: buildFallbackDraft(context),
      providerMeta: fallbackMeta,
    }
    console.error("[draft] fallback_used", {
      requestId: context.requestId,
      uidHash: context.uidHash,
      errorCode,
      mode: context.mode,
      tone: context.tone,
      language: context.language,
      errorMessage: error instanceof Error ? error.message : "unknown",
    })
    return {
      result: fallbackResult,
      usedFallback: true,
      errorCode,
    }
  }
}

export type { DraftFallbackContext, ProviderRequestInput }
