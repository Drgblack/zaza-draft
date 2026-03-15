export type ToneClass = "accusatory" | "defensive" | "clinical" | "collaborative"

export interface ToneClassificationResult {
  toneClass: ToneClass
  toneModifier: number
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
const ANTHROPIC_MAX_TOKENS = 10

const TONE_MODIFIERS: Record<ToneClass, number> = {
  accusatory: 30,
  defensive: 20,
  clinical: 5,
  collaborative: -20,
}

function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY
}

function buildPrompt(rawMessage: string) {
  return `Classify the overall tone of this teacher-parent message.
Return exactly one word from this list:
accusatory | defensive | clinical | collaborative

Message:
${rawMessage}`
}

function normalizeToneClass(value: string): ToneClass {
  const normalized = value.trim().toLowerCase()

  if (
    normalized === "accusatory" ||
    normalized === "defensive" ||
    normalized === "clinical" ||
    normalized === "collaborative"
  ) {
    return normalized
  }

  return "clinical"
}

function extractTextContent(payload: unknown): string {
  const content = (payload as { content?: Array<{ type?: string; text?: string }> })?.content

  if (!Array.isArray(content)) {
    return ""
  }

  return content
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join(" ")
}

export async function classifyTone(rawMessage: string): Promise<ToneClassificationResult> {
  const apiKey = getAnthropicApiKey()

  if (!apiKey) {
    throw new Error("Missing Anthropic API key (ANTHROPIC_API_KEY)")
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildPrompt(rawMessage),
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic tone classification failed: ${response.status} ${response.statusText}`)
  }

  const payload = (await response.json()) as unknown
  const toneClass = normalizeToneClass(extractTextContent(payload))

  return {
    toneClass,
    toneModifier: TONE_MODIFIERS[toneClass],
  }
}
