# QA Notes

## De-escalation
- Confirm the banner subtitle stays supportive and explains the softening as a service to the message (e.g., “I softened a few high-emotion phrases...”).
- Confirm the banner copy never feels corrective by avoiding language such as “You used inappropriate language,” “This is not allowed,” or “You should not.”

## Screenshot: Calmed and professionalised banner
- Use `QA_EMOTIONAL_INPUT` from `lib/deescalation/fixtures.ts` as the note prompt.
- Steps:
  1. Run `pnpm dev` to start the local server.
  2. Go to the draft screen (main editor).
  3. Paste `QA_EMOTIONAL_INPUT` into the prompt box.
  4. Generate the draft.
  5. Expand “See what changed” on the De-escalation banner.
  6. Take a screenshot showing the banner, expanded list, and supporting copy.
  7. Save the image as `/docs/screenshots/deescalation-banner.png`.
  8. Add a brief note below the image describing that it shows the calm banner and flagged phrases.
- Placeholder image: `![Calmed banner](./screenshots/deescalation-banner.png)`
- (Drop in the actual screenshot file and add a one-line description below describing what part of the UI it captures.)
