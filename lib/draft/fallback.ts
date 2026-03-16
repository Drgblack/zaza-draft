import { generateDraft, type ProviderMeta, type ProviderResult } from "@/lib/ai/provider"
import type { GenerationMetadata } from "@/lib/generation/classification"
import {
  normalizeParentFacingGreetingLine,
  type GreetingSource,
  type NameConfidenceLevel,
} from "@/lib/draft/greeting-resolution"
import {
  detectTeacherNoteIssueClusters,
  summarizeTeacherNoteIssueClusters,
  type TeacherNoteIssueCluster,
} from "@/lib/draft/teacher-note-issues"
import type { DraftMode, PronounPreference } from "@/lib/types"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"

export const ALLOWED_TONES = ["warm", "professional", "direct", "empathetic"] as const
export const ALLOWED_LANGUAGES = ["en", "de"] as const
export type ToneKey = (typeof ALLOWED_TONES)[number]
export type LanguageKey = (typeof ALLOWED_LANGUAGES)[number]

export interface DraftFallbackContext {
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
  sourceSituation?: string
  teacherNoteIssueClusters?: TeacherNoteIssueCluster[]
}

export type RecoveryIssueKind =
  | "bullying_safety"
  | "homework"
  | "lateness"
  | "grading"
  | "behaviour"
  | "disruption"
  | "support"
  | "general"

export interface RecoveryDraftResult {
  text: string
  templateFamily: string
  issueKind: RecoveryIssueKind
  sourceAnchors: string[]
}

const ISSUE_PATTERNS = {
  en: {
    bullying_safety:
      /\b(bully|bullying|unsafe|safety|hurt|pushed|hit|afraid|scared|crying|incident|breaktime|playground)\b/,
    homework: /\b(homework|missing work|not handed in|did not hand in|didn't hand in|worksheet|task load)\b/,
    lateness: /\b(late|lateness|tardy|punctual|arrival)\b/,
    grading: /\b(grade|grading|marking|marked|assessment|test score|exam)\b/,
    behaviour: /\b(behaviour|behavior|rude|unkind|argument|conflict)\b/,
    disruption: /\b(disrupt|disruption|calling out|talking over|interrupt|unsettled|focus)\b/,
    support: /\b(support|help|meeting|follow up|check in|plan)\b/,
  },
  de: {
    bullying_safety:
      /\b(mobb|gemobbt|sicherheit|sicher|verletz|geschubst|geschlagen|angst|weinen|aufsicht|pause|vorfall)\b/,
    homework: /\b(hausaufgabe|hausaufgaben|nicht abgegeben|fehlende aufgabe|aufgabenmenge)\b/,
    lateness: /\b(spät|verspät|zu spät|pünktlich)\b/,
    grading: /\b(note|noten|bewertung|bewertet|test|prüfung|korrigiert)\b/,
    behaviour: /\b(verhalten|respektlos|unfreundlich|streit|konflikt)\b/,
    disruption: /\b(stört|unruh|reinruf|unterbr|ablenk|konzent|laut)\b/,
    support: /\b(unterstütz|hilfe|förder|zusätzliche hilfe|besprech)\b/,
  },
} as const

const ISSUE_SUBJECTS = {
  en: {
    bullying_safety: "Subject: Follow-up on today's incident",
    homework: "Subject: Update on homework",
    lateness: "Subject: Update on punctuality",
    grading: "Subject: Update on recent marking",
    behaviour: "Subject: Update on classroom behaviour",
    disruption: "Subject: Update on lesson time",
    support: "Subject: Update on next steps",
    general: "Subject: Update from school",
  },
  de: {
    bullying_safety: "Betreff: Rückmeldung zu dem Vorfall heute",
    homework: "Betreff: Rückmeldung zu den Hausaufgaben",
    lateness: "Betreff: Rückmeldung zur Pünktlichkeit",
    grading: "Betreff: Rückmeldung zur Bewertung",
    behaviour: "Betreff: Rückmeldung zum Verhalten im Unterricht",
    disruption: "Betreff: Rückmeldung zum Unterrichtsverlauf",
    support: "Betreff: Rückmeldung zu den nächsten Schritten",
    general: "Betreff: Rückmeldung aus dem Unterricht",
  },
} as const

const ISSUE_ANCHORS = {
  en: {
    bullying_safety: ["incident", "safety", "break", "breaktime", "playground", "bullying"],
    homework: ["homework", "task", "work", "missing work"],
    lateness: ["lateness", "arrival", "punctuality", "start of lessons"],
    grading: ["marking", "grade", "assessment", "work"],
    behaviour: ["behaviour", "conduct", "conflict", "classroom behaviour"],
    disruption: ["lesson", "class", "lesson time", "disruption"],
    support: ["support", "meeting", "follow up", "next steps"],
    general: ["school", "class", "update", "next steps"],
  },
  de: {
    bullying_safety: ["vorfall", "sicherheit", "pause", "aufsicht", "mobbing"],
    homework: ["hausaufgaben", "aufgaben", "fehlenden aufgaben"],
    lateness: ["pünktlichkeit", "zu spät", "unterrichtsbeginn"],
    grading: ["bewertung", "note", "test"],
    behaviour: ["verhalten", "umgang", "konflikt"],
    disruption: ["unterricht", "lernrunde", "lernzeit"],
    support: ["unterstützung", "weitere schritte", "rückmeldung"],
    general: ["unterricht", "rückmeldung", "nächsten schritte"],
  },
} as const

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim()
}

