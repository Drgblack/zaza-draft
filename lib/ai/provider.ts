import type { DraftLanguage, DraftMode, DraftTone, PronounPreference } from "@/lib/types"
import { MODE_DISPLAY_NAMES, MODE_PROMPT_INSTRUCTIONS } from "@/lib/draft-mode"
import { buildStudentInstruction, PRONOUN_LABELS } from "@/lib/draft/student-policy"
import { detectOutOfScopeRequest } from "@/lib/safety/out-of-scope"
import { resolveGenerationSamplingConfig } from "@/lib/ai/generation-config"
import type {
  GenerationInputMode,
  GenerationMetadata,
  MessageDirection,
} from "@/lib/generation/classification"
import {
  logGreetingDecision,
  type GreetingSource,
  type GreetingDecision,
  type NameConfidenceLevel,
} from "@/lib/draft/greeting-resolution"

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
  generationMetadata: GenerationMetadata
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
  forceContinuation?: boolean
  signatureBlock?: string
  uiLocale?: string
  greeting?: {
    text: string
    name?: string
  }
  greetingFinal?: boolean
  greetingConfidence?: NameConfidenceLevel
  greetingSource?: GreetingSource
  messageType?: string
  scanId?: string
  ocrConfidence?: number
  panicClassificationConfidence?: number
  teacherSignatureName?: string
  trustGradeViolations?: {
    types: string[]
    phrases: string[]
  }
  teacherAuthenticityViolations?: {
    types: string[]
    phrases: string[]
  }
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

function isParentFacingDraft(direction: MessageDirection) {
  return direction === "parent_to_teacher" || direction === "teacher_to_parent" || direction === "teacher_internal_notes"
}

function buildDirectionInstruction(direction: MessageDirection) {
  switch (direction) {
    case "parent_to_teacher":
      return "The source text is an incoming message to the teacher. Write only as the teacher replying to the parent; never write from the parent's perspective."
    case "teacher_to_parent":
      return "The source text is already teacher-authored. Polish it while keeping the teacher as the sender and the parent as the recipient."
    case "teacher_internal_notes":
      return "The source text is rough teacher-authored notes. Convert it into a polished message from the teacher to the parent and never imply that the parent wrote the source text."
    case "report_comment":
      return "The source text is for a report comment. Keep it teacher-authored, evidence-based, and not parent-facing."
  }
}

function buildSafeDraftInstructions(input: ProviderInput) {
  switch (input.generationMetadata.direction) {
    case "teacher_to_parent":
      return [
        "This request comes from Safe Draft typed teacher input.",
        "Preserve the teacher as the author throughout. Do not thank the parent for writing unless that wording is explicitly present in the teacher draft.",
        "Keep the message warm but efficient. Lead with the real classroom issue or update, not a generic empathy opener.",
      ]
    case "teacher_internal_notes":
      return [
        "This request comes from Safe Draft typed teacher notes.",
        "Transform rough teacher notes into a polished teacher-authored parent message.",
        "Do not respond as though an incoming parent email was pasted here.",
        "Do not open with phrases such as 'thank you for sharing your concerns' or similar parent-reply language unless the source is explicitly classified as parent_to_teacher.",
        "Name the concrete issue early and write in the voice of an experienced teacher sending a real update home.",
      ]
    case "report_comment":
      return [
        "This request comes from Safe Draft report-comment mode.",
        "Write a concise teacher-authored report comment with no greeting and no parent reply framing.",
        "Keep it observational, school-appropriate, and free of emotional padding.",
      ]
    case "parent_to_teacher":
      return [
        "This Safe Draft request was unexpectedly classified as parent_to_teacher.",
        "Keep the output teacher-authored and bounded. Do not switch into the parent's voice.",
        "Acknowledge the specific issue in one sentence, then move to what has been checked, what will happen next, or what boundary applies.",
      ]
  }
}

