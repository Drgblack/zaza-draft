import type { DraftLanguage } from "@/lib/types"
import {
  classifyTeacherIntent,
  type TeacherDraftIntent,
} from "@/lib/draft/intent-classification"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"

export type ParentInterpretationRiskLevel = "low" | "medium" | "high"
export type ReplyLikelihood = "low" | "medium" | "high"
export type RegretRiskLevel = "low" | "medium" | "high"
export type ParentEmotionalState =
  | "frustrated"
  | "anxious"
  | "defensive"
  | "accusatory"
  | "distressed"
  | "neutral"

export type ProfessionalJudgementSignal = {
  dimension:
    | "clarity"
    | "authority"
    | "interpretation_risk"
    | "reply_likelihood"
    | "boundary_strength"
    | "regret_risk"
  finding: string
  direction: "positive" | "negative"
}

export type ProfessionalJudgementResult = {
  clarityScore: number
  authorityScore: number
  parentInterpretationRisk: ParentInterpretationRiskLevel
  replyLikelihood: ReplyLikelihood
  boundaryStrengthScore: number
  regretRisk: RegretRiskLevel
  sendConfidenceScore: number
  parentEmotionalState?: ParentEmotionalState
  signals: ProfessionalJudgementSignal[]
}

const HEDGED_CONCLUSION_PATTERN =
  /\b(we'll see|we can look at|I'll consider|to be determined|depending on|it may be possible)\b/i
const FIRM_FINAL_VERB_PATTERN = /\b(will|is|are|remains|applies|expect)\b/i
const CONTRAST_CLAUSE_PATTERN = /\b(?:however|but)\b/gi
const FIRM_STATEMENT_PATTERN =
  /\b(I|we|the classroom expectation|the expectation|the rule|rules|this|it|phones?|expectations?)\b[\s\S]{0,60}\b(will|is|are|remains|applies|expect)\b[\s\S]{0,80}\b[a-z]{2,}\b/i
