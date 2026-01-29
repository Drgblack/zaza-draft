# Website FAQ (EN)

**1. What is Zaza Draft?**  
Zaza Draft is a bilingual assistant for teachers and counselors that writes respectful replies to parents while anchoring tone, names, and signatures.

**2. How does it keep things calm?**  
Every reply respects Appendix F safety: banned moral judgment phrases are removed, there are no absolute promises, and drafts focus on understanding rather than assigning blame.

**3. What data do you collect?**  
We process the situation you submit, the generated response, and usage metadata under `users/{uid}`. These stay private and are only accessible through authenticated routes.

**4. Is my data shared with third parties?**  
No. We do not publish drafts or metadata externally. Firestore documents remain within your namespace and are not used for training external models.

**5. What happens when a phrase is blocked?**  
The API returns `outcome: "INVALID_REQUEST"` with `errorCode: "TRUST_GRADE_VIOLATION"` and localized guidance so you can rephrase without losing momentum.

**6. How does trust-grade parity work for EN and DE?**  
We run the same banned-phrase list and tests for both languages. Trust-grade violations and explanations are localized but share the same structure.

**7. What does usage look like?**  
Usage is tracked per plan month. When you reach your limit, you receive a `RATE_LIMITED` response with `errorCode: "USAGE_LIMIT_EXCEEDED"`, plus the `usage` object showing plan, limit, remaining, and whether the plan is unlimited.

**8. How can I get support?**  
Support details live in `docs/QA.md`. Issues route to Firestore (`supportTickets/{ticketId}`) and alert the operations team; expect a calm reply in the same tone we aim for.

**9. Which languages are available?**  
English and German are fully supported. Every feature, from greeting resolution to signatures, is tested in both locales.

**10. What does pricing look like?**  
Pricing is in pilot mode. We offer a free plan with transparent limits and a forthcoming Pro plan with higher usage and dedicated onboarding (see pricing doc for placeholder pricing references).
