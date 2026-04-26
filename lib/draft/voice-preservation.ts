export interface VoiceProfile {
  avgSentenceWordCount: number
  sentenceCount: number
  avgClauseDepth: number
  hasFirstPerson: boolean
  hasDirectAddress: boolean
  formalityScore: number
}

export type VoiceViolationType =
  | "SENTENCE_LENGTH_DRIFT"
  | "FORMALITY_DRIFT"
  | "PERSON_DRIFT"

export type VoiceViolation = {
  type: VoiceViolationType
  description: string
  severity: "advisory"
}

const FORMAL_MARKER_PATTERN =
  /\b(I wish to|I write to|I am writing|please be advised|please note|I would like to draw your attention)\b/gi

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function countWords(text: string) {
  const normalized = text.trim()
  return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0
}

function countMatches(text: string, pattern: RegExp) {
  const matches = text.match(pattern)
  return matches ? matches.length : 0
}

export function extractVoiceProfile(text: string): VoiceProfile {
  const sentences = splitSentences(text)
  const sentenceCount = sentences.length
  const totalSentenceWords = sentences.reduce((sum, sentence) => sum + countWords(sentence), 0)
  const avgSentenceWordCount = sentenceCount === 0 ? 0 : totalSentenceWords / sentenceCount
  const commaCount = countMatches(text, /,/g)
  const avgClauseDepth = sentenceCount === 0 ? 0 : commaCount / sentenceCount
  const firstPersonCount = countMatches(text, /\bI\b/g)
  const directAddressCount = countMatches(text, /\b(you|your)\b/gi)
  const formalMarkerCount = countMatches(text, FORMAL_MARKER_PATTERN)
  const formalityScore = Math.min(1, formalMarkerCount / 3)

  return {
    avgSentenceWordCount,
    sentenceCount,
    avgClauseDepth,
    hasFirstPerson: firstPersonCount > 1,
    hasDirectAddress: directAddressCount > 0,
    formalityScore,
  }
}

export function checkVoicePreservation(options: {
  sourceProfile: VoiceProfile
  candidateProfile: VoiceProfile
}): {
  preserved: boolean
  violations: VoiceViolation[]
} {
  const { sourceProfile, candidateProfile } = options
  const violations: VoiceViolation[] = []

  if (
    sourceProfile.sentenceCount >= 2 &&
    candidateProfile.avgSentenceWordCount > sourceProfile.avgSentenceWordCount * 1.6
  ) {
    violations.push({
      type: "SENTENCE_LENGTH_DRIFT",
      description: "Output sentences are significantly longer than source",
      severity: "advisory",
    })
  }

  if (candidateProfile.formalityScore > sourceProfile.formalityScore + 0.3) {
    violations.push({
      type: "FORMALITY_DRIFT",
      description: "Output is more formal than teacher's natural register",
      severity: "advisory",
    })
  } else if (
    sourceProfile.formalityScore > 0.4 &&
    candidateProfile.formalityScore < sourceProfile.formalityScore - 0.3
  ) {
    violations.push({
      type: "FORMALITY_DRIFT",
      description: "Output is less formal than teacher's natural register",
      severity: "advisory",
    })
  }

  if (sourceProfile.hasFirstPerson && !candidateProfile.hasFirstPerson) {
    violations.push({
      type: "PERSON_DRIFT",
      description: "Teacher's first-person voice removed from output",
      severity: "advisory",
    })
  }

  return {
    preserved: violations.length === 0,
    violations,
  }
}
