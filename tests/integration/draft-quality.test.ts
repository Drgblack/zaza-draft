import { beforeAll, describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

function loadLocalEnvFile(filename: string) {
  const fullPath = path.join(process.cwd(), filename)
  if (!fs.existsSync(fullPath)) {
    return
  }
  const raw = fs.readFileSync(fullPath, "utf8")
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      return
    }
    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex <= 0) {
      return
    }
    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = value
    }
  })
}

loadLocalEnvFile(".env.local")
loadLocalEnvFile(".env")

const hasLiveGenerationEnv = Boolean(
  process.env.OPENAI_API_KEY && (process.env.OPENAI_MODEL_PRIMARY || process.env.OPENAI_MODEL),
)

const describeIfLive = hasLiveGenerationEnv ? describe.sequential : describe.skip

type Tone = "warm" | "professional" | "direct" | "empathetic"

interface DraftResponse {
  success: boolean
  data?: {
    generatedDraft?: string
    formattedDraft?: {
      subject?: string
      paragraphs?: string[]
    }
    metadata?: {
      modeUsed?: string
    }
  }
  error?: {
    code?: string
    message?: string
  }
}

const SALLY_INPUT =
  "Hello Parent, did you know that Sally is late to school every single day and she is very disruptive when she finally arrives. She is silly in class and annoys me to death! And, the homework is just awful. She needs to get a grip and you should tell her that too! If I don't see her improve she will get sent to the Principal's office."

const JAKE_PANIC_INPUT =
  "This is a message from Jake's parent to his teacher. Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime at school. Karen wants to know what happened in class and why nobody called."

const SIGNOFF_BLOCK_REGEX = /\n\n(?:Best|Kind|Warm) regards,?\n.+$/s
const GERMAN_LEAK_REGEX = /\b(?:Betreff|Liebe|Mit freundlichen|Rückmeldung|Hausaufgaben|Guten Tag)\b/i

function stripSubject(text: string) {
  return text.replace(/^(?:Subject|Betreff):[^\n]*\n+/i, "").trim()
}

function getGreetingLine(text: string) {
  const withoutSubject = stripSubject(text)
  return withoutSubject.split(/\n+/).map((line) => line.trim()).find(Boolean) ?? ""
}

function getBodyWithoutGreetingAndSignoff(text: string) {
  const withoutSubject = stripSubject(text)
  const withoutSignoff = withoutSubject.replace(SIGNOFF_BLOCK_REGEX, "").trim()
  const lines = withoutSignoff.split(/\n+/)
  if (lines.length > 0) {
    lines.shift()
  }
  return lines.join("\n").trim()
}

function getWordCount(text: string) {
  return text.split(/\s+/).map((part) => part.trim()).filter(Boolean).length
}

function levenshteinDistance(left: string, right: string) {
  const a = left.toLowerCase()
  const b = right.toLowerCase()
  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[a.length][b.length]
}

function similarityRatio(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length)
  if (maxLength === 0) {
    return 1
  }
  return 1 - levenshteinDistance(left, right) / maxLength
}

function detectConcernCoverage(text: string) {
  const normalized = text.toLowerCase()
  const matched = new Set<string>()
  if (/\blate\b|\blateness\b|\bpunctuality\b/.test(normalized)) {
    matched.add("attendance_lateness")
  }
  if (/\bdisruptive\b|\bbehaviour\b|\bbehavior\b|\bclassroom\b/.test(normalized)) {
    matched.add("classroom_behaviour")
  }
  if (/\bhomework\b/.test(normalized)) {
    matched.add("homework")
  }
  return matched
}

function assertParentMessageStructure(text: string) {
  const greetingLine = getGreetingLine(text)
  expect(greetingLine).toMatch(/^(Dear Parent\/Carer,|Hello \w+,)/)
  expect(text).not.toMatch(/Hello\s,/)
  expect(text.trim()).toMatch(SIGNOFF_BLOCK_REGEX)
  expect(text.toLowerCase()).not.toContain("calm update")
}

async function callDraftRoute(payload: Record<string, unknown>) {
  const { POST } = await import("@/app/api/draft/generate/route")

  const request = new Request("https://example.com/api/draft/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-zaza-dev-bypass": "1",
    },
    body: JSON.stringify(payload),
  })

  const response = await POST(request)
  const json = (await response.json()) as DraftResponse

  expect(response.status).toBe(200)
  expect(json.success).toBe(true)
  expect(json.data?.generatedDraft).toBeTruthy()

  return json.data!.generatedDraft!
}

