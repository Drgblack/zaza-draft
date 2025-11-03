// Mock data for draft generation responses
// Use this until the real OpenAI API is connected

export const mockDraftResponses = {
  'parent-email-homework': {
    draft: "Dear Smith Family,\n\nI wanted to reach out regarding Emma's recent homework completion. I've noticed she's been working diligently on her assignments, which shows great dedication.\n\nHowever, I've observed that some assignments are being submitted incomplete. I'd love to discuss some strategies we can try together to help Emma stay on track.\n\nWould you be available for a brief call this week? I'm confident that with our combined support, Emma will thrive.\n\nWarm regards,\nSarah Johnson",
    tone: "empathetic",
    pedagogicalReasoning: "I used a strength-based approach, starting with Emma's effort before addressing the concern. This builds trust and frames the conversation as a partnership rather than criticism.",
    keyPhrases: [
      {
        phrase: "working diligently on her assignments",
        reasoning: "Acknowledging effort before discussing challenges follows growth mindset principles and prevents defensiveness."
      },
      {
        phrase: "strategies we can try together",
        reasoning: "Partnership language ('we' and 'together') positions the teacher and parent as a team working for the student's benefit."
      },
      {
        phrase: "Emma will thrive",
        reasoning: "Ending with optimism and confidence in the student maintains hope and forward momentum."
      }
    ],
    suggestions: [
      "Add a specific example of an assignment Emma completed well",
      "Mention what subject or type of homework is most challenging",
      "Suggest a specific time window for the phone call"
    ]
  },
  
  'report-card-progress': {
    draft: "Marcus has shown remarkable growth in mathematics this term. His problem-solving skills have developed significantly, particularly in fractions and decimals.\n\nHe actively participates in class discussions and isn't afraid to ask questions when concepts are unclear. This curiosity and willingness to learn will serve him well.\n\nMoving forward, I encourage Marcus to continue practicing his multiplication facts, as this will strengthen his foundation for more complex operations.",
    tone: "warm",
    pedagogicalReasoning: "I structured this as 'strength → evidence → growth area' to maintain positivity while being honest about areas for development. This follows best practices in formative feedback.",
    keyPhrases: [
      {
        phrase: "remarkable growth",
        reasoning: "Starting with strong, specific praise sets a positive tone and recognizes genuine progress."
      },
      {
        phrase: "isn't afraid to ask questions",
        reasoning: "Highlighting learning behaviors (not just outcomes) reinforces that curiosity is valued."
      },
      {
        phrase: "will strengthen his foundation",
        reasoning: "Framing practice as building strength (not fixing weakness) maintains a growth orientation."
      }
    ],
    suggestions: [
      "Add specific scores or percentages if available",
      "Mention a particular project or assignment Marcus excelled at",
      "Include next term's topic preview to build excitement"
    ]
  },

  'behavioral-concern': {
    draft: "I wanted to share some observations about Lily's classroom behavior. She is a bright, creative student with wonderful ideas to contribute.\n\nRecently, I've noticed she's been having difficulty staying focused during independent work time. This is affecting her ability to complete tasks within the allotted period.\n\nI believe with some support, we can help Lily develop stronger self-regulation skills. Could we schedule a time to discuss strategies that might work both at school and at home?",
    tone: "professional",
    pedagogicalReasoning: "I balanced concern with respect by leading with strengths and positioning the behavior as a skill to develop (not a character flaw). This reduces parent defensiveness and encourages collaboration.",
    keyPhrases: [
      {
        phrase: "bright, creative student",
        reasoning: "Beginning with genuine strengths prevents the message from feeling like an attack and shows you see the whole child."
      },
      {
        phrase: "develop stronger self-regulation skills",
        reasoning: "Naming it as a developable skill (vs 'bad behavior') normalizes the challenge and implies it can improve with practice."
      },
      {
        phrase: "strategies that might work both at school and at home",
        reasoning: "Inviting parent input creates partnership and acknowledges they know their child best."
      }
    ],
    suggestions: [
      "Note specific times when Lily does focus well (to identify patterns)",
      "Mention any recent changes (new seating, different time of day, etc.)",
      "Propose 2-3 initial strategies you're already trying"
    ]
  }
};

// Helper function to get mock response based on scenario
export function getMockDraftResponse(scenario: string) {
  return mockDraftResponses[scenario] || mockDraftResponses['parent-email-homework'];
}