function inferStudentFirstNameFromSource(source?: string | null) {
  const raw = (source ?? "").trim()
  if (!raw) {
    return undefined
  }

  const patterns = [/\b([A-Z][a-z]{2,}) came home\b/, /\b([A-Z][a-z]{2,}) says\b/, /\b([A-Z][a-z]{2,}) had\b/]
  for (const pattern of patterns) {
    const match = raw.match(pattern)
    const candidate = match?.[1]?.trim()
    if (candidate && !["Hello", "Dear", "Parent", "Karen"].includes(candidate)) {
      return candidate
    }
  }

  return undefined
}

function resolveStudentFirstName(context: DraftFallbackContext) {
  return context.studentFirstName?.trim() || inferStudentFirstNameFromSource(context.sourceSituation)
}

function resolveGreetingLine(context: DraftFallbackContext) {
  if (context.greetingFinal && context.greeting?.text?.trim()) {
    return normalizeParentFacingGreetingLine(
      context.greeting.text.trim(),
      context.language === "de" ? "de" : "en",
    )
  }
  if (context.mode !== "parent_message") {
    return ""
  }
  return context.language === "de" ? "Guten Tag," : "Dear Parent/Carer,"
}

function buildClosingBlock(language: LanguageKey, teacherSignatureName?: string) {
  if (language === "de") {
    const closing = "Mit freundlichen Grüßen"
    return teacherSignatureName ? `${closing}\n${teacherSignatureName}` : closing
  }
  const closing = teacherSignatureName ? "Best regards," : "Kind regards,"
  return teacherSignatureName ? `${closing}\n${teacherSignatureName}` : closing
}

export function isSafeDraftTeacherNotesRecovery(context: DraftFallbackContext) {
  return (
    context.mode === "parent_message" &&
    context.generationMetadata.mode === "safe_draft" &&
    context.generationMetadata.direction === "teacher_internal_notes"
  )
}

function detectRecoveryIssueKind(source: string | undefined, language: LanguageKey): RecoveryIssueKind {
  const normalized = normalizeText(source)
  const patterns = ISSUE_PATTERNS[language]
  if (patterns.bullying_safety.test(normalized)) return "bullying_safety"
  if (patterns.homework.test(normalized)) return "homework"
  if (patterns.lateness.test(normalized)) return "lateness"
  if (patterns.grading.test(normalized)) return "grading"
  if (patterns.behaviour.test(normalized)) return "behaviour"
  if (patterns.disruption.test(normalized)) return "disruption"
  if (patterns.support.test(normalized)) return "support"
  return "general"
}

function buildParentReplyOpening(
  language: LanguageKey,
  tone: ToneKey,
  issueKind: RecoveryIssueKind,
  studentFirstName?: string,
) {
  if (language === "de") {
    const byTone: Record<ToneKey, Record<RecoveryIssueKind, string>> = {
      warm: {
        bullying_safety: "Danke, dass Sie sich so zeitnah wegen des Vorfalls gemeldet haben.",
        homework: "Danke, dass Sie sich wegen der Hausaufgaben gemeldet haben.",
        lateness: "Danke für Ihre Rückmeldung zur Pünktlichkeit.",
        grading: "Danke für Ihre Nachricht zur Bewertung.",
        behaviour: "Danke für Ihre Rückmeldung zum Verhalten im Unterricht.",
        disruption: "Danke für Ihre Rückmeldung zu dem unruhigen Verlauf heute.",
        support: "Danke für Ihre Nachricht zu den nächsten Schritten.",
        general: "Danke für Ihre Nachricht.",
      },
      professional: {
        bullying_safety: "Danke für Ihre Nachricht zu dem Vorfall heute.",
        homework: "Danke für Ihre Nachricht zu den Hausaufgaben.",
        lateness: "Danke für Ihre Nachricht zur Pünktlichkeit.",
        grading: "Danke für Ihre Nachricht zur Bewertung.",
        behaviour: "Danke für Ihre Nachricht zum Verhalten im Unterricht.",
        disruption: "Danke für Ihre Nachricht zum Unterrichtsverlauf.",
        support: "Danke für Ihre Nachricht zu den nächsten Schritten.",
        general: "Danke für Ihre Nachricht.",
      },
      direct: {
        bullying_safety: "Ich habe Ihre Nachricht zu dem Vorfall heute gelesen.",
        homework: "Ich habe Ihre Nachricht zu den Hausaufgaben gelesen.",
        lateness: "Ich habe Ihre Nachricht zur Pünktlichkeit gelesen.",
        grading: "Ich habe Ihre Nachricht zur Bewertung gelesen.",
        behaviour: "Ich habe Ihre Nachricht zum Verhalten im Unterricht gelesen.",
        disruption: "Ich habe Ihre Nachricht zum Unterrichtsverlauf gelesen.",
        support: "Ich habe Ihre Nachricht zu den nächsten Schritten gelesen.",
        general: "Ich habe Ihre Nachricht gelesen.",
      },
      empathetic: {
        bullying_safety: "Es tut mir leid zu hören, dass Ihr Kind wegen des Vorfalls heute so belastet war.",
        homework: "Danke, dass Sie mich wegen der Hausaufgaben direkt informiert haben.",
        lateness: "Danke, dass Sie mich wegen der Pünktlichkeit direkt informiert haben.",
        grading: "Danke, dass Sie mir die Sorge zur Bewertung direkt mitgeteilt haben.",
        behaviour: "Danke, dass Sie mir die Sorge zum Verhalten im Unterricht direkt mitgeteilt haben.",
        disruption: "Danke, dass Sie die Sorge wegen des heutigen Unterrichtsverlaufs direkt angesprochen haben.",
        support: "Danke, dass Sie sich wegen der nächsten Schritte direkt gemeldet haben.",
        general: "Danke, dass Sie sich direkt gemeldet haben.",
      },
    }
    return byTone[tone][issueKind]
  }

  const studentLabel = studentFirstName?.trim() || "your child"
  const byTone: Record<ToneKey, Record<RecoveryIssueKind, string>> = {
    warm: {
      bullying_safety: `I'm really sorry to hear ${studentLabel} had such a difficult experience today, and I can hear how worrying this has been.`,
      homework: "Thank you for getting in touch about this.",
      lateness: "Thank you for getting in touch about this.",
      grading: "Thank you for getting in touch about this.",
      behaviour: "Thank you for getting in touch about this.",
      disruption: "Thank you for getting in touch about this.",
      support: "Thank you for getting in touch about this.",
      general: "Thank you for getting in touch.",
    },
    professional: {
      bullying_safety: `Thank you for letting me know about this. I completely understand why this is so concerning for ${studentLabel} and for you.`,
      homework: "Thank you for your message.",
      lateness: "Thank you for your message.",
      grading: "Thank you for your message.",
      behaviour: "Thank you for your message.",
      disruption: "Thank you for your message.",
      support: "Thank you for your message.",
      general: "Thank you for your message.",
    },
    direct: {
      bullying_safety: "Thank you for letting me know. I take what you have shared very seriously.",
      homework: "I have received your message.",
      lateness: "I have received your message.",
      grading: "I have received your message.",
      behaviour: "I have received your message.",
      disruption: "I have received your message.",
      support: "I have received your message.",
      general: "I have read your message.",
    },
    empathetic: {
      bullying_safety: `I'm really sorry to hear ${studentLabel} had such a difficult experience today. I completely understand why this is worrying.`,
      homework: "Thank you for letting me know.",
      lateness: "Thank you for letting me know.",
      grading: "Thank you for letting me know.",
      behaviour: "Thank you for letting me know.",
      disruption: "Thank you for letting me know.",
      support: "Thank you for letting me know.",
      general: "Thank you for letting me know about this concern.",
    },
  }
  return byTone[tone][issueKind]
}

