import type { DraftLanguage, DraftMode } from "@/lib/types"
import type { GenerationInputMode, MessageDirection } from "@/lib/generation/classification"

export type LaunchBenchmarkCategory =
  | "angry_parent_message"
  | "teacher_notes_to_parent"
  | "report_comment"
  | "panic_scan_ocr"
  | "high_risk_complaint"

export type LaunchBenchmarkTension = "calm" | "mild" | "high"
export type LaunchBenchmarkSource = "typed" | "ocr" | "voice"

export interface LaunchBenchmarkEvaluationExpectations {
  requireSubjectLine: boolean
  requireGreeting: boolean
  requireClosing: boolean
  requireSingleClosing: boolean
  requirePracticalNextStep: boolean
  minWords: number
  maxWords: number
  requiredPhrasesAny?: string[]
  forbiddenPhrases?: string[]
}

export interface LaunchBenchmarkCase {
  id: string
  title: string
  category: LaunchBenchmarkCategory
  locale: DraftLanguage
  tension: LaunchBenchmarkTension
  source: LaunchBenchmarkSource
  input: string
  expectedMode: GenerationInputMode
  draftMode: DraftMode
  intendedDirection: MessageDirection
  sourceConfidence?: number
  nonNegotiableQualityCriteria: string[]
  obviousFailurePatterns: string[]
  evaluation: LaunchBenchmarkEvaluationExpectations
  sampleGoodOutput: string
  sampleBadOutput: string
}

