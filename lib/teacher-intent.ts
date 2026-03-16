import type { DraftInteractionTeacherIntent } from "@/lib/draft-interaction-events"
import type { MessageDirection } from "@/lib/generation/classification"
import type { DraftMode } from "@/lib/types"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"

interface TeacherIntentClassificationInput {
  situation: string
  draftMode: DraftMode
  documentationMode: boolean
  messageType?: string | null
  messageDirection?: MessageDirection | null
  safetyAnalysis?: Pick<SafetyEngineOutput, "triggeredSignals"> | null
}

const SAFEGUARDING_PATTERNS = [
  /\bsafeguard(?:ing)?\b/i,
  /\bchild protection\b/i,
  /\bwelfare concern\b/i,
  /\bself[- ]harm\b/i,
  /\babuse\b/i,
  /\bneglect\b/i,
  /\bunsafe\b/i,
  /\bdisclosure\b/i,
  /\bkindeswohl\b/i,
  /\bgef[aä]hrd/i,
  /\bvernachl[aä]ssig/i,
  /\bmissbrauch\b/i,
] as const

const INCIDENT_PATTERNS = [
  /\bincident\b/i,
  /\bdocument(?:ing|ation|ed)?\b/i,
  /\brecord(?:ing|ed)?\b/i,
  /\blog(?:ging|ged)?\b/i,
  /\bfactual note\b/i,
  /\bvorfall\b/i,
  /\bdokumentier/i,
  /\bprotokoll/i,
] as const

const ATTENDANCE_PATTERNS = [
  /\battendance\b/i,
  /\babsence\b/i,
  /\babsent\b/i,
  /\blate(?:ness)?\b/i,
  /\btardy\b/i,
  /\bpresent\b/i,
  /\bpunctual(?:ity)?\b/i,
  /\banwesen/i,
  /\bfehl(?:t|en|zeiten)\b/i,
  /\bversp[aä]t/i,
] as const

const ADMINISTRATIVE_PATTERNS = [
  /\breminder\b/i,
  /\bschedule\b/i,
  /\btimetable\b/i,
  /\btrip\b/i,
  /\bpermission slip\b/i,
  /\bconsent form\b/i,
  /\bdeadline\b/i,
  /\bmeeting notice\b/i,
  /\badministrative\b/i,
  /\bnewsletter\b/i,
  /\berinnerung\b/i,
  /\btermin\b/i,
  /\bausflug\b/i,
  /\bformular\b/i,
  /\bfrist\b/i,
] as const

const COMPLAINT_PATTERNS = [
  /\bcomplain(?:t|ed|ing)?\b/i,
  /\bconcern(?:ed)?\b/i,
  /\bupset\b/i,
  /\bunhappy\b/i,
  /\bdissatisfied\b/i,
  /\bworried\b/i,
  /\braised\b.{0,20}\bissue\b/i,
  /\bbeschwer/i,
  /\bsorge\b/i,
  /\bunzufrieden\b/i,
  /\bver[aä]rger/i,
] as const

const PRAISE_PATTERNS = [
  /\bwell done\b/i,
  /\bexcellent\b/i,
  /\bimpressed\b/i,
  /\bproud\b/i,
  /\bcommend\b/i,
  /\bpositive feedback\b/i,
  /\boutstanding\b/i,
  /\blob\b/i,
  /\bstolz\b/i,
  /\bsehr gut\b/i,
  /\bherausragend\b/i,
] as const

const PROGRESS_PATTERNS = [
  /\bprogress\b/i,
  /\bimprov(?:e|ed|ement|ing)\b/i,
  /\bdevelop(?:ed|ment|ing)\b/i,
  /\bgrowth\b/i,
  /\bupdate\b/i,
  /\bfortschritt\b/i,
  /\bentwicklung\b/i,
  /\bverbesser/i,
] as const

const BEHAVIOUR_PATTERNS = [
  /\bbehavio[u]?r\b/i,
  /\bconduct\b/i,
  /\bdisrupt(?:ion|ive)?\b/i,
  /\bdisrespect/i,
  /\boutburst\b/i,
  /\bclassroom expectations\b/i,
  /\bverhalt/i,
  /\bst[oö]r/i,
  /\bregelversto/i,
] as const

const EXPECTATION_PATTERNS = [
  /\bexpectation(?:s)?\b/i,
  /\bnext steps\b/i,
  /\broutine\b/i,
  /\bclarify\b/i,
  /\bremind(?:er)?\b/i,
  /\bshould\b/i,
  /\bneed to\b/i,
  /\berwartung/i,
  /\bvereinbarung\b/i,
  /\bn[aä]chste schritte\b/i,
] as const

function matchesAny(text: string, patterns: readonly RegExp[]) {
  return patterns.some((pattern) => pattern.test(text))
}

function includesSafeguardingSignal(
  safetyAnalysis?: TeacherIntentClassificationInput["safetyAnalysis"],
) {
  return (safetyAnalysis?.triggeredSignals ?? []).some((signal) => {
    const normalizedCategory = signal.category?.toLowerCase?.() ?? ""
    const normalizedLabel = signal.label?.toLowerCase?.() ?? ""
    return normalizedCategory.includes("safeguard") || normalizedLabel.includes("safeguard")
  })
}

function normalizeSituation(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

export function classifyTeacherIntent(
  input: TeacherIntentClassificationInput,
): DraftInteractionTeacherIntent {
  const normalizedSituation = normalizeSituation(input.situation)
  const messageType = input.messageType ?? null
  const messageDirection = input.messageDirection ?? null

  if (!normalizedSituation) {
    return input.draftMode === "report_comment" ? "share_progress" : "other"
  }

  if (
    matchesAny(normalizedSituation, SAFEGUARDING_PATTERNS) ||
    includesSafeguardingSignal(input.safetyAnalysis)
  ) {
    return "safeguarding_note"
  }

  if (input.documentationMode || matchesAny(normalizedSituation, INCIDENT_PATTERNS)) {
    return "document_incident"
  }

  if (matchesAny(normalizedSituation, ATTENDANCE_PATTERNS)) {
    return "attendance_issue"
  }

  if (
    messageType === "official_notice" ||
    messageType === "admin_feedback" ||
    matchesAny(normalizedSituation, ADMINISTRATIVE_PATTERNS)
  ) {
    return "administrative_notice"
  }

  if (
    messageType === "parent_complaint" ||
    messageDirection === "parent_to_teacher" ||
    matchesAny(normalizedSituation, COMPLAINT_PATTERNS)
  ) {
    return "respond_to_complaint"
  }

  if (matchesAny(normalizedSituation, PRAISE_PATTERNS)) {
    return "praise_student"
  }

  if (matchesAny(normalizedSituation, PROGRESS_PATTERNS)) {
    return "share_progress"
  }

  if (matchesAny(normalizedSituation, BEHAVIOUR_PATTERNS)) {
    return "address_behaviour"
  }

  if (matchesAny(normalizedSituation, EXPECTATION_PATTERNS)) {
    return "clarify_expectations"
  }

  if (input.draftMode === "report_comment") {
    return "share_progress"
  }

  return "other"
}