function buildTeacherDraftOpening(
  language: LanguageKey,
  tone: ToneKey,
  issueKind: RecoveryIssueKind,
  studentFirstName?: string,
) {
  if (language === "de") {
    const byTone: Record<ToneKey, Record<RecoveryIssueKind, string>> = {
      warm: {
        bullying_safety: "Ich möchte Ihnen eine kurze und ruhige Rückmeldung zu dem Vorfall heute geben.",
        homework: "Ich möchte Ihnen eine kurze und ruhige Rückmeldung zu nicht erledigten Hausaufgaben geben.",
        lateness: "Ich möchte Ihnen eine kurze und ruhige Rückmeldung zur Pünktlichkeit geben.",
        grading: "Ich möchte Ihnen eine kurze und ruhige Rückmeldung zur letzten Bewertung geben.",
        behaviour: "Ich möchte Ihnen eine kurze und ruhige Rückmeldung zu einem Verhaltensthema geben.",
        disruption: "Ich möchte Ihnen eine kurze und ruhige Rückmeldung zu einigen unruhigen Momenten im Unterricht geben.",
        support: "Ich möchte Ihnen eine kurze und ruhige Rückmeldung zu den nächsten Schritten geben.",
        general: "Ich möchte Ihnen eine kurze und ruhige Rückmeldung zu einem Punkt aus dem Unterricht geben.",
      },
      professional: {
        bullying_safety: "Ich möchte Ihnen eine kurze Rückmeldung zu dem Vorfall heute geben.",
        homework: "Ich möchte Ihnen eine kurze Rückmeldung zu nicht erledigten Hausaufgaben geben.",
        lateness: "Ich möchte Ihnen eine kurze Rückmeldung zur Pünktlichkeit geben.",
        grading: "Ich möchte Ihnen eine kurze Rückmeldung zur letzten Bewertung geben.",
        behaviour: "Ich möchte Ihnen eine kurze Rückmeldung zu einem Verhaltensthema geben.",
        disruption: "Ich möchte Ihnen eine kurze Rückmeldung zu einigen unruhigen Momenten im Unterricht geben.",
        support: "Ich möchte Ihnen eine kurze Rückmeldung zu den nächsten Schritten geben.",
        general: "Ich möchte Ihnen eine kurze Rückmeldung zu einem Punkt aus dem Unterricht geben.",
      },
      direct: {
        bullying_safety: "Ich schreibe Ihnen mit einer klaren Rückmeldung zu dem Vorfall heute.",
        homework: "Ich schreibe Ihnen mit einer klaren Rückmeldung zu den Hausaufgaben.",
        lateness: "Ich schreibe Ihnen mit einer klaren Rückmeldung zur Pünktlichkeit.",
        grading: "Ich schreibe Ihnen mit einer klaren Rückmeldung zur letzten Bewertung.",
        behaviour: "Ich schreibe Ihnen mit einer klaren Rückmeldung zu einem Verhaltensthema.",
        disruption: "Ich schreibe Ihnen mit einer klaren Rückmeldung zu dem Unterrichtsverlauf heute.",
        support: "Ich schreibe Ihnen mit einer klaren Rückmeldung zu den nächsten Schritten.",
        general: "Ich schreibe Ihnen mit einer klaren Rückmeldung zu diesem Punkt aus dem Unterricht.",
      },
      empathetic: {
        bullying_safety: "Ich möchte Ihnen eine ruhige Rückmeldung zu dem Vorfall heute geben und die nächsten Schritte deutlich machen.",
        homework: "Ich möchte Ihnen eine ruhige Rückmeldung zu den Hausaufgaben geben und die nächsten Schritte deutlich machen.",
        lateness: "Ich möchte Ihnen eine ruhige Rückmeldung zur Pünktlichkeit geben und die nächsten Schritte deutlich machen.",
        grading: "Ich möchte Ihnen eine ruhige Rückmeldung zur Bewertung geben und die nächsten Schritte deutlich machen.",
        behaviour: "Ich möchte Ihnen eine ruhige Rückmeldung zu dem Verhaltensthema geben und die nächsten Schritte deutlich machen.",
        disruption: "Ich möchte Ihnen eine ruhige Rückmeldung zum Unterrichtsverlauf geben und die nächsten Schritte deutlich machen.",
        support: "Ich möchte Ihnen eine ruhige Rückmeldung zu den nächsten Schritten geben.",
        general: "Ich möchte Ihnen eine ruhige Rückmeldung zu diesem Punkt aus dem Unterricht geben.",
      },
    }
    return byTone[tone][issueKind]
  }

  const studentName = studentFirstName?.trim()
  const namedHomework = studentName ? `${studentName}'s homework` : "homework"
  const namedLateness = studentName ? `${studentName}'s punctuality` : "punctuality"

  const byTone: Record<ToneKey, Record<RecoveryIssueKind, string>> = {
    warm: {
      bullying_safety: "I wanted to follow up on what happened today.",
      homework: `I just wanted to let you know about ${namedHomework}, as a few pieces have not been handed in on time recently.`,
      lateness: `I just wanted to let you know about ${namedLateness}, as there have been a few late starts to class recently.`,
      grading: "I wanted to update you on the recent marking.",
      behaviour: "I wanted to update you on a classroom behaviour concern.",
      disruption: "I wanted to let you know about some disruption during lesson time.",
      support: "I wanted to keep you in the loop about the next steps for support in school.",
      general: "I wanted to make you aware of a classroom concern.",
    },
    professional: {
      bullying_safety: "I wanted to follow up on what happened today.",
      homework: studentName
        ? `I wanted to let you know that ${studentName} has been handing homework in late more regularly over the past few weeks.`
        : "I wanted to let you know that homework has been handed in late more regularly over the past few weeks.",
      lateness: studentName
        ? `I wanted to let you know that ${studentName} has been arriving late to class more regularly over the past few weeks.`
        : "I wanted to let you know that there has been a more regular pattern of lateness to class.",
      grading: "I wanted to update you on the recent marking.",
      behaviour: "I wanted to make you aware of a classroom behaviour concern.",
      disruption: "I wanted to let you know about some disruption during lesson time.",
      support: "I wanted to update you on the next steps for support in school.",
      general: "I wanted to make you aware of a classroom concern.",
    },
    direct: {
      bullying_safety: "I am writing with a clear update about what happened today.",
      homework: studentName
        ? `${studentName} has been handing homework in late, and it is becoming a pattern.`
        : "Homework has been handed in late, and it is becoming a pattern.",
      lateness: studentName
        ? `${studentName} has been arriving late to class, and it is becoming a pattern.`
        : "There has been repeated lateness to class, and it is becoming a pattern.",
      grading: "I am writing with a clear update about the recent marking.",
      behaviour: "I am writing with a clear update about a classroom behaviour concern.",
      disruption: "I am writing with a clear update about lesson time today.",
      support: "I am writing with a clear update about the next steps for support in school.",
      general: "I am writing with a clear update about a classroom concern.",
    },
    empathetic: {
      bullying_safety: "I wanted to follow up on what happened today because I know this will have felt serious.",
      homework: studentName
        ? `I wanted to get in touch about ${studentName}'s homework, as handing it in on time has been difficult lately.`
        : "I wanted to get in touch about homework, as handing it in on time has been difficult lately.",
      lateness: studentName
        ? `I wanted to get in touch about ${studentName}'s punctuality, as arriving on time has been difficult lately.`
        : "I wanted to get in touch about punctuality, as arriving on time has been difficult lately.",
      grading: "I wanted to reach out about the recent marking and explain the next step in school.",
      behaviour: "I wanted to reach out about a classroom behaviour concern and explain the next step in school.",
      disruption: "I wanted to follow up on lesson time today and explain the next step in school.",
      support: "I wanted to reach out about the next steps for support in school.",
      general: "I wanted to reach out about this concern and explain the next step in school.",
    },
  }
  return byTone[tone][issueKind]
}

