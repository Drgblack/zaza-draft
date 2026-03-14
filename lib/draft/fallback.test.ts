import { buildFallbackDraft, type DraftFallbackContext } from "./fallback"

const baseContext: Omit<DraftFallbackContext, "language" | "teacherSignatureName"> = {
  mode: "parent_message",
  tone: "professional",
  requestId: "test",
  uidHash: "abc123",
  generationMetadata: {
    mode: "safe_draft",
    direction: "teacher_internal_notes",
    source_type: "typed_text",
    locale: "en",
    prompt_builder: "safe_draft",
  },
  studentPronounPreference: "auto",
  studentFirstName: "Kai",
  sourceSituation: "Need to send a calm update about missing homework and what I will follow up in class tomorrow.",
}

const toneFixtureSituation =
  "Sally has been struggling to hand in homework on time and it is becoming a pattern. I need to let the parents know but I don't want to sound harsh."

const expectedToneFallbacks: Record<string, string> = {
  warm: [
    "Subject: Update on homework",
    "Hello,",
    "I wanted to send a quick update about Sally's homework, as a few pieces have not been handed in on time recently.",
    "I will go through what is missing with Sally in class, make the next task clear, and help re-establish a steadier homework routine.",
    "If it would help, please do let me know if you are seeing the same pattern at home, and I will follow up again after I have checked this in school.",
    "Best regards,\nDr Greg Blackburn",
  ].join("\n\n"),
  professional: [
    "Subject: Update on homework",
    "Hello,",
    "I wanted to let you know that Sally has been handing homework in late more regularly over the past few weeks.",
    "I will go through what is missing in class, make the next task and deadline clear, and check that the expectations are understood.",
    "I wanted to make you aware of the pattern early, and I will follow up again if a further update is needed.",
    "Best regards,\nDr Greg Blackburn",
  ].join("\n\n"),
  direct: [
    "Subject: Update on homework",
    "Hello,",
    "Sally has been handing homework in late, and it is becoming a pattern.",
    "I will go through what is missing tomorrow, make the next deadline clear, and expect the work to be handed in on time from this point.",
    "I wanted to raise this now so it can be addressed before it becomes a wider pattern.",
    "Best regards,\nDr Greg Blackburn",
  ].join("\n\n"),
  empathetic: [
    "Subject: Update on homework",
    "Hello,",
    "I wanted to get in touch about Sally's homework, as handing it in on time has been difficult lately.",
    "I will check in with Sally in class, go through what is missing, and make sure the next task feels clear rather than overwhelming.",
    "I did not want this to become a bigger source of pressure, so I wanted to let you know now and I will follow up again after I have checked in at school.",
    "Best regards,\nDr Greg Blackburn",
  ].join("\n\n"),
}

