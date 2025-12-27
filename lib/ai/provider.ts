import type { DraftLanguage, DraftMode, DraftTone, PronounPreference } from "@/lib/types"
import { MODE_DISPLAY_NAMES, MODE_PROMPT_INSTRUCTIONS } from "@/lib/draft-mode"

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY
}

function getEnvModelPrimary() {
  return process.env.OPENAI_MODEL_PRIMARY || process.env.OPENAI_MODEL || null
}

function getEnvModelFallback() {
  return process.env.OPENAI_MODEL_FALLBACK ?? null
}

function forceFailPrimary() {
  return process.env.OPENAI_FORCE_FAIL_PRIMARY === "1"
}

interface ProviderInput {
  situation: string
  tone: DraftTone
  language: DraftLanguage
  context?: {
    subject?: string
    gradeLevel?: string
  }
  rewrite?: boolean
  previousDraft?: string
  pronounPreference: PronounPreference
  mode: DraftMode
}

export interface ProviderMeta {
  modelUsed: string
  tokensUsed?: number
  latencyMs: number
}

export interface ProviderResult {
  text: string
  providerMeta: ProviderMeta
}

class ProviderError extends Error {
  constructor(message: string, public status?: number, public openAIErrorCode?: string) {
    super(message)
    this.name = "ProviderError"
  }
}

const transientStatusCodes = new Set([429, 500, 502, 503, 504])

const PRONOUN_INSTRUCTIONS: Record<PronounPreference, string> = {
  auto: "Use pronouns only when the teacher explicitly states them; otherwise default to neutral wording (the student, the learner, this person).",
  she: "Use she/her pronouns consistently throughout the draft.",
  he: "Use he/him pronouns consistently throughout the draft.",
  they: "Use they/them pronouns consistently throughout the draft.",
  avoid: "Avoid gendered pronouns entirely and rely on neutral constructions such as 'the student' or 'this learner'.",
}

function buildSystemPrompt(input: ProviderInput) {
  const systemLines = [
    "You are Zara Draft, an assistant for K-12 teachers who writes professional, concise communications for parents and colleagues.",
    "Always stay factual: do not invent facts that were not provided in the prompt. When details are missing, keep the response neutral and ask for clarification.",
    "Maintain the requested tone and output the final text in the requested language. Keep replies ≤250 words, focused on teacher style.",
    "Avoid gendered pronouns unless the teacher explicitly specifies them in the prompt; default to inclusive wording.",
    "Never include student PII (full names, emails, phone numbers, addresses). If the prompt is disallowed, explain politely that you cannot help.",
    "Do not include blocked language such as insults, diagnostic labels, or emotionally charged terms; redirect toward behaviour, effort, and growth.",
    PRONOUN_INSTRUCTIONS[input.pronounPreference],
    MODE_PROMPT_INSTRUCTIONS[input.mode],
  ]

  if (input.rewrite) {
    systemLines.push(
      "You are rewriting content already supplied; keep meaning intact while adapting tone/language per the request.",
    )
  }

  return systemLines.join(" ")
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveModels() {
  const primary = getEnvModelPrimary()
  if (!primary) {
    throw new ProviderError(
      "Missing OpenAI model configuration (OPENAI_MODEL_PRIMARY or OPENAI_MODEL)",
    )
  }

  return {
    primary,
    fallback: getEnvModelFallback(),
  }
}

export function getConfiguredModelNames() {
  return {
    primary: getEnvModelPrimary(),
    fallback: getEnvModelFallback(),
  }
}

interface FetchPayload {
  messages: Array<{ role: "system" | "user"; content: string }>
  temperature: number
  max_tokens: number
}

function buildBasePayload(input: ProviderInput): FetchPayload {
  const system = buildSystemPrompt(input)
  const contextLines = [
    `Tone: ${input.tone}`,
    `Language: ${input.language}`,
    `Mode: ${MODE_DISPLAY_NAMES[input.mode]}`,
    `Context subject: ${input.context?.subject ?? "-"}`,
    `Context gradeLevel: ${input.context?.gradeLevel ?? "-"}`,
  ]
  const userParts = [
    `Situation:\n${input.situation}`,
    input.rewrite && input.previousDraft ? `Rewrite previous draft:\n${input.previousDraft}` : undefined,
  ].filter(Boolean)

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: `${contextLines.join("\n")} \n\n${userParts.join("\n\n")}` },
    ],
    temperature: 0.4,
    max_tokens: 500,
  }
}