function resolveTeacherNoteIssueClusters(context: DraftFallbackContext) {
  if (context.teacherNoteIssueClusters && context.teacherNoteIssueClusters.length > 0) {
    return context.teacherNoteIssueClusters
  }
  return detectTeacherNoteIssueClusters(context.sourceSituation, context.language)
}

function joinList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? ""
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`
}

function buildTeacherNoteConcernLabels(
  clusters: TeacherNoteIssueCluster[],
  language: LanguageKey,
  studentFirstName?: string,
) {
  if (language === "de") {
    return clusters.map((cluster) => {
      switch (cluster) {
        case "attendance_lateness":
          return "Pünktlichkeit"
        case "homework":
          return "Hausaufgaben"
        case "classroom_behaviour":
          return "Verhalten im Unterricht"
        case "peer_issues":
          return "Umgang mit anderen Kindern"
        case "academic_progress":
          return "Lernentwicklung"
      }
    })
  }

  const studentName = studentFirstName?.trim()
  return clusters.map((cluster) => {
    switch (cluster) {
      case "attendance_lateness":
        return studentName ? `${studentName}'s punctuality` : "punctuality"
      case "homework":
        return studentName ? `${studentName}'s homework` : "homework"
      case "classroom_behaviour":
        return "classroom behaviour"
      case "peer_issues":
        return "interactions with other children"
      case "academic_progress":
        return "academic progress"
    }
  })
}

