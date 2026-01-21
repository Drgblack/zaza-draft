const OUT_OF_SCOPE_PATTERNS = [
  {
    severity: "low",
    pattern: /\brecipe\b/i,
    reason: "asks for a recipe or cooking tips",
  },
  {
    severity: "low",
    pattern: /\b(cake|meal|dinner|dessert|baking)\b.*\b(recipe|tips|ideas)\b/i,
    reason: "requests a specific recipe or cooking help",
  },
  {
    severity: "low",
    pattern: /\byour (recipe|favorite restaurant|favorite place)\b/i,
    reason: "asks about the teacher’s personal recipe or preferences",
  },
  {
    severity: "low",
    pattern: /\brecommend (a|an)?\s*(?:plumber|cleaner|repair|vendor)\b/i,
    reason: "requests a personal recommendation outside school",
  },
  {
    severity: "high",
    pattern: /\b(personal|private) (number|mobile|email|contact)\b/i,
    reason: "asks for the teacher’s private contact details",
  },
  {
    severity: "high",
    pattern: /\bWhatsApp\b/i,
    reason: "asks to communicate over WhatsApp",
  },
  {
    severity: "high",
    pattern: /\bmeet (at|around)?\s*my (house|home|place)\b/i,
    reason: "invites the teacher to the parent’s private home",
  },
  {
    severity: "high",
    pattern: /\b(come over|come by|come to our)\b/i,
    reason: "invites an unsupervised personal visit",
  },
  {
    severity: "high",
    pattern: /\b(gift card|gift|cash|pay you|bank details|money)\b/i,
    reason: "offers money or a gift card and suggests private payment",
  },
  {
    severity: "high",
    pattern: /\b(private tutoring|tutoring privately|tutor me outside school)\b/i,
    reason: "requests private tutoring or paid instruction outside school",
  },
]

export type OutOfScopeSeverity = "low" | "high"

export function detectOutOfScopeRequest(message: string | undefined | null) {
  if (!message) {
    return { isOutOfScope: false, severity: "low" as OutOfScopeSeverity, reasons: [] }
  }

  const normalized = message.toLowerCase()
  const matches = OUT_OF_SCOPE_PATTERNS.filter(({ pattern }) => pattern.test(normalized))
  if (!matches.length) {
    return { isOutOfScope: false, severity: "low" as OutOfScopeSeverity, reasons: [] }
  }

  const severity: OutOfScopeSeverity = matches.some(({ severity }) => severity === "high")
    ? "high"
    : "low"
  const reasons = Array.from(new Set(matches.map(({ reason }) => reason)))
  return { isOutOfScope: true, severity, reasons }
}
