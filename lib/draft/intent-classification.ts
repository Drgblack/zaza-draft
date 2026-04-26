export type TeacherDraftIntent =
  | "close"
  | "inform"
  | "limit"
  | "invite"
  | "acknowledge"
  | "escalate"
  | "unknown"

export type TeacherDraftIntentClassification = {
  intent: TeacherDraftIntent
  confidence: "high" | "medium" | "low"
  signals: string[]
}

export type IntentPreservationViolation = {
  type: "INTENT_DRIFT"
  sourceIntent: TeacherDraftIntent
  candidateIntent: TeacherDraftIntent
  description: string
}

const ESCALATE_SIGNALS = [
  { label: "head teacher", pattern: /\bhead teacher\b/i },
  { label: "pastoral", pattern: /\bpastoral\b/i },
  { label: "SENCO", pattern: /\bSENCO\b/i },
  { label: "safeguarding", pattern: /\bsafeguarding\b/i },
  { label: "referred", pattern: /\breferred\b/i },
  { label: "formal", pattern: /\bformal\b/i },
  { label: "incident report", pattern: /\bincident report\b/i },
  { label: "serious concern", pattern: /\bserious concern\b/i },
] as const

const LIMIT_SIGNALS = [
  { label: "will not", pattern: /\bwill not\b/i },
  { label: "cannot", pattern: /\bcannot\b/i },
  { label: "won't", pattern: /\bwon't\b/i },
  { label: "not permitted", pattern: /\bnot permitted\b/i },
  { label: "not allowed", pattern: /\bnot allowed\b/i },
  { label: "must not", pattern: /\bmust not\b/i },
  { label: "remains in place", pattern: /\bremains in place\b/i },
  { label: "non-negotiable", pattern: /\bnon-negotiable\b/i },
  { label: "consistent expectation", pattern: /\bconsistent expectation\b/i },
  { label: "same for all", pattern: /\bsame for all\b/i },
  { label: "applies to all", pattern: /\b(applies to all|for all students)\b/i },
  { label: "apply this consistently", pattern: /\bapply this consistently\b/i },
] as const

const CLOSE_SIGNALS = [
  { label: "no further action", pattern: /\bno (further|additional) action\b/i },
  {
    label: "no response needed",
    pattern: /\bno response (needed|necessary|required)\b/i,
  },
  {
    label: "keep you informed",
    pattern: /\bi wanted to (let you know|keep you informed)\b/i,
  },
  { label: "for your records", pattern: /\bfor your (records|information)\b/i },
  { label: "no need to reply", pattern: /\bno need to reply\b/i },
] as const

const INVITE_SIGNALS = [
  { label: "happy to chat", pattern: /\bhappy to (chat|discuss|meet|talk)\b/i },
  {
    label: "please let me know",
    pattern: /\bplease (let me know|get in touch)\b/i,
  },
  { label: "reach out", pattern: /\breach out\b/i },
  { label: "would you like to", pattern: /\bwould you like to\b/i },
  { label: "if you have", pattern: /\bif you (have|would like)\b/i },
] as const

const ACKNOWLEDGE_SIGNALS = [
  { label: "I understand", pattern: /\bI understand\b/i },
  { label: "I can see", pattern: /\bI can see\b/i },
  { label: "I appreciate", pattern: /\bI appreciate\b/i },
  {
    label: "thank you for raising",
    pattern: /\bthank you for (raising|sharing|letting me know)\b/i,
  },
  { label: "I'm sorry to hear", pattern: /\bI'm sorry to hear\b/i },
] as const

const OPEN_ENDED_CLOSE_INVITATION_PATTERN =
  /\b(please (don't hesitate|feel free)|get in touch|if you have (any|further) (questions|concerns))\b/i

const LIMIT_RESTATEMENT_PATTERN =
  /\b(will not|cannot|won't|not permitted|not allowed|must not|expectation is that|expectations remain clear|apply this consistently|clear and fair for all students|within those expectations)\b/i

function collectSignals(
  text: string,
  patterns: ReadonlyArray<{ label: string; pattern: RegExp }>,
) {
  return patterns.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

function countWords(text: string) {
  const normalized = text.trim()
  return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0
}

export function classifyTeacherIntent(text: string): TeacherDraftIntentClassification {
  const body = text.trim()
  if (!body) {
    return { intent: "unknown", confidence: "low", signals: [] }
  }

  const escalateSignals = collectSignals(body, ESCALATE_SIGNALS)
  if (escalateSignals.length > 0) {
    return {
      intent: "escalate",
      confidence: escalateSignals.length >= 2 ? "high" : "medium",
      signals: escalateSignals,
    }
  }

  const limitSignals = collectSignals(body, LIMIT_SIGNALS)
  if (limitSignals.length > 0) {
    return {
      intent: "limit",
      confidence: limitSignals.length >= 2 ? "high" : "medium",
      signals: limitSignals,
    }
  }

  const closeSignals = collectSignals(body, CLOSE_SIGNALS)
  const inviteSignals = collectSignals(body, INVITE_SIGNALS)
  if (closeSignals.length > 0 && inviteSignals.length === 0 && !body.includes("?")) {
    return {
      intent: "close",
      confidence: "high",
      signals: closeSignals,
    }
  }

  if (inviteSignals.length > 0 && (body.includes("?") || inviteSignals.length > 0)) {
    return {
      intent: "invite",
      confidence: body.includes("?") || inviteSignals.length >= 2 ? "high" : "medium",
      signals: inviteSignals,
    }
  }

  const acknowledgeSignals = collectSignals(body, ACKNOWLEDGE_SIGNALS)
  if (acknowledgeSignals.length > 0) {
    return {
      intent: "acknowledge",
      confidence: "medium",
      signals: acknowledgeSignals,
    }
  }

  return {
    intent: "inform",
    confidence: "low",
    signals: [],
  }
}

export function checkIntentPreservation(options: {
  sourceIntent: ReturnType<typeof classifyTeacherIntent>
  candidateIntent: ReturnType<typeof classifyTeacherIntent>
  sourceText?: string
  candidateText?: string
}): {
  preserved: boolean
  violation: IntentPreservationViolation | null
} {
  const sourceIntent = options.sourceIntent.intent
  const sourceIntentConfidence = options.sourceIntent.confidence
  const candidateIntent = options.candidateIntent.intent
  const candidateText = options.candidateText ?? ""
  const sourceText = options.sourceText ?? ""

  if (sourceIntent === "close" && candidateIntent === "invite") {
    return {
      preserved: false,
      violation: {
        type: "INTENT_DRIFT",
        sourceIntent,
        candidateIntent,
        description: "Source closes the thread but output invites further contact",
      },
    }
  }

  if (sourceIntent === "limit" && candidateIntent === "invite") {
    return {
      preserved: false,
      violation: {
        type: "INTENT_DRIFT",
        sourceIntent,
        candidateIntent,
        description: "Source sets a limit but output opens dialogue about it",
      },
    }
  }

  if (
    sourceIntent === "limit" &&
    candidateIntent === "acknowledge" &&
    !LIMIT_RESTATEMENT_PATTERN.test(candidateText)
  ) {
    return {
      preserved: false,
      violation: {
        type: "INTENT_DRIFT",
        sourceIntent,
        candidateIntent,
        description: "Source sets a limit but output omits the limit entirely",
      },
    }
  }

  if (sourceIntent === "close" && OPEN_ENDED_CLOSE_INVITATION_PATTERN.test(candidateText)) {
    return {
      preserved: false,
      violation: {
        type: "INTENT_DRIFT",
        sourceIntent,
        candidateIntent,
        description: "Source closes thread but output adds open-ended invitation",
      },
    }
  }

  if (
    sourceIntent === "inform" &&
    sourceIntentConfidence !== "low" &&
    countWords(candidateText) > countWords(sourceText) * 1.5
  ) {
    return {
      preserved: false,
      violation: {
        type: "INTENT_DRIFT",
        sourceIntent,
        candidateIntent,
        description: "Informational message expanded without added substance",
      },
    }
  }

  return {
    preserved: true,
    violation: null,
  }
}
