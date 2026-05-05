import type { DraftLanguage, DraftMode, DraftTone, PronounPreference } from "@/lib/types"
import { MODE_DISPLAY_NAMES, MODE_PROMPT_INSTRUCTIONS } from "@/lib/draft-mode"
import { buildStudentInstruction, PRONOUN_LABELS } from "@/lib/draft/student-policy"
import {
  summarizeTeacherNoteIssueClusters,
  type TeacherNoteIssueCluster,
} from "@/lib/draft/teacher-note-issues"
import {
  formatEnglishPhraseExamples,
  ENGLISH_PARENT_FACING_BANNED_PHRASES,
} from "@/lib/draft/teacher-phrase-inventory"
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
import type { LengthTarget } from "@/lib/draft/length-calibration"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
const SECONDARY_ANTHROPIC_TIMEOUT_MS = 3000

function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY
}

function getEnvModelPrimary() {
  return process.env.ANTHROPIC_MODEL_PRIMARY || DEFAULT_ANTHROPIC_MODEL
}

function getEnvModelFallback() {
  return process.env.ANTHROPIC_MODEL_FALLBACK ?? null
}

function forceFailPrimary() {
  return process.env.OPENAI_FORCE_FAIL_PRIMARY === "1"
}

interface ProviderInput {
  situation: string
  generationMetadata: GenerationMetadata
  originalSituation?: string
  documentationSourceText?: string
  tone: DraftTone
  language: DraftLanguage
  context?: {
    subject?: string
    gradeLevel?: string
  }
  rewrite?: boolean
  forwardSafeRewrite?: boolean
  previousDraft?: string
  lightEditMode?: boolean
  teacherDraftMode?: boolean
  pronounPreference: PronounPreference
  mode: DraftMode
  studentFirstName?: string
  teacherNoteIssueClusters?: TeacherNoteIssueCluster[]
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
  teacherDraftQualityViolations?: {
    types: string[]
    phrases: string[]
  }
  professionalJudgementConstraints?: {
    clarityIssue: boolean
    authorityIssue: boolean
    interpretationRiskPhrases: string[]
    replyLikelihoodIssue: boolean
    boundaryStrengthIssue: boolean
  }
  lengthTarget?: LengthTarget
  safetyAnalysis?: SafetyEngineOutput | null
  documentationMode?: boolean
  documentationTopic?: string | null
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

export interface TeacherDraftFallbackExtraction {
  subject: string
  boundaryType: "classroom_boundary" | "general"
}

class ProviderError extends Error {
  constructor(message: string, public status?: number, public providerErrorCode?: string) {
    super(message)
    this.name = "ProviderError"
  }
}

const transientStatusCodes = new Set([429, 500, 502, 503, 504])

const PRONOUN_INSTRUCTIONS: Record<PronounPreference, string> = {
  auto:
    "Use pronouns only when the teacher explicitly states them; otherwise prefer the student's name or another mode-appropriate neutral reference.",
  she: "Use she/her pronouns consistently throughout the draft.",
  he: "Use he/him pronouns consistently throughout the draft.",
  they: "Use they/them pronouns consistently throughout the draft.",
  avoid:
    "Avoid gendered pronouns entirely and rely on the student's name or another mode-appropriate neutral reference.",
}

const SAFETY_REWRITE_INSTRUCTIONS = {
  accusation:
    "Replace any accusatory phrasing with observation-based language. Use 'I noticed' or 'During [time]' instead of 'your child refuses'.",
  escalation:
    "Remove or soften any consequence or escalation language. Replace with collaborative next steps.",
  frustration:
    "Remove any language that reveals teacher frustration. Maintain a calm, professional tone.",
  negative_generalisation:
    "Replace generalising statements with specific, time-bounded observations.",
  prescriptive_demand:
    "Remove any directives to the parent. Replace with collaborative invitations.",
  emotional_coldness:
    "Add a warm greeting if absent. Add a collaboration invitation if absent.",
  professional_risk:
    "Remove any diagnostic speculation, motive attribution, or psychological interpretation. Replace risky phrasing with the general category of concern in safe, parent-facing language while staying specific enough that the parent knows what the conversation is about. For example: instead of 'ADHD' use 'some learning and attention challenges'; instead of 'deliberately disrupts' use 'some persistent behavioural patterns during lessons'; instead of 'emotional problems' use 'some social and emotional difficulties'. Never reduce the concern to vague placeholders such as 'a classroom concern' or 'some issues' on their own. Where appropriate, suggest SENCO or pastoral referral.",
} as const

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

function buildParentFacingToneInstructions(input: ProviderInput) {
  if (input.mode !== "parent_message" || !isParentFacingDraft(input.generationMetadata.direction)) {
    return []
  }

  if (input.language === "de") {
    return [
      `Preserve the selected ${input.tone} tone in German and keep it teacher-authored, calm, concrete, and school-appropriate.`,
    ]
  }

  switch (input.tone) {
    case "warm":
      return [
        "Warm tone contract: sound gently relational and collaborative, as a teacher who wants to work with the parent rather than simply notify them.",
        `Warm wording should use natural teacher openings such as ${formatEnglishPhraseExamples("warm", "teacherUpdateOpenings")}, while still naming the issue early.`,
        "Warm drafts may include one brief partnership sentence near the end, but only when it genuinely fits the source and does not sound like generic reassurance.",
        "Do not turn warm into vague reassurance, therapy language, or support-bot empathy.",
      ]
    case "professional":
      return [
        "Professional tone contract: sound calm, measured, and factual without becoming cold or stiff.",
        `Professional wording should be clear and neutral, with openings such as ${formatEnglishPhraseExamples("professional", "teacherUpdateOpenings")} and no unnecessary emotional padding.`,
        "Do not let professional drift into corporate, managerial, or HR-style phrasing.",
      ]
    case "direct":
      return [
        "Direct tone contract: be concise, explicit, and clear about the issue, expectation, and next step.",
        `Direct wording should use shorter sentences and clean openings such as ${formatEnglishPhraseExamples("direct", "teacherUpdateOpenings")}.`,
        "Direct drafts should usually be one short sentence or one brief paragraph leaner than warm drafts on the same topic, and should avoid extra reassurance or partnership filler unless it changes the action.",
        "Do not turn direct into rude, abrupt, or accusatory language.",
      ]
    case "empathetic":
      return [
        "Empathetic tone contract: acknowledge the child's difficulty or the parent's worry more explicitly than warm, while staying grounded in the actual school issue.",
        `Empathetic wording should briefly show understanding, then move quickly to a concrete teacher action using natural openings such as ${formatEnglishPhraseExamples("empathetic", "teacherUpdateOpenings")}.`,
        "Do not let empathetic drift into customer-support phrasing, counselling language, or a narration of your own tone-management process.",
      ]
  }
}

function buildToneRecoveryInstruction(input: ProviderInput) {
  if (input.mode !== "parent_message" || !isParentFacingDraft(input.generationMetadata.direction)) {
    return "Keep the selected tone visible in the rewrite instead of collapsing back to generic calm teacher language."
  }

  switch (input.tone) {
    case "warm":
      return "Keep the rewrite visibly warm: collaborative, gently phrased, and partnership-focused, without sounding gushy or vague."
    case "professional":
      return "Keep the rewrite visibly professional: measured, factual, and calm, without extra softening or corporate phrasing."
    case "direct":
      return "Keep the rewrite visibly direct: concise, plain, and clear about the expectation and next step, without becoming sharp."
    case "empathetic":
      return "Keep the rewrite visibly empathetic: acknowledge the difficulty more than warm would, then move to a concrete teacher action without sounding like support copy."
  }
}

function buildForwardSafeRewriteInstructions(input: ProviderInput) {
  if (!input.rewrite || !input.forwardSafeRewrite) {
    return []
  }

  return [
    "Forward-Safe Rewrite mode is enabled.",
    "Rewrite so the message remains professional and defensible even if it is forwarded beyond the original recipient.",
    "Prioritize neutral tone, collaborative framing, non-accusatory wording, and clarity without emotional phrasing.",
    "Remove wording that could sound reactive, sarcastic, personal, or difficult to defend out of context.",
    "Keep the message calm and teacher-authentic; do not make it sound legalistic, robotic, or corporate.",
    "Preserve the underlying facts, documentation accuracy, safeguarding clarity, and the teacher's intended next step.",
    "Where the source is sensitive, use observation-based language that can stand alone if read by school leadership or another adult later.",
  ]
}

function buildLightEditInstructions(input: ProviderInput) {
  if (!input.lightEditMode) {
    return []
  }

  return [
    "Light edit mode is enabled.",
    "The source draft is already calm, professional, and safe.",
    "Prefer minimal edits over full rewrites when the draft is already safe.",
    "Stay close to the original structure and length unless a small change clearly improves safety or clarity.",
    "Only adjust small tone risks or minor phrasing.",
    "Do not expand content.",
    "Do not introduce new information.",
    "Do not add institutional or process language unless it already appears in the source.",
    "Keep the result close to the original wording and length.",
  ]
}

function buildTeacherDraftEditContract(input: ProviderInput) {
  if (
    !input.teacherDraftMode ||
    input.mode !== "parent_message" ||
    input.generationMetadata.direction !== "teacher_to_parent"
  ) {
    return []
  }

  return [
    "Teacher-draft preservation contract:",
    "The source text is already a teacher-authored draft.",
    "Preserve the teacher's message as the source of truth.",
    "Preserve structure, intent, and authorship unless a safety or clarity exception is required elsewhere in this prompt.",
    "If the teacher wrote a subject line, preserve it verbatim. If not, do not generate one.",
    "If the teacher wrote a greeting, preserve it verbatim. If not, do not add one.",
    "If the teacher wrote a sign-off, preserve it verbatim. If not, do not add one.",
    "Do not turn the draft into a freshly composed parent email.",
    "Do not add sentences.",
    "Do not split or merge paragraphs.",
    "Do not rewrite for tone alone.",
    "Do not invent meetings, calls, school processes, or next steps.",
    "Every sentence in the output must remain traceable to the teacher's draft.",
    "If the wording is risky or inflammatory, make the narrowest change that neutralises the risk while preserving structure, intent, and authorship.",
    "If a single sentence is run-on or unclear, you may make one narrow clarity edit without changing the rest of the message.",
    ...(input.lengthTarget
      ? [
          `Runtime length contract: your reply must be between ${input.lengthTarget.minWords} and ${input.lengthTarget.maxWords} words and no more than ${input.lengthTarget.maxSentences} sentences.`,
        ]
      : []),
    ...(input.lightEditMode
      ? [
          "Current draft signal: this draft already appears safe overall. Limit edits to spelling, grammar, and narrow safety or clarity changes.",
        ]
      : [
          "Current draft signal: some wording may need firmer editing, but keep the fix narrow and source-preserving.",
        ]),
  ]
}

function buildPrimaryParentReplyContract() {
  return [
    "Parent-message primary reply contract:",
    "--- ROLE ---",
    "You are a calm, experienced teacher writing a professional reply to a parent.",
    "--- OBJECTIVE ---",
    "Write a reply that:",
    "- acknowledges the concern briefly",
    "- maintains professional boundaries",
    "- avoids escalation",
    "- sounds natural and human",
    "- protects the teacher from misinterpretation",
    "- feels like the message the teacher will not regret tomorrow",
    "--- HARD RULES (must be enforced) ---",
    "- Do NOT repeat unusual or specific parent wording verbatim (e.g. 'mindfulness purposes', 'felt embarrassed').",
    "- Do NOT invent administrative claims (e.g. 'I don't have a record', 'no previous communication').",
    "- Do NOT sound defensive or argumentative.",
    "- Do NOT summarise the parent's email.",
    "- Do NOT use generic customer-service closers (e.g. 'Please feel free to contact me', 'Please feel free to reach out').",
    "--- STYLE RULES ---",
    "- Acknowledge the concern in ONE short sentence only.",
    "- Reframe into teacher perspective immediately.",
    "- Use calm, neutral language.",
    "- Keep sentences simple and natural.",
    "- Avoid over-explaining or justifying.",
    "- Keep the close brief and plain.",
    "--- STRUCTURE ---",
    "1. Greeting (safe fallback rules already handled).",
    "2. Thank + brief acknowledgement.",
    "3. Teacher perspective (intent + classroom expectation).",
    "4. Support framing (student wellbeing without conceding policy).",
    "5. Next step (process-based, not defensive).",
    "6. Close.",
    "--- EXAMPLE TRANSFORMATION ---",
    "BAD: 'I understand Lucy uses her phone for mindfulness purposes...'",
    "GOOD: 'I understand Lucy may need support when she feels overwhelmed.'",
    "BAD: 'I don't have a record of previous communication...'",
    "GOOD: 'It would be helpful to clarify this through the school's usual support process.'",
    "Rewrite ideas in your own words. Do not reuse distinctive phrases from the parent's message.",
  ]
}

function buildSafeDraftInstructions(input: ProviderInput) {
  switch (input.generationMetadata.direction) {
    case "teacher_to_parent":
      if (input.teacherDraftMode) {
        return [
          "This request comes from Safe Draft typed teacher input in teacher-draft mode.",
          "Use the teacher draft itself as the primary source.",
          "Preserve the teacher as the author throughout.",
          "Do not treat the draft as rough notes.",
          "Do not infer missing intent when the draft already states the teacher's purpose.",
          "Do not replace teacher-authored details with generic parent-message scaffolding.",
        ]
      }
      return [
        "This request comes from Safe Draft typed teacher input.",
        "Preserve the teacher as the author throughout. Do not thank the parent for writing unless that wording is explicitly present in the teacher draft.",
        "Keep the message warm but efficient. Lead with the real classroom issue or update, not a generic empathy opener.",
        "When you mention a next step, make it a concrete school action such as checking the work, adjusting the class routine, following up with colleagues, or arranging a short meeting if needed.",
      ]
    case "teacher_internal_notes":
      const issueSummary =
        input.teacherNoteIssueClusters && input.teacherNoteIssueClusters.length > 0
          ? summarizeTeacherNoteIssueClusters(input.teacherNoteIssueClusters, input.language)
          : null
      return [
        "This request comes from Safe Draft typed teacher notes.",
        "Transform rough teacher notes into a polished teacher-authored parent message.",
        "Do not respond as though an incoming parent email was pasted here.",
        "Do not open with phrases such as 'thank you for sharing your concerns' or similar parent-reply language unless the source is explicitly classified as parent_to_teacher.",
        "Preserve the student name when one is present unless privacy mode is explicitly active.",
        "Preserve every major concern cluster that is clearly present in the notes. Major clusters include attendance/lateness, homework, classroom behaviour, peer issues/conflict, and academic progress.",
        "Do not collapse multiple concern clusters into a single generic homework message.",
        "Do not invent concerns, parent reactions, or home events that are not present in the notes.",
        "If more than one concern cluster is detected, use a short framing sentence that signals several linked concerns, cover each detected cluster briefly, and then finish with one forward-looking school action statement.",
        ...(issueSummary
          ? [
              `Detected concern clusters in the notes: ${issueSummary}. Address each of these in the final message, even if some are covered briefly.`,
            ]
          : []),
        "Name the concrete issue early and write in the voice of an experienced teacher sending a real update home.",
        "Turn the notes into concrete teacher actions: what you checked, what you will adjust in class, who you will speak with, or when you will follow up. Avoid abstract process wording such as 'gather the details' or 'prepare a plan'.",
      ]
    case "report_comment":
      return [
        "This request comes from Safe Draft report-comment mode.",
        "Write a concise teacher-authored report comment with no subject line, no greeting, no sign-off, and no parent reply framing.",
        "Keep it observational, balanced, school-appropriate, and free of emotional padding or conversational email wording.",
        "Where the evidence allows, lead with a clear strength or recent progress, then add one precise area for development, and finish with a brief concluding observation only if it adds value.",
        "Use specific classroom language such as contributes, explains, sustains attention, organises work, listens carefully, or approaches tasks with more confidence.",
        "Avoid generic school-admin phrases such as 'continues to make progress', 'is a valued member of the class', 'works well when supported', or 'has the potential to'.",
        "Vary sentence openings so the comment does not sound formulaic or repetitive.",
        "If pronouns are not explicitly provided, prefer the student's name or neutral noun phrases over uncertain singular they/them wording.",
        "Write something that could be pasted directly into a report or comment bank without further cleanup.",
      ]
    case "parent_to_teacher":
      return [
        "This Safe Draft request is a typed or pasted parent email to the teacher.",
        "Keep the output teacher-authored and bounded. Do not switch into the parent's voice.",
        ...buildPrimaryParentReplyContract(),
      ]
  }
}

function buildPanicScanInstructions(input: ProviderInput) {
  const normalizedSource = `${input.originalSituation ?? ""}\n${input.situation}`.toLowerCase()
  const isHighRiskPanicScan =
    /(bully|bullying|unsafe|safety|safeguard|safeguarding|hit|hurt|pushed|punched|kicked|fight|altercation|afraid|scared|crying|distressed|upset|incident|witness|lunchtime|playground|breaktime|repeated pattern|every day|again and again|nobody listened)/i.test(
      normalizedSource,
    )
  const instructions = [
    "This request comes from Panic Scan OCR.",
    "Treat OCR provenance as authoritative. The cleaned OCR text is the primary source and must not be rewritten as if it came from typed teacher notes.",
    "Default assumption: the uploaded screenshot is a message received by the teacher from a parent or guardian. Unless the metadata shows unusually strong outgoing-teacher evidence, write only as the teacher replying to that incoming message.",
    `Risk tier for this Panic Scan reply: ${isHighRiskPanicScan ? "HIGH_RISK" : "STANDARD"}.`,
  ]

  switch (input.generationMetadata.direction) {
    case "parent_to_teacher":
      instructions.push(
        "Interpret the OCR text as a parent message to the teacher and write a calm, professional teacher reply to the parent.",
        "When the source is a parent-reported incident or complaint, the teacher reply must acknowledge receipt, not restate facts.",
        "Do not repeat information the parent provided back to them as if it is new information.",
        "Open with a brief acknowledgement only, then move straight to what you will check or who you will speak with.",
        "Never open with lines such as 'I understand he came home upset...' or 'I wanted to update you regarding the incident...' when those details came from the parent message.",
        "Open like a real teacher replying to an upset parent: acknowledge the message briefly, recognise the seriousness if needed, and give one believable immediate step you will take.",
        "Keep the tone de-escalating and bounded; do not sound like customer support, HR, counselling copy, or a teacher narrating their own tone-management process.",
        "Preferred opening pattern: one natural sentence acknowledging the concern, one concrete sentence about what you will check or who you will speak with, then a brief line about when you will update the parent.",
        `Believable parent-reply openings include ${formatEnglishPhraseExamples("professional", "parentReplyOpenings")}. Believable next-step lines include ${formatEnglishPhraseExamples("professional", "actionPatterns")}.`,
        "Avoid lines such as 'my priority is to address it calmly and respectfully', 'summarize the key observations', 'prepare a practical plan', or other customer-support / HR phrasing.",
      )
      if (isHighRiskPanicScan) {
        instructions.push(
          "HIGH RISK Panic Scan framework: use a trained-teacher safeguarding response rather than a generic helpful-responder template.",
          "Open with genuine emotional acknowledgement. Briefly recognise the child's difficult experience and the parent's worry without telling the parent how they feel.",
          `Believable high-risk openings include ${formatEnglishPhraseExamples("empathetic", "highRiskParentReplyOpenings")}.`,
          "Do not use lines such as 'I know this will feel serious', 'I wanted to follow up on what happened today', 'I understand he/she came home upset', or 'I wanted to update you regarding the incident'.",
          "If you did not witness the incident, say so honestly without dismissing the report. Make clear that not witnessing it does not reduce how seriously you take it.",
          "Name concrete investigation steps: speak with the child privately, speak with the other students involved, speak with any witnesses or staff on duty, and review what happened.",
          "Do not over-promise outcomes and do not claim certainty before you have checked the facts.",
          "Offer a real conversation such as a phone call or in-person meeting with a suggested time. High-risk cases should not be closed with email alone.",
          "Close by reinforcing partnership briefly and genuinely, not with a generic closer.",
          "Do not minimise it or suggest it was probably a misunderstanding.",
          "Do not use generic closers such as 'Please don't hesitate to reach out'.",
        )
      } else if (/(grade|grading|graded|mark|marked|test score|assessment|homework mark|note\b|noten|bewertung|bewertet)/i.test(normalizedSource)) {
        instructions.push(
          "If the message is a grading complaint, open by acknowledging the concern about the marking and say that you will review the work or the marking before replying in detail. Keep it factual rather than managerial.",
        )
      } else if (/(not trying to be difficult|not attacking|not blaming|don't want trouble|defensive|ich will keinen ärger|ich greife sie nicht an|ich möchte keinen streit)/i.test(normalizedSource)) {
        instructions.push(
          "If the parent sounds defensive or hesitant, open gently and show that you have understood the concern without over-soothing. Then give one clear step you will take.",
        )
      } else if (/(furious|angry|outraged|unacceptable|how dare|ridiculous|disgrace|empört|wütend|inakzeptabel|unerhört)/i.test(normalizedSource)) {
        instructions.push(
          "If the parent sounds angry or accusatory, open by acknowledging the seriousness without mirroring the accusation. Then state plainly what you will check and when you will follow up.",
        )
      }
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
        "Keep the wording concise, observational, balanced, school-appropriate, and free of greeting, sign-off, or parent-email language.",
        "Prefer a polished report rhythm: start with a clear strength or recent progress, then mention one area for development if needed, without turning it into advice to parents.",
        "Avoid generic school-admin phrasing such as 'continues to make progress', 'is a valued member of the class', or 'works well when supported'.",
        "If pronouns are unclear, prefer the student's name or neutral noun phrases rather than uncertain pronouns.",
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
        "Use believable school actions rather than abstract process language: say what you will check, who you will speak with, or when you will follow up.",
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
        "Remove venting and filler, keep the real issue clear, and turn it into concise teacher language with one concrete next step in school.",
      )
      break
    case "report_comment":
      instructions.push(
        "Convert the spoken notes into a concise report comment with no greeting or sign-off.",
        "Use brief observational sentences rather than reflective, emotional, or parent-facing language.",
        "Shape the comment like a polished school report: strength or progress first, one clear development point if needed, then a concise concluding observation.",
        "Avoid generic report fillers such as 'continues to make progress', 'is a valued member of the class', or 'has the potential to'.",
        "If pronouns are unclear, prefer the student's name or neutral noun phrases rather than uncertain pronouns.",
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

function buildContinuationInstruction(input: ProviderInput) {
  if (
    input.generationMetadata.mode === "safe_draft" &&
    input.generationMetadata.direction === "teacher_internal_notes"
  ) {
    const issueSummary =
      input.teacherNoteIssueClusters && input.teacherNoteIssueClusters.length > 0
        ? summarizeTeacherNoteIssueClusters(input.teacherNoteIssueClusters, input.language)
        : null
    return `This greeting needs a full teacher-authored message. After the opening line, write at least three short paragraphs that turn the teacher's own notes into a calm parent update, keep strictly to the facts in the notes, preserve the student name when one is provided, keep all major concern clusters from the notes visible${issueSummary ? ` (${issueSummary})` : ""}, give each detected cluster at least brief coverage, use one forward-looking school action statement, rewrite harsh wording safely, and do not imply that the parent raised a complaint unless the source explicitly says so. ${buildToneRecoveryInstruction(input)}`
  }
  return `This greeting needs a full reply; after the opening line, provide at least three short paragraphs that acknowledge the concern, outline a practical next step, and invite a calm discussion. ${buildToneRecoveryInstruction(input)}`
}

function buildDocumentationModePrompt(input: ProviderInput) {
  const today = new Date().toISOString().split("T")[0]
  const detectedTopic = input.documentationTopic ?? "general"
  const rawMessage = input.documentationSourceText ?? input.originalSituation ?? input.situation

  return `You are writing a neutral school incident record, not a parent communication.

Rules:
1. Begin with the heading: Incident Record
2. Then output exactly these sections in this order, one per line:
   Date: ${today}
   Location: <specific location from the source, or "Not specified" if none is given>
   Observed behaviour: <observable, factual description only>
   Teacher response: <what the teacher did, said, recorded, or checked>
   Follow-up action: <next step already stated in the source, or "No follow-up action recorded.">
3. Use only observable descriptions. Convert subjective or emotional wording into neutral, defensible documentation language.
4. Remove emotional language, motive attribution, diagnosis speculation, and accusatory phrasing.
5. Maintain factual accuracy. Only document what is explicitly stated in the source text. Do not infer, elaborate, or add specific details not present in the input.
6. Use third person: "The student" or [child name] if known.
7. Keep the tone professional, neutral, and suitable for safeguarding or behaviour documentation.
8. Preserve safeguarding clarity and documentation accuracy even while softening wording.
9. If the source is vague, the record must also be vague. Write only what can be directly attributed to the source.
10. End with: "This record is for documentation purposes."
11. Internal topic hint: ${detectedTopic}. Use it only to keep the wording context-appropriate; do not add a separate context field to the record unless it is stated in the source.
12. Replace "I think he might have ADHD" with "The student may benefit from assessment for learning and attention needs."
13. Replace motive language such as "deliberately disrupts" with the observable action only.
14. Replace psychological interpretation with safe pastoral wording such as "The student may need follow-up for social and emotional needs."

Input: ${rawMessage}`
}

function buildSafetyAnalysisInstructions(input: ProviderInput) {
  if (!input.safetyAnalysis || input.documentationMode) {
    return []
  }

  const triggeredLabels = input.safetyAnalysis.triggeredSignals.map((signal) => signal.label)
  const categories = new Set(
    input.safetyAnalysis.triggeredSignals.map((signal) => signal.category),
  )

  if (input.safetyAnalysis.professionalRiskFlags.length > 0) {
    categories.add("professional_risk")
  }

  const rewriteInstructions = Array.from(categories)
    .map((category) => {
      if (category === "mitigating") {
        return null
      }

      return SAFETY_REWRITE_INSTRUCTIONS[category as keyof typeof SAFETY_REWRITE_INSTRUCTIONS] ?? null
    })
    .filter(
      (
        instruction,
      ): instruction is Exclude<
        (typeof SAFETY_REWRITE_INSTRUCTIONS)[keyof typeof SAFETY_REWRITE_INSTRUCTIONS],
        null
      > => instruction !== null,
    )

  return [
    "Communication Safety Analysis:",
    `- Risk level: ${input.safetyAnalysis.riskLevel}`,
    `- Triggered signals: ${triggeredLabels.join(", ") || "None"}`,
    `- Tone classification: ${input.safetyAnalysis.toneClass}`,
    "Rewriting instructions based on detected signals:",
    ...rewriteInstructions.map((instruction) => `- ${instruction}`),
    "Hard constraints for this rewrite:",
    "- The rewritten message MUST include the specific behaviour or concern from the original message. Never replace it with generic phrases such as 'a classroom concern', 'some issues', or 'a concern in class'.",
    "- The rewritten message MUST make clear what happened, when or where it happened if that is stated in the source, and what the teacher would like to happen next.",
    "- Only change framing and tone. Keep the factual content, pattern, and school context from the original message.",
    "- If the original says a student 'refuses to listen', rewrite it as the same concern in observation-based language, for example: 'I've noticed that following instructions has sometimes been challenging.'",
    "- A parent reading the rewritten message should understand the exact concern without needing to ask a follow-up question.",
    "Never hallucinate specific facts, dates, or incidents not in the original message.",
    "Preserve the core information. Only change tone and framing.",
  ]
}

export function buildSystemPrompt(input: ProviderInput) {
  if (input.documentationMode) {
    return buildDocumentationModePrompt(input)
  }

  const systemLines = [
    "You are Zara Draft, an assistant for K-12 teachers who writes professional, concise communications for parents and colleagues.",
    "Always stay factual: do not invent facts that were not provided in the prompt. When details are missing, keep the response neutral and ask for clarification.",
    "Maintain the requested tone and output the final text in the requested language. Keep replies ≤250 words, focused on teacher style.",
    "Sound like a calm, experienced teacher writing a real message, not a chatbot, therapist, HR partner, or customer-support agent.",
    "Open with the actual issue, update, or boundary from the source text rather than a generic empathy formula.",
    "Prefer concrete teacher language: what you noticed, what has been checked, what will happen next, and what support or boundary is appropriate in school.",
    "When describing next steps, use believable school actions such as speaking with staff involved, reviewing the work, checking what happened, adjusting the class routine, following up with an update, or arranging a short meeting if needed.",
    "Avoid managerial process wording such as 'gather the details', 'summarize the key observations', 'monitor the situation', 'keep an eye on it', or 'prepare a practical plan'.",
    "Avoid abstract support-plan phrasing such as 'support his success in the classroom', 'identify specific supports that would be useful', 'additional support strategies', 'specific strategies to help him stay more engaged during our activities', 'benefit from additional encouragement', or 'support the overall learning experience'. Prefer plain teacher wording such as 'see what might help', 'some approaches that may help him stay focused during lessons', 'practical next steps', 'may need clearer routines and regular encouragement', or 'help him feel more settled and successful in class'.",
    "Avoid generic empathy boilerplate, counselling language, corporate phrasing, abstract suggestions, and inflated reassurance.",
    `Do not use product-mediated tone narration such as ${ENGLISH_PARENT_FACING_BANNED_PHRASES.map((phrase) => `'${phrase}'`).join(", ")}.`,
    "Do not use lines such as 'thank you for sharing your concerns', 'I understand how important this is', 'I understand how overwhelming this feels', 'It might be helpful to discuss', or 'Please feel free to reach out' unless the exact source genuinely demands that wording.",
    "Keep warmth brief and believable. Do not over-apologise, over-promise, or sound like a bot trying to be nice.",
    "Avoid gendered pronouns unless the teacher explicitly specifies them in the prompt; default to inclusive wording.",
    "Never include student PII (full names, emails, phone numbers, addresses). If the prompt is disallowed, explain politely that you cannot help.",
    "Do not include blocked language such as insults, diagnostic labels, or emotionally charged terms; redirect toward behaviour, effort, and growth.",
    "Do not switch author roles. The final output must always reflect the classified sender-recipient relationship.",
    "Unless the message is explicitly classified as parent_to_teacher, do not write as if the parent authored the source text first.",
    "If the source mentions escalation, complaints about policy, or threats such as 'Schulträger einschalten', keep the tone calm and bounded and suggest a practical next step.",
    "Use the student's first name sparingly (once or twice) and then switch to 'your child' or explicit pronouns when they are known; avoid repeating 'your child' in adjacent sentences.",
    "Describe engagement challenges as calm observations (has found it difficult to stay focused, has had a few moments where...) rather than writing 'instances of disruption' or accusatory language.",
    "For parent-facing teacher messages, close plainly. Only add a brief partnership or reassurance line when it genuinely fits the source and does not read like filler.",
    "Prefer the student's first name once or twice, then use 'your child' or the provided pronouns naturally; never use 'the student' in a parent-facing message.",
    PRONOUN_INSTRUCTIONS[input.pronounPreference],
    ...buildParentFacingToneInstructions(input),
    buildDirectionInstruction(input.generationMetadata.direction),
    MODE_PROMPT_INSTRUCTIONS[input.mode],
    ...PROMPT_BUILDERS[input.generationMetadata.prompt_builder](input),
    ...buildTeacherDraftEditContract(input),
    ...buildSafetyAnalysisInstructions(input),
    ...buildForwardSafeRewriteInstructions(input),
    ...buildLightEditInstructions(input),
  ]

  if (input.generationMetadata.direction === "parent_to_teacher") {
    if (input.generationMetadata.mode === "panic_scan") {
      systemLines.push(
        "For Panic Scan parent complaints, do not restate the incident details back to the parent in the opening paragraph. Acknowledge receipt briefly and move to the concrete school-side next step.",
        "Unless the parent is explicitly discussing behaviour, avoid generic 'behavior documentation' phrasing and keep the focus on the actual concern being raised.",
      )
    } else {
      systemLines.push(
        "For typed or pasted parent emails, acknowledge the concern briefly in the first paragraph and then move straight to the teacher's explanation, boundary, or next step.",
        "Do not restate the parent's complaint in detail, do not mirror the child's reported feelings line by line, and do not recycle distinctive parent-only phrases such as 'came home upset', 'felt embarrassed', or coping-tool explanations unless one brief reference is genuinely necessary.",
        "Use only one brief, neutral acknowledgement of the child's experience. Prefer plain wording such as 'upset' or 'uncomfortable' and avoid replaying emotionally loaded parent phrasing such as 'embarrassed', 'singled out', or similar unless it is essential.",
        "Do not repeat unusual parent wording such as 'mindfulness purposes' or similar advocacy phrasing verbatim; restate the core concern in plain teacher-safe language instead.",
        "Do not invent lines about missing records, prior communication gaps, what has or has not been logged, whether you were or were not previously aware of an arrangement, whether there is anything on file, or whether there is a formal arrangement unless the teacher explicitly provided that fact.",
        "Avoid administrative rebuttal phrasing such as 'on file', 'formal arrangement', 'I wasn't aware', 'I had not been informed', 'nothing has been shared with me', or similar unless the teacher explicitly gave that information.",
        "Avoid school-admin wording such as 'properly documented', 'logged', 'recorded', 'evidenced', or 'pastoral process' unless the teacher explicitly referred to that process. Prefer plain phrasing such as 'clarify this through the school's usual support process' or 'follow up with the appropriate colleague'.",
        "Do not invent extra classroom details such as what other pupils were doing, who witnessed the moment, or what was said beyond the core classroom boundary unless those details are explicit in the source.",
        "Keep the phone-use or classroom boundary intact where relevant, but frame it calmly and non-defensively.",
        "Do not promise 'flexibility' or echo the parent's requested accommodation language. Instead, say that any agreed adjustments or support arrangements should be clarified through the school's usual support process.",
        "If the concern points to a possible support need or adjustment, suggest clarifying that through the school's usual support process or the appropriate colleague so expectations are clear for staff and for the child.",
        "A strong reply pattern for this kind of parent email is: brief acknowledgement, a calm line that the intention was not to make the child feel uncomfortable, one sentence keeping the classroom expectation or boundary clear, then one sentence about clarifying support arrangements through the school's usual support process, and a final sentence about following up sensitively with the appropriate colleague.",
        "For classroom-boundary complaints involving phone use or similar support tools, prefer wording such as: the intention was not to make the child feel uncomfortable; the usual classroom expectation still applies; the child may need support when feeling overwhelmed; this should be clarified through the school's usual support process so expectations are clear for staff and for the child; in the meantime the teacher will continue to handle it sensitively and follow up with the appropriate colleague.",
        "Do not use the absence of prior information as a rebuttal. Avoid lines such as 'I wasn't aware', 'I had not been informed', 'I don't have a record', 'there is nothing on file', or 'there is no formal arrangement' unless those facts were explicitly given by the teacher.",
        "Unless the parent is explicitly discussing behaviour, avoid generic 'behavior documentation' phrasing and keep the focus on the actual concern being raised.",
      )
    }
  }

  if (
    input.mode === "parent_message" &&
    isParentFacingDraft(input.generationMetadata.direction) &&
    !input.teacherDraftMode
  ) {
    const subjectLabel = input.language === "de" ? "Betreff" : "Subject"
    systemLines.push(
      `Include a concise professional subject line on the first line in the form '${subjectLabel}: <short subject>'.`,
      "Make the subject neutral, teacher-authentic, and specific to the issue or update. Avoid generic labels such as 'Support Update' or 'General Update'.",
      "For parent-facing teacher messages, never refer to the child as 'the student', 'the learner', or another institutional label.",
      "Reference order for parent-facing teacher messages: use the student's first name if it is available; otherwise use 'your child'; only then use explicit pronouns when they are known and sound natural.",
      "Avoid institutional phrases such as 'learning tasks' or 'instruction time'. Prefer natural teacher phrasing such as 'during class', 'in today's lesson', or 'during our work together'.",
    )
  }

  const teacherName = input.teacherSignatureName?.trim()
  const hasTeacherName = Boolean(teacherName)
  systemLines.push(
    "Do not invent or infer the teacher’s name from the parent greeting or the recipient line.",
    "Only use teacherSignatureName if provided; otherwise omit the name.",
  )
  if (input.teacherDraftMode) {
    systemLines.push(
      "If the teacher wrote a sign-off, preserve it verbatim, including punctuation and line breaks.",
      "If the teacher did not write a sign-off, do not add one.",
    )
  } else if (hasTeacherName) {
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
  if (
    input.generationMetadata.mode === "safe_draft" &&
    input.generationMetadata.direction === "teacher_internal_notes"
  ) {
    systemLines.push(
      "No privacy mode is active for this request, so keep the student's first name when it is provided.",
    )
  }
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
      buildToneRecoveryInstruction(input),
    )
    if (
      input.generationMetadata.mode === "safe_draft" &&
      input.generationMetadata.direction === "teacher_internal_notes"
    ) {
      systemLines.push(
        "Keep the recovery strictly in teacher-note-to-parent framing. Do not write as if the parent contacted the teacher first, and do not introduce phrases such as 'thank you for bringing this to my attention' or 'your child came home upset' unless those facts appear in the notes.",
      )
    }
  }
  if (input.teacherDraftQualityViolations && input.teacherDraftQualityViolations.types.length > 0) {
    const dedupedPhrases = Array.from(new Set(input.teacherDraftQualityViolations.phrases))
    systemLines.push(
      "Your previous rewrite still felt too surface-level or professionally risky for teacher-draft mode.",
      `Resolve these teacher-draft quality issues: ${input.teacherDraftQualityViolations.types.join(", ")}.`,
      `Avoid or rewrite these phrases and ideas: ${dedupedPhrases.join(", ")}.`,
      "Preserve the teacher's intent, but do not preserve wording that still sounds defensive, rigid, filler-heavy, or difficult to send.",
      "If needed, restructure the message so the acknowledgement, boundary, and close land more calmly.",
      "Do not invent context, follow-up channels, school processes, or collaboration offers that are absent from the source draft.",
      "Every sentence must stay traceable to the teacher's source text.",
    )
  }
  if (input.professionalJudgementConstraints) {
    const constraints = input.professionalJudgementConstraints
    systemLines.push("PROFESSIONAL JUDGEMENT CONSTRAINTS (this rewrite pass):")
    if (constraints.clarityIssue) {
      systemLines.push(
        "End with a single, unambiguous declarative statement. Do not leave the message open-ended.",
      )
    }
    if (constraints.authorityIssue) {
      systemLines.push(
        "Do not apologise. Do not seek permission. Use first-person firm statements (I will, I apply, I expect).",
      )
    }
    if (constraints.interpretationRiskPhrases.length > 0) {
      systemLines.push(
        `Do not use any of these phrases: ${Array.from(new Set(constraints.interpretationRiskPhrases)).join(", ")}. They risk reading as passive-aggressive or patronising.`,
      )
    }
    if (constraints.replyLikelihoodIssue) {
      systemLines.push(
        "Do not add any invitation for further contact unless the teacher's source text explicitly invites discussion.",
      )
    }
    if (constraints.boundaryStrengthIssue) {
      systemLines.push(
        "State the boundary once, clearly, using direct language. Do not soften it immediately after stating it.",
      )
    }
  }
  if (input.teacherDraftMode) {
    systemLines.push(
      "Treat the teacher draft as the primary source. Do not recast it as notes, and do not replace its wording with inferred intent.",
    )
  } else {
    systemLines.push(
      "Treat the cleaned notes that follow as your primary source and use the original notes only for background; do not repeat the original wording.",
    )
    systemLines.push(
      "Never quote, repeat, or paraphrase the original rough notes. Use them only to infer intent.",
    )
  }
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
        if (input.teacherDraftMode) {
          systemLines.push(
            "The email must include at least: a brief acknowledgement, the specific issue, a clear boundary or decision where relevant, and a concise closing sentence grounded in the existing expectation.",
          )
          systemLines.push(
            "Do not add a discussion invitation unless the teacher's source text explicitly invites discussion.",
          )
        } else {
          systemLines.push(
            "The email must include at least: acknowledgement, one practical next step, and a calm invitation to discuss.",
          )
        }
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
    systemLines.push(buildContinuationInstruction(input))
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

  if (
    input.generationMetadata.direction === "parent_to_teacher" &&
    input.generationMetadata.mode !== "panic_scan"
  ) {
    systemLines.push(...buildPrimaryParentReplyContract())
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
    throw new ProviderError("Missing Anthropic model configuration (ANTHROPIC_MODEL_PRIMARY)")
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
  if ((input.safetyAnalysis?.professionalRiskFlags.length ?? 0) > 0) {
    console.log("[provider] professional-risk full prompt", {
      documentationMode: Boolean(input.documentationMode),
      generationMode: input.generationMetadata.mode,
      direction: input.generationMetadata.direction,
      prompt: system,
    })
  }
  if (input.documentationMode) {
    return {
      messages: [
        { role: "system", content: system },
        { role: "user", content: input.documentationSourceText ?? input.originalSituation ?? input.situation },
      ],
      temperature: 0.2,
      top_p: 0.1,
      max_tokens: 400,
    }
  }
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

    if (error.providerErrorCode === "rate_limit_exceeded") {
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

function extractAnthropicTextContent(payload: any) {
  const content = Array.isArray(payload?.content) ? payload.content : []
  return content
    .filter((item: { type?: string; text?: string }) => item?.type === "text" && typeof item.text === "string")
    .map((item: { text: string }) => item.text)
    .join("")
    .trim()
}

async function callAnthropicModel(model: string, payload: FetchPayload): Promise<GenerationResult> {
  return callAnthropicModelWithOptions(model, payload)
}

async function callAnthropicModelWithOptions(
  model: string,
  payload: FetchPayload,
  options?: { timeoutMs?: number },
): Promise<GenerationResult> {
  const anthropicKey = getAnthropicApiKey()
  if (!anthropicKey) {
    throw new ProviderError("Missing Anthropic API key (ANTHROPIC_API_KEY)")
  }

  const system = payload.messages.find((message) => message.role === "system")?.content ?? ""
  const messages = payload.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))

  const requestPayload = {
    model,
    system,
    messages,
    temperature: payload.temperature,
    top_p: payload.top_p,
    max_tokens: payload.max_tokens,
  }

  const start = Date.now()
  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs
  const timeoutHandle =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null
  let response: Response
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    })
  } catch (error) {
    if (
      controller.signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new ProviderError(
        `AI_GENERATION_FAILED: Request timed out after ${timeoutMs ?? 0}ms`,
      )
    }
    throw new ProviderError(
      `AI_GENERATION_FAILED: ${error instanceof Error ? error.message : "Network error"}`,
    )
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
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
    throw new ProviderError(
      `AI_GENERATION_FAILED: ${response.status} ${response.statusText}`,
      response.status,
      json?.error?.type ?? json?.error?.code,
    )
  }

  const result = extractAnthropicTextContent(json)
  if (!result) {
    throw new ProviderError("AI_GENERATION_FAILED: No content returned")
  }

  const tokensUsed =
    typeof json?.usage?.input_tokens === "number" && typeof json?.usage?.output_tokens === "number"
      ? json.usage.input_tokens + json.usage.output_tokens
      : undefined

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
    return callAnthropicModel(primary, payload)
  }

