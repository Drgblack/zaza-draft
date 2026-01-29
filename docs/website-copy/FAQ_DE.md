# Website FAQ (DE)

**1. Was ist Zaza Draft?**  
Zaza Draft ist ein zweisprachiger Assistent für Lehrkräfte, der ruhige Antworten formuliert und Begrüßung, Ton und Signatur verlässlich anpasst.

**2. Wie sorgt das Tool für Ruhe?**  
Appendix F ist fester Teil des Flows: moralische Urteile und absolute Versprechen werden blockiert, damit die Antwort offen, respektvoll und lösungsorientiert bleibt.

**3. Welche Daten verarbeitet ihr?**  
Wir nutzen die eingegebene Situation, den generierten Text und Nutzungsdaten, die im privaten Firestore-Bereich (`users/{uid}`) gespeichert werden.

**4. Teilt ihr Daten mit Dritten?**  
Nein. Entwürfe und Metadaten bleiben hinter Ihrer Authentifizierung und werden nicht öffentlich oder für externe Trainings genutzt.

**5. Was passiert bei blockierten Formulierungen?**  
Die API gibt `outcome: "INVALID_REQUEST"` und `errorCode: "TRUST_GRADE_VIOLATION"` zurück. Gleichzeitig liefern wir Hinweise, wie Sie Ihre Nachricht umformulieren können.

**6. Liefert ihr Trust-Grade-Parität für Englisch und Deutsch?**  
Ja. Die gleiche Liste verbotener Ausdrücke und Tests laufen für beide Sprachen. Fehlercodes und Hinweise sind lokalisiert, teilen aber dieselbe Struktur.

**7. Wie funktioniert die Nutzungserfassung?**  
Die Nutzung wird pro Planmonat gezählt. Bei Überschreitung erhalten Sie `RATE_LIMITED` und `errorCode: "USAGE_LIMIT_EXCEEDED"` plus ein `usage`-Objekt mit Limit, verbleibenden Entwürfen und Planstatus.

**8. Wo finde ich Support?**  
Die Supportkontakte stehen in `docs/QA.md`. Meldungen schreiben wir in Firestore (`supportTickets/{ticketId}`) und das Team antwortet in ruhigem Ton.

**9. Welche Sprachen unterstützt ihr?**  
Aktuell Englisch und Deutsch. Begrüßungsauflösung, Signatur und alle Sicherheitstests sind für beide Sprachen validiert.

**10. Wie ist die Preisstruktur?**  
Die Preise sind in der Pilotphase. Es gibt einen Free-Plan und bald einen Pro-Plan mit höheren Limits sowie individueller Betreuung (siehe Preise-Dokument für Platzhalterinformationen).
