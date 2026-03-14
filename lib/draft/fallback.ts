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
        "Thank you for sharing your concerns. I want to respond carefully and work with you on a calm next step for your child.",
      teacherDraft:
        "I wanted to share a calm update about your child and outline the next steps I will take to support steady progress.",
      report: "The student is making steady progress and responding well to the current plan.",
    },
    professional: {
      parentReply:
        "Thank you for raising this with me. I will review the situation carefully and follow up with clear next steps for your child.",
      teacherDraft:
        "I wanted to give you a clear update about your child and explain the practical next steps I will take in class.",
      report: "The student is operating at a dependable level and continuing to meet expectations.",
    },
    direct: {
      parentReply:
        "Thank you for flagging this. I will keep the response clear, factual, and focused on the next step we can take together.",
      teacherDraft:
        "Here is the clear update I want to send: your child completed the essential tasks, and a short follow-up will help us stay aligned.",
      report: "The student met the standards, and sharpening daily habits will help maintain this pace.",
    },
    empathetic: {
      parentReply:
        "Thank you for letting me know how this has been feeling at home. I want to reply with care and keep the next steps calm and supportive.",
      teacherDraft:
        "I want to share this update in a calm and supportive way so your child feels encouraged while we work on the next steps together.",
      report: "The student is progressing with care and could use encouragement to keep building momentum.",
    },
  },
  de: {
    warm: {
      parentReply:
        "Vielen Dank, dass Sie Ihre Sorge geteilt haben. Ich möchte ruhig und sorgfältig darauf eingehen und einen klaren nächsten Schritt vorschlagen.",
      teacherDraft:
        "Ich möchte Ihnen eine ruhige Rückmeldung zu Ihrem Kind geben und die nächsten Schritte klar und unterstützend darstellen.",
      report: "Das Kind macht kontinuierliche Fortschritte und reagiert gut auf den aktuellen Plan.",
    },
    professional: {
      parentReply:
        "Vielen Dank für Ihre Nachricht. Ich werde die Situation sorgfältig prüfen und Ihnen die nächsten Schritte klar zusammenfassen.",
      teacherDraft:
        "Ich möchte Ihnen eine klare Rückmeldung zu Ihrem Kind geben und die nächsten sinnvollen Schritte aus dem Unterricht erläutern.",
      report: "Der Lernende arbeitet verl\u00e4sslich und erf\u00fcllt weiterhin die Erwartungen.",
    },
    direct: {
      parentReply:
        "Danke, dass Sie das angesprochen haben. Ich halte die Rückmeldung bewusst sachlich und konzentriere mich auf einen klaren nächsten Schritt.",
      teacherDraft:
        "Hier ist die klare Rückmeldung, die ich senden möchte: Die wesentlichen Aufgaben wurden erledigt, und ein kurzes Nachfassen ist sinnvoll.",
      report: "Der Lernende erf\u00fcllt die Standards, und ein gezielter Schliff der t\u00e4glichen Gewohnheiten bleibt hilfreich.",
    },
    empathetic: {
      parentReply:
        "Vielen Dank, dass Sie Ihre Perspektive mit mir teilen. Ich möchte behutsam antworten und gemeinsam für mehr Ruhe und Klarheit sorgen.",
      teacherDraft:
        "Ich möchte diese Rückmeldung ruhig und unterstützend formulieren, damit wir Ihrem Kind gemeinsam mehr Sicherheit geben können.",
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
  trustGradeViolations?: {
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