interface GenerationResult {
  text: string
  latencyMs: number
  tokensUsed?: number
  modelUsed: string
}

function isTransientOpenAIError(error: unknown) {
  if (error instanceof ProviderError) {
    if (typeof error.status === "number") {
      return transientStatusCodes.has(error.status)
    }

    const message = error.message.toLowerCase()
    if (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("connection reset") ||
      message.includes("rate limit")
    ) {
      return true
    }

    if (error.openAIErrorCode === "rate_limit_exceeded") {
      return true
    }

    return false
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("connection reset")
    ) {
      return true
    }
  }

  return false
}

async function callOpenAIModel(model: string, payload: FetchPayload): Promise<GenerationResult> {
  const openAiKey = getOpenAiApiKey()
  if (!openAiKey) {
    throw new ProviderError("Missing AI provider key (OPENAI_API_KEY)")
  }

  const requestPayload = {
    ...payload,
    model,
  }

  const start = Date.now()
  let response: Response
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify(requestPayload),
    })
  } catch (error) {
    throw new ProviderError(
      `AI_GENERATION_FAILED: ${error instanceof Error ? error.message : "Network error"}`,
    )
  }

  const responseText = await response.text()
  let json: any
  try {
    json = JSON.parse(responseText)
  } catch {
    json = null
  }

  const latencyMs = Date.now() - start

  if (!response.ok) {
    const code = json?.error?.code
    throw new ProviderError(
      `AI_GENERATION_FAILED: ${response.status} ${response.statusText}`,
      response.status,
      code,
    )
  }

  const result = json?.choices?.[0]?.message?.content?.trim()
  if (!result) {
    throw new ProviderError("AI_GENERATION_FAILED: No content returned")
  }

  const tokensUsed = json?.usage?.total_tokens
  return {
    text: result,
    latencyMs,
    tokensUsed,
    modelUsed: json?.model ?? model,
  }
}

async function callWithFallback(payload: FetchPayload): Promise<GenerationResult> {
  const { primary, fallback } = resolveModels()
  let lastError: Error | undefined
  let simulatedFailure = false

  const attemptPrimary = async () => {
    if (forceFailPrimary() && !simulatedFailure) {
      simulatedFailure = true
      throw new ProviderError("Simulated primary failure", 503)
    }
    return callOpenAIModel(primary, payload)
  }

  try {
    return await attemptPrimary()
  } catch (error) {
    console.warn("[provider] primary model failed", {
      status: error instanceof ProviderError ? error.status : undefined,
      code: error instanceof ProviderError ? error.openAIErrorCode : undefined,
    })
    lastError = error instanceof Error ? error : new Error("Unknown error")

    if (!isTransientOpenAIError(error)) {
      throw error
    }

    await delay(250)

    try {
      return await attemptPrimary()
    } catch (secondError) {
      lastError = secondError instanceof Error ? secondError : new Error("Unknown error")
      if (!isTransientOpenAIError(secondError)) {
        throw secondError
      }
    }
  }

  if (!fallback) {
    throw lastError ?? new ProviderError("AI_GENERATION_FAILED: Unable to generate draft")
  }

  console.info("[provider] falling back to secondary model", { fallbackModel: fallback })
  return callOpenAIModel(fallback, payload)
}

export async function generateDraft(input: ProviderInput): Promise<ProviderResult> {
  const basePayload = buildBasePayload(input)
  const result = await callWithFallback(basePayload)
  return {
    text: result.text,
    providerMeta: {
      modelUsed: result.modelUsed,
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
    },
  }
}