function buildTeacherNoteActionClauses(
  clusters: TeacherNoteIssueCluster[],
  language: LanguageKey,
  studentFirstName?: string,
) {
  if (language === "de") {
    return clusters.map((cluster) => {
      switch (cluster) {
        case "attendance_lateness":
          return "die Erwartungen an einen pünktlichen Start noch einmal klar benennen"
        case "homework":
          return "die fehlenden Hausaufgaben noch einmal ruhig durchgehen"
        case "classroom_behaviour":
          return "die Erwartungen für den Unterricht ruhig und eindeutig aufgreifen"
        case "peer_issues":
          return "mögliche Konflikte mit anderen Kindern genauer klären"
        case "academic_progress":
          return "die aktuelle Lernentwicklung im Unterricht noch einmal genau prüfen"
      }
    })
  }

  const studentLabel = studentFirstName?.trim() || "the student"
  return clusters.map((cluster) => {
    switch (cluster) {
      case "attendance_lateness":
        return "restate the expectation around arriving on time"
      case "homework":
        return "go through the missing homework and make the next task clear"
      case "classroom_behaviour":
        return `speak with ${studentLabel} about the classroom expectations and the recent disruption`
      case "peer_issues":
        return "check in about the interactions with other children and speak with pupils involved if needed"
      case "academic_progress":
        return "review the recent classwork and make the next learning steps clear"
    }
  })
}

function buildTeacherNotesMultiIssueSubject(
  language: LanguageKey,
  clusters: TeacherNoteIssueCluster[],
  studentFirstName?: string,
) {
  if (language === "de") {
    const labels = buildTeacherNoteConcernLabels(clusters.slice(0, 2), language)
    return `Betreff: Rückmeldung zu ${labels.join(" und ")}`
  }

  const labels = buildTeacherNoteConcernLabels(clusters.slice(0, 2), language, studentFirstName)
  return `Subject: Update on ${labels.join(" and ")}`
}

function buildTeacherNotesMultiIssueOpening(
  context: DraftFallbackContext,
  clusters: TeacherNoteIssueCluster[],
) {
  const labels = joinList(
    buildTeacherNoteConcernLabels(clusters, context.language, context.studentFirstName),
  )
  const studentName = context.studentFirstName?.trim()

  if (context.language === "de") {
    const openings: Record<ToneKey, string> = {
      warm: studentName
        ? `Ich möchte Ihnen eine kurze und ruhige Rückmeldung zu ${studentName} geben, da sich zuletzt mehrere Punkte bei ${labels} gezeigt haben.`
        : `Ich möchte Ihnen eine kurze und ruhige Rückmeldung geben, da sich zuletzt mehrere Punkte bei ${labels} gezeigt haben.`,
      professional: studentName
        ? `Ich möchte Ihnen eine kurze Rückmeldung zu ${studentName} geben, da sich zuletzt mehrere Punkte bei ${labels} gezeigt haben.`
        : `Ich möchte Ihnen eine kurze Rückmeldung geben, da sich zuletzt mehrere Punkte bei ${labels} gezeigt haben.`,
      direct: studentName
        ? `Ich schreibe Ihnen mit einer klaren Rückmeldung zu ${studentName} bei ${labels}.`
        : `Ich schreibe Ihnen mit einer klaren Rückmeldung zu mehreren Punkten bei ${labels}.`,
      empathetic: studentName
        ? `Ich möchte Ihnen eine ruhige Rückmeldung zu ${studentName} geben, weil ${labels} zuletzt gleichzeitig schwieriger geworden sind.`
        : `Ich möchte Ihnen eine ruhige Rückmeldung geben, weil ${labels} zuletzt gleichzeitig schwieriger geworden sind.`,
    }
    return openings[context.tone]
  }

  const openings: Record<ToneKey, string> = {
    warm: studentName
      ? `I just wanted to let you know about ${studentName}, as there have been a few linked concerns recently with ${labels}.`
      : `I just wanted to let you know that there have been a few linked concerns recently with ${labels}.`,
    professional: studentName
      ? `I wanted to make you aware of a few concerns about ${studentName}, particularly with ${labels}.`
      : `I wanted to make you aware of a few linked concerns, particularly with ${labels}.`,
    direct: studentName
      ? `I am writing with a clear update about ${studentName}'s ${labels}.`
      : `I am writing with a clear update about ${labels}.`,
    empathetic: studentName
      ? `I wanted to reach out about ${studentName}, as ${labels} have all been more difficult recently.`
      : `I wanted to reach out because ${labels} have all been more difficult recently.`,
  }
  return openings[context.tone]
}

function buildTeacherNotesMultiIssueAction(
  context: DraftFallbackContext,
  clusters: TeacherNoteIssueCluster[],
) {
  const clauses = buildTeacherNoteActionClauses(
    clusters,
    context.language,
    context.studentFirstName,
  )
  const actionText = joinList(clauses)

  if (context.language === "de") {
    return `Ich werde diese Punkte in der Schule direkt aufgreifen, ${actionText}, damit die nächsten Schritte klar bleiben.`
  }

  const prefixes: Record<ToneKey, string> = {
    warm: "I will follow these points up in school,",
    professional: "I will follow these points up in school,",
    direct: "I will address these points in school,",
    empathetic: "I will follow these points up in school,",
  }
  return `${prefixes[context.tone]} ${actionText}, so the next steps are clear.`
}

function buildTeacherNotesMultiIssueFollowUp(
  context: DraftFallbackContext,
  clusters: TeacherNoteIssueCluster[],
) {
  if (context.language === "de") {
    return context.tone === "warm"
      ? "Ich wollte Ihnen das gesamte Bild frühzeitig geben und melde mich noch einmal, wenn ich diese Punkte im Unterricht weiter geprüft habe."
      : "Ich wollte Ihnen das gesamte Muster frühzeitig rückmelden und melde mich noch einmal, wenn ich diese Punkte im Unterricht weiter geprüft habe."
  }

  const studentName = context.studentFirstName?.trim() || "the student"
  const followUps: Record<ToneKey, string> = {
    warm: `I wanted to share the full picture early so that we can support ${studentName} consistently, and I will follow up again once I have checked these points in school.`,
    professional:
      "I wanted to make you aware of the full pattern early, and I will follow up again once I have checked these points in school.",
    direct:
      "I wanted to raise the full pattern now so it can be addressed before it becomes more established.",
    empathetic: `I did not want these linked concerns to build further, so I wanted to let you know now and I will follow up again once I have checked these points with ${studentName} in school.`,
  }
  return followUps[context.tone]
}

