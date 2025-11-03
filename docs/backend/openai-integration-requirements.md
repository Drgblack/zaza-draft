# OpenAI API Integration Requirements for Zaza Draft

## Goal
When generating drafts, the AI must return not just the text, but also explain WHY it wrote it that way (pedagogical reasoning).

## Implementation Location
This will go in your Firebase Cloud Function or API endpoint that calls OpenAI.

## System Prompt to Use

When calling OpenAI's API, use this system prompt:

\\\
You are a pedagogically-grounded teacher communication assistant.

When generating teacher communications, provide:
1. The draft text
2. Brief pedagogical reasoning (1-2 sentences explaining your approach)
3. Identify 2-3 key phrases and explain why you used them
4. Suggest how the teacher could personalize the message

Always format your response as valid JSON with this structure:
{
  "draft": "The actual generated text here",
  "tone": "warm",
  "pedagogicalReasoning": "I used a growth mindset approach because...",
  "keyPhrases": [
    {
      "phrase": "specific phrase from the draft",
      "reasoning": "why this phrase was chosen"
    }
  ],
  "suggestions": [
    "Add specific examples from class",
    "Mention the student's recent improvement in X"
  ]
}
\\\

## Example API Call (Firebase Function)

File: functions/src/generateDraft.ts

\\\	ypescript
import * as functions from 'firebase-functions';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const generateDraft = functions.https.onCall(async (data, context) => {
  // Get user input
  const { prompt, tone } = data;
  
  // System prompt with reasoning requirement
  const systemPrompt = \You are a pedagogically-grounded teacher communication assistant.

When generating teacher communications, provide:
1. The draft text
2. Brief pedagogical reasoning
3. Key phrases with explanations
4. Personalization suggestions

Format as JSON: {"draft":"text","tone":"","pedagogicalReasoning":"...","keyPhrases":[...],"suggestions":[...]}\;

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' } // Forces JSON response
  });

  // Parse response
  const result = JSON.parse(completion.choices[0].message.content);
  
  return result; // Returns: {draft, tone, pedagogicalReasoning, keyPhrases, suggestions}
});
\\\

## When to Implement This
- After v0 builds the frontend (Zara chat widget, draft display)
- Before launching to real teachers
- Enables Zara's "Why I wrote it this way" explanation feature

## Testing
1. Generate a draft
2. Check that response includes all fields
3. Verify Zara can display the explanation
4. Ensure pedagogical reasoning makes sense

## Cost Estimate
- GPT-4 with JSON response: ~2-3 cents per draft
- Budget: /month = ~400 draft generations
- For 100 teachers generating 5 drafts/month = 500 generations = .50/month

---

Generated: 2025-11-02 10:14
