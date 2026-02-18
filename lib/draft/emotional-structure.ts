export type EmotionalLocale = "en" | "de"
export type EmotionalStep =
  | "acknowledgeEmotion"
  | "acknowledgeIncident"
  | "reassure"
  | "nextSteps"
  | "inviteDialogue"
  | "signOff"

type KeywordMap = Record<EmotionalStep, string[]>

const NORMALIZE_REGEX = /[\p{M}]/gu

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(NORMALIZE_REGEX, "")
}

const KEYWORDS: Record<EmotionalLocale, KeywordMap> = {
  en: {
    acknowledgeEmotion: [
      "i understand",
      "i hear",
      "thank you for sharing",
      "i can imagine",
      "i appreciate your honesty",
    ],
    acknowledgeIncident: [
      "regarding",
      "about the concern",
      "in your note",
      "the homework load",
      "this situation",
    ],
    reassure: [
      "i'm committed",
      "i'm here for you",
      "rest assured",
      "we'll keep the focus",
      "i will support",
    ],
    nextSteps: [
      "please",
      "let's",
      "i will",
      "i plan to",
      "we can set up",
    ],
    inviteDialogue: [
      "let me know",
      "feel free to reach out",
      "i welcome",
      "happy to chat",
      "i'm available",
    ],
    signOff: [],
  },
  de: {
    acknowledgeEmotion: [
      "ich verstehe",
      "ich höre",
      "mir ist bewusst",
      "danke, dass",
      "ich nehme wahr",
      "mir fällt auf",
      "das klingt belastend",
    ],
    acknowledgeIncident: [
      "bezüglich",
      "in bezug auf",
      "die situation",
      "die anfrage",
      "konkret",
      "die aktuellen termine",
    ],
    reassure: [
      "ich bin für sie da",
      "wir behalten den fokus",
      "gemeinsam finden wir",
      "ich unterstütze",
      "das schaffen wir",
      "ich bleibe an der seite",
      "wir kümmern uns darum",
      "ich halte sie informiert",
    ],
    nextSteps: [
      "bitte",
      "lassen sie uns",
      "wir planen",
      "wir treffen",
      "ich setze mich",
      "ich organisiere",
      "ich sorge dafür",
      "wir stimmen uns ab",
      "kurze termine",
    ],
    inviteDialogue: [
      "melden sie sich",
      "lassen sie mich wissen",
      "gerne im gespräch",
      "sprechen sie mich an",
      "ich freue mich",
      "rufen sie mich an",
      "schreiben sie mir",
      "ich bin erreichbar",
    ],
    signOff: [],
  },
}

const SIGN_OFFS: Record<EmotionalLocale, string[]> = {
  en: ["kind regards", "best regards", "warm regards", "sincerely", "yours sincerely"],
  de: ["mit freundlichen grüßen", "herzliche grüße", "mit herzlichen grüßen"],
}

export interface EmotionalStructureResult {
  locale: EmotionalLocale
  score: number
  matchedSteps: EmotionalStep[]
  passed: boolean
}

export function evaluateEmotionalStructure(text: string, locale: EmotionalLocale): EmotionalStructureResult {
  const normalizedText = normalize(text)
  const matchedSteps: EmotionalStep[] = []
  const keywords = KEYWORDS[locale]

  const checkStep = (step: EmotionalStep, candidates: string[]) => {
    if (candidates.some((phrase) => normalizedText.includes(normalize(phrase)))) {
      matchedSteps.push(step)
    }
  }

  Object.entries(keywords).forEach(([step, phrases]) => {
    if (phrases.length > 0) {
      checkStep(step as EmotionalStep, phrases)
    }
  })

  const closings = SIGN_OFFS[locale]
  if (closings.some((closing) => normalizedText.includes(normalize(closing)))) {
    matchedSteps.push("signOff")
  }

  const uniqueSteps = Array.from(new Set(matchedSteps))
  const score = uniqueSteps.length
  return {
    locale,
    score,
    matchedSteps: uniqueSteps,
    passed: score >= 4,
  }
}
