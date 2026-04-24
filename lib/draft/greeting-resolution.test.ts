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

  it("preserves Ms title in English parent greetings", () => {
    const text = "Kind regards\nMs Parker\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "en",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Dear Ms Parker,")
    expect(greeting.greeting).not.toContain("Hello Parker")
    expect(greeting.recipientTitle).toBe("Ms")
    expect(greeting.recipientSurname).toBe("Parker")
  })

  it("preserves Mr title in English parent greetings", () => {
    const text = "Best regards\nMr Ahmed\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "en",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Dear Mr Ahmed,")
    expect(greeting.greeting).not.toContain("Hi Ahmed")
    expect(greeting.recipientTitle).toBe("Mr")
    expect(greeting.recipientSurname).toBe("Ahmed")
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

  it("falls back when the sign-off is a possessive relationship phrase such as Lucy's Dad", () => {
    const text = "Kind regards\nLucy's Dad\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "en",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })

    expect(greeting.greeting).toBe("Dear Parent/Carer,")
    expect(greeting.greeting).not.toContain("Hello Lucy")
    expect(greeting.safeName).toBeUndefined()
  })

  it("falls back when the sign-off is a possessive relationship phrase such as Tom's Mum", () => {
    const text = "Best regards\nTom's Mum\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "en",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })

    expect(greeting.greeting).toBe("Dear Parent/Carer,")
    expect(greeting.greeting).not.toContain("Hello Tom")
    expect(greeting.safeName).toBeUndefined()
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

  it("rejects possessive parent relationship sign-offs", () => {
    expect(scoreSafeName("Lucy's Dad", "en").level).toBe("NONE")
    expect(scoreSafeName("Tom's Mum", "en").level).toBe("NONE")
  })
})
