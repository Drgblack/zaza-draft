import {
  DeescalationCategory,
  DeescalationSeverity,
  DetectionResult,
  DeescalationSummary,
  RewriteOutcome,
} from "./types"

const REWRITE_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bsick of\b/gi, replacement: "concerned about" },
  { pattern: /\blies\b/gi, replacement: "inconsistent information" },
  { pattern: /\bliar(?:s)?\b/gi, replacement: "inaccurate claims" },
  { pattern: /\blazy attitude\b/gi, replacement: "inconsistent follow-through" },
  { pattern: /\blazy\b/gi, replacement: "working toward consistent effort" },
  { pattern: /\bmanipulative\b/gi, replacement: "trying to influence others" },
  { pattern: /\bmanipulating\b/gi, replacement: "trying to control outcomes" },
  { pattern: /\bpsycho\b/gi, replacement: "overwhelmed or distressed" },
  { pattern: /\bor else\b/gi, replacement: "so we can stay focused on next steps" },
  { pattern: /\bif you (?:do not|don't|will not|won't)\b/gi, replacement: "If this pattern continues" },
  { pattern: /\balways\b/gi, replacement: "frequently" },
  { pattern: /\bnever\b/gi, replacement: "rarely" },
  { pattern: /\bevery time\b/gi, replacement: "most times" },
  { pattern: /\bconstantly\b/gi, replacement: "frequently" },
  { pattern: /\bat all times\b/gi, replacement: "very consistently" },
  { pattern: /\bdamn\b/gi, replacement: "frustrating" },
  { pattern: /\bshit\b/gi, replacement: "messy" },
  { pattern: /\bhell\b/gi, replacement: "very difficult" },
  { pattern: /\bbitch\b/gi, replacement: "critical" },
  { pattern: /\bpiss(?:ed)?\b/gi, replacement: "frustrated" },
  { pattern: /\bstupid(?:ly)?\b/gi, replacement: "not yet productive" },
  { pattern: /\bidiot(?:ic)?\b/gi, replacement: "not meeting expectations" },
  { pattern: /\bdumm(?:e|er|en)?\b/gi, replacement: "noch unsicher" },
  { pattern: /\bidiot(?:in|isch)?\b/gi, replacement: "noch nicht auf dem richtigen Weg" },
  { pattern: /\bfaul(?:es|e|er)?\b/gi, replacement: "arbeitet daran, beständig zu sein" },
  { pattern: /\bmanipulativ\b/gi, replacement: "versucht, Situationen zu beeinflussen" },
  { pattern: /\bmanipulierend\b/gi, replacement: "versucht, andere zu lenken" },
  { pattern: /\bpsycho\b/gi, replacement: "emotional überfordert" },
  { pattern: /\bor sonst\b/gi, replacement: "damit wir uns auf nächste Schritte konzentrieren" },
  { pattern: /\bwenn (?:du|ihr|Sie) (?:nicht|nichts?)\b/gi, replacement: "Wenn dieses Muster weiterbesteht" },
  { pattern: /\bimmer\b/gi, replacement: "häufig" },
  { pattern: /\bnie\b/gi, replacement: "selten" },
  { pattern: /\bständig\b/gi, replacement: "immer wieder" },
  { pattern: /\bverdammt\b/gi, replacement: "sehr frustrierend" },
  { pattern: /\bscheiße\b/gi, replacement: "sehr herausfordernd" },
  { pattern: /\bscheiß\b/gi, replacement: "sehr herausfordernd" },
  { pattern: /\bmist\b/gi, replacement: "sehr schwierig" },
  { pattern: /\barschloch\b/gi, replacement: "sehr gestresst" },
  { pattern: /\bverflucht\b/gi, replacement: "ziemlich frustrierend" },
  { pattern: /\bkacke\b/gi, replacement: "sehr schwierig" },
]