const FIRST_PERSON_FIRM_PATTERN = /\bI (will|am|have|apply|expect|need)\b/i
const CONSISTENT_APPLICATION_PATTERN = /\b(consistently|all students|same for everyone|fair to all)\b/i
const APOLOGY_PATTERN = /\bI('m| am) (?:so )?sorry (to|that|if|for)\b/i
const SUBMISSIVE_HEDGE_PATTERN = /\bI hope (this|that|it|you|we)|I just wanted to|I only wanted to|I merely\b/i
const EXPLANATION_PATTERN = /\bbecause\b|\bin order to\b|\bso that\b|\bto ensure\b/i
const PERMISSION_SEEKING_END_PATTERN =
  /\bdo you (think|feel|agree|mind)|is that (okay|alright|acceptable|ok)\b/i
const FIRM_MARKERS_PATTERN =
  /\b(will not|cannot|won't|must not|not permitted|not allowed|remains in place)\b/i
const LIMIT_OPENING_PATTERN =
  /\b(happy to (chat|discuss|meet|talk)|please (let me know|get in touch)|would you like to|if you (have|would like))\b/i
const RISKY_INVITATION_PATTERN =
  /\b(please (don't hesitate|feel free)|get in touch|happy to (chat|discuss|meet|talk)|if you have (any|further) (questions|concerns))\b/i
const QUESTION_ENDING_PATTERN = /\?\s*$/
const PASSIVE_AGGRESSIVE_PATTERN =
  /\b(as I (previously|already) (mentioned|said|noted|explained)|as per my (previous|last|earlier)|I (have|had) already|as we (discussed|agreed)|you will (recall|remember|note))\b/i
const DISMISSIVE_PATTERN =
  /\b(that is (not|simply) (the case|how it works|possible|my responsibility)|this is (standard|normal|policy|procedure)|all (students|children|parents) (are|have been|must))\b/i
const PATRONISING_PATTERN =
  /\b(I think you('ll| will) (find|see|understand)|as you may (know|be aware|understand)|I (hope|trust) (this|that) (helps|clarifies|explains)|hopefully this (makes sense|helps|clarifies))\b/i
const MEDIUM_INTERPRETATION_RISK_PATTERN =
  /\b(I (must|have to) (stress|emphasise|make clear)|I (want|need) to be (clear|direct|honest) (with you|here)|I (must|would like to) (remind you|point out|flag))\b/i
const ACCUSATORY_PARENT_PATTERN =
  /\b(your fault|you (caused|made|told)|why did you|you (should|shouldn't|ought to)|failed to|not good enough|unacceptable)\b/i
const DEFENSIVE_PARENT_PATTERN =
  /\b(my (child|son|daughter) (would never|did not|doesn't|has never|is not like that)|that('s| is) not (true|accurate|what happened|fair)|I don't (think|believe) (that|this) is (right|fair|accurate))\b/i
const FRUSTRATED_PARENT_PATTERN =
  /\b(again|still|every (time|week|day)|nothing (has|is) (changed|improving)|I (have|had) (already|previously) (raised|mentioned|told you))\b/i
const ANXIOUS_PARENT_PATTERN =
  /\b(worried|concern(?:ed)?|not sure|don't know (what|how|if)|(really|very) (upset|distressed|troubled)|impact on (his|her|their) (learning|confidence|wellbeing))\b/i
const DISTRESSED_PARENT_PATTERN =
  /\b(crying|in tears|cannot (cope|sleep|concentrate)|refusing (to go|school)|very (upset|distressed|unhappy))\b/i
const DE_ESCALATION_OPENING_PATTERN = /\bI (understand|can see|appreciate|hear) (that|why|how)\b/i
const OPEN_LOOP_PATTERN =
  /\b(please (let me know|get in touch|do not hesitate|don't hesitate|feel free)|if you (have|would like|need|want)|happy to (discuss|chat|talk|meet))\b/i
const VAGUE_NEXT_STEP_PATTERN =
  /\b(we('ll| will) (discuss|review|look into|follow up)|I('ll| will) (look into|check|find out|investigate))\b/i
const SOFTENING_PATTERN =
  /\b(where possible|try to|ideally|as much as possible|in most cases)\b/i
const OVER_SOFTENING_PATTERN =
  /\b(may not|might not|ideally|where possible|as much as possible|try to)\b/i
const SOURCE_FIRM_BOUNDARY_PATTERN = /\b(will not|cannot|won't|not permitted|not allowed|must not)\b/i
const BOUNDARY_DILUTION_PATTERN =
  /\b(we('ll| will) consider|we('ll| will) review|we can look at|this may be reviewed|open to reviewing|willing to reconsider)\b/i
const EMPATHY_PATTERN =
  /\b(I understand|I can see|I appreciate|I'm sorry to hear|I know this has been)\b/i
const RHETORICAL_HEDGE_PATTERN =
  /\b(I'm sure you (understand|can appreciate|can see)|as I'm sure you're aware|you'll appreciate)\b/i
const FABRICATION_PHRASES = [
  /\brecent conversation\b/i,
  /\bprevious conversation\b/i,
  /\bour conversation\b/i,
  /\barrange a\b/i,
  /\bbrief meeting\b/i,
  /\bquick call\b/i,
  /\bsupport coordinator\b/i,
  /\bspecific approaches\b/i,
  /\bdiscuss approaches\b/i,
  /\bexplore what\b/i,
  /\bwhat might work\b/i,
] as const
const SUBJECT_FAMILIES = [
  /\bphones?\b/i,
  /\bmobile\b/i,
  /\bdevices?\b/i,
  /\blaptops?\b/i,
  /\bbehaviour\b/i,
  /\buniform\b/i,
  /\bhomework\b/i,
  /\blateness\b/i,
  /\battendance\b/i,
  /\bgum\b/i,
  /\bfidget spinner\b/i,
  /\btrading cards?\b/i,
] as const

function countWords(text: string) {
  const normalized = text.trim()
  return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function countExplanationSentences(text: string) {
  return splitSentences(text).filter((sentence) => EXPLANATION_PATTERN.test(sentence)).length
}

function containsFabrication(sourceText: string, candidateText: string) {
  return FABRICATION_PHRASES.some((pattern) => pattern.test(candidateText) && !pattern.test(sourceText))
}

function hasBoundaryDilution(sourceText: string, candidateText: string) {
  return SOURCE_FIRM_BOUNDARY_PATTERN.test(sourceText) && BOUNDARY_DILUTION_PATTERN.test(candidateText)
}

function hasOverSoftening(sourceText: string, candidateText: string) {
  return SOURCE_FIRM_BOUNDARY_PATTERN.test(sourceText) && OVER_SOFTENING_PATTERN.test(candidateText)
}

function hasEmpathyAfterBoundaryInSameParagraph(text: string) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return paragraphs.some((paragraph) => {
    const sentences = splitSentences(paragraph)
    const boundaryIndex = sentences.findIndex((sentence) => FIRM_MARKERS_PATTERN.test(sentence))
    if (boundaryIndex === -1) {
      return false
    }

    return sentences.slice(boundaryIndex + 1).some((sentence) => EMPATHY_PATTERN.test(sentence))
  })
}

function hasSingleClearSubject(text: string) {
  const matchedFamilies = SUBJECT_FAMILIES.filter((pattern) => pattern.test(text))
  return matchedFamilies.length === 1
}

function getOpeningParagraph(text: string) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return paragraphs.at(0) ?? ""
}

export function classifyParentEmotionalState(sourceText: string): ParentEmotionalState {
  const source = sourceText.trim()
  if (!source) {
    return "neutral"
  }

  if (ACCUSATORY_PARENT_PATTERN.test(source)) {
    return "accusatory"
  }

  if (DEFENSIVE_PARENT_PATTERN.test(source)) {
    return "defensive"
  }

  if (FRUSTRATED_PARENT_PATTERN.test(source)) {
    return "frustrated"
  }

  if (ANXIOUS_PARENT_PATTERN.test(source)) {
    return "anxious"
  }

  if (DISTRESSED_PARENT_PATTERN.test(source)) {
    return "distressed"
  }

  return "neutral"
}

function computeSendConfidenceScore(options: {
  clarityScore: number
  authorityScore: number
  parentInterpretationRisk: ParentInterpretationRiskLevel
  replyLikelihood: ReplyLikelihood
  regretRisk: RegretRiskLevel
}) {
  const interpretationComponent =
    options.parentInterpretationRisk === "low"
      ? 100
      : options.parentInterpretationRisk === "medium"
      ? 50
      : 0
  const replyComponent =
    options.replyLikelihood === "low" ? 100 : options.replyLikelihood === "medium" ? 60 : 20
  const regretComponent = options.regretRisk === "low" ? 100 : options.regretRisk === "medium" ? 50 : 0

  return Math.round(
    options.clarityScore * 0.25 +
      options.authorityScore * 0.25 +
      interpretationComponent * 0.2 +
      replyComponent * 0.15 +
      regretComponent * 0.15,
  )
}

export function evaluateProfessionalJudgement(options: {
  sourceText: string
  candidateText: string
  sourceIntent: TeacherDraftIntent
  language: DraftLanguage
  safetyAnalysis?: SafetyEngineOutput | null
}): ProfessionalJudgementResult {
  const candidateText = options.candidateText.trim()
  const sourceText = options.sourceText.trim()
  const candidateSentences = splitSentences(candidateText)
  const sourceSentences = splitSentences(sourceText)
  const lastSentence = candidateSentences.at(-1) ?? candidateText
  const candidateWordCount = countWords(candidateText)
  const contrastClauseCount = (candidateText.match(CONTRAST_CLAUSE_PATTERN) ?? []).length
  const hasFirmStatement = candidateSentences.some((sentence) => FIRM_STATEMENT_PATTERN.test(sentence))
  const sourceExplanationSentenceCount = countExplanationSentences(sourceText)
  const candidateExplanationSentenceCount = countExplanationSentences(candidateText)
  const signals: ProfessionalJudgementSignal[] = []
  const parentEmotionalState =
    options.sourceIntent === "acknowledge"
      ? classifyParentEmotionalState(sourceText)
      : undefined
  const candidateIntent = classifyTeacherIntent(candidateText)
  const sourceIntent = options.sourceIntent
  const hasFabrication = containsFabrication(sourceText, candidateText)
  const boundaryDilution = hasBoundaryDilution(sourceText, candidateText)
  const overSoftening = hasOverSoftening(sourceText, candidateText)
  const endsWithQuestion = QUESTION_ENDING_PATTERN.test(lastSentence)

  let clarityScore = 100
  if (HEDGED_CONCLUSION_PATTERN.test(candidateText)) {
    clarityScore -= 20
    signals.push({
      dimension: "clarity",
      finding: "Hedged conclusion weakens the final decision.",
      direction: "negative",
    })
  }
  if (!FIRM_FINAL_VERB_PATTERN.test(lastSentence)) {
    clarityScore -= 15
    signals.push({
      dimension: "clarity",
      finding: "Draft ends without a clear final statement.",
      direction: "negative",
    })
  }
  if (endsWithQuestion) {
    clarityScore -= 25
    signals.push({
      dimension: "clarity",
      finding: "Ending on a question leaves the decision sounding unresolved.",
      direction: "negative",
    })
  }
  if (contrastClauseCount > 1) {
    clarityScore -= 15
    signals.push({
      dimension: "clarity",
      finding: "Multiple 'however' or 'but' turns make the message feel uncertain.",
      direction: "negative",
    })
  }
  if (candidateWordCount > 100 && !hasFirmStatement) {
    clarityScore -= 10
    signals.push({
      dimension: "clarity",
      finding: "Long message without a clear firm sentence risks muddying the decision.",
      direction: "negative",
    })
  }
  clarityScore = clampScore(clarityScore)
  if (clarityScore >= 80) {
    signals.push({
      dimension: "clarity",
      finding: "Decision lands clearly without unnecessary hedging.",
      direction: "positive",
    })
  }

  let authorityScore = 70
  if (FIRST_PERSON_FIRM_PATTERN.test(candidateText)) {
    authorityScore += 15
    signals.push({
      dimension: "authority",
      finding: "First-person framing keeps the teacher in clear professional control.",
      direction: "positive",
    })
  }
  if (CONSISTENT_APPLICATION_PATTERN.test(candidateText)) {
    authorityScore += 10
    signals.push({
      dimension: "authority",
      finding: "Consistent-application language supports fair professional authority.",
      direction: "positive",
    })
  }
  if (!APOLOGY_PATTERN.test(candidateText)) {
    authorityScore += 5
    signals.push({
      dimension: "authority",
      finding: "No unnecessary apology language softens the teacher's position.",
      direction: "positive",
    })
  }
  if (options.sourceIntent !== "acknowledge" && APOLOGY_PATTERN.test(candidateText)) {
    authorityScore -= 20
    signals.push({
      dimension: "authority",
      finding: "Unnecessary apology language weakens the teacher's authority.",
      direction: "negative",
    })
  }
  if (SUBMISSIVE_HEDGE_PATTERN.test(candidateText)) {
    authorityScore -= 15
    signals.push({
      dimension: "authority",
      finding: "Submissive hedging makes the teacher sound less in control.",
      direction: "negative",
    })
  }
  if (candidateExplanationSentenceCount >= 2 && sourceExplanationSentenceCount === 0) {
    authorityScore -= 15
    signals.push({
      dimension: "authority",
      finding: "Extra justification makes the message sound over-explained.",
      direction: "negative",
    })
  }
  if (PERMISSION_SEEKING_END_PATTERN.test(lastSentence)) {
    authorityScore -= 10
    signals.push({
      dimension: "authority",
      finding: "Permission-seeking at the end undercuts professional certainty.",
      direction: "negative",
    })
  }
  if (
    parentEmotionalState === "accusatory" &&
    !DE_ESCALATION_OPENING_PATTERN.test(getOpeningParagraph(candidateText))
  ) {
    signals.push({
      dimension: "authority",
      finding: "Accusatory parent tone requires explicit de-escalation in opening.",
      direction: "negative",
    })
  }
  authorityScore = clampScore(authorityScore)

  let boundaryStrengthScore = 50
  if (sourceIntent === "limit") {
    boundaryStrengthScore = 50
    if (/\b(will not|cannot|must not|is not permitted|are not permitted|not allowed)\b/i.test(candidateText)) {
      boundaryStrengthScore += 20
      signals.push({
        dimension: "boundary_strength",
        finding: "Boundary is stated directly and remains easy to understand.",
        direction: "positive",
      })
    }
    if (/\b(consistently|same for all|fair to all|applies to every|all students)\b/i.test(candidateText)) {
      boundaryStrengthScore += 15
      signals.push({
        dimension: "boundary_strength",
        finding: "Consistency language helps the boundary feel fair rather than personal.",
        direction: "positive",
      })
    }
    if (!SOFTENING_PATTERN.test(candidateText)) {
      boundaryStrengthScore += 10
      signals.push({
        dimension: "boundary_strength",
        finding: "No softening language keeps the boundary firm.",
        direction: "positive",
      })
    }
    if (hasSingleClearSubject(candidateText)) {
      boundaryStrengthScore += 5
      signals.push({
        dimension: "boundary_strength",
        finding: "Single clear subject keeps the boundary focused and harder to challenge.",
        direction: "positive",
      })
    }
    if (overSoftening) {
      boundaryStrengthScore -= 20
      signals.push({
        dimension: "boundary_strength",
        finding: "Softening language weakens the enforceability of the boundary.",
        direction: "negative",
      })
    }
    if (boundaryDilution) {
      boundaryStrengthScore -= 15
      signals.push({
        dimension: "boundary_strength",
        finding: "Open-ended softening weakens the practical strength of the boundary.",
        direction: "negative",
      })
    }
    if (hasEmpathyAfterBoundaryInSameParagraph(candidateText)) {
      boundaryStrengthScore -= 10
      signals.push({
        dimension: "boundary_strength",
        finding: "Empathy immediately after the boundary softens its practical force.",
        direction: "negative",
      })
    }
    if (RHETORICAL_HEDGE_PATTERN.test(candidateText)) {
      boundaryStrengthScore -= 10
      signals.push({
        dimension: "boundary_strength",
        finding: "Rhetorical hedging makes the boundary easier to push against.",
        direction: "negative",
      })
    }
    boundaryStrengthScore = clampScore(boundaryStrengthScore)
  }

  let parentInterpretationRisk: ParentInterpretationRiskLevel = "low"
  if (
    PASSIVE_AGGRESSIVE_PATTERN.test(candidateText) ||
    DISMISSIVE_PATTERN.test(candidateText) ||
    PATRONISING_PATTERN.test(candidateText)
  ) {
    parentInterpretationRisk = "high"
  } else if (
    options.sourceIntent !== "escalate" &&
    MEDIUM_INTERPRETATION_RISK_PATTERN.test(candidateText)
  ) {
    parentInterpretationRisk = "medium"
  }

  if (
    parentEmotionalState === "distressed" &&
    FIRM_MARKERS_PATTERN.test(getOpeningParagraph(candidateText))
  ) {
    signals.push({
      dimension: "interpretation_risk",
      finding: "Distressed parent - boundary language in opening paragraph may read as dismissive.",
      direction: "negative",
    })
    if (parentInterpretationRisk === "low") {
      parentInterpretationRisk = "medium"
    }
  }
  signals.push({
    dimension: "interpretation_risk",
    finding:
      parentInterpretationRisk === "low"
        ? "Message is unlikely to be misread by a parent."
        : parentInterpretationRisk === "medium"
        ? "Some language could invite mixed interpretations."
        : "Message is likely to be interpreted in more than one way.",
    direction: parentInterpretationRisk === "low" ? "positive" : "negative",
  })

  let replyLikelihood: ReplyLikelihood = "low"
  if (
    ((sourceIntent === "close" || sourceIntent === "limit") && OPEN_LOOP_PATTERN.test(candidateText)) ||
    endsWithQuestion ||
    (VAGUE_NEXT_STEP_PATTERN.test(candidateText) && !VAGUE_NEXT_STEP_PATTERN.test(sourceText))
  ) {
    replyLikelihood = "high"
  } else if (
    (candidateIntent.intent === "invite" && sourceIntent !== "invite") ||
    boundaryDilution ||
    candidateWordCount > countWords(sourceText) * 1.4
  ) {
    replyLikelihood = "medium"
  }
  signals.push({
    dimension: "reply_likelihood",
    finding:
      replyLikelihood === "low"
        ? "Draft is unlikely to invite further back-and-forth."
        : replyLikelihood === "medium"
        ? "Draft may prompt a follow-up reply."
        : "Draft actively invites a parent response.",
    direction: replyLikelihood === "low" ? "positive" : "negative",
  })

  const missingAccusatoryDeEscalation =
    parentEmotionalState === "accusatory" &&
    !DE_ESCALATION_OPENING_PATTERN.test(getOpeningParagraph(candidateText))
  const regretRisk: RegretRiskLevel =
    parentInterpretationRisk === "high" ||
    authorityScore < 45 ||
    clarityScore < 45 ||
    hasFabrication ||
    missingAccusatoryDeEscalation
      ? "high"
      : parentInterpretationRisk === "medium" ||
        authorityScore < 60 ||
        clarityScore < 60 ||
        (replyLikelihood === "high" && sourceIntent === "close")
      ? "medium"
      : "low"
  signals.push({
    dimension: "regret_risk",
    finding:
      regretRisk === "low"
        ? "Teacher is unlikely to regret sending this version."
        : regretRisk === "medium"
        ? "Draft is probably workable but worth a quick second look."
        : "Draft has a meaningful risk of being regretted later.",
    direction: regretRisk === "low" ? "positive" : "negative",
  })

  return {
    clarityScore,
    authorityScore,
    parentInterpretationRisk,
    replyLikelihood,
    boundaryStrengthScore,
    regretRisk,
    sendConfidenceScore: computeSendConfidenceScore({
      clarityScore,
      authorityScore,
      parentInterpretationRisk,
      replyLikelihood,
      regretRisk,
    }),
    parentEmotionalState,
    signals,
  }
}