function buildRecoveryAction(
  language: LanguageKey,
  tone: ToneKey,
  issueKind: RecoveryIssueKind,
  studentFirstName?: string,
) {
  if (language === "de") {
    const byIssue: Record<RecoveryIssueKind, string> = {
      bullying_safety:
        "Ich werde mit den beteiligten Kolleginnen und Kollegen sprechen, klären, was heute passiert ist, und den Punkt zügig weiterverfolgen.",
      homework:
        "Ich gehe die fehlenden Aufgaben im Unterricht noch einmal klar durch und mache die nächsten Arbeitsschritte deutlich.",
      lateness:
        "Ich werde diesen Punkt in der Schule noch einmal ruhig aufgreifen und die Erwartungen zum pünktlichen Start klar benennen.",
      grading:
        "Ich schaue mir die Arbeit und die Bewertung noch einmal genau an und melde mich mit einer klaren Rückmeldung bei Ihnen.",
      behaviour:
        "Ich greife diesen Punkt in der Schule direkt auf und formuliere die Erwartung ruhig und eindeutig.",
      disruption:
        "Ich spreche diesen Punkt im Unterricht direkt an und stärke die Erwartungen für eine ruhige Lernzeit.",
      support:
        "Ich halte die nächsten Schritte in der Schule klar und prüfe, welche Unterstützung jetzt am sinnvollsten ist.",
      general:
        "Ich werde diesen Punkt in der Schule weiter aufgreifen und die nächsten Schritte klar und praktikabel halten.",
    }
    return byIssue[issueKind]
  }

  const studentLabel = studentFirstName?.trim() || "the student"
  const namedChild = studentFirstName?.trim() || "the student"
  const byTone: Record<ToneKey, Record<RecoveryIssueKind, string>> = {
    warm: {
      bullying_safety:
        `I did not personally witness this during class, but I take what you have shared very seriously. I will speak with ${namedChild} privately tomorrow morning, speak with the other students involved, and check with the staff who were on duty at lunchtime.`,
      homework: `I will go through what is missing with ${studentLabel} in class, make the next task clear, and help re-establish a steadier homework routine.`,
      lateness: `I will follow this up with ${studentLabel} in school, restate the expectation around arrival, and help build a steadier start to lessons.`,
      grading:
        "I will review the work and the marking carefully, then come back to you with a clear explanation of what I have checked.",
      behaviour:
        "I will speak with the student in school, restate the classroom expectation calmly, and help reset the pattern before it grows further.",
      disruption:
        "I will address this in class, revisit the lesson routines that support calm learning, and reinforce the expectation clearly.",
      support:
        "I will keep the next steps clear in school, check what support will help most, and make sure that support feels manageable.",
      general:
        "I will follow this up in school, keep the next steps clear, and approach it in a steady way.",
    },
    professional: {
      bullying_safety:
        `I did not personally witness this during class, but I take what you have shared very seriously. I will speak with ${namedChild} privately, speak with the other students involved, and check with the staff who were on duty at lunchtime.`,
      homework:
        "I will go through what is missing in class, make the next task and deadline clear, and check that the expectations are understood.",
      lateness:
        "I will follow this up in school, make the expectations around arrival clear, and keep the start of lessons consistent.",
      grading:
        "I will review the work and the marking carefully, then come back to you with a clear explanation.",
      behaviour:
        "I will address this directly in school and follow it up calmly so the expectation is clear.",
      disruption:
        "I will address this directly in class and reinforce the expectations for lesson time.",
      support:
        "I will keep the next steps clear in school and check what support will help most now.",
      general:
        "I will follow this up in school and keep the next steps clear and practical.",
    },
    direct: {
      bullying_safety:
        `I did not personally witness this during class, but I am treating your report seriously. I will speak with ${namedChild} privately, speak with the other students involved, and establish what happened with the staff who were on duty.`,
      homework:
        "I will go through what is missing tomorrow, make the next deadline clear, and expect the work to be handed in on time from this point.",
      lateness:
        "I will address this tomorrow, restate the expectation around arriving on time, and keep that expectation consistent.",
      grading:
        "I will review the work and the marking, then reply with a clear explanation.",
      behaviour:
        "I will address this directly in school and make the classroom expectation clear.",
      disruption:
        "I will address this directly in class and make the expectation for lesson time clear.",
      support:
        "I will set out the next steps clearly in school and confirm what support will be in place.",
      general:
        "I will follow this up in school and set out the next steps clearly.",
    },
    empathetic: {
      bullying_safety:
        `I did not personally witness this during class, but that does not lessen how seriously I take what you have shared. I will speak with ${namedChild} privately, speak with the other students involved, and check with the staff who were on duty at lunchtime.`,
      homework: `I will check in with ${studentLabel} in class, go through what is missing, and make sure the next task feels clear rather than overwhelming.`,
      lateness: `I will check in with ${studentLabel} in school, go over the start-of-day expectations again, and help make the routine clearer.`,
      grading:
        "I will review the work and the marking carefully, then come back to you with a clear explanation once I have checked it properly.",
      behaviour:
        "I will address this in school, make the expectation clear, and help the student reset the pattern without escalating it further.",
      disruption:
        "I will address this in class, revisit the routines that help lesson time stay settled, and make the next step clear.",
      support:
        "I will keep the next steps clear in school, check what support will help most, and make sure the support is manageable.",
      general:
        "I will follow this up in school, keep the next steps clear, and make sure the approach feels manageable.",
    },
  }
  return byTone[tone][issueKind]
}

