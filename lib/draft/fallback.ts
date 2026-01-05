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
}

const FALLBACK_TONE_TEXT: Record<ToneKey, { parent: string; report: string }> = {
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
}

const FALLBACK_LANGUAGE_COPY: Record<
  LanguageKey,
  {
    subject: string
    parentGreeting: string
    nextStep: string
    closing: string
    reportSuffix: string
  }
> = {
  en: {
    subject: "Subject: Your child's progress",
    parentGreeting: "Dear parent(s),",
    nextStep: "Please feel free to reach out if you'd like to discuss this further.",
    closing: "Best regards,\n[Your Name]",
    reportSuffix: "I will continue to keep you posted.",
  },
  de: {
    subject: "Betreff: Rückmeldung zum Lernen",
    parentGreeting: "Liebe Eltern,",
    nextStep: "Melden Sie sich gern, wenn Sie sich austauschen möchten.",
    closing: "Mit freundlichen Grüßen\n[Ihr Name]",
    reportSuffix: "Ich werde Sie weiter informieren.",
  },
}

function buildFallbackDraft(context: DraftFallbackContext) {
  const toneText = FALLBACK_TONE_TEXT[context.tone]
  const langCopy = FALLBACK_LANGUAGE_COPY[context.language]
  const studentProps = {
    firstName: context.studentFirstName,
    pronoun: context.studentPronounPreference,
  }
  const nameLine = context.studentFirstName
    ? `I'm referring to ${buildStudentNameForFallback(studentProps)} and following the ${context.studentPronounPreference} pronoun preference.`
    : "I'm referring to your child and keeping the wording professional and neutral."
  const instruction = buildStudentInstruction(studentProps)
  if (context.mode === "parent_message") {
    return `${langCopy.subject}\n${langCopy.parentGreeting}\n${nameLine}\n${instruction}\n${toneText.parent}\n${langCopy.nextStep}\n${langCopy.closing}`
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