describe("fallback drafting signature hygiene", () => {
  it("Case A (DE) omits teacher name when not provided", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "de",
      teacherSignatureName: undefined,
    }

    const text = buildFallbackDraft(context)
    expect(text).not.toContain("Samantha")
    expect(text).not.toContain("[Lehrkraft Name]")
    expect(text).not.toContain("Ã")
    expect(text.trim().endsWith("Mit freundlichen Grüßen")).toBe(true)
  })

  it("Case B (EN) omits teacher name and placeholders", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      teacherSignatureName: undefined,
    }

    const text = buildFallbackDraft(context)
    expect(text).not.toContain("Samantha")
    expect(text).not.toContain("[Your Name]")
    expect(text.trim().endsWith("Kind regards,")).toBe(true)
  })

  it("respects a final resolved greeting when fallback runs", () => {
    const finalGreeting = "Guten Tag, Dr. Markus Schneider,"
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "de",
      teacherSignatureName: undefined,
      greeting: {
        text: finalGreeting,
        name: "Dr. Markus Schneider",
      },
      greetingFinal: true,
    }

    const text = buildFallbackDraft(context)
    const lines = text.split("\n")
    expect(lines).toContain(finalGreeting)
    expect(text).not.toContain("Liebe Eltern,")
    expect(text).toContain("Mit freundlichen Grüßen")
  })

  it("keeps safe draft fallback teacher-authored for internal notes", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      teacherSignatureName: undefined,
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("Subject: Update on homework")
    expect(text).toContain("I wanted to let you know that Kai has been handing homework in late")
    expect(text).toContain("make the next task and deadline clear")
    expect(text).not.toContain("Thank you for bringing this to my attention.")
    expect(text).not.toContain("your child came home so upset")
  })

  it("keeps teacher-note fallback anchored to lateness without complaint-reply framing", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      teacherSignatureName: undefined,
      sourceSituation: "Need a calm parent message about arriving late to class and the expectations I will restate tomorrow morning.",
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("Subject: Update on punctuality")
    expect(text).toContain("Kai has been arriving late to class more regularly")
    expect(text).toContain("expectations around arrival")
    expect(text).not.toContain("Thank you for bringing this to my attention.")
    expect(text).not.toContain("came home")
  })

  it("uses issue-specific reply framing for panic scan fallback", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      teacherSignatureName: undefined,
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "en",
        prompt_builder: "panic_scan",
      },
      sourceSituation:
        "Parent says the homework set was too heavy this week and their child was upset at home.",
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("Thank you for your message about homework.")
    expect(text).toContain("I will go through what is missing in class")
    expect(text).not.toContain("Thank you for raising this with me.")
  })

  it("keeps an angry parent bullying complaint issue-specific", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      teacherSignatureName: undefined,
      tone: "direct",
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "en",
        prompt_builder: "panic_scan",
      },
      sourceSituation:
        "Parent says their child was pushed at breaktime, felt unsafe in the playground, and wants a response today.",
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("Subject: Follow-up on today's incident")
    expect(text).toContain("I have read your message about what happened today.")
    expect(text).toContain("I will speak with the staff involved today, establish what happened")
    expect(text).not.toContain("prepare a practical plan")
  })

  it("keeps report comment fallback mode-appropriate", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      mode: "report_comment",
      language: "en",
      teacherSignatureName: undefined,
      sourceSituation:
        "Short report comment on steady class contributions but homework still needs to be completed more regularly.",
    }

    const text = buildFallbackDraft(context)
    expect(text).not.toContain("Subject:")
    expect(text).not.toContain("Hello,")
    expect(text).not.toContain("Kind regards")
    expect(text).toContain("Should complete homework more regularly")
  })

  it("varies fallback output meaningfully across tone settings for the same source", () => {
    const tones: DraftFallbackContext[] = ["warm", "professional", "direct", "empathetic"].map(
      (tone) => ({
        ...baseContext,
        language: "en",
        tone,
        teacherSignatureName: undefined,
        generationMetadata: {
          mode: "panic_scan",
          direction: "parent_to_teacher",
          source_type: "ocr_text",
          locale: "en",
          prompt_builder: "panic_scan",
        },
        sourceSituation:
          "Parent says the recent marking in maths felt unclear and wants to know how the work was assessed.",
      }),
    )

    const outputs = tones.map((context) => buildFallbackDraft(context))
    expect(new Set(outputs).size).toBe(outputs.length)
    outputs.forEach((output) => {
      expect(output).toContain("Subject: Update on recent marking")
      expect(output).toContain("marking")
    })
  })

  it("locks the homework fixture to four visibly distinct parent-facing tone outputs", () => {
    const outputs = (["warm", "professional", "direct", "empathetic"] as const).map((tone) =>
      buildFallbackDraft({
        ...baseContext,
        language: "en",
        tone,
        teacherSignatureName: "Dr Greg Blackburn",
        studentFirstName: "Sally",
        sourceSituation: toneFixtureSituation,
      }),
    )

    expect(outputs).toEqual([
      expectedToneFallbacks.warm,
      expectedToneFallbacks.professional,
      expectedToneFallbacks.direct,
      expectedToneFallbacks.empathetic,
    ])

    outputs.forEach((output) => {
      expect(output).not.toContain("I'm sorry to hear your child came home upset")
    })
  })
})