function buildRecoveryFollowUp(
  language: LanguageKey,
  tone: ToneKey,
  issueKind: RecoveryIssueKind,
  studentFirstName?: string,
) {
  if (language === "de") {
    if (issueKind === "bullying_safety") {
      return "Sobald ich den Ablauf geprüft habe, gebe ich Ihnen eine Rückmeldung."
    }
    return tone === "warm"
      ? "Wenn danach eine kurze Rückmeldung hilfreich ist, melde ich mich noch einmal bei Ihnen."
      : "Wenn danach eine weitere Rückmeldung sinnvoll ist, melde ich mich noch einmal bei Ihnen."
  }
  if (issueKind === "bullying_safety") {
    const studentLabel = studentFirstName?.trim() || "your child"
    const byTone: Record<ToneKey, string> = {
      warm: `Would you be available for a short phone call tomorrow afternoon, or would you prefer to meet in person? Working together is the best way for us to support ${studentLabel} well.`,
      professional:
        "Would you be available for a short phone call tomorrow afternoon, or would you prefer to meet in person once I have spoken to everyone involved?",
      direct:
        "I would like to speak with you directly once I have checked this. Are you available for a short phone call tomorrow afternoon, or would you prefer to meet in person?",
      empathetic: `Would you be available for a short phone call tomorrow afternoon, or would you prefer to meet in person? Working together is the best way for us to support ${studentLabel} well.`,
    }
    return byTone[tone]
  }
  const byTone: Record<ToneKey, string> = {
    warm:
      "If it would help, please do let me know if you are seeing the same pattern at home, and I will follow up again after I have checked this in school.",
    professional:
      "I wanted to make you aware of the pattern early, and I will follow up again if a further update is needed.",
    direct:
      "I wanted to raise this now so it can be addressed before it becomes a wider pattern.",
    empathetic:
      "I did not want this to become a bigger source of pressure, so I wanted to let you know now and I will follow up again after I have checked in at school.",
  }
  return byTone[tone]
}

function buildReportCommentRecovery(context: DraftFallbackContext, issueKind: RecoveryIssueKind) {
  const comments =
    context.language === "de"
      ? {
          homework: "Arbeitet im Unterricht verlässlich mit und zeigt ein solides Verständnis. Sollte Hausaufgaben regelmäßiger abschließen, um die Lernfortschritte besser zu sichern.",
          lateness: "Arbeitet nach dem Unterrichtsbeginn konzentriert mit und beteiligt sich sachlich. Sollte pünktlicher erscheinen, um den Einstieg in die Lernphase sicherer zu nutzen.",
          behaviour: "Arbeitet in vielen Phasen konzentriert mit und beteiligt sich sachlich. Sollte im Umgang mit anderen noch konstanter ruhig und respektvoll bleiben.",
          disruption: "Bringt fachlich passende Beiträge ein und reagiert auf Rückmeldungen. Sollte die Lernzeit konstanter ruhig halten, um durchgehend konzentriert zu arbeiten.",
          bullying_safety: "Beschreibt belastende Situationen zunehmend klar und nimmt Rückmeldungen ernst auf. Arbeitet daran, Konflikte ruhig anzusprechen und sich in angespannten Momenten sicherer zu orientieren.",
          grading: "Arbeitet inhaltlich sicher und kann wesentliche Anforderungen erfüllen. Sollte Rückmeldungen zur Bewertung gezielter aufgreifen, um schriftliche Leistungen weiter zu schärfen.",
          support: "Arbeitet grundsätzlich mit und nutzt Unterstützung zunehmend zielgerichtet. Benötigt weiterhin klare Hilfen und verlässliche Strukturen, um selbstständiger zu arbeiten.",
          general: "Zeigt in mehreren Bereichen eine stabile Entwicklung und arbeitet zunehmend sicherer mit. Sollte die nächsten Lernschritte weiterhin verlässlich und konzentriert umsetzen.",
        }
      : {
          homework: "Works steadily in class and shows sound understanding of the material. Should complete homework more regularly so that learning is reinforced consistently.",
          lateness: "Works productively once lessons begin and contributes appropriately. Should arrive more punctually so that the start of learning time is used well.",
          behaviour: "Contributes appropriately in many parts of the day and responds to guidance. Should be more consistently calm and respectful in interactions with others.",
          disruption: "Makes relevant contributions and responds to guidance. Should keep lesson time calmer so that concentration is sustained more consistently.",
          bullying_safety: "Describes difficult situations with growing clarity and responds thoughtfully to support. Is working on raising concerns calmly and feeling more secure in challenging moments.",
          grading: "Meets key assessment expectations and shows secure understanding. Should use feedback on marked work more consistently to sharpen written responses.",
          support: "Engages with support and is beginning to work with greater independence. Would benefit from clear routines and continued guidance to strengthen independent work.",
          general: "Shows steady development across several areas and is working with greater consistency. Should continue to develop concentration and consistency in day-to-day work.",
        }

  return comments[issueKind]
}

