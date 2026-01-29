# Datenschutz & Vertrauen (DE)

Zaza Draft wurde für Lehrkräfte entwickelt, die Privatsphäre und ruhige Sprache schätzen. So gehen wir damit um:

- **Verarbeitete Daten:** Ihr authentifizierter `users/{uid}`-Kontext, die beschriebene Situation und der erzeugte Entwurf. Wir speichern die Snippets und Nutzungsdaten in Firestore, damit Sie frühere Nachrichten nachvollziehen können.
- **Nicht geteilte Daten:** Elternnamen, Schülerdetails und Entwürfe bleiben privat und sind nur über die gesicherte API zugänglich.
- **Sicherheitsverhalten:** Jeder Text wird gegen Appendix F-Formulierungen geprüft. Bei einem Verstoß liefert die API `outcome: "INVALID_REQUEST"` mit `errorCode: "TRUST_GRADE_VIOLATION"` und einer lokalisierten Erklärung, damit Sie gezielt umformulieren können.
- **Keine moralischen Urteile:** Wir erfinden keine Geschichten, vermeiden Schuldzuweisungen und lehnen absolute Versprechen ab.
- **Strukturierte Fehler:** Nutzungslimits und Trust-Grade-Errors nutzen klare Codes (`RATE_LIMITED`, `USAGE_LIMIT_EXCEEDED`, `INVALID_REQUEST`), damit Ihre Abläufe stabil reagieren.
- **Support & Sprachen:** Zaza Draft unterstützt Englisch und Deutsch gleichwertig; alle Sicherheitstests sind bilingual. Die Supportkontakte finden Sie in `docs/QA.md`, wir antworten mit derselben Ruhe.