function buildPanicScanInstructions(input: ProviderInput) {
  const instructions = [
    "This request comes from Panic Scan OCR.",
    "Treat OCR provenance as authoritative. The cleaned OCR text is the primary source and must not be rewritten as if it came from typed teacher notes.",
    "Default assumption: the uploaded screenshot is a message received by the teacher from a parent or guardian. Unless the metadata shows unusually strong outgoing-teacher evidence, write only as the teacher replying to that incoming message.",
  ]

  switch (input.generationMetadata.direction) {
    case "parent_to_teacher":
      instructions.push(
        "Interpret the OCR text as a parent message to the teacher and write a calm, professional teacher reply to the parent.",
        "Acknowledge the specific concern in neutral language before outlining next steps.",
        "Keep the tone de-escalating and bounded; do not sound like customer support, HR, or counselling copy.",
      )
      break
    case "teacher_to_parent":
      instructions.push(
        "The OCR appears to contain a teacher-authored message. Polish it as a teacher-authored message to the parent and do not convert it into a parent complaint.",
        "Keep it concise, grounded, and sendable.",
      )
      break
    case "teacher_internal_notes":
      instructions.push(
        "The OCR appears to contain teacher notes. Convert those notes into a teacher-authored message to the parent without pretending the parent wrote first.",
        "Use specific classroom language rather than vague empathy or abstract support wording.",
      )
      break
    case "report_comment":
      instructions.push(
        "The OCR appears to contain report-comment material. Return a report-style output only.",
        "Keep the wording concise, observational, and school-appropriate.",
      )
      break
  }

  if (typeof input.ocrConfidence === "number" && input.ocrConfidence < 0.55) {
    instructions.push(
      "OCR confidence is limited. Preserve meaning conservatively, avoid over-interpreting uncertain fragments, and keep the reply broad, calm, and professional.",
      "If details are unclear, respond to the clear concern only and avoid quoting or confidently restating ambiguous wording.",
    )
  }

  return instructions
}

function buildVoiceToCalmInstructions(input: ProviderInput) {
  const instructions = [
    "This request comes from Voice-to-Calm transcript input.",
    "Treat transcript provenance as authoritative. The source is spoken teacher content unless the direction explicitly says otherwise.",
  ]

  switch (input.generationMetadata.direction) {
    case "parent_to_teacher":
      instructions.push(
        "The transcript appears to contain an incoming parent message. Write a calm, professional teacher reply to the parent.",
        "Keep the reply measured, specific, and bounded rather than warmly generic.",
      )
      break
    case "teacher_to_parent":
      instructions.push(
        "The transcript already resembles a teacher-authored message. Polish it while keeping the teacher as the sender.",
        "Smooth out spoken roughness, but keep the language realistic and teacher-authored.",
      )
      break
    case "teacher_internal_notes":
      instructions.push(
        "Convert the teacher's spoken notes into a calm teacher-authored parent-facing message.",
        "Do not behave like a reply to a parent unless the direction is explicitly parent_to_teacher.",
        "Remove venting and filler, keep the real issue clear, and turn it into concise teacher language with a practical next step.",
      )
      break
    case "report_comment":
      instructions.push(
        "Convert the spoken notes into a concise report comment with no greeting or sign-off.",
        "Use brief observational sentences rather than reflective or emotional language.",
      )
      break
  }

  return instructions
}

const PROMPT_BUILDERS: Record<GenerationInputMode, (input: ProviderInput) => string[]> = {
  safe_draft: buildSafeDraftInstructions,
  panic_scan: buildPanicScanInstructions,
  voice_to_calm: buildVoiceToCalmInstructions,
}

