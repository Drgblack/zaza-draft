import { describe, expect, it } from "vitest"
import {
  normalizeParentFacingGreetingLine,
  resolveGreeting,
  scoreSafeName,
} from "./greeting-resolution"

describe("resolveGreeting", () => {
  it("uses a name from German sign-off when safe", () => {
    const text = "Mit freundlichen Grüßen\nDr. Markus Schneider\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "de",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Guten Tag, Dr. Markus Schneider,")
  })

  it("uses standalone signature-only name", () => {
    const text = "Vielen Dank für Ihre Nachricht.\n\nThomas Berger\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "de",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Guten Tag, Thomas Berger,")
  })

  it("falls back when name is unsafe", () => {
    const text = "Lehrerin: Frau Müller\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "de",
      messageType: "parent_message",
      mode: "parent_message",
      direction: "teacher_internal_notes",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Guten Tag,")
  })

  it("prefers first-name English greetings when only first and last name are known", () => {
    const text = "Kind regards\nJohn Peterson\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "en",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Hello John,")
  })

  it("falls back to a generic English greeting when the parent name is unknown", () => {
    const text = "Best regards\nOpen in Gmail\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "en",
      mode: "parent_message",
      direction: "teacher_internal_notes",
      tone: "warm",
    })
    expect(greeting.greeting).toBe("Dear Parent/Carer,")
  })

  it("uses German honorific greetings when salutation data is strong", () => {
    const text = "Mit Nachdruck\nFrau Karen Roberts\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "de",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Hallo Frau Roberts,")
    expect(greeting.confidence).toBe("MEDIUM")
  })

  it("omits greetings entirely for report comments", () => {
    const greeting = resolveGreeting({
      cleanedOcrText: "Homework effort was more consistent this week.",
      locale: "en",
      mode: "report_comment",
      direction: "report_comment",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("")
    expect(greeting.final).toBe(false)
  })

  it("normalizes malformed generic English greeting punctuation to the unknown-recipient fallback", () => {
    expect(normalizeParentFacingGreetingLine("Hello ,", "en")).toBe("Dear Parent/Carer,")
  })

  it("keeps a named English greeting clean and correctly punctuated", () => {
    expect(normalizeParentFacingGreetingLine("Hello Karen  ,", "en")).toBe("Hello Karen,")
  })
})

describe("scoreSafeName", () => {
  it("scores a proper name as high", () => {
    expect(scoreSafeName("Dr. Markus Schneider", "de").level).toBe("HIGH")
  })

  it("rejects UI-looking strings", () => {
    expect(scoreSafeName("Open in Gmail", "en").level).toBe("NONE")
  })
})
