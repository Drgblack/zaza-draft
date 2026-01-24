import { describe, expect, it } from "vitest"

import { resolveGreeting } from "@/lib/draft/greeting-resolution"
import { applyFinalGreetingGuard } from "./final-greeting"

describe("final greeting guard", () => {
  it("prepends the resolved Elena Martínez greeting", () => {
    const greeting = resolveGreeting({
      cleanedOcrText: "Beschwerde über den Unterricht.\n\nMit freundlichen Grüßen\nElena Martínez\n",
      locale: "de",
      messageType: "parent_complaint",
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
    })
    expect(greeting.greeting).toBe("Guten Tag, Dr. Markus Schneider,")
    const generatedBody = "Sehr geehrte Eltern,\nIch habe Ihre Angaben zur Kenntnis genommen."
    const enforced = applyFinalGreetingGuard(generatedBody, greeting.greeting)
    expect(enforced.trim().startsWith(greeting.greeting)).toBe(true)
  })
})