export function buildSystemPrompt(input: ProviderInput) {
  const systemLines = [
    "You are Zara Draft, an assistant for K-12 teachers who writes professional, concise communications for parents and colleagues.",
    "Always stay factual: do not invent facts that were not provided in the prompt. When details are missing, keep the response neutral and ask for clarification.",
    "Maintain the requested tone and output the final text in the requested language. Keep replies ≤250 words, focused on teacher style.",
    "Sound like a calm, experienced teacher writing a real message, not a chatbot, therapist, HR partner, or customer-support agent.",
    "Open with the actual issue, update, or boundary from the source text rather than a generic empathy formula.",
    "Prefer concrete teacher language: what you noticed, what has been checked, what will happen next, and what support or boundary is appropriate in school.",
    "Avoid generic empathy boilerplate, counselling language, corporate phrasing, abstract suggestions, and inflated reassurance.",
    "Do not use lines such as 'thank you for sharing your concerns', 'I understand how important this is', 'I understand how overwhelming this feels', 'It might be helpful to discuss', or 'Please feel free to reach out' unless the exact source genuinely demands that wording.",
    "Keep warmth brief and believable. Do not over-apologise, over-promise, or sound like a bot trying to be nice.",
    "Avoid gendered pronouns unless the teacher explicitly specifies them in the prompt; default to inclusive wording.",
    "Never include student PII (full names, emails, phone numbers, addresses). If the prompt is disallowed, explain politely that you cannot help.",
    "Do not include blocked language such as insults, diagnostic labels, or emotionally charged terms; redirect toward behaviour, effort, and growth.",
    "Do not switch author roles. The final output must always reflect the classified sender-recipient relationship.",
    "Unless the message is explicitly classified as parent_to_teacher, do not write as if the parent authored the source text first.",
    "If the source mentions escalation, complaints about policy, or threats such as 'Schulträger einschalten', keep the tone calm and bounded and suggest a practical next step.",
    "Use the student's first name sparingly (once or twice) and then switch to inclusive pronouns or neutral wording; avoid repeating 'your child' in adjacent sentences.",
    "Describe engagement challenges as calm observations (has found it difficult to stay focused, has had a few moments where...) rather than writing 'instances of disruption' or accusatory language.",
    "For parent-facing teacher messages, close with a short reassurance about aiming to support the student positively and helping them feel confident and successful at school.",
    "Prefer the student's first name once or twice, then use the provided pronouns naturally; avoid repeating 'the student'.",
    PRONOUN_INSTRUCTIONS[input.pronounPreference],
    buildDirectionInstruction(input.generationMetadata.direction),
    MODE_PROMPT_INSTRUCTIONS[input.mode],
    ...PROMPT_BUILDERS[input.generationMetadata.prompt_builder](input),
  ]

  if (input.generationMetadata.direction === "parent_to_teacher") {
    systemLines.push(
      "In the first paragraph (after any resolved greeting), restate the parent's stated concern in neutral language before moving toward next steps.",
      "Unless the parent is explicitly discussing behaviour, avoid generic 'behavior documentation' phrasing and keep the focus on the actual concern being raised.",
    )
  }

  const teacherName = input.teacherSignatureName?.trim()
  const hasTeacherName = Boolean(teacherName)
  systemLines.push(
    "Do not invent or infer the teacher’s name from the parent greeting or the recipient line.",
    "Only use teacherSignatureName if provided; otherwise omit the name.",
  )
  if (hasTeacherName) {
    systemLines.push(
      `A canonical closing block will be added downstream using teacherSignatureName (${teacherName}); do not add your own closing or signature block.`,
    )
  } else {
    const closingInstruction =
      input.language === "de"
        ? "Do not add a closing or signature block; a canonical German closing is added downstream."
        : "Do not add a closing or signature block; a canonical English closing is added downstream."
    systemLines.push(closingInstruction)
  }

  const requestText = input.originalSituation ?? input.situation
  const outOfScope = detectOutOfScopeRequest(requestText)
  if (outOfScope.isOutOfScope) {
    systemLines.push(
      "Out-of-scope request detected. Do not fulfil the parent’s off-topic or personal request. Write a professional teacher reply that politely sets boundaries and redirects to school-related communication. Do not invent personal teacher details.",
    )
    if (outOfScope.severity === "high") {
      systemLines.push(
        "Be firmer, maintain safeguarding-professional boundaries, and suggest official school channels or policy when appropriate.",
      )
    }
  }

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
  if (input.trustGradeViolations && input.trustGradeViolations.types.length > 0) {
    const dedupedPhrases = Array.from(new Set(input.trustGradeViolations.phrases))
    systemLines.push(
      `Do not produce the following trust-grade violation types: ${input.trustGradeViolations.types.join(", ")}.`,
      `Avoid these phrases: ${dedupedPhrases.join(", ")}.`,
    )
  }
  if (input.teacherAuthenticityViolations && input.teacherAuthenticityViolations.types.length > 0) {
    const dedupedPhrases = Array.from(new Set(input.teacherAuthenticityViolations.phrases))
    systemLines.push(
      "Your previous draft sounded generic or AI-written. Rewrite it so it sounds like a calm, experienced teacher writing something genuinely sendable.",
      `Avoid these style problems: ${input.teacherAuthenticityViolations.types.join(", ")}.`,
      `Do not use these phrases: ${dedupedPhrases.join(", ")}.`,
      "Replace vague empathy with a brief reference to the specific issue and a practical next step.",
    )
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
    systemLines.push("Avoid placeholders like [Name des Schülers], [Parent Name], or [Student Name].")
    systemLines.push(
      "If no student name was supplied, refer to the child as 'Ihr Kind' (use 'Ihr Sohn' or 'Ihre Tochter' only when the teacher explicitly provides gender).",
    )
    if (input.mode === "parent_message" && isParentFacingDraft(input.generationMetadata.direction)) {
      const hasFinalGreeting = Boolean(input.greetingFinal && input.greeting?.text)
      if (hasFinalGreeting) {
        systemLines.push(
          "The greeting has been resolved upstream; keep the provided opening line, follow the subject/paragraph expectations, and do not replace it with 'Liebe Eltern,' or similar.",
        )
      } else {
        systemLines.push(
          "German parent messages must mimic a concise professional email: start with 'Betreff: <short subject>' on the first line, add a blank line, and begin with a polite greeting such as 'Liebe Eltern,' or 'Liebe Erziehungsberechtigte,'.",
        )
      }
      systemLines.push(
        "Write 3-5 short paragraphs separated by blank lines; each paragraph should focus on calm observations, progress updates, and collaborative next steps, keeping sentences brief (2-3 sentences) and paragraphs short.",
      )
      systemLines.push(
        "End with a brief reassuring sentence before the final paragraph ends. Do not add a closing or signature block; that is handled downstream.",
      )
      systemLines.push(
        "German parent messages must always include EXACTLY 3-5 paragraphs separated by blank lines (two newline characters), keep 'Betreff: …' on the first line, and never collapse the response into a single block.",
      )
      systemLines.push(
        "Never add a manual sign-off such as 'Herzliche Grüße' or 'Freundliche Grüße'; the final closing block is appended downstream. Never begin or end with refusal phrasing such as 'Es tut mir leid' or 'Ich kann nicht helfen'.",
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

  if (input.greeting?.text) {
    const normalizedGreeting = input.greeting.text.replace(/\s+/g, " ").trim()
    if (normalizedGreeting) {
      systemLines.push(`Begin the message with "${normalizedGreeting}" and keep that line unchanged.`)
      if (input.greetingFinal) {
        systemLines.push(
          `Start the email body with EXACTLY this line (verbatim): ${normalizedGreeting}`,
        )
        systemLines.push(
          "Then continue writing the email normally in 2-5 short paragraphs.",
        )
        systemLines.push("Do NOT repeat the greeting line anywhere else.")
        systemLines.push(
          "The email must include at least: acknowledgement, one practical next step, and a calm invitation to discuss.",
        )
        systemLines.push(
          `The very first line must be exactly "${normalizedGreeting}". Do not change spelling, punctuation, or academic titles such as "Dr." or "Prof.", and do not add any gendered honorifics like Herr/Frau/Mr/Ms.`,
        )
      }
    }
    if (input.greeting.name) {
      const normalizedName = input.greeting.name.trim()
      if (normalizedName) {
        systemLines.push(
          `Address the recipient as "${normalizedName}" in that greeting and do not invent or swap to any other addressee names.`,
        )
      }
    }
  }

  if (input.uiLocale?.toLowerCase().startsWith("de")) {
    systemLines.push(
      "DE tone contract: avoid moral judgement words such as 'Lügen', 'Ausreden', 'faul', or 'schlecht'; describe behaviour with neutral observations (for example, 'Es gab einige Situationen, in denen...'); frame collaboration with phrases like 'Ich möchte gemeinsam mit Ihnen' and offer a clear next step such as 'Können wir einen kurzen Termin vereinbaren?'; keep the tone calm, professional, and supportive without sounding accusatory.",
    )
  }

  if (input.forceContinuation) {
    systemLines.push(
      "This greeting needs a full reply; after the opening line, provide at least three short paragraphs that acknowledge the concern, outline a practical next step, and invite a calm discussion.",
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

  const providerGreetingDecision: GreetingDecision = {
    greeting: (input.greeting?.text ?? "").trim(),
    safeParentName: input.greeting?.name ?? null,
    confidence: input.greetingConfidence ?? "NONE",
    source: input.greetingSource ?? "generic-fallback",
    locale: input.language === "de" ? "de" : "en",
    messageType: input.messageType,
    scanId: input.scanId,
    greetingFinal: Boolean(input.greetingFinal && (input.greeting?.text ?? "").trim()),
  }
  logGreetingDecision("provider-prompt", providerGreetingDecision)
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
  top_p: number
  max_tokens: number
  seed?: number
}

function buildBasePayload(input: ProviderInput): FetchPayload {
  const system = buildSystemPrompt(input)
  const sampling = resolveGenerationSamplingConfig({
    mode: input.mode,
    generationMetadata: input.generationMetadata,
    rewrite: input.rewrite,
    hasRepairSignals: Boolean(
      (input.trustGradeViolations && input.trustGradeViolations.types.length > 0) ||
        (input.teacherAuthenticityViolations && input.teacherAuthenticityViolations.types.length > 0),
    ),
  })
  const contextLines = [
    `Tone: ${input.tone}`,
    `Language: ${input.language}`,
    `Mode: ${MODE_DISPLAY_NAMES[input.mode]}`,
    `Generation mode: ${input.generationMetadata.mode}`,
    `Message direction: ${input.generationMetadata.direction}`,
    `Source type: ${input.generationMetadata.source_type}`,
    `Context subject: ${input.context?.subject ?? "-"}`,
    `Context gradeLevel: ${input.context?.gradeLevel ?? "-"}`,
  ]
  if (input.signatureBlock) {
    contextLines.push(`Signature block:\n${input.signatureBlock}`)
  }
  const userParts = [
    `Primary source (${input.generationMetadata.source_type}):\n${input.situation}`,
    input.originalSituation
      ? `Original notes (for reference only, same provenance: ${input.generationMetadata.source_type}):\n${input.originalSituation}`
      : undefined,
    input.rewrite && input.previousDraft ? `Rewrite previous draft:\n${input.previousDraft}` : undefined,
  ].filter(Boolean)

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: `${contextLines.join("\n")} \n\n${userParts.join("\n\n")}` },
    ],
    temperature: sampling.temperature,
    top_p: sampling.top_p,
    max_tokens: sampling.max_tokens,
    seed: sampling.seed,
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

  const buildRequestPayload = (seedOverride = payload.seed) => ({
    ...payload,
    model,
    ...(seedOverride === undefined ? {} : { seed: seedOverride }),
  })

  const requestOnce = async (requestPayload: Record<string, unknown>) => {
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify(requestPayload),
    })
  }

  const start = Date.now()
  let response: Response
  try {
    response = await requestOnce(buildRequestPayload())
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

  let latencyMs = Date.now() - start

  if (!response.ok) {
    const errorMessage = String(json?.error?.message ?? "").toLowerCase()
    const code = json?.error?.code
    if (
      payload.seed !== undefined &&
      response.status === 400 &&
      (code === "unsupported_parameter" || errorMessage.includes("seed"))
    ) {
      try {
        response = await requestOnce(buildRequestPayload(undefined))
        const retryText = await response.text()
        try {
          json = JSON.parse(retryText)
        } catch {
          json = null
        }
        latencyMs = Date.now() - start
      } catch (error) {
        throw new ProviderError(
          `AI_GENERATION_FAILED: ${error instanceof Error ? error.message : "Network error"}`,
        )
      }
      if (!response.ok) {
        throw new ProviderError(
          `AI_GENERATION_FAILED: ${response.status} ${response.statusText}`,
          response.status,
          json?.error?.code,
        )
      }
    } else {
      throw new ProviderError(
        `AI_GENERATION_FAILED: ${response.status} ${response.statusText}`,
        response.status,
        code,
      )
    }
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






