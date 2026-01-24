import { describe, expect, it } from "vitest"
import { resolveGreeting, scoreSafeName } from "./greeting-resolution"

describe("resolveGreeting", () => {
  it("uses a name from German sign-off when safe", () => {
    const text = "Mit freundlichen Grüßen\nDr. Markus Schneider\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "de",
    })
    expect(greeting.greeting).toBe("Guten Tag, Dr. Markus Schneider,")
  })

  it("uses standalone signature-only name", () => {
    const text = "Vielen Dank für Ihre Nachricht.\n\nThomas Berger\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "de",
    })
    expect(greeting.greeting).toBe("Guten Tag, Thomas Berger,")
  })

  it("falls back when name is unsafe", () => {
    const text = "Lehrerin: Frau Müller\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "de",
      messageType: "parent_message",
    })
    expect(greeting.greeting).toBe("Liebe Eltern,")
  })

  it("uses English name when safe", () => {
    const text = "Kind regards\nJohn Peterson\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "en",
    })
    expect(greeting.greeting).toBe("Hello John Peterson,")
  })

  it("falls back on ambiguous english text", () => {
    const text = "Best regards\nOpen in Gmail\n"
    const greeting = resolveGreeting({
      cleanedOcrText: text,
      locale: "en",
    })
    expect(greeting.greeting).toBe("Hello,")
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