describeIfLive("draft quality integration", () => {
  beforeAll(() => {
    expect(hasLiveGenerationEnv).toBe(true)
  })

  it(
    "Test 1 — Sally Safe Draft, Professional, Parent message",
    async () => {
      const output = await callDraftRoute({
        situation: SALLY_INPUT,
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
        studentFirstName: "Sally",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      })

      expect(output).toContain("Sally")
      assertParentMessageStructure(output)
      expect(detectConcernCoverage(output).size).toBeGreaterThanOrEqual(2)
    },
    120000,
  )

  it(
    "Test 2 — Sally Safe Draft, all four tones",
    async () => {
      const tones: Tone[] = ["warm", "professional", "direct", "empathetic"]
      const outputs = await Promise.all(
        tones.map((tone) =>
          callDraftRoute({
            situation: SALLY_INPUT,
            tone,
            language: "en",
            uiLocale: "en-GB",
            mode: "parent_message",
            studentFirstName: "Sally",
            signature: {
              line1: "Dr Greg Blackburn",
            },
          }),
        ),
      )

      outputs.forEach((output) => {
        assertParentMessageStructure(output)
        expect(detectConcernCoverage(output).size).toBeGreaterThanOrEqual(2)
      })

      const bodyByTone = new Map<Tone, string>(
        tones.map((tone, index) => [tone, getBodyWithoutGreetingAndSignoff(outputs[index])]),
      )

      const warmWordCount = getWordCount(bodyByTone.get("warm")!)
      const directWordCount = getWordCount(bodyByTone.get("direct")!)
      expect(Math.abs(warmWordCount - directWordCount)).toBeGreaterThanOrEqual(10)

      for (let i = 0; i < tones.length; i += 1) {
        for (let j = i + 1; j < tones.length; j += 1) {
          const similarity = similarityRatio(bodyByTone.get(tones[i])!, bodyByTone.get(tones[j])!)
          expect(similarity).toBeLessThanOrEqual(0.85)
        }
      }
    },
    240000,
  )

  it(
    "Test 3 — Jane report comment",
    async () => {
      const output = await callDraftRoute({
        situation:
          "Jane came to school every day this term, contributed thoughtful answers in reading, and completed her writing with more care. She still needs to slow down in maths book work and check her answers before handing them in. Write a concise report comment.",
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "report_comment",
        studentFirstName: "Jane",
        pronounPreference: "she",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      })

      expect(output).not.toMatch(/^(Dear|Hello)/)
      expect(output).not.toMatch(SIGNOFF_BLOCK_REGEX)
      expect(output).toMatch(/\b(She|Her)\b/)
      expect(output).not.toContain("Dear")
      expect(output).not.toContain("Hello")
      expect(output).not.toMatch(/\bThem\b/)
    },
    120000,
  )

  it(
    "Test 4 — Panic Scan reply, English locale",
    async () => {
      const output = await callDraftRoute({
        situation: JAKE_PANIC_INPUT,
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        messageType: "parent_complaint",
        scanId: "integration-jake-scan",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      })

      expect(output).not.toMatch(GERMAN_LEAK_REGEX)
      expect(output.trim()).toMatch(SIGNOFF_BLOCK_REGEX)
      expect(output.toLowerCase()).not.toContain("calm update")
      expect(output.toLowerCase()).not.toContain("i know this will feel serious")
      expect(output.toLowerCase()).not.toContain("i wanted to follow up on what happened today")
      expect(output.toLowerCase()).not.toContain("i understand he came home")
      expect(output).toMatch(/I'?m really sorry to hear|I can hear how worrying this has been|I completely understand why this is concerning/i)
      expect(output).toMatch(/speak with Jake privately|speak with the other students involved|staff who were on duty|what happened in class/i)
      expect(output).toMatch(/phone call|meet in person|meeting/i)
    },
    120000,
  )

  it(
    "Test 5 — Sign-off presence across all parent-message modes",
    async () => {
      const outputs = await Promise.all([
        callDraftRoute({
          situation:
            "Need to write home about repeated lateness to class and the expectations I will restate tomorrow morning.",
          tone: "professional",
          language: "en",
          uiLocale: "en-GB",
          mode: "parent_message",
          signature: {
            line1: "Dr Greg Blackburn",
          },
        }),
        callDraftRoute({
          situation: JAKE_PANIC_INPUT,
          tone: "empathetic",
          language: "en",
          uiLocale: "en-GB",
          mode: "parent_message",
          inputMode: "panic_scan",
          sourceType: "ocr_text",
          messageType: "parent_complaint",
          scanId: "integration-jake-scan-2",
          signature: {
            line1: "Dr Greg Blackburn",
          },
        }),
        callDraftRoute({
          situation:
            "Turn these spoken notes into a calm parent update about missed homework, the check-in I will do tomorrow morning, and the support I will keep in place this week.",
          tone: "warm",
          language: "en",
          uiLocale: "en-GB",
          mode: "parent_message",
          inputMode: "voice_to_calm",
          sourceType: "voice_transcript",
          voiceSessionId: "integration-voice-1",
          signature: {
            line1: "Dr Greg Blackburn",
          },
        }),
      ])

      outputs.forEach((output) => {
        expect(output.trim()).toMatch(SIGNOFF_BLOCK_REGEX)
      })
    },
    240000,
  )
})