const TARGETED_SUGGESTIONS: Array<{ key: string; suggestion: string }> = [
  {
    key: "lies",
    suggestion: "Describe the inaccurate or missing information rather than labelling it a lie.",
  },
  {
    key: "liar",
    suggestion: "Focus on the miscommunication instead of calling someone a liar.",
  },
  {
    key: "lazy",
    suggestion: "Name the follow-through or effort you need to see instead of calling it lazy.",
  },
  {
    key: "manipulative",
    suggestion: "Talk about the specific behaviours and their impact rather than the label.",
  },
  {
    key: "psycho",
    suggestion: "Stick to observable behaviour; avoid using emotional or diagnostic labels.",
  },
  {
    key: "sick of",
    suggestion: "Share your concern calmly and explain the impact on learning.",
  },
  {
    key: "or else",
    suggestion: "Outline desired next steps instead of promising consequences.",
  },
  {
    key: "if you don't",
    suggestion: "Describe what needs to change rather than issuing a threat.",
  },
  {
    key: "never",
    suggestion: "Note the frequency without making sweeping statements.",
  },
  {
    key: "always",
    suggestion: "Talk about the most recent pattern instead of absolutes like always.",
  },
  {
    key: "dumm",
    suggestion: "Beschreiben Sie den Lernmoment oder die Herausforderung statt einer Beleidigung.",
  },
  {
    key: "faul",
    suggestion: "Benennen Sie die fehlende Regelmässigkeit oder das Verhalten, nicht das Label.",
  },
  {
    key: "manipulativ",
    suggestion: "Fokusieren Sie sich auf die beobachteten Verhaltensweisen, nicht auf die Absicht.",
  },
  {
    key: "psycho",
    suggestion: "Nennen Sie lieber den Stress oder die Emotionen, die Sie sehen.",
  },
  {
    key: "oder sonst",
    suggestion: "Formulieren Sie klare nächste Schritte, ohne mit Konsequenzen zu drohen.",
  },
  {
    key: "wenn du",
    suggestion: "Beschreiben Sie klare Beobachtungen und Konsequenzen statt einer Drohung.",
  },
  {
    key: "wenn ihr",
    suggestion: "Drücken Sie die Beobachtung neutral aus, ohne zu drohen.",
  },
  {
    key: "wenn Sie",
    suggestion: "Beschreiben Sie die beobachtete Situation, statt zu drohen.",
  },
  {
    key: "immer",
    suggestion: "Sprechen Sie über konkrete Situationen statt verallgemeinernder Begriffe.",
  },
  {
    key: "nie",
    suggestion: "Benennen Sie die Häufigkeit ohne absolute Aussagen.",
  },
  {
    key: "verdammt",
    suggestion: "Beschreiben Sie die Frustration sachlich ohne Kraftausdruck.",
  },
  {
    key: "scheiße",
    suggestion: "Fokussieren Sie sich auf die Herausforderung, statt zu fluchen.",
  },
  {
    key: "arschloch",
    suggestion: "Bleiben Sie bei den beobachtbaren Verhaltensweisen statt Beschimpfungen.",
  },
]

const CATEGORY_HINTS: Record<DeescalationCategory, string> = {
  insult: "Use neutral descriptions of the behaviour and its impact.",
  sarcasm: "Keep language literal and focus on the facts rather than irony.",
  threat: "Offer clear next steps instead of consequences or ultimatums.",
  absolute: "Replace sweeping language with observable frequency or detail.",
  inflammatory: "Describe the behaviour you see without labels or emotional adjectives.",
  profanity: "Switch to calm, professional vocabulary that names the behaviour or impact.",
}

const COACHING_LINE_CALM = "I kept your intent but softened a few phrases so the message lands well and stays professional."
const COACHING_LINE_NO_CHANGE = "Your note already feels calm and professional, so no changes were needed."

function getSuggestionForSnippet(snippet: string, category: DeescalationCategory) {
  const normalized = snippet.toLowerCase()
  for (const targeted of TARGETED_SUGGESTIONS) {
    if (normalized.includes(targeted.key)) {
      return targeted.suggestion
    }
  }
  return CATEGORY_HINTS[category]
}

function trimSnippet(value: string, limit = 60) {
  const trimmed = value.trim()
  if (trimmed.length <= limit) {
    return trimmed
  }
  return `${trimmed.slice(0, limit - 3).trim()}...`
}

export function rewriteHighEmotionText(text: string, detection: DetectionResult): RewriteOutcome {
  let cleanedText = text
  for (const rule of REWRITE_RULES) {
    cleanedText = cleanedText.replace(rule.pattern, rule.replacement)
  }

  const summarizedPhrases = detection.flaggedPhrases.slice(0, 5).map((phrase) => ({
    originalSnippet: trimSnippet(phrase.snippet),
    category: phrase.category,
    suggestionSnippet: trimSnippet(getSuggestionForSnippet(phrase.snippet, phrase.category), 80),
  }))

  const summary: DeescalationSummary = {
    wasDeescalated: detection.wasDeescalated,
    coachingLine: detection.wasDeescalated ? COACHING_LINE_CALM : COACHING_LINE_NO_CHANGE,
    flaggedPhrases: summarizedPhrases,
  }

  return {
    cleanedText,
    summary,
  }
}