export const LAUNCH_READINESS_BENCHMARKS: LaunchBenchmarkCase[] = [
  {
    id: "en-angry-parent-summary",
    title: "EN angry parent summary from teacher notes",
    category: "angry_parent_message",
    locale: "en",
    tension: "high",
    source: "typed",
    input:
      "Parent says their child came home in tears after maths again, says I keep humiliating him in front of the class, and wants an explanation before tomorrow morning. Need calm reply, acknowledge concern, keep boundaries, say I'll check lesson notes and speak tomorrow.",
    expectedMode: "safe_draft",
    draftMode: "parent_message",
    intendedDirection: "teacher_internal_notes",
    nonNegotiableQualityCriteria: [
      "Teacher remains the sender throughout.",
      "Reply names the concern without sounding defensive.",
      "Includes one concrete next step.",
      "Tone stays calm and professional under pressure.",
    ],
    obviousFailurePatterns: [
      "Replies as though the parent wrote the draft.",
      "Uses customer-support phrases such as 'thank you for sharing your concerns'.",
      "Gets argumentative or dismissive.",
    ],
    evaluation: {
      requireSubjectLine: true,
      requireGreeting: true,
      requireClosing: true,
      requireSingleClosing: true,
      requirePracticalNextStep: true,
      minWords: 45,
      maxWords: 210,
      requiredPhrasesAny: ["I will", "I have", "we can"],
      forbiddenPhrases: [
        "thank you for sharing your concerns",
        "my child came home in tears",
        "I am very upset",
      ],
    },
    sampleGoodOutput: [
      "Subject: Follow-up on today's maths lesson",
      "",
      "Dear Jordan,",
      "",
      "I am sorry to hear that Theo came home so upset after maths today. I will check the lesson notes this afternoon and speak with him again tomorrow so I can respond to you clearly.",
      "",
      "If it is helpful, we can arrange a short call after school tomorrow once I have reviewed what happened in class.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n"),
    sampleBadOutput: [
      "Subject: Re: Today's concern",
      "",
      "Dear Jordan,",
      "",
      "Thank you for sharing your concerns. I understand how important this is and it might be helpful to discuss how upset your child feels.",
      "",
      "Please feel free to reach out.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
      "",
      "Best regards,",
      "Dr Greg Blackburn",
    ].join("\n"),
  },
  {
    id: "de-angry-parent-summary",
    title: "DE accusatory parent summary from teacher notes",
    category: "angry_parent_message",
    locale: "de",
    tension: "high",
    source: "typed",
    input:
      "Eltern werfen mir vor, dass ich ihre Tochter im Unterricht unfair behandelt habe und verlangen bis morgen eine Stellungnahme. Bitte ruhig, klar und nicht defensiv antworten. Ich prüfe die Situation und melde mich nach Rücksprache.",
    expectedMode: "safe_draft",
    draftMode: "parent_message",
    intendedDirection: "teacher_internal_notes",
    nonNegotiableQualityCriteria: [
      "Ruhiger Lehrerton trotz Vorwurf.",
      "Konkreter nächster Schritt ohne Schuldzuweisung.",
      "Keine übertriebene Beschwichtigung.",
    ],
    obviousFailurePatterns: [
      "Formuliert wie eine Antwort aus Sicht der Eltern.",
      "Klingt nach Kundendienst oder Beschwerdehotline.",
      "Wird abwehrend oder belehrend.",
    ],
    evaluation: {
      requireSubjectLine: true,
      requireGreeting: true,
      requireClosing: true,
      requireSingleClosing: true,
      requirePracticalNextStep: true,
      minWords: 45,
      maxWords: 220,
      requiredPhrasesAny: ["Ich werde", "Ich prüfe", "wir können"],
      forbiddenPhrases: [
        "vielen dank, dass sie ihre sorge geteilt haben",
        "meine tochter",
        "ich bin sehr verärgert",
      ],
    },
    sampleGoodOutput: [
      "Betreff: Rückmeldung zur Situation im Unterricht",
      "",
      "Guten Tag, Frau Schneider,",
      "",
      "Ich habe Ihre Rückmeldung zur heutigen Situation gelesen und prüfe den Ablauf noch einmal sorgfältig. Nach einer kurzen Rücksprache im Team melde ich mich morgen mit einer klaren Rückmeldung bei Ihnen.",
      "",
      "Wenn ein kurzes Gespräch danach hilfreich ist, können wir uns morgen Nachmittag dazu abstimmen.",
      "",
      "Mit freundlichen Grüßen,",
      "Dr Greg Blackburn",
    ].join("\n"),
    sampleBadOutput: [
      "Betreff: Ihre Sorge",
      "",
      "Guten Tag, Frau Schneider,",
      "",
      "Vielen Dank, dass Sie Ihre Sorge geteilt haben. Ich verstehe, wie wichtig das ist, und es könnte hilfreich sein, wenn wir gemeinsam für mehr Ruhe sorgen.",
      "",
      "Melden Sie sich gern.",
      "",
      "Mit freundlichen Grüßen,",
      "Dr Greg Blackburn",
      "",
      "Herzliche Grüße,",
      "Dr Greg Blackburn",
    ].join("\n"),
  },
  {
    id: "en-teacher-rough-notes",
    title: "EN teacher rough notes to polished parent update",
    category: "teacher_notes_to_parent",
    locale: "en",
    tension: "mild",
    source: "typed",
    input:
      "Need to email Ella's family. She has settled better this week, but written work still slows right down after lunch. Want to say we've moved her closer, broken tasks up, and will keep an eye on stamina next week. Keep it warm but practical.",
    expectedMode: "safe_draft",
    draftMode: "parent_message",
    intendedDirection: "teacher_internal_notes",
    nonNegotiableQualityCriteria: [
      "Feels like a real teacher update, not a reply to a complaint.",
      "Mentions the actual classroom issue.",
      "Stays concise and sendable.",
    ],
    obviousFailurePatterns: [
      "Starts by thanking the parent for writing.",
      "Turns into vague encouragement without the concrete update.",
    ],
    evaluation: {
      requireSubjectLine: true,
      requireGreeting: true,
      requireClosing: true,
      requireSingleClosing: true,
      requirePracticalNextStep: true,
      minWords: 40,
      maxWords: 180,
      requiredPhrasesAny: ["I have", "I will", "next week"],
      forbiddenPhrases: ["thank you for sharing your concerns", "your message", "I understand how important this is"],
    },
    sampleGoodOutput: [
      "Subject: Update on Ella's written work",
      "",
      "Dear family,",
      "",
      "I wanted to give you a short update on Ella's week. She has settled much better in lessons, although her written work still slows down after lunch.",
      "",
      "I have moved her closer to me and started breaking the longer tasks into smaller steps. I will keep an eye on her stamina again next week and let you know how that helps.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n"),
    sampleBadOutput: [
      "Subject: Ella",
      "",
      "Dear family,",
      "",
      "Thank you for sharing your concerns. I understand how important this is and want to respond carefully.",
      "",
      "It might be helpful to discuss support for Ella at some point.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n"),
  },
  {
    id: "de-voice-rough-notes",
    title: "DE Voice-to-Calm spoken teacher dump",
    category: "teacher_notes_to_parent",
    locale: "de",
    tension: "mild",
    source: "voice",
    input:
      "Okay, need this calmer. Jonas was all over the place after lunch again, but he did actually get through the reading once I sat him near me. Need to tell home that the change helped, I’ll keep that seat next week, and I don’t want this to sound dramatic.",
    expectedMode: "voice_to_calm",
    draftMode: "parent_message",
    intendedDirection: "teacher_internal_notes",
    nonNegotiableQualityCriteria: [
      "Gesprochene Rohfassung wird in ruhige Lehrersprache überführt.",
      "Konkrete Beobachtung und Maßnahme bleiben erhalten.",
      "Kein Antwortstil auf eine Elternnachricht.",
    ],
    obviousFailurePatterns: [
      "Klingt wie eine Antwort auf eine Beschwerde.",
      "Behält gesprochene Füllwörter oder Hektik bei.",
    ],
    evaluation: {
      requireSubjectLine: true,
      requireGreeting: true,
      requireClosing: true,
      requireSingleClosing: true,
      requirePracticalNextStep: true,
      minWords: 40,
      maxWords: 180,
      requiredPhrasesAny: ["Ich habe", "Ich werde", "nächste Woche"],
      forbiddenPhrases: ["vielen dank für ihre nachricht", "okay", "all over the place"],
    },
    sampleGoodOutput: [
      "Betreff: Kurze Rückmeldung zu Jonas",
      "",
      "Guten Tag,",
      "",
      "Ich möchte Ihnen eine kurze Rückmeldung zum heutigen Unterricht geben. Nach der Mittagspause fiel es Jonas zunächst schwer, wieder in die Aufgabe zu finden, konnte den Lesetext mit der veränderten Sitzordnung dann aber gut bearbeiten.",
      "",
      "Ich habe ihn näher zu mir gesetzt, und diese Unterstützung hat heute geholfen. Ich werde diese Platzierung auch in der nächsten Woche beibehalten und weiter beobachten, wie stabil er damit arbeitet.",
      "",
      "Mit freundlichen Grüßen,",
      "Dr Greg Blackburn",
    ].join("\n"),
    sampleBadOutput: [
      "Betreff: Jonas",
      "",
      "Guten Tag,",
      "",
      "Vielen Dank für Ihre Nachricht. Ich möchte behutsam antworten und gemeinsam für mehr Ruhe und Klarheit sorgen.",
      "",
      "Es könnte hilfreich sein, darüber zu sprechen.",
      "",
      "Mit freundlichen Grüßen,",
      "Dr Greg Blackburn",
    ].join("\n"),
  },
  {
    id: "en-report-comment-fast",
    title: "EN report comment under time pressure",
    category: "report_comment",
    locale: "en",
    tension: "calm",
    source: "typed",
    input:
      "Need a quick report comment now: Luca has become more consistent in class discussion, checks his work more carefully, and is beginning to sustain attention for longer independent tasks.",
    expectedMode: "safe_draft",
    draftMode: "report_comment",
    intendedDirection: "report_comment",
    nonNegotiableQualityCriteria: [
      "Short, observational, school-appropriate.",
      "No greeting, sign-off, or parent-facing invitation.",
      "Evidence and progress only.",
    ],
    obviousFailurePatterns: [
      "Turns into an email.",
      "Adds customer-support warmth or contact invitation.",
    ],
    evaluation: {
      requireSubjectLine: false,
      requireGreeting: false,
      requireClosing: false,
      requireSingleClosing: false,
      requirePracticalNextStep: false,
      minWords: 20,
      maxWords: 85,
      requiredPhrasesAny: ["discussion", "attention", "work"],
      forbiddenPhrases: ["dear", "kind regards", "please feel free to reach out"],
    },
    sampleGoodOutput:
      "Luca contributes more consistently during class discussion and now checks his work with greater care. He is beginning to sustain attention for longer independent tasks and is showing steadier progress across lessons.",
    sampleBadOutput:
      "Dear family, Luca is on an important journey. Please feel free to reach out if you would like to discuss his progress further. Kind regards, Dr Greg Blackburn",
  },
  {
    id: "de-report-comment-fast",
    title: "DE report comment under time pressure",
    category: "report_comment",
    locale: "de",
    tension: "calm",
    source: "typed",
    input:
      "Schneller Berichtskommentar: Nora arbeitet ausdauernder, beteiligt sich sachlich an Gesprächen und zeigt bei längeren Schreibaufgaben mehr Sicherheit als zu Beginn des Halbjahres.",
    expectedMode: "safe_draft",
    draftMode: "report_comment",
    intendedDirection: "report_comment",
    nonNegotiableQualityCriteria: [
      "Knapp, beobachtend, schulisch angemessen.",
      "Keine Anrede und kein Gruß.",
    ],
    obviousFailurePatterns: [
      "Wirkt wie eine Elternmail.",
      "Zu weich oder zu allgemein.",
    ],
    evaluation: {
      requireSubjectLine: false,
      requireGreeting: false,
      requireClosing: false,
      requireSingleClosing: false,
      requirePracticalNextStep: false,
      minWords: 20,
      maxWords: 85,
      requiredPhrasesAny: ["arbeitet", "beteiligt", "Sicherheit"],
      forbiddenPhrases: ["liebe eltern", "mit freundlichen grüßen", "melden sie sich gern"],
    },
    sampleGoodOutput:
      "Nora arbeitet zunehmend ausdauernd und beteiligt sich sachlich an Unterrichtsgesprächen. Bei längeren Schreibaufgaben zeigt sie mehr Sicherheit als zu Beginn des Halbjahres.",
    sampleBadOutput:
      "Liebe Eltern, Nora macht tolle Fortschritte auf ihrem Weg. Melden Sie sich gern, wenn Sie sich austauschen möchten. Mit freundlichen Grüßen, Dr Greg Blackburn",
  },
  {
    id: "en-panic-scan-angry-ocr",
    title: "EN Panic Scan angry parent screenshot",
    category: "panic_scan_ocr",
    locale: "en",
    tension: "high",
    source: "ocr",
    input:
      "Hello Ms Smith, my child came home in tears again after your lesson. I am furious that this keeps happening and I want a proper explanation today. Jordan Lee",
    expectedMode: "panic_scan",
    draftMode: "parent_message",
    intendedDirection: "parent_to_teacher",
    sourceConfidence: 0.87,
    nonNegotiableQualityCriteria: [
      "Treated as an incoming parent message.",
      "Response is calm, bounded, and de-escalating.",
      "Does not rewrite the OCR text as teacher-authored.",
    ],
    obviousFailurePatterns: [
      "Outputs the parent complaint in polished form instead of a reply.",
      "Replies defensively or mirrors anger.",
    ],
    evaluation: {
      requireSubjectLine: true,
      requireGreeting: true,
      requireClosing: true,
      requireSingleClosing: true,
      requirePracticalNextStep: true,
      minWords: 45,
      maxWords: 210,
      requiredPhrasesAny: ["I will", "I have", "we can"],
      forbiddenPhrases: [
        "my child came home in tears again",
        "I am furious",
        "thank you for sharing your concerns",
      ],
    },
    sampleGoodOutput: [
      "Subject: Follow-up on your message",
      "",
      "Dear Jordan,",
      "",
      "I am sorry to hear how upsetting this has felt for your child. I will review what happened in today's lesson and speak with the students involved so I can respond to you clearly.",
      "",
      "Once I have checked that, I can send you a fuller update later today or arrange a short call if that is helpful.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n"),
    sampleBadOutput: [
      "Subject: Lesson concern",
      "",
      "Dear Jordan,",
      "",
      "My child came home in tears again after your lesson and I am furious that this keeps happening.",
      "",
      "Please feel free to reach out.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n"),
  },
  {
    id: "de-panic-scan-low-confidence",
    title: "DE Panic Scan low-confidence worried parent screenshot",
    category: "panic_scan_ocr",
    locale: "de",
    tension: "mild",
    source: "ocr",
    input:
      "Gtn Tag Fr. Mllr mein kind sehr nervös wg HA ... versteh nicht alles ... bitte Rückruf wenn mglich",
    expectedMode: "panic_scan",
    draftMode: "parent_message",
    intendedDirection: "parent_to_teacher",
    sourceConfidence: 0.34,
    nonNegotiableQualityCriteria: [
      "Bleibt bei der sicheren Kernbedeutung.",
      "Antwortet vorsichtig und nicht überinterpretierend.",
      "Lehrkraft bleibt klar die antwortende Person.",
    ],
    obviousFailurePatterns: [
      "Erfindet konkrete Details aus unsicherem OCR.",
      "Behandelt den Text als ausgehende Lehrkraftnachricht.",
    ],
    evaluation: {
      requireSubjectLine: true,
      requireGreeting: true,
      requireClosing: true,
      requireSingleClosing: true,
      requirePracticalNextStep: true,
      minWords: 35,
      maxWords: 180,
      requiredPhrasesAny: ["Ich habe", "Ich schaue", "wir können"],
      forbiddenPhrases: [
        "vielen dank, dass sie ihre sorge geteilt haben",
        "die naturwissenschaftsaufgabe am donnerstag",
        "mein kind sehr nervös",
      ],
    },
    sampleGoodOutput: [
      "Betreff: Kurze Rückmeldung zu den Hausaufgaben",
      "",
      "Guten Tag,",
      "",
      "Ich habe Ihre Nachricht zu den Hausaufgaben gelesen. Ich schaue mir den aktuellen Umfang noch einmal an und melde mich mit einer klaren Rückmeldung, damit die nächsten Schritte für Ihr Kind überschaubar bleiben.",
      "",
      "Wenn ein kurzes Gespräch hilfreich ist, können wir uns dazu in dieser Woche kurz abstimmen.",
      "",
      "Mit freundlichen Grüßen,",
      "Dr Greg Blackburn",
    ].join("\n"),
    sampleBadOutput: [
      "Betreff: Naturwissenschaften am Donnerstag",
      "",
      "Guten Tag,",
      "",
      "Vielen Dank, dass Sie Ihre Sorge geteilt haben. Die Naturwissenschaftsaufgabe am Donnerstag hat Ihr Kind offenbar stark belastet und ich verstehe genau, wie schwierig das war.",
      "",
      "Mit freundlichen Grüßen,",
      "Dr Greg Blackburn",
    ].join("\n"),
  },
  {
    id: "en-high-risk-complaint",
    title: "EN high-risk safety-adjacent complaint",
    category: "high_risk_complaint",
    locale: "en",
    tension: "high",
    source: "typed",
    input:
      "Parent says their daughter feels unsafe because another pupil keeps targeting her and says the school has ignored earlier complaints. Need a serious but calm reply. Acknowledge concern, say I am escalating through safeguarding channels today, avoid sounding casual or dismissive.",
    expectedMode: "safe_draft",
    draftMode: "parent_message",
    intendedDirection: "teacher_internal_notes",
    nonNegotiableQualityCriteria: [
      "Treats the issue with appropriate seriousness.",
      "Does not over-soften or minimise safety concerns.",
      "Includes a clear safeguarding/escalation next step.",
    ],
    obviousFailurePatterns: [
      "Minimises the issue as a misunderstanding.",
      "Uses breezy reassurance without action.",
    ],
    evaluation: {
      requireSubjectLine: true,
      requireGreeting: true,
      requireClosing: true,
      requireSingleClosing: true,
      requirePracticalNextStep: true,
      minWords: 50,
      maxWords: 220,
      requiredPhrasesAny: ["safeguarding", "senior team", "I will raise", "I have passed this on"],
      forbiddenPhrases: [
        "it was probably just a misunderstanding",
        "nothing to worry about",
        "thank you for sharing your concerns",
      ],
    },
    sampleGoodOutput: [
      "Subject: Follow-up on your safeguarding concern",
      "",
      "Dear family,",
      "",
      "I am sorry to hear that your daughter has felt unsafe. I am treating this seriously and will raise the concern through our safeguarding process today so that it is reviewed promptly by the appropriate staff.",
      "",
      "Once that has been logged, I will make sure you receive a clear update on the next steps and who is following this up.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n"),
    sampleBadOutput: [
      "Subject: Quick reply",
      "",
      "Dear family,",
      "",
      "Thank you for sharing your concerns. I am sure this was probably just a misunderstanding and I understand how important this is.",
      "",
      "Please feel free to reach out.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n"),
  },
  {
    id: "de-high-risk-panic-scan",
    title: "DE high-risk Panic Scan complaint",
    category: "high_risk_complaint",
    locale: "de",
    tension: "high",
    source: "ocr",
    input:
      "Mein Sohn sagt, dass er sich in der Schule nicht sicher fühlt und dass frühere Hinweise nicht ernst genommen wurden. Ich erwarte heute eine klare Rückmeldung.",
    expectedMode: "panic_scan",
    draftMode: "parent_message",
    intendedDirection: "parent_to_teacher",
    sourceConfidence: 0.82,
    nonNegotiableQualityCriteria: [
      "Wird als eingehende Elternnachricht behandelt.",
      "Klar ernst, ruhig und professionell.",
      "Nennt einen schulischen Eskalations- oder Schutzschritt.",
    ],
    obviousFailurePatterns: [
      "Formuliert die Elternaussage nur um statt zu antworten.",
      "Verharmlost die Sicherheitslage.",
    ],
    evaluation: {
      requireSubjectLine: true,
      requireGreeting: true,
      requireClosing: true,
      requireSingleClosing: true,
      requirePracticalNextStep: true,
      minWords: 45,
      maxWords: 220,
      requiredPhrasesAny: ["ich werde", "safeguarding", "Schulleitung", "ich gebe das heute weiter"],
      forbiddenPhrases: [
        "das war sicher nur ein missverständnis",
        "melden sie sich gern",
        "mein sohn sagt",
      ],
    },
    sampleGoodOutput: [
      "Betreff: Rückmeldung zu Ihrer Sorge um die Sicherheit Ihres Sohnes",
      "",
      "Guten Tag,",
      "",
      "Ich habe Ihre Nachricht gelesen und nehme diese Sorge sehr ernst. Ich gebe den Hinweis heute an die zuständigen Kolleginnen und Kollegen weiter, damit der Sachverhalt umgehend geprüft und über die nächsten Schutzschritte entschieden wird.",
      "",
      "Sobald diese Rücksprache erfolgt ist, erhalten Sie eine klare Rückmeldung zum weiteren Vorgehen.",
      "",
      "Mit freundlichen Grüßen,",
      "Dr Greg Blackburn",
    ].join("\n"),
    sampleBadOutput: [
      "Betreff: Ihre Sorge",
      "",
      "Guten Tag,",
      "",
      "Das war sicher nur ein Missverständnis. Vielen Dank, dass Sie Ihre Sorge geteilt haben.",
      "",
      "Melden Sie sich gern.",
      "",
      "Mit freundlichen Grüßen,",
      "Dr Greg Blackburn",
    ].join("\n"),
  },
]
