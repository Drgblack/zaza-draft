export type RouteRecoveryIssueKind =
  | "bullying_safety"
  | "homework"
  | "lateness"
  | "grading"
  | "behaviour"
  | "disruption"
  | "phone_device"
  | "support"
  | "general"

export function detectRouteRecoveryIssueKind(
  source: string | undefined,
  language: string | undefined,
): RouteRecoveryIssueKind {
  const normalized = (source ?? "").toLowerCase()
  const isGerman = language?.toLowerCase().startsWith("de")
  const patterns = isGerman
    ? {
        bullying_safety:
          /\b(mobb|gemobbt|sicherheit|sicher|verletz|geschubst|geschlagen|angst|weinen|aufsicht|pause|vorfall)\b/,
        homework: /\b(hausaufgabe|hausaufgaben|nicht abgegeben|fehlende aufgabe|aufgabenmenge)\b/,
        lateness: /\b(spät|verspät|zu spät|pünktlich)\b/,
        grading: /\b(note|noten|bewertung|bewertet|test|prüfung|korrigiert)\b/,
        behaviour: /\b(verhalten|respektlos|unfreundlich|streit|konflikt)\b/,
        disruption: /\b(stört|unruh|reinruf|unterbr|ablenk|konzent|laut)\b/,
        phone_device: /\b(handy|handys|mobiltelefon|gerät|geräte|bildschirmzeit|unterrichtsregeln)\b/,
        support: /\b(unterstütz|hilfe|förder|zusätzliche hilfe|besprech)\b/,
      }
    : {
        bullying_safety:
          /\b(bully|bullying|unsafe|safety|hurt|pushed|hit|afraid|scared|crying|incident|breaktime|playground)\b/,
        homework:
          /\b(homework|missing work|not handed in|did not hand in|didn't hand in|worksheet|task load)\b/,
        lateness: /\b(late|lateness|tardy|punctual|arrival)\b/,
        grading: /\b(grade|grading|marking|marked|assessment|test score|exam)\b/,
        behaviour: /\b(behaviour|behavior|rude|unkind|argument|conflict)\b/,
        disruption: /\b(disrupt|disruption|calling out|talking over|interrupt|unsettled|focus)\b/,
        phone_device: /\b(phone|phones|mobile|device|devices|screen time|classroom rules)\b/,
        support: /\b(support|help|meeting|follow up|check in|plan)\b/,
      }

  if (patterns.bullying_safety.test(normalized)) return "bullying_safety"
  if (patterns.homework.test(normalized)) return "homework"
  if (patterns.lateness.test(normalized)) return "lateness"
  if (patterns.grading.test(normalized)) return "grading"
  if (patterns.behaviour.test(normalized)) return "behaviour"
  if (patterns.disruption.test(normalized)) return "disruption"
  if (patterns.phone_device.test(normalized)) return "phone_device"
  if (patterns.support.test(normalized)) return "support"
  return "general"
}

export function getRouteRecoveryAnchors(
  issueKind: RouteRecoveryIssueKind,
  language: string | undefined,
) {
  const isGerman = language?.toLowerCase().startsWith("de")
  if (isGerman) {
    const anchors: Record<RouteRecoveryIssueKind, string[]> = {
      bullying_safety: ["vorfall", "sicherheit", "pause", "aufsicht", "mobbing"],
      homework: ["hausaufgaben", "aufgaben", "fehlenden aufgaben"],
      lateness: ["pünktlichkeit", "zu spät", "unterrichtsbeginn"],
      grading: ["bewertung", "note", "test"],
      behaviour: ["verhalten", "konflikt", "umgang"],
      disruption: ["unterricht", "lernzeit", "unterrichtsverlauf"],
      phone_device: ["handy", "unterrichtsregeln", "unterricht", "erwartungen"],
      support: ["unterstützung", "nächsten schritte", "rückmeldung"],
      general: ["unterricht", "rückmeldung", "nächsten schritte"],
    }
    return anchors[issueKind]
  }

  const anchors: Record<RouteRecoveryIssueKind, string[]> = {
    bullying_safety: ["incident", "safety", "break", "breaktime", "playground", "bullying"],
    homework: ["homework", "task", "work", "missing work"],
    lateness: ["lateness", "arrival", "punctuality", "start of lessons"],
    grading: ["marking", "grade", "assessment", "work"],
    behaviour: ["behaviour", "conflict", "classroom behaviour"],
    disruption: ["lesson", "class", "lesson time", "disruption"],
    phone_device: ["phone", "phones", "classroom rules", "lesson", "expectations"],
    support: ["support", "meeting", "follow up", "next steps"],
    general: ["school", "class", "update", "next steps"],
  }
  return anchors[issueKind]
}
