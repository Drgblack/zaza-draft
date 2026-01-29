# Public FAQ (EN / DE)

## English

**What is Zaza Draft?**  
Zaza Draft is a teacher-first assistant that helps you respond calmly to parents and caregivers. It anchors the child’s name, preserves tone, and appends the correct teacher signature in English and German replies.

**How does privacy work?**  
We keep every draft within your private Firestore namespace (`users/{uid}`), and drafts are only accessible when you authenticate through `/api/draft/generate`. Nothing is shared publicly, and our trust-grade filters prevent sensitive or accusatory language.

**Is it safe?**  
Yes. The service enforces Appendix F constraints, blocks banned phrases, and never makes absolute promises. Usage is rate-limited per plan, and all safety checks are covered by deterministic EN/DE tests (`app/api/draft/generate/route.test.ts`).

**What languages are supported?**  
Zaza Draft currently anchors behaviour to English and German. Every feature from greeting resolution to signature formatting is validated for both locales.

**What is the pricing model?**  
Pricing details are still being finalized. For pilot access or to discuss upcoming plans, please reach out through the support channel listed below.

**How can I get support?**  
Open `docs/QA.md` to find the support widget details. In-app issues can be reported via the support form, which writes to Firestore (`supportTickets/{ticketId}`) and triggers the on-call notifications.

## Deutsch

**Was ist Zaza Draft?**  
Zaza Draft ist ein Lehrerbegleiter, der dabei hilft, ruhige Nachrichten an Eltern zu verfassen. Der Entwurf verankert den Namen des Kindes, wahrt den Ton und ergänzt die korrekte Signatur auf Deutsch und Englisch.

**Wie funktioniert der Datenschutz?**  
Alle Entwürfe bleiben im privaten Firestore-Bereich (`users/{uid}`) und sind nur über die authentifizierte Route `/api/draft/generate` erreichbar. Es gibt keine öffentliche Veröffentlichung, und die Trust-Grade-Filter sperren sensible oder vorwurfsvolle Formulierungen.

**Ist das Tool sicher?**  
Ja. Appendix F ist fest eingebaut, verbotene Ausdrücke werden geblockt, und absolute Versprechen erscheinen nicht in den Antworten. Die Nutzung ist pro Plan begrenzt, und alle Sicherheitsmassnahmen wurden durch EN/DE Tests abgesichert.

**Welche Sprachen werden unterstützt?**  
Zaza Draft unterstützt derzeit Englisch und Deutsch. Alle Funktionen von der Begrüßungsauflösung bis zur Signaturformatierung sind für beide Sprachen geprüft.

**Wie ist das Preismodell?**  
Die Preisstruktur wird gerade finalisiert. Für Pilotzugänge oder Fragen zu geplanten Tarifen wenden Sie sich bitte über den Supportkanal an uns.

**Wie bekomme ich Unterstützung?**  
Schauen Sie in `docs/QA.md` nach den Supportkontaktmöglichkeiten. Probleme können über das Supportformular gemeldet werden; es schreibt in Firestore (`supportTickets/{ticketId}`) und aktiviert das On-Call-Team.
