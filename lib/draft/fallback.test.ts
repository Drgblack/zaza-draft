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
    "Dear Parent/Carer,",
    "I just wanted to let you know about Sally's homework, as a few pieces have not been handed in on time recently.",
    "I will go through what is missing with Sally in class, make the next task clear, and help re-establish a steadier homework routine.",
    "If it would help, please do let me know if you are seeing the same pattern at home, and I will follow up again after I have checked this in school.",
    "Kind regards,\nDr Greg Blackburn",
  ].join("\n\n"),
  professional: [
    "Subject: Update on homework",
    "Dear Parent/Carer,",
    "I wanted to let you know that Sally has been handing homework in late more regularly over the past few weeks.",
    "I will go through what is missing in class, make the next task and deadline clear, and check that the expectations are understood.",
    "I wanted to make you aware of the pattern early, and I will follow up again if a further update is needed.",
    "Kind regards,\nDr Greg Blackburn",
  ].join("\n\n"),
  direct: [
    "Subject: Update on homework",
    "Dear Parent/Carer,",
    "Sally has been handing homework in late, and it is becoming a pattern.",
    "I will go through what is missing tomorrow, make the next deadline clear, and expect the work to be handed in on time from this point.",
    "I wanted to raise this now so it can be addressed before it becomes a wider pattern.",
    "Kind regards,\nDr Greg Blackburn",
  ].join("\n\n"),
  empathetic: [
    "Subject: Update on homework",
    "Dear Parent/Carer,",
    "I wanted to get in touch about Sally's homework, as handing it in on time has been difficult lately.",
    "I will check in with Sally in class, go through what is missing, and make sure the next task feels clear rather than overwhelming.",
    "I did not want this to become a bigger source of pressure, so I wanted to let you know now and I will follow up again after I have checked in at school.",
    "Kind regards,\nDr Greg Blackburn",
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

  it("preserves the student name and multiple issue clusters for safe draft teacher-note fallback", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      tone: "professional",
      teacherSignatureName: "Dr Greg Blackburn",
      studentFirstName: "Sally",
      sourceSituation:
        "Sally has been late to registration twice this week, has called out and disrupted the lesson, and still has missing homework. I need to send a calm message home.",
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("Sally")
    expect(text).toMatch(/late|lateness|registration|punctuality/i)
    expect(text).toMatch(/called out|lesson|classroom|behaviour|disrupt/i)
    expect(text).toMatch(/homework|missing work|missing homework/i)
  })

  it("covers at least two of the three concern clusters in the exact Sally harsh-notes case", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      tone: "professional",
      teacherSignatureName: "Dr Greg Blackburn",
      studentFirstName: "Sally",
      sourceSituation:
        "Hello Parent, did you know that Sally is late to school every single day and she is very disruptive when she finally arrives. She is silly in class and annoys me to death! And, the homework is just awful. She needs to get a grip and you should tell her that too! If I don't see her improve she will get sent to the Principal's office.",
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("Sally")
    expect(text).toMatch(/punctuality|late/i)
    expect(text).toMatch(/classroom expectations|disruption|behaviour/i)
    expect(text).toMatch(/homework|missing homework/i)
  })

  it("keeps a two-issue teacher-note fallback focused on both issues", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      tone: "professional",
      teacherSignatureName: "Dr Greg Blackburn",
      studentFirstName: "Sally",
      sourceSituation:
        "Sally has been late to class several times this week and still has missing homework.",
    }

    const text = buildFallbackDraft(context)
    expect(text).toMatch(/punctuality|late/i)
    expect(text).toMatch(/homework|missing homework/i)
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
    expect(text).toContain("Thank you for your message.")
    expect(text).toContain("I will go through what is missing in class")
    expect(text).not.toContain("Thank you for raising this with me.")
  })

  it("keeps the Lucy phone-support fallback useful without parroting the complaint", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      tone: "professional",
      teacherSignatureName: "Dr Greg Blackburn",
      studentFirstName: "Lucy",
      generationMetadata: {
        mode: "safe_draft",
        direction: "parent_to_teacher",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      sourceSituation: [
        "Subject: Concern about how Lucy was treated in class",
        "",
        "Hello,",
        "",
        "Lucy came home quite upset today and told me she was asked to put her phone away during your lesson.",
        "",
        "We have previously explained that Lucy uses her phone for mindfulness purposes when she feels overwhelmed, and we would expect some flexibility around this rather than her being singled out in front of others.",
        "",
        "She felt embarrassed and said the way it was handled made her uncomfortable. I'm sure that wasn't your intention, but it's important that her needs are understood and respected.",
        "",
        "I would appreciate it if you could reconsider how this is approached going forward.",
        "",
        "Kind regards,",
        "Lucy's Dad",
      ].join("\n"),
    }

    const text = buildFallbackDraft(context)

    expect(text).toContain("Subject: Follow-up on today's concern")
    expect(text).toContain("Dear Parent/Carer,")
    expect(text).toContain("Thank you for getting in touch and for explaining your concerns.")
    expect(text).toContain("apply the usual classroom expectations around phone use consistently")
    expect(text).toContain("the school's usual support process")
    expect(text).toContain("follow up with the appropriate colleague")
    expect(text).not.toContain("Subject: Update from school")
    expect(text).not.toContain("Hello Lucy's")
    expect(text).not.toContain("Hello Lucy,")
    expect(text).not.toContain("mindfulness purposes")
    expect(text).not.toContain("I don't have a record")
    expect(text).not.toContain("felt embarrassed")
    expect(text).not.toContain("We have previously explained")
  })

  it("uses boutique teacher-draft fallback for blunt phone-boundary drafts", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      tone: "professional",
      teacherDraftMode: true,
      teacherSignatureName: "Greg",
      studentFirstName: "Lucy",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      sourceSituation: [
        "Dear Lucy's Dad,",
        "",
        "I understand that Lucy may feel more comfortable having her phone with her, but classroom rules are clear that phones are not used during lessons.",
        "",
        "I can't make individual exceptions in the moment, as this would quickly become unmanageable across the class.",
        "",
        "Regards,",
        "Greg",
      ].join("\n"),
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("Thank you for getting in touch and for sharing your concerns.")
    expect(text).toContain("Lucy felt uncomfortable during the lesson")
    expect(text).toContain("phone use consistently")
    expect(text).not.toContain("I can't make individual exceptions")
    expect(text).not.toContain("unmanageable across the class")
    expect(text).not.toContain("support coordinator")
    expect(text).not.toContain("appropriate colleague")
    expect(text).toContain("Kind regards,\nGreg")
  })

  it("uses boutique teacher-draft fallback for marking disputes without customer-support filler", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      tone: "professional",
      teacherDraftMode: true,
      teacherSignatureName: "Greg",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      sourceSituation: [
        "Dear Parent/Carer,",
        "",
        "The marking was fair and consistent, and I applied the criteria correctly.",
        "",
        "There is nothing more to discuss here.",
        "",
        "Regards,",
        "Greg",
      ].join("\n"),
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("raising your concerns about the recent marking")
    expect(text).toContain("marking criteria consistently and fairly")
    expect(text).not.toContain("There is nothing more to discuss")
    expect(text).not.toContain("please feel free")
    expect(text).toContain("Kind regards,\nGreg")
  })

  it("keeps special-treatment boundary drafts clear without calling the request unreasonable", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      tone: "professional",
      teacherDraftMode: true,
      teacherSignatureName: "Greg",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      sourceSituation: [
        "Dear Parent/Carer,",
        "",
        "I think this request is unreasonable and I cannot offer special treatment here.",
        "",
        "The expectation is the same for everyone.",
        "",
        "Regards,",
        "Greg",
      ].join("\n"),
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("keep expectations clear and consistent across the class")
    expect(text).not.toContain("unreasonable")
    expect(text).not.toContain("special treatment")
    expect(text).toContain("Kind regards,\nGreg")
  })

  it("turns tired homework drafts into calmer fallback language without losing the point", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      tone: "professional",
      teacherDraftMode: true,
      teacherSignatureName: "Greg",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      sourceSituation: [
        "Dear Parent/Carer,",
        "",
        "I am tired of repeating this and I can't keep chasing homework every week.",
        "",
        "Your child needs to take this seriously because this is getting frustrating.",
        "",
        "Regards,",
        "Greg",
      ].join("\n"),
    }

    const text = buildFallbackDraft(context)
    expect(text).toContain("expectations around homework clear and consistent")
    expect(text).toContain("go through what is missing in class")
    expect(text).not.toContain("tired of repeating this")
    expect(text).not.toContain("frustrating")
    expect(text).toContain("Kind regards,\nGreg")
  })

  it("removes product-mediated calm-update phrasing from fallback openings", () => {
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

    outputs.forEach((output) => {
      expect(output.toLowerCase()).not.toContain("send a calm update")
      expect(output.toLowerCase()).not.toContain("brief, calm update")
    })
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
    expect(text).toContain("Thank you for letting me know. I take what you have shared very seriously.")
    expect(text).toContain("I did not personally witness this during class")
    expect(text).toContain("phone call tomorrow afternoon")
    expect(text).not.toContain("prepare a practical plan")
  })

  it("keeps the Jake/Karen angry-parent panic scan fallback natural across all four tones", () => {
    const outputs = (["warm", "professional", "direct", "empathetic"] as const).map((tone) =>
      buildFallbackDraft({
        ...baseContext,
        language: "en",
        tone,
        teacherSignatureName: "Dr Greg Blackburn",
        generationMetadata: {
          mode: "panic_scan",
          direction: "parent_to_teacher",
          source_type: "ocr_text",
          locale: "en",
          prompt_builder: "panic_scan",
        },
        sourceSituation:
          "Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime. Karen wants to know what happened and why nobody called.",
      }),
    )

    outputs.forEach((output) => {
      expect(output.toLowerCase()).not.toContain("send a calm update")
      expect(output.toLowerCase()).not.toContain("brief, calm update")
      expect(output).toContain("Kind regards,\nDr Greg Blackburn")
    })
  })

  it("uses the high-risk panic scan fallback framework for the Jake/Karen incident case", () => {
    const text = buildFallbackDraft({
      ...baseContext,
      language: "en",
      tone: "empathetic",
      teacherSignatureName: "Dr Greg Blackburn",
      studentFirstName: undefined,
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "en",
        prompt_builder: "panic_scan",
      },
      sourceSituation:
        "Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime at school. Karen wants to know what happened in class and why nobody called.",
    })

    expect(text).toContain("Jake")
    expect(text).toMatch(/I'?m really sorry to hear|I completely understand why this is concerning|I can hear how worrying this has been/i)
    expect(text).toMatch(/speak with Jake privately|speak with the other students involved|speak with any witnesses/i)
    expect(text).toMatch(/phone call|meet in person|meeting/i)
    expect(text.toLowerCase()).not.toContain("i know this will feel serious")
    expect(text.toLowerCase()).not.toContain("i wanted to follow up on what happened today")
    expect(text.toLowerCase()).not.toContain("please don't hesitate to reach out")
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
