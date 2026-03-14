import { generateDraft, ProviderMeta, ProviderResult } from "@/lib/ai/provider"
import type { PronounPreference } from "@/lib/types"
import { DraftMode } from "@/lib/types"
import { buildStudentInstruction, buildStudentNameForFallback } from "@/lib/draft/student-policy"
import type { GreetingSource, NameConfidenceLevel } from "@/lib/draft/greeting-resolution"
import type { GenerationMetadata, MessageDirection } from "@/lib/generation/classification"

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
  generationMetadata: GenerationMetadata
  studentFirstName?: string
  studentPronounPreference: PronounPreference
  teacherSignatureName?: string
  greeting?: {
    text: string
    name?: string
  }
  greetingFinal?: boolean
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
  Record<ToneKey, { parentReply: string; teacherDraft: string; report: string }>
> = {
  en: {
    warm: {
      parentReply:
        "I'm sorry to hear that this has been such a difficult week for your child. I will look into what happened in school and come back to you with an update.",
      teacherDraft:
        "I wanted to send you a brief update about how your child is getting on and let you know what I will adjust in class this week.",
      report: "The student is making steady progress and responding well to the current plan.",
    },
    professional: {
      parentReply:
        "Thank you for bringing this to my attention. I will speak with the staff involved and look into what happened before I come back to you.",
      teacherDraft:
        "I wanted to give you a clear update about your child and explain the adjustment I will make in class.",
      report: "The student is operating at a dependable level and continuing to meet expectations.",
    },
    direct: {
      parentReply:
        "I can see why you are upset. I will check what happened with the staff involved and get back to you once I have looked into it properly.",
      teacherDraft:
        "Here is the clear update I want to send: your child completed the essential tasks, and I will follow up briefly on the missing part.",
      report: "The student met the standards, and sharpening daily habits will help maintain this pace.",
    },
    empathetic: {
      parentReply:
        "I'm sorry to hear that your child came home so upset. I will look into what happened in school and update you as soon as I can.",
      teacherDraft:
        "I want to share this update in a calm way so your child feels encouraged, and I will begin tomorrow with a shorter check-in and clearer instructions.",
      report: "The student is progressing with care and could use encouragement to keep building momentum.",
    },
  },
  de: {
    warm: {
      parentReply:
        "Es tut mir leid zu hören, dass diese Woche für Ihr Kind so belastend war. Ich schaue mir den Punkt im Unterricht noch einmal genau an und melde mich mit einer Rückmeldung bei Ihnen.",
      teacherDraft:
        "Ich möchte Ihnen eine kurze Rückmeldung zu Ihrem Kind geben und erläutern, was ich im Unterricht in dieser Woche anpasse.",
      report: "Das Kind macht kontinuierliche Fortschritte und reagiert gut auf den aktuellen Plan.",
    },
    professional: {
      parentReply:
        "Danke, dass Sie mich darauf aufmerksam gemacht haben. Ich spreche mit den beteiligten Kolleginnen und Kollegen und schaue mir genau an, was passiert ist.",
      teacherDraft:
        "Ich möchte Ihnen eine klare Rückmeldung zu Ihrem Kind geben und erläutern, was ich im Unterricht als Nächstes konkret anpasse.",
      report: "Der Lernende arbeitet verl\u00e4sslich und erf\u00fcllt weiterhin die Erwartungen.",
    },
    direct: {
      parentReply:
        "Ich kann nachvollziehen, dass Sie darüber verärgert sind. Ich prüfe den Vorgang mit den beteiligten Mitarbeitenden und melde mich dann bei Ihnen zurück.",
      teacherDraft:
        "Hier ist die klare Rückmeldung, die ich senden möchte: Die wesentlichen Aufgaben wurden erledigt, und ich fasse bei dem offenen Punkt kurz nach.",
      report: "Der Lernende erf\u00fcllt die Standards, und ein gezielter Schliff der t\u00e4glichen Gewohnheiten bleibt hilfreich.",
    },
    empathetic: {
      parentReply:
        "Es tut mir leid zu hören, dass Ihr Kind heute so belastet nach Hause gekommen ist. Ich werde nachsehen, was passiert ist, und mich so bald wie möglich wieder bei Ihnen melden.",
      teacherDraft:
        "Ich möchte diese Rückmeldung ruhig formulieren; deshalb beginne ich morgen mit einer kurzen klaren Orientierung im Unterricht.",
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
    parentGreeting: "Hello,",
    nextStep: "If a short conversation would help, I can speak with you this week.",
    reportSuffix: "I will continue to keep you posted.",
  },
  de: {
    subject: "Betreff: R\u00fcckmeldung zum Lernen",
    parentGreeting: "Guten Tag,",
    nextStep: "Wenn ein kurzes Gespräch hilfreich ist, können wir uns in dieser Woche kurz abstimmen.",
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

function resolveParentFacingLine(toneText: (typeof FALLBACK_TONE_TEXT)[LanguageKey][ToneKey], direction: MessageDirection) {
  return direction === "parent_to_teacher" ? toneText.parentReply : toneText.teacherDraft
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
  const finalGreetingLine = context.greetingFinal && context.greeting?.text?.trim()
  const parentFacingLine = resolveParentFacingLine(toneText, context.generationMetadata.direction)
  if (finalGreetingLine) {
    // Final greeting - do not override
    if (context.mode === "parent_message") {
      return `${langCopy.subject}\n${finalGreetingLine}\n${nameLine}\n${instruction}\n${parentFacingLine}\n${langCopy.nextStep}\n${closingBlock}`
    }
    return `${finalGreetingLine}\n${nameLine}\n${instruction}\n${toneText.report} ${langCopy.reportSuffix}`
  }
  if (context.mode === "parent_message") {
    return `${langCopy.subject}\n${langCopy.parentGreeting}\n${nameLine}\n${instruction}\n${parentFacingLine}\n${langCopy.nextStep}\n${closingBlock}`
  }
  return `${nameLine}\n${instruction}\n${toneText.report} ${langCopy.reportSuffix}`
}

interface ProviderRequestInput {
  situation: string
  generationMetadata: GenerationMetadata
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
  forceContinuation?: boolean
  uiLocale?: string
  teacherSignatureName?: string
  greeting?: {
    text: string
    name?: string
  }
  greetingFinal?: boolean
  greetingConfidence?: NameConfidenceLevel
  greetingSource?: GreetingSource
  messageType?: string
  scanId?: string
  ocrConfidence?: number
  panicClassificationConfidence?: number
  trustGradeViolations?: {
    types: string[]
    phrases: string[]
  }
  teacherAuthenticityViolations?: {
    types: string[]
    phrases: string[]
  }
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
      generationMode: context.generationMetadata.mode,
      direction: context.generationMetadata.direction,
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
