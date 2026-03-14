import { describe, expect, it } from "vitest"

import { resolveGreeting } from "@/lib/draft/greeting-resolution"
import { applyFinalGreetingGuard } from "./final-greeting"

describe("final greeting guard", () => {
  it("prepends the resolved Elena Martínez greeting", () => {
    const greeting = resolveGreeting({
      cleanedOcrText: "Beschwerde über den Unterricht.\n\nMit freundlichen Grüßen\nElena Martínez\n",
      locale: "de",
      messageType: "parent_complaint",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Guten Tag, Elena Martínez,")
    const generatedBody = "Vielen Dank für die Nachricht.\nWir nehmen die Rückmeldung ernst."
    const enforced = applyFinalGreetingGuard(generatedBody, greeting.greeting)
    expect(enforced.trim().startsWith(greeting.greeting)).toBe(true)
  })

  it("forces the Dr. Markus Schneider greeting even if the draft starts differently", () => {
    const greeting = resolveGreeting({
      cleanedOcrText: "Mit freundlichen Grüßen\nDr. Markus Schneider\n",
      locale: "de",
      messageType: "parent_complaint",
      mode: "parent_message",
      direction: "parent_to_teacher",
      tone: "professional",
    })
    expect(greeting.greeting).toBe("Guten Tag, Dr. Markus Schneider,")
    const generatedBody = "Sehr geehrte Eltern,\nIch habe Ihre Angaben zur Kenntnis genommen."
    const enforced = applyFinalGreetingGuard(generatedBody, greeting.greeting)
    expect(enforced.trim().startsWith(greeting.greeting)).toBe(true)
  })

  it("preserves the first body sentence when a malformed inline greeting is repaired", () => {
    const enforced = applyFinalGreetingGuard(
      "Hello , I wanted to send a clear update about homework.",
      "Dear Parent/Carer,",
    )

    expect(enforced).toBe("Dear Parent/Carer,\n\nI wanted to send a clear update about homework.")
  })

  it("removes malformed inline greeting residue after a repaired top greeting", () => {
    const enforced = applyFinalGreetingGuard(
      [
        "Dear Parent/Carer,",
        "",
        "Hello , I wanted to send a clear update about homework.",
      ].join("\n"),
      "Dear Parent/Carer,",
    )

    expect(enforced).toBe(
      [
        "Dear Parent/Carer,",
        "",
        "I wanted to send a clear update about homework.",
      ].join("\n"),
    )
  })
})
