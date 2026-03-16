import type { DraftLanguage, DraftMode } from "@/lib/types"
import type { PlanType } from "@/lib/usage"

export const DRAFT_ATTRIBUTION_LINES = {
  en: "Drafted with the help of Zaza Draft.",
  de: "Mit Unterstützung von Zaza Draft formuliert.",
} as const

export function resolveDraftSignatureEnabled(
  preference: boolean | undefined,
  plan: PlanType,
) {
  if (typeof preference === "boolean") {
    return preference
  }

  return plan === "free"
}

export function getDraftAttributionLine(language: DraftLanguage) {
  return language === "de" ? DRAFT_ATTRIBUTION_LINES.de : DRAFT_ATTRIBUTION_LINES.en
}

export function shouldShowDraftAttribution(args: {
  enabled: boolean
  mode: DraftMode
  documentationMode: boolean
}) {
  return args.enabled && args.mode === "parent_message" && !args.documentationMode
}

export function appendDraftAttribution(text: string, attributionLine: string | null | undefined) {
  const trimmed = text.trim()
  if (!trimmed || !attributionLine) {
    return trimmed
  }

  if (trimmed.includes(attributionLine)) {
    return trimmed
  }

  return `${trimmed}\n\n${attributionLine}`
}
