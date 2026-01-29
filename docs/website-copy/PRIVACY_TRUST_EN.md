# Privacy & Trust (EN)

Zaza Draft is built for educators who value privacy and calm language. Here is what we do and what we avoid:

- **Data we process:** Your authenticated `users/{uid}` context, the draft situation you submit, and the resulting generated reply. We persist snippets and usage metadata in Firestore so you can review past drafts.
- **Data we do not share:** We never publish parent names, student details, or drafts publicly. Data stays within your Firestore namespace and is only accessible via the authenticated API.
- **Safety behaviour:** Every draft passes through Appendix F checks. Banned phrases trigger an `outcome: "INVALID_REQUEST"` with `errorCode: "TRUST_GRADE_VIOLATION"` plus localized guidance so you can adjust the tone without guesswork.
- **No moral judgement:** We do not invent backstories, refuse to assign blame, and we reject content that contains moralizing language or absolute promises.
- **Structured errors:** Usage limits and trust-grade failures return consistent JSON (`RATE_LIMITED`, `USAGE_LIMIT_EXCEEDED`, or `INVALID_REQUEST`) so your integrations can react predictably.
- **Support & languages:** Zaza Draft supports English and German equally; every safety test is bilingual. Reach us through the support page referenced in `docs/QA.md`, and we will respond with the same calm tone.
