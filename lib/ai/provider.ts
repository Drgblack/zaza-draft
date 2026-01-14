import type { DraftLanguage, DraftMode, DraftTone, PronounPreference } from "@/lib/types"
import { MODE_DISPLAY_NAMES, MODE_PROMPT_INSTRUCTIONS } from "@/lib/draft-mode"
import { buildStudentInstruction, PRONOUN_LABELS } from "@/lib/draft/student-policy"

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
  originalSituation?: string
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
  studentFirstName?: string
  resolvedPronounPreference?: PronounPreference
  forceLanguage?: boolean
  signatureBlock?: string
  uiLocale?: string
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

export function buildSystemPrompt(input: ProviderInput) {
  const systemLines = [
    "You are Zara Draft, an assistant for K-12 teachers who writes professional, concise communications for parents and colleagues.",
    "Always stay factual: do not invent facts that were not provided in the prompt. When details are missing, keep the response neutral and ask for clarification.",
    "Maintain the requested tone and output the final text in the requested language. Keep replies ≤250 words, focused on teacher style.",
    "Avoid gendered pronouns unless the teacher explicitly specifies them in the prompt; default to inclusive wording.",
    "Never include student PII (full names, emails, phone numbers, addresses). If the prompt is disallowed, explain politely that you cannot help.",
    "Do not include blocked language such as insults, diagnostic labels, or emotionally charged terms; redirect toward behaviour, effort, and growth.",
  "Use the student's first name sparingly (once or twice) and then switch to inclusive pronouns or neutral wording; avoid repeating 'your child' in adjacent sentences.",
  "Describe engagement challenges as calm observations (has found it difficult to stay focused, has had a few moments where...) rather than writing 'instances of disruption' or accusatory language.",
  "Close parent messages with a short reassurance about aiming to support the student positively and helping them feel confident and successful at school.",
  "Prefer the student's first name once or twice, then use the provided pronouns naturally; avoid repeating 'the student'.",
    PRONOUN_INSTRUCTIONS[input.pronounPreference],
    MODE_PROMPT_INSTRUCTIONS[input.mode],
  ]

  const resolvedPronoun = input.resolvedPronounPreference ?? input.pronounPreference
  const studentInstruction = buildStudentInstruction({
    firstName: input.studentFirstName,
    pronoun: resolvedPronoun,
  })
  systemLines.push(studentInstruction)
  if (resolvedPronoun !== "auto") {
    const label = PRONOUN_LABELS[resolvedPronoun]
    if (label) {
      systemLines.push(`Use the ${label} pronouns consistently for the student. Do not switch pronouns.`)
    }
  }
  systemLines.push(
    "Treat the cleaned notes that follow as your primary source and use the original notes only for background; do not repeat the original wording.",
  )
  systemLines.push(
    "Never quote, repeat, or paraphrase the original rough notes. Use them only to infer intent.",
  )
  systemLines.push(
    "Always choose calm, school-safe language and do not restate insults, inflammatory labels, or threats.",
  )

  if (input.language === "de") {
    systemLines.push(
      "When writing in German, keep the sentences warm, calm, and professional; favour the Sie form and avoid bureaucratic labels such as 'Fach:' unless they are explicitly part of the request.",
    )
    systemLines.push("Avoid placeholders like [Name des Sch�lers], [Parent Name], or [Student Name].")
    systemLines.push(
      "If no student name was supplied, refer to the child as 'Ihr Kind' (use 'Ihr Sohn' or 'Ihre Tochter' only when the teacher explicitly provides gender).",
    )
    if (input.mode === "parent_message") {
    systemLines.push(
      "German parent messages must mimic a concise professional email: start with 'Betreff: <short subject>' on the first line, add a blank line, and begin with a polite greeting such as 'Liebe Eltern,' or 'Liebe Erziehungsberechtigte,'.",
    )
    systemLines.push(
      "Write 3-5 short paragraphs separated by blank lines; each paragraph should focus on calm observations, progress updates, and collaborative next steps, keeping sentences brief (2-3 sentences) and paragraphs short.",
    )
    systemLines.push(
      "End with a blank line, then 'Herzliche Grüße,' or 'Freundliche Grüße,' on its own line, followed by the teacher's name; include a brief reassuring sentence before the closing.",
    )
    systemLines.push(
      "German parent messages must always include EXACTLY 3-5 paragraphs separated by blank lines (two newline characters), keep 'Betreff: …' on the first line, and never collapse the response into a single block.",
    )
    systemLines.push(
      "Always finish after a blank line with a polite closing (for example, 'Herzliche Grüße,' or 'Freundliche Grüße,' plus the teacher name) and never begin or end with refusal phrasing such as 'Es tut mir leid' or 'Ich kann nicht helfen'.",
    )
  } else {
    systemLines.push(
      "German report comments should span 35 to 70 words, omit greetings, focus on observable behaviour and progress, and end with a short clarity statement without a call to action.",
      )
    }
    systemLines.push("Translate any English notes into natural German rather than copying English words literally.")
    systemLines.push(
      "Always reframe rude or harsh German input into a calm, professional note; never begin with a refusal such as 'Es tut mir leid' or 'Ich kann nicht helfen'. Stay within 3-5 short paragraphs separated by blank lines, include the requested subject line and a polite closing, and keep the tone supportive.",
    )
  }

  if (input.uiLocale?.toLowerCase().startsWith("de")) {
    systemLines.push(
      "DE tone contract: avoid moral judgement words such as 'L�gen', 'Ausreden', 'faul', or 'schlecht'; describe behaviour with neutral observations (for example, 'Es gab einige Situationen, in denen...'); frame collaboration with phrases like 'Ich m�chte gemeinsam mit Ihnen' and offer a clear next step such as 'K�nnen wir einen kurzen Termin vereinbaren?'; keep the tone calm, professional, and supportive without sounding accusatory.",
    )
  }

  if (input.rewrite) {
    systemLines.push(
      "You are rewriting content already supplied; keep meaning intact while adapting tone/language per the request.",
    )
  }

  if (input.forceLanguage) {
    const languageName = input.language === "de" ? "German" : "English"
    systemLines.push(
      `Respond strictly in ${languageName}; avoid mixing other languages and do not include English phrases when German is requested.`,
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
  if (input.signatureBlock) {
    contextLines.push(`Signature block:\n${input.signatureBlock}`)
  }
  const userParts = [
    `Cleaned notes:\n${input.situation}`,
    input.originalSituation ? `Original notes (for reference only):\n${input.originalSituation}` : undefined,
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