export function buildTeacherNotesRecoveryDraft(
  context: DraftFallbackContext,
  greetingLine: string,
  closingBlock: string,
) {
  const resolvedStudentFirstName = resolveStudentFirstName(context)
  const issueClusters = resolveTeacherNoteIssueClusters(context)
  if (issueClusters.length > 1) {
    return [
      buildTeacherNotesMultiIssueSubject(
        context.language,
        issueClusters,
        resolvedStudentFirstName,
      ),
      greetingLine,
      buildTeacherNotesMultiIssueOpening(context, issueClusters),
      buildTeacherNotesMultiIssueAction(context, issueClusters),
      buildTeacherNotesMultiIssueFollowUp(context, issueClusters),
      closingBlock,
    ].join("\n\n")
  }

  const issueKind = detectRecoveryIssueKind(context.sourceSituation, context.language)
  return [
    ISSUE_SUBJECTS[context.language][issueKind],
    greetingLine,
    buildTeacherDraftOpening(context.language, context.tone, issueKind, resolvedStudentFirstName),
    buildRecoveryAction(context.language, context.tone, issueKind, resolvedStudentFirstName),
    buildRecoveryFollowUp(context.language, context.tone, issueKind, resolvedStudentFirstName),
    closingBlock,
  ].join("\n\n")
}

export function buildFallbackDraftResult(context: DraftFallbackContext): RecoveryDraftResult {
  const issueClusters = resolveTeacherNoteIssueClusters(context)
  const issueKind = detectRecoveryIssueKind(context.sourceSituation, context.language)
  const hasTeacherNoteMultiIssue =
    isSafeDraftTeacherNotesRecovery(context) && issueClusters.length > 1
  const templateFamily = hasTeacherNoteMultiIssue
    ? `${context.generationMetadata.mode}_${context.generationMetadata.direction}_multi_issue`
    : `${context.generationMetadata.mode}_${context.generationMetadata.direction}_${issueKind}`
  const sourceAnchors = hasTeacherNoteMultiIssue
    ? [
        ...issueClusters,
        summarizeTeacherNoteIssueClusters(issueClusters, context.language),
      ]
    : [...ISSUE_ANCHORS[context.language][issueKind]]
  const greetingLine = resolveGreetingLine(context)
  const closingBlock = buildClosingBlock(context.language, context.teacherSignatureName)
  const resolvedStudentFirstName = resolveStudentFirstName(context)

  if (context.mode === "report_comment") {
    return {
      text: buildReportCommentRecovery(context, issueKind),
      templateFamily,
      issueKind,
      sourceAnchors,
    }
  }

  if (greetingLine && isSafeDraftTeacherNotesRecovery(context)) {
    return {
      text: buildTeacherNotesRecoveryDraft(context, greetingLine, closingBlock),
      templateFamily,
      issueKind,
      sourceAnchors,
    }
  }

  const opening =
    context.generationMetadata.direction === "parent_to_teacher"
      ? buildParentReplyOpening(context.language, context.tone, issueKind, resolvedStudentFirstName)
      : buildTeacherDraftOpening(
          context.language,
          context.tone,
          issueKind,
          resolvedStudentFirstName,
        )

  return {
    text: [
      ISSUE_SUBJECTS[context.language][issueKind],
      greetingLine,
      opening,
      buildRecoveryAction(context.language, context.tone, issueKind, resolvedStudentFirstName),
      buildRecoveryFollowUp(context.language, context.tone, issueKind, resolvedStudentFirstName),
      closingBlock,
    ]
      .filter(Boolean)
      .join("\n\n"),
    templateFamily,
    issueKind,
    sourceAnchors,
  }
}

export function buildFallbackDraft(context: DraftFallbackContext) {
  return buildFallbackDraftResult(context).text
}

export interface ProviderRequestInput {
  situation: string
  generationMetadata: GenerationMetadata
  signatureBlock?: string
  originalSituation?: string
  documentationSourceText?: string
  tone: ToneKey
  language: LanguageKey
  context?: {
    subject?: string
    gradeLevel?: string
  }
  rewrite?: boolean
  forwardSafeRewrite?: boolean
  previousDraft?: string
  pronounPreference: PronounPreference
  mode: DraftMode
  studentFirstName?: string
  teacherNoteIssueClusters?: TeacherNoteIssueCluster[]
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
  safetyAnalysis?: SafetyEngineOutput | null
  documentationMode?: boolean
  documentationTopic?: string | null
}

export interface ProviderFallbackResult {
  result: ProviderResult
  usedFallback: boolean
  errorCode: string | null
  recoveryMeta?: {
    templateFamily: string
    issueKind: RecoveryIssueKind
    sourceAnchors: string[]
    stage: "provider_fallback"
  }
}

export async function generateDraftWithFallback(
  input: ProviderRequestInput,
  context: DraftFallbackContext,
  runner: (input: ProviderRequestInput) => Promise<ProviderResult> = generateDraft,
): Promise<ProviderFallbackResult> {
  const start = Date.now()
  try {
    const result = await runner(input)
    return { result, usedFallback: false, errorCode: null }
  } catch (error) {
    const duration = Date.now() - start
    const fallbackMeta: ProviderMeta = { modelUsed: "fallback", latencyMs: duration }
    const errorCode =
      error instanceof Error && error.name !== "Error" ? error.name : "PROVIDER_ERROR"
    const recovery = buildFallbackDraftResult(context)
    console.error("[draft] fallback_used", {
      requestId: context.requestId,
      uidHash: context.uidHash,
      errorCode,
      mode: context.mode,
      generationMode: context.generationMetadata.mode,
      direction: context.generationMetadata.direction,
      tone: context.tone,
      language: context.language,
      templateFamily: recovery.templateFamily,
      issueKind: recovery.issueKind,
      errorMessage: error instanceof Error ? error.message : "unknown",
    })
    return {
      result: { text: recovery.text, providerMeta: fallbackMeta },
      usedFallback: true,
      errorCode,
      recoveryMeta: {
        templateFamily: recovery.templateFamily,
        issueKind: recovery.issueKind,
        sourceAnchors: recovery.sourceAnchors,
        stage: "provider_fallback",
      },
    }
  }
}
