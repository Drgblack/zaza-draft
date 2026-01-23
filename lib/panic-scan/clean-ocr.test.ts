import { describe, expect, it } from "vitest"
import { cleanOcrText } from "./clean-ocr"

describe("cleanOcrText", () => {
  it("removes Gmail chrome and leaves only the parent message", () => {
    const raw = `
Inbox
99+
Starred
Compose
Search mail
Facebook Growth
Dear Miss Smith,
Thank you for sharing the update about Jamie.
I agree we should meet next Tuesday to go over the new plan and set measurable goals.
Kind regards,
Mrs Turner
Meet
`

    const result = cleanOcrText(raw)
    expect(result.cleanText).toContain("Dear Miss Smith,")
    expect(result.cleanText).toContain("set measurable goals.")
    expect(result.cleanText).toContain("Kind regards,")
    expect(result.cleanText).not.toContain("Inbox")
    expect(result.cleanText).not.toContain("Compose")
    expect(result.cleanText).not.toContain("99+")
    expect(result.removedLines).toBeGreaterThan(3)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it("keeps a plain body without a greeting", () => {
    const raw = `
The student has been improving daily.
Please continue the plan.
Thanks,
Alex
`
    const result = cleanOcrText(raw)
    expect(result.cleanText).toBe(`The student has been improving daily.

Please continue the plan.

Thanks,
Alex`)
    expect(result.removedLines).toBe(0)
  })

  it("captures the signature and respects end boundaries", () => {
    const raw = `
Inbox
Snoozed
Hello Ms Carter,
I wanted to flag that the student has been coming to office hours weekly.
Kind regards,
Ms Carter
Sent
`

    const result = cleanOcrText(raw)
    expect(result.cleanText).toContain("Hello Ms Carter,")
    expect(result.cleanText).toContain("Kind regards,")
    expect(result.cleanText).toContain("Ms Carter")
    expect(result.removedLines).toBeGreaterThan(2)
    expect(result.debug?.boundaries).toBeDefined()
  })

  it("lets the actual message take priority when the parent name also appears in UI labels", () => {
    const raw = `
Inbox
Jamie Powell
Dear Parent Team,
Jamie Powell is attending tutoring regularly and is asking for the reading log.
Regards,
Ms Lee
`

    const result = cleanOcrText(raw)
    expect(result.cleanText.split("\n")[0]).toBe("Dear Parent Team,")
    expect(result.cleanText).toContain("Jamie Powell is attending tutoring regularly")
    expect(result.cleanText).not.toContain("Inbox")
  })
})

it("strips Gmail UI chrome from OCR text", () => {
  const raw = [
    "Gmail",
    "Compose",
    "Inbox",
    "External",
    "Support @ ZazaTeach",
    "Summarise this email",
    "It looks like this message is in German",
    "Translate to English",
    "",
    "Formelle Beschwerde bezüglich Leistungsbewertung",
    "",
    "Sehr geehrte Frau Samantha,",
    "hiermit möchte ich formell Beschwerde über die Bewertung der letzten Klassenarbeit meines Sohnes Jonas einreichen.",
    "Bitte lassen Sie mir die Bewertungsmaßstäbe sowie eine schriftliche Begründung zukommen.",
    "",
    "Mit freundlichen Grüßen",
    "Dr. Markus Schneider",
    "",
    "Open in Gmail",
  ].join("\n")

    const result = cleanOcrText(raw)
  const joined = result.cleanText
  expect(joined).toContain("Sehr geehrte Frau Samantha,")
  expect(joined).toContain("hiermit möchte ich formell Beschwerde")
  expect(joined).not.toMatch(/Summarise this email|Translate to English|It looks like this message is in German|Open in Gmail|Gmail|Meet|Compose|Inbox|External/i)
})

