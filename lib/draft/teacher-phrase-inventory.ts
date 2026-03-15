export type EnglishParentFacingTone = "warm" | "professional" | "direct" | "empathetic"

export const ENGLISH_PARENT_FACING_BANNED_PHRASES = [
  "send a calm update",
  "brief, calm update",
  "brief calm update",
  "a calm update",
  "calm update about",
  "calm update on",
]

export const ENGLISH_PARENT_REPLY_PARROTING_BANNED_PHRASES = [
  "i understand he came home",
  "i understand she came home",
  "i understand they came home",
  "i understand your child came home",
  "i wanted to update you regarding the incident",
]

export const ENGLISH_PARENT_FACING_PHRASE_INVENTORY: Record<
  EnglishParentFacingTone,
  {
    teacherUpdateOpenings: string[]
    parentReplyOpenings: string[]
    actionPatterns: string[]
    followUpPatterns: string[]
  }
> = {
  warm: {
    teacherUpdateOpenings: [
      "I just wanted to let you know about...",
      "I wanted to keep you in the loop about...",
      "I wanted to follow up on...",
    ],
    parentReplyOpenings: [
      "Thank you for letting me know.",
      "I appreciate you getting in touch about this.",
      "I have received your message and will look into this promptly.",
    ],
    actionPatterns: [
      "I will go through what is missing in class and make the next step clear.",
      "I will speak with the staff involved and check what happened today.",
      "I will follow this up in school and keep the routine steady.",
    ],
    followUpPatterns: [
      "I will follow up again once I have checked this in school.",
      "If it would help, please let me know if you are seeing the same pattern at home.",
    ],
  },
  professional: {
    teacherUpdateOpenings: [
      "I wanted to let you know that...",
      "I wanted to update you on...",
      "I wanted to make you aware of...",
    ],
    parentReplyOpenings: [
      "Thank you for your message.",
      "I appreciate you getting in touch about this.",
      "I have received your message and will look into this promptly.",
    ],
    actionPatterns: [
      "I will review the work carefully and come back to you with a clear explanation.",
      "I will follow this up in school and keep the next steps clear.",
      "I will speak with the staff involved and check what happened.",
    ],
    followUpPatterns: [
      "I will follow up again if a further update is needed.",
      "I wanted to make you aware of the pattern early.",
    ],
  },
  direct: {
    teacherUpdateOpenings: [
      "I am writing to let you know that...",
      "I am writing about...",
      "I need to make you aware that...",
    ],
    parentReplyOpenings: [
      "I have received your message.",
      "I have read your message and will look into this today.",
      "I will review this and come back to you.",
    ],
    actionPatterns: [
      "I will address this directly in school and make the expectation clear.",
      "I will review this and come back to you with a clear answer.",
      "I will speak with the staff involved today and establish what happened.",
    ],
    followUpPatterns: [
      "I wanted to raise this now so it can be addressed before it becomes a wider pattern.",
      "I will come back to you as soon as that has been checked.",
    ],
  },
  empathetic: {
    teacherUpdateOpenings: [
      "I wanted to reach out about...",
      "I wanted to follow up on...",
      "I just wanted to let you know that...",
    ],
    parentReplyOpenings: [
      "Thank you for letting me know.",
      "I appreciate you getting in touch about this.",
      "I have received your message and will look into this promptly.",
    ],
    actionPatterns: [
      "I will check in tomorrow and make sure the next step feels clear rather than overwhelming.",
      "I will speak with the staff involved and look into what happened.",
      "I will follow this up in school and make sure the approach is manageable.",
    ],
    followUpPatterns: [
      "I did not want this to become a bigger source of pressure, so I wanted to let you know now.",
      "I will come back to you as soon as I have checked the detail.",
    ],
  },
}

export function formatEnglishPhraseExamples(
  tone: EnglishParentFacingTone,
  section: keyof (typeof ENGLISH_PARENT_FACING_PHRASE_INVENTORY)[EnglishParentFacingTone],
) {
  return ENGLISH_PARENT_FACING_PHRASE_INVENTORY[tone][section]
    .map((phrase) => `'${phrase}'`)
    .join(", ")
}
