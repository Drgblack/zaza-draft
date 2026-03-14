import type { DraftLanguage } from "@/lib/types"

export type TeacherNoteIssueCluster =
  | "attendance_lateness"
  | "homework"
  | "classroom_behaviour"
  | "peer_issues"
  | "academic_progress"

const ISSUE_PATTERNS: Record<
  DraftLanguage,
  Record<TeacherNoteIssueCluster, RegExp[]>
> = {
  en: {
    attendance_lateness: [
      /\blate to (?:class|school|registration|the lesson)\b/i,
      /\blate start\b/i,
      /\blateness\b/i,
      /\btardy\b/i,
      /\bregistration\b/i,
      /\barriv(?:e|es|ing|al)\b/i,
      /\bpunctual(?:ity)?\b/i,
      /\battendance\b/i,
      /\babsen(?:t|ce)\b/i,
    ],
    homework: [
      /\bhomework\b/i,
      /\bassignment(?:s)?\b/i,
      /\bmissing work\b/i,
      /\bmissing homework\b/i,
      /\bnot handed in\b/i,
      /\bdid not hand in\b/i,
      /\bhand(?:ing)? in\b/i,
    ],
    classroom_behaviour: [
      /\bcalling out\b/i,
      /\bcalled out\b/i,
      /\bdisruptive\b/i,
      /\bdisrupt(?:ed|ion)?\b/i,
      /\bsilly in class\b/i,
      /\bprincipal'?s office\b/i,
      /\btalking over\b/i,
      /\binterrupt(?:ed|ing)?\b/i,
      /\bclassroom behaviour\b/i,
      /\bbehavio[u]?r\b/i,
      /\blesson behaviour\b/i,
      /\bunsettled\b/i,
    ],
    peer_issues: [
      /\bpeer(?:s)?\b/i,
      /\bclassmate(?:s)?\b/i,
      /\bfriendship\b/i,
      /\bconflict\b/i,
      /\bargument\b/i,
      /\bbully(?:ing)?\b/i,
      /\bpushed\b/i,
      /\bhit\b/i,
      /\bunkind\b/i,
    ],
    academic_progress: [
      /\bacademic\b/i,
      /\bprogress\b/i,
      /\breading\b/i,
      /\bwriting\b/i,
      /\bmaths?\b/i,
      /\bspelling\b/i,
      /\bassessment\b/i,
      /\bgrade(?:s|d|ing)?\b/i,
      /\bunderstanding\b/i,
      /\bfalling behind\b/i,
    ],
  },
  de: {
    attendance_lateness: [
      /\bspät\b/i,
      /\bverspät/i,
      /\bpünktlich(?:keit)?\b/i,
      /\banwesenheit\b/i,
      /\bfehl(?:t|te|en)\b/i,
      /\bunterrichtsbeginn\b/i,
    ],
    homework: [
      /\bhausaufgabe(?:n)?\b/i,
      /\baufgabe(?:n)?\b/i,
      /\bnicht abgegeben\b/i,
      /\bfehlende(?:n)? aufgabe(?:n)?\b/i,
      /\babgeben\b/i,
    ],
    classroom_behaviour: [
      /\breinruf/i,
      /\bstört/i,
      /\bunruh/i,
      /\bverhalten\b/i,
      /\bunterbr/i,
      /\bablenk/i,
      /\bunterrichtsverhalten\b/i,
    ],
    peer_issues: [
      /\bkonflikt\b/i,
      /\bstreit\b/i,
      /\bmobb/i,
      /\bmit(?:schüler|schülerin|schülern)\b/i,
      /\bgeschubst\b/i,
      /\bgeschlagen\b/i,
      /\bauseinandersetzung\b/i,
    ],
    academic_progress: [
      /\bleistung\b/i,
      /\bfortschritt\b/i,
      /\blesen\b/i,
      /\bschreiben\b/i,
      /\bmathe\b/i,
      /\bverständnis\b/i,
      /\bbewertung\b/i,
      /\bnote(?:n)?\b/i,
      /\blernstand\b/i,
    ],
  },
}

const ISSUE_LABELS: Record<DraftLanguage, Record<TeacherNoteIssueCluster, string>> = {
  en: {
    attendance_lateness: "attendance/lateness",
    homework: "homework",
    classroom_behaviour: "classroom behaviour",
    peer_issues: "peer issues",
    academic_progress: "academic progress",
  },
  de: {
    attendance_lateness: "Anwesenheit/Pünktlichkeit",
    homework: "Hausaufgaben",
    classroom_behaviour: "Unterrichtsverhalten",
    peer_issues: "soziale/peerbezogene Themen",
    academic_progress: "Lernfortschritt",
  },
}

function normalizeText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

export function detectTeacherNoteIssueClusters(
  text: string | undefined | null,
  language: DraftLanguage,
): TeacherNoteIssueCluster[] {
  const normalized = normalizeText(text)
  if (!normalized) {
    return []
  }

  const patterns = ISSUE_PATTERNS[language]
  return (Object.keys(patterns) as TeacherNoteIssueCluster[])
    .map((cluster) => {
      const positions = patterns[cluster]
        .map((pattern) => normalized.search(pattern))
        .filter((position) => position >= 0)
      const firstPosition = positions.length > 0 ? Math.min(...positions) : Number.POSITIVE_INFINITY
      return { cluster, firstPosition }
    })
    .filter((entry) => Number.isFinite(entry.firstPosition))
    .sort((left, right) => left.firstPosition - right.firstPosition)
    .map((entry) => entry.cluster)
}

export function summarizeTeacherNoteIssueClusters(
  clusters: TeacherNoteIssueCluster[],
  language: DraftLanguage,
) {
  return clusters.map((cluster) => ISSUE_LABELS[language][cluster]).join(", ")
}

export function hasTeacherNoteIssueCluster(
  clusters: TeacherNoteIssueCluster[],
  cluster: TeacherNoteIssueCluster,
) {
  return clusters.includes(cluster)
}