  try {
    return await attemptPrimary()
  } catch (error) {
    console.warn("[provider] primary model failed", {
      status: error instanceof ProviderError ? error.status : undefined,
      code: error instanceof ProviderError ? error.providerErrorCode : undefined,
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
  return callAnthropicModel(fallback, payload)
}

function parseTeacherDraftFallbackExtraction(raw: string): TeacherDraftFallbackExtraction | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  if (!cleaned) {
    return null
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<TeacherDraftFallbackExtraction>
    const subject = typeof parsed.subject === "string" ? parsed.subject.trim() : ""
    const boundaryType = parsed.boundaryType === "classroom_boundary" ? "classroom_boundary" : "general"
    if (!subject) {
      return null
    }
    return { subject, boundaryType }
  } catch {
    const subjectMatch = cleaned.match(/"subject"\s*:\s*"([^"]+)"/i)
    const boundaryTypeMatch = cleaned.match(
      /"boundaryType"\s*:\s*"(classroom_boundary|general)"/i,
    )
    if (!subjectMatch?.[1]) {
      return null
    }
    return {
      subject: subjectMatch[1].trim(),
      boundaryType: boundaryTypeMatch?.[1] === "classroom_boundary" ? "classroom_boundary" : "general",
    }
  }
}

export async function extractTeacherDraftFallbackContext(params: {
  sourceText: string
  language: DraftLanguage
}): Promise<TeacherDraftFallbackExtraction | null> {
  const sourceText = params.sourceText.trim()
  if (!sourceText) {
    return null
  }

  const languageLabel = params.language === "de" ? "German" : "English"
  const payload: FetchPayload = {
    messages: [
      {
        role: "system",
        content: [
          "Teacher-draft fallback micro-extraction.",
          `Read the teacher's source draft and return JSON only in ${languageLabel}.`,
          'Schema: {"subject":"...","boundaryType":"classroom_boundary|general"}.',
          'subject must be a short source-grounded phrase that can complete: "The classroom expectation is that ...".',
          "Keep subject under 12 words.",
          "Use only ideas already present in the source.",
          "Do not invent meetings, processes, roles, support plans, or next steps.",
          "Use boundaryType=classroom_boundary for lesson-time rules, routines, or item-use boundaries; otherwise use general.",
        ].join(" "),
      },
      {
        role: "user",
        content: sourceText,
      },
    ],
    temperature: 0,
    top_p: 0.1,
    max_tokens: 100,
  }

  try {
    const result = await callAnthropicModelWithOptions(resolveModels().primary, payload, {
      timeoutMs: SECONDARY_ANTHROPIC_TIMEOUT_MS,
    })
    return parseTeacherDraftFallbackExtraction(result.text)
  } catch {
    return null
  }
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






