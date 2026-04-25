// @vitest-environment happy-dom

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MainEditor } from "@/components/main-editor"

type Locale = "en-GB" | "de-DE"
let mockLocale: Locale = "en-GB"
let mockOnboardingCompleted = true
let mockOnboardingSkipped = false
let mockWelcomeEmailSent = true
let mockFirstLogin = false
let lastOnboardingPostBody: Record<string, unknown> | null = null
let failOnboardingSave = false
const logClientEventMock = vi.fn()
const logClientEventOnceMock = vi.fn()

/**
 * Mock useLocale so MainEditor can render without LanguageProvider.
 */
vi.mock("@/hooks/use-locale", () => {
  const enStrings = {
    "editor.outOfScope.title": "Not generated",
    "editor.outOfScope.body": "This doesn't look like a school report or parent message.",
    "editor.outOfScope.helper": "Adjust the text or add context and try again.",
    "onboarding.eyebrow": "First steps",
    "onboarding.title": "Welcome to Zaza Draft",
    "onboarding.description":
      "Start with Safe Draft for parent-ready messages, use Panic Scan when a screenshot needs a calm reply, and shape polished report comments from your classroom notes.",
    "onboarding.dismiss": "Continue to Draft",
    "onboarding.demo.badge": "Demo sample",
    "onboarding.demo.title": "A sample parent email is ready below",
    "onboarding.demo.description":
      "We loaded a realistic difficult parent email so you can see what a calmer, safer rewrite looks like before using your own message.",
    "onboarding.demo.action": "Try safer rewrite",
    "onboarding.demo.clear": "Use blank editor",
    "onboarding.capture.optional": "Optional quick setup",
    "onboarding.capture.progress": "Step 1 of 5",
    "onboarding.capture.answered": "0 of 6 questions answered",
    "onboarding.capture.helper": "You can leave any question blank and keep moving.",
    "onboarding.capture.skip": "Skip for now",
    "onboarding.capture.back": "Back",
    "onboarding.capture.next": "Next",
    "onboarding.capture.finish": "Finish setup",
    "onboarding.capture.saving": "Saving setup...",
    "onboarding.capture.step.context.title": "A little context",
    "onboarding.capture.step.context.description":
      "Optional details so Draft can feel more relevant from the start.",
    "onboarding.capture.step.useCase.title": "What will you use Draft for most?",
    "onboarding.capture.step.useCase.description":
      "This helps us bias examples and defaults without changing your control.",
    "onboarding.capture.step.stress.title": "What feels hardest when writing?",
    "onboarding.capture.step.stress.description":
      "Choose the pressure point that would save you the most energy.",
    "onboarding.capture.step.tone.title": "What tone usually fits best?",
    "onboarding.capture.step.tone.description":
      "We can use this as a gentle default later. You can still change tone anytime.",
    "onboarding.capture.step.region.title": "Which education context best fits your school?",
    "onboarding.capture.step.region.description":
      "This helps us tailor examples and wording more appropriately for your setting later.",
    "onboarding.capture.field.role": "Your role",
    "onboarding.capture.field.schoolType": "School type",
    "onboarding.capture.option.role.teacher": "Teacher",
    "onboarding.capture.option.role.school_leader": "School leader",
    "onboarding.capture.option.role.senc_support": "SEN / support staff",
    "onboarding.capture.option.role.admin_staff": "Admin or pastoral staff",
    "onboarding.capture.option.role.other": "Other",
    "onboarding.capture.option.schoolType.primary": "Primary school",
    "onboarding.capture.option.schoolType.secondary": "Secondary school",
    "onboarding.capture.option.schoolType.all_through": "All-through school",
    "onboarding.capture.option.schoolType.international_private": "International or private school",
    "onboarding.capture.option.schoolType.other": "Other",
    "onboarding.capture.option.mainUseCase.parent_messages": "Parent messages",
    "onboarding.capture.option.mainUseCase.reports": "Reports and comments",
    "onboarding.capture.option.mainUseCase.both": "Both equally",
    "onboarding.capture.option.writingStressPoint.deescalation": "Keeping difficult messages calm",
    "onboarding.capture.option.writingStressPoint.clarity": "Making the wording clearer",
    "onboarding.capture.option.writingStressPoint.tone": "Finding the right tone",
    "onboarding.capture.option.writingStressPoint.speed": "Getting to a strong draft quickly",
    "onboarding.capture.option.writingStressPoint.difficult_conversations": "Handling sensitive parent conversations",
    "onboarding.capture.option.tonePreference.warm": "Warm",
    "onboarding.capture.option.tonePreference.professional": "Professional",
    "onboarding.capture.option.tonePreference.direct": "Direct",
    "onboarding.capture.option.tonePreference.empathetic": "Empathetic",
    "onboarding.capture.option.region.germany_austria_switzerland":
      "Germany / Austria / Switzerland",
    "onboarding.capture.option.region.uk_ireland": "UK or Ireland",
    "onboarding.capture.option.region.usa_canada": "USA / Canada",
    "onboarding.capture.option.region.australia_new_zealand":
      "Australia / New Zealand",
    "onboarding.capture.option.region.international_school": "International school",
    "onboarding.capture.option.region.other_europe": "Other Europe",
    "onboarding.capture.option.region.latin_america": "Latin America",
    "onboarding.capture.option.region.middle_east_africa": "Middle East / Africa",
    "onboarding.capture.option.region.asia_pacific": "Asia-Pacific",
    "onboarding.capture.option.region.other_prefer_not_to_say":
      "Other / Prefer not to say",
    "onboarding.feature.safeDraft":
      "Turn a rough parent message into a clear, professional draft you can send with confidence.",
    "onboarding.feature.panicScan":
      "Review a screenshot or urgent message before replying and keep the response steady.",
    "onboarding.feature.reportComment":
      "Convert observations into concise, report-ready comments without losing your meaning.",
    homeSafeDraftTitle: "Safe Draft",
    panicScanTitle: "Panic Scan",
    "button.generate.parentMessage": "Write calm reply",
    "button.generate.teacherDraft": "Improve my draft",
    "button.generate.reportComment": "Generate comment",
    "editor.mode.reportComment": "Report comment",
    "editor.mode.reportCommentShortcut": "Report comment instead",
    "editor.mode.returnToParentMessage": "Back to parent reply",
    "editor.firstValue.badge": "Demo sample",
    "editor.firstValue.title": "This first-run example is sample content",
    "editor.firstValue.description":
      "Replace it with your own message at any time. The goal is to show what a calmer rewrite can look like straight away.",
    "editor.firstValue.clear": "Use my own text",
    "editor.saferSummary.eyebrow": "Why this is safer",
    "editor.saferSummary.title": "The message keeps the concern, but lowers the heat.",
    "editor.saferSummary.description":
      "Draft keeps the teacher's intent intact while making the wording easier to send.",
    "editor.saferSummary.category.softened_escalation": "Softened escalation",
    "editor.saferSummary.category.reduced_blame": "Reduced blame",
    "editor.saferSummary.category.clearer_next_step": "Clearer next step",
    "editor.saferSummary.category.professional_tone": "More professional tone",
  }
  const deStrings = {
    "editor.outOfScope.title": "Nicht generiert",
    "editor.outOfScope.body":
      "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus. Zaza Draft hilft Ihnen bei professioneller schulischer Kommunikation.",
    "editor.outOfScope.helper": "Passen Sie den Text an oder f├╝gen Sie Kontext hinzu und versuchen Sie es erneut.",
    "onboarding.eyebrow": "Erste Schritte",
    "onboarding.title": "Willkommen bei Zaza Draft",
    "onboarding.description":
      "Nutzen Sie Safe Draft für elterngerechte Nachrichten, Panic Scan für ruhige Antworten auf Screenshots und Berichtskommentare für klare Formulierungen aus Ihren Unterrichtsnotizen.",
    "onboarding.dismiss": "Weiter zu Draft",
    "onboarding.demo.badge": "Demo-Beispiel",
    "onboarding.demo.title": "Unten ist bereits eine Beispielnachricht geladen",
    "onboarding.demo.description":
      "Wir haben eine realistische schwierige Elternnachricht vorbereitet, damit Sie sofort sehen können, wie eine ruhigere, sicherere Antwort wirken kann.",
    "onboarding.demo.action": "Sicherere Fassung testen",
    "onboarding.demo.clear": "Leeren Editor verwenden",
    "onboarding.capture.optional": "Optionale Kurzeinrichtung",
    "onboarding.capture.progress": "Schritt 1 von 5",
    "onboarding.capture.answered": "0 von 6 Fragen beantwortet",
    "onboarding.capture.helper": "Sie können jede Frage offen lassen und einfach weitergehen.",
    "onboarding.capture.skip": "Jetzt überspringen",
    "onboarding.capture.back": "Zurück",
    "onboarding.capture.next": "Weiter",
    "onboarding.capture.finish": "Einrichtung abschließen",
    "onboarding.capture.saving": "Einrichtung wird gespeichert...",
    "onboarding.capture.step.context.title": "Ein wenig Kontext",
    "onboarding.capture.step.context.description":
      "Optionale Angaben, damit Draft von Anfang an passender wirkt.",
    "onboarding.capture.step.useCase.title": "Wofür werden Sie Draft am häufigsten nutzen?",
    "onboarding.capture.step.useCase.description":
      "So können wir Beispiele und Standardwerte später sinnvoll ausrichten, ohne Ihre Kontrolle einzuschränken.",
    "onboarding.capture.step.stress.title": "Was ist beim Schreiben am anstrengendsten?",
    "onboarding.capture.step.stress.description":
      "Wählen Sie den Punkt, der Ihnen im Alltag am meisten Entlastung bringen würde.",
    "onboarding.capture.step.tone.title": "Welcher Ton passt meist am besten?",
    "onboarding.capture.step.tone.description":
      "Das können wir später als sanfte Voreinstellung nutzen. Sie können den Ton jederzeit ändern.",
    "onboarding.capture.step.region.title":
      "Welcher Bildungskontext passt am besten zu Ihrer Schule?",
    "onboarding.capture.step.region.description":
      "So können wir Beispiele und Formulierungen später passender auf Ihr Umfeld abstimmen.",
    "onboarding.capture.field.role": "Ihre Rolle",
    "onboarding.capture.field.schoolType": "Schulart",
    "onboarding.capture.option.role.teacher": "Lehrkraft",
    "onboarding.capture.option.role.school_leader": "Schulleitung",
    "onboarding.capture.option.role.senc_support": "Förder- oder Unterstützungsteam",
    "onboarding.capture.option.role.admin_staff": "Verwaltung oder pastoral zuständig",
    "onboarding.capture.option.role.other": "Andere",
    "onboarding.capture.option.schoolType.primary": "Grundschule / Primarstufe",
    "onboarding.capture.option.schoolType.secondary": "Sekundarstufe",
    "onboarding.capture.option.schoolType.all_through": "Durchgängige Schule",
    "onboarding.capture.option.schoolType.international_private": "Internationale oder private Schule",
    "onboarding.capture.option.schoolType.other": "Andere",
    "onboarding.capture.option.mainUseCase.parent_messages": "Elternnachrichten",
    "onboarding.capture.option.mainUseCase.reports": "Berichte und Kommentare",
    "onboarding.capture.option.mainUseCase.both": "Beides gleich häufig",
    "onboarding.capture.option.writingStressPoint.deescalation": "Schwierige Nachrichten ruhig halten",
    "onboarding.capture.option.writingStressPoint.clarity": "Formulierungen klarer machen",
    "onboarding.capture.option.writingStressPoint.tone": "Den richtigen Ton treffen",
    "onboarding.capture.option.writingStressPoint.speed": "Schnell zu einer guten Fassung kommen",
    "onboarding.capture.option.writingStressPoint.difficult_conversations": "Sensible Elterngespräche bewältigen",
    "onboarding.capture.option.tonePreference.warm": "Warm",
    "onboarding.capture.option.tonePreference.professional": "Professionell",
    "onboarding.capture.option.tonePreference.direct": "Direkt",
    "onboarding.capture.option.tonePreference.empathetic": "Einfühlsam",
    "onboarding.capture.option.region.germany_austria_switzerland":
      "Deutschland / Österreich / Schweiz",
    "onboarding.capture.option.region.uk_ireland": "Großbritannien oder Irland",
    "onboarding.capture.option.region.usa_canada": "USA / Kanada",
    "onboarding.capture.option.region.australia_new_zealand":
      "Australien / Neuseeland",
    "onboarding.capture.option.region.international_school": "Internationale Schule",
    "onboarding.capture.option.region.other_europe": "Übriges Europa",
    "onboarding.capture.option.region.latin_america": "Lateinamerika",
    "onboarding.capture.option.region.middle_east_africa": "Naher Osten / Afrika",
    "onboarding.capture.option.region.asia_pacific": "Asien-Pazifik",
    "onboarding.capture.option.region.other_prefer_not_to_say":
      "Andere / Möchte ich nicht angeben",
    "onboarding.feature.safeDraft":
      "Formen Sie aus einer Rohfassung eine klare, professionelle Nachricht für Eltern.",
    "onboarding.feature.panicScan":
      "Prüfen Sie Screenshots oder dringende Nachrichten vor dem Antworten und halten Sie den Ton ruhig.",
    "onboarding.feature.reportComment":
      "Verdichten Sie Beobachtungen zu präzisen Berichtskommentaren, ohne Ihre Aussage zu verlieren.",
    homeSafeDraftTitle: "Sicherer Entwurf",
    panicScanTitle: "Panic Scan",
    "button.generate.parentMessage": "Ruhige Antwort schreiben",
    "button.generate.teacherDraft": "Meinen Entwurf verbessern",
    "button.generate.reportComment": "Kommentar erstellen",
    "editor.mode.reportComment": "Berichtskommentar",
    "editor.mode.reportCommentShortcut": "Stattdessen Berichtskommentar",
    "editor.mode.returnToParentMessage": "Zurück zur Elternantwort",
    "editor.firstValue.badge": "Demo-Beispiel",
    "editor.firstValue.title": "Dieses Erstbeispiel ist Demo-Inhalt",
    "editor.firstValue.description":
      "Sie können es jederzeit durch Ihren eigenen Text ersetzen. Es soll nur sofort zeigen, wie eine ruhigere Fassung aussehen kann.",
    "editor.firstValue.clear": "Eigenen Text verwenden",
    "editor.saferSummary.eyebrow": "Warum das sicherer ist",
    "editor.saferSummary.title": "Die Aussage bleibt erhalten, aber die Formulierung nimmt Spannung heraus.",
    "editor.saferSummary.description":
      "Draft bewahrt die pädagogische Absicht, macht die Nachricht aber leichter versendbar.",
    "editor.saferSummary.category.softened_escalation": "Eskalation entschärft",
    "editor.saferSummary.category.reduced_blame": "Weniger Vorwurf",
    "editor.saferSummary.category.clearer_next_step": "Klarerer nächster Schritt",
    "editor.saferSummary.category.professional_tone": "Professionellerer Ton",
  }
  const t = (key: string) => {
    const localeStrings = mockLocale === "de-DE" ? deStrings : enStrings
    return localeStrings[key] ?? key
  }
  return {
    useLocale: () => ({
      locale: mockLocale,
      t,
      setLocale: vi.fn(),
      isGerman: mockLocale === "de-DE",
    }),
  }
})

/**
 * Mock useAuth so MainEditor can render without AuthProvider.
 * IMPORTANT: MainEditor calls both getIdToken() and signOut(), so the mock must expose them.
 */
vi.mock("@/hooks/use-auth", () => {
  const getIdToken = vi.fn(async () => "test-token")
  const signOut = vi.fn(async () => {})
  const user = {
    uid: "test-uid",
    email: "test@example.com",
    displayName: "Test User",
  }

  return {
    useAuth: () => ({
      user,
      getIdToken,
      signOut,
      isLoading: false,
      loading: false,
      isAuthenticated: true,
      isAuthed: true,
      isPro: false,
      isQa: false,
      signIn: vi.fn(),
      logout: vi.fn(),
    }),
  }
})

const createMockSearchParams = () => {
  const params = new URLSearchParams()
  return {
    get: (key: string) => params.get(key),
    getAll: (key: string) => params.getAll(key),
    has: (key: string) => params.has(key),
    entries: () => params.entries(),
    keys: () => params.keys(),
    values: () => params.values(),
    toString: () => params.toString(),
    [Symbol.iterator]: () => params.entries(),
  }
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(() => Promise.resolve()),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => createMockSearchParams(),
  useParams: () => ({}),
}))

vi.mock("@/lib/analytics", () => ({
  TRUST_FUNNEL_EVENTS: {
    onboardingBannerShown: "onboarding_banner_shown",
    onboardingCompleted: "onboarding_completed",
    onboardingDismissed: "onboarding_dismissed",
    firstDraftStarted: "first_draft_started",
    firstDraftGenerated: "first_draft_generated",
    paywallShown: "paywall_shown",
  },
  logClientEvent: (...args: unknown[]) => logClientEventMock(...args),
  logClientEventOnce: (...args: unknown[]) => logClientEventOnceMock(...args),
  logDraftInteractionEvent: vi.fn(),
}))

/**
 * Fetch mock that works in node/happy-dom when code calls fetch("/api/...")
 * Normalise to http://localhost for any relative path.
 */
const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
  const url = typeof input === "string" ? input : (input as any)?.url ?? String(input)
  const full = url.startsWith("http") ? url : `http://localhost${url}`
  const textFrom = (payload: unknown) => JSON.stringify(payload)

  if (full.includes("/api/account/status")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          usage: { plan: "free", currentMonthUsage: 0, limit: 5, remaining: 5 },
          isQaUser: false,
        },
      }),
    } as any
  }

  if (full.includes("/api/onboarding/welcome")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { sent: true, alreadySent: false } }),
    } as any
  }

  if (full.includes("/api/onboarding")) {
    if ((init?.method ?? "GET") === "POST") {
      lastOnboardingPostBody = init?.body ? JSON.parse(String(init.body)) : null
      if (failOnboardingSave) {
        return {
          ok: false,
          status: 500,
          json: async () => ({
            success: false,
            error: { code: "ONBOARDING_SAVE_FAILED", message: "Unable to save onboarding state." },
          }),
        } as any
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            onboardingCompleted: true,
            onboardingSkipped:
              lastOnboardingPostBody &&
              typeof lastOnboardingPostBody === "object" &&
              lastOnboardingPostBody.action === "skip",
            onboardingProfile:
              lastOnboardingPostBody &&
              typeof lastOnboardingPostBody === "object" &&
              "profile" in lastOnboardingPostBody
                ? lastOnboardingPostBody.profile
                : {
                    role: null,
                    schoolType: null,
                    mainUseCase: null,
                    writingStressPoint: null,
                    tonePreference: null,
                    region: null,
                  },
          },
        }),
      } as any
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          onboardingCompleted: mockOnboardingCompleted,
          onboardingSkipped: mockOnboardingSkipped,
          onboardingProfile: {
            role: null,
            schoolType: null,
            mainUseCase: null,
            writingStressPoint: null,
            tonePreference: null,
            region: null,
          },
          welcomeEmailSent: mockWelcomeEmailSent,
          firstLogin: mockFirstLogin,
        },
      }),
    } as any
  }

  if (full.includes("/api/snippets/history")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { items: [] } }),
    } as any
  }

  /**
   * IMPORTANT:
   * Many UIs treat non-2xx as ÔÇ£generic errorÔÇØ, and only display OUT_OF_SCOPE
   * when the response is 200 with an error code in JSON.
   *
   * So we return ok:true/status:200 but with a payload that clearly indicates OUT_OF_SCOPE.
   */
  if (full.includes("/api/draft/generate")) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const situation =
      typeof body?.situation === "string" ? body.situation.toLowerCase() : ""
    if (situation.includes("observation-based wording only")) {
      const payload = {
        success: true,
        data: {
          generatedDraft:
            "Subject: Classroom update\n\nHello,\n\nI wanted to share that he sometimes finds it difficult to stay focused during longer tasks and benefits from clear step-by-step instructions.\n\nKind regards,\nGreg Blackburn",
          formattedDraft: {
            subject: "Classroom update",
            paragraphs: [
              "Hello,",
              "I wanted to share that he sometimes finds it difficult to stay focused during longer tasks and benefits from clear step-by-step instructions.",
              "Kind regards,\nGreg Blackburn",
            ],
          },
          metadata: {
            wordCount: 42,
            toneUsed: "professional",
            modelUsed: "model-v1",
            pronounPreference: "auto",
            pronounResolution: {
              resolvedPreference: "auto",
              reason: null,
              source: null,
            },
            generationTime: 420,
            tokensUsed: 210,
            safetyFlags: [],
            generatedAt: new Date().toISOString(),
            requestedAt: new Date().toISOString(),
            contextUsed: {},
            signatureBlock: "Greg Blackburn",
          },
          meta: {
            inputReframed: false,
            inputReframedTier: null,
            latencyMs: 420,
            usedFallback: false,
            errorCode: null,
          },
          usage: {
            plan: "free",
            currentMonthUsage: 3,
            limit: 5,
            remaining: 2,
          },
          safetyAnalysis: {
            riskScore: 10,
            riskLevel: "low",
            triggeredSignals: [],
            toneClass: "collaborative",
            topicSensitivity: "medium",
            reactionForecast: {
              collaborative: 55,
              concerned: 25,
              defensive: 10,
              hostile: 0,
              confused: 10,
            },
            explanationLines: [],
            documentationModeAvailable: false,
            professionalRiskFlags: [],
            structuralImbalance: false,
          },
          outputSafetyAnalysis: {
            riskScore: 10,
            riskLevel: "low",
            triggeredSignals: [],
            toneClass: "collaborative",
            topicSensitivity: "medium",
            reactionForecast: {
              collaborative: 55,
              concerned: 25,
              defensive: 10,
              hostile: 0,
              confused: 10,
            },
            explanationLines: [],
            documentationModeAvailable: false,
            professionalRiskFlags: [],
            structuralImbalance: false,
          },
          deescalationSummary: null,
          documentationModeActive: false,
        },
      }
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => textFrom(payload),
      } as any
    }
    if (situation.includes("adhd") || situation.includes("autism spectrum")) {
      const payload = {
        success: false,
        code: "BLOCKED_LANGUAGE",
        message: "Draft paused this message to keep the communication parent-safe.",
        error: { code: "BLOCKED_LANGUAGE", message: "Draft paused this message to keep the communication parent-safe." },
        data: {
          blockedLanguage: {
            title: "Draft paused this message for safety",
            teacherNote:
              "This draft includes medical or diagnostic speculation, which teachers should avoid in parent communication. Instead, describe observed behaviour and classroom impact only.",
            safeAlternatives: [
              "Unsafe: 'I think he may have ADHD.'",
              "Safer: 'He sometimes finds it difficult to stay focused during longer tasks and benefits from clear step-by-step instructions.'",
              "Use observation-based wording instead.",
            ],
            actionLabel: "Create a parent-safe version",
            variant: "diagnostic_speculation",
          },
        },
      }
      return {
        ok: false,
        status: 422,
        json: async () => payload,
        text: async () => textFrom(payload),
      } as any
    }
    if (
      situation.includes("head teacher") ||
      situation.includes("schulleitung weiterzugeben")
    ) {
      const payload = {
        success: true,
        data: {
          generatedDraft:
            "Dear Mr and Mrs Patel,\n\nThank you for sharing your concern about the recent homework load. I understand why the last few evenings have felt stressful, and I want to respond clearly and constructively.\n\nI will review the current homework instructions with the class, keep the next set more focused, and check in with your child this week so we can see what is feeling most manageable.\n\nIf it would help, we can also arrange a short call to agree the next step together.\n\nKind regards,\nGreg Blackburn",
          formattedDraft: {
            subject: "Homework concern follow-up",
            paragraphs: [
              "Dear Mr and Mrs Patel,",
              "Thank you for sharing your concern about the recent homework load. I understand why the last few evenings have felt stressful, and I want to respond clearly and constructively.",
              "I will review the current homework instructions with the class, keep the next set more focused, and check in with your child this week so we can see what is feeling most manageable.",
              "If it would help, we can also arrange a short call to agree the next step together.",
              "Kind regards,\nGreg Blackburn",
            ],
          },
          metadata: {
            wordCount: 109,
            toneUsed: "professional",
            modelUsed: "model-v1",
            pronounPreference: "auto",
            pronounResolution: {
              resolvedPreference: "auto",
              reason: null,
              source: null,
            },
            generationTime: 610,
            tokensUsed: 340,
            safetyFlags: [],
            generatedAt: new Date().toISOString(),
            requestedAt: new Date().toISOString(),
            contextUsed: {},
            signatureBlock: "Greg Blackburn",
          },
          meta: {
            inputReframed: false,
            inputReframedTier: null,
            latencyMs: 610,
            usedFallback: false,
            errorCode: null,
          },
          usage: {
            plan: "free",
            currentMonthUsage: 1,
            limit: 5,
            remaining: 4,
          },
          safetyAnalysis: {
            riskScore: 44,
            riskLevel: "medium",
            triggeredSignals: [
              {
                id: "cold_no_collaboration",
                category: "escalation",
                label: "No collaboration invitation",
                matchedPhrase: "Please deal with this immediately",
              },
              {
                id: "blame",
                category: "accusation",
                label: "Blame wording",
                matchedPhrase: "your homework expectations are unreasonable",
              },
            ],
            toneClass: "tense",
            topicSensitivity: "high",
            reactionForecast: {
              collaborative: 20,
              concerned: 35,
              defensive: 30,
              hostile: 5,
              confused: 10,
            },
            explanationLines: [],
            documentationModeAvailable: false,
            professionalRiskFlags: [],
            structuralImbalance: false,
          },
          outputSafetyAnalysis: {
            riskScore: 12,
            riskLevel: "low",
            triggeredSignals: [],
            toneClass: "collaborative",
            topicSensitivity: "high",
            reactionForecast: {
              collaborative: 60,
              concerned: 20,
              defensive: 10,
              hostile: 0,
              confused: 10,
            },
            explanationLines: [],
            documentationModeAvailable: false,
            professionalRiskFlags: [],
            structuralImbalance: false,
          },
          deescalationSummary: {
            wasDeescalated: true,
            flaggedPhrases: [{ original: "escalating", replacement: "follow up", category: "threat" }],
            coachingLine: "The wording was made calmer and easier to send.",
          },
          documentationModeActive: false,
        },
      }
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => textFrom(payload),
      } as any
    }
    if (situation.includes("reading progress")) {
      const success = {
        success: true,
        data: {
          generatedDraft: "Dear parent, here's the latest reading progress update for Jamie.",
          formattedDraft: {
            subject: "Reading Update",
            paragraphs: [
              "Jamie has been participating well in guided reading sessions and is improving fluency.",
              "Please encourage them to continue reading at home to reinforce comprehension skills.",
            ],
          },
          metadata: {
            wordCount: 78,
            toneUsed: "warm",
            modelUsed: "model-v1",
            pronounPreference: "auto",
            pronounResolution: {
              resolvedPreference: "auto",
              reason: null,
              source: null,
            },
            generationTime: 520,
            tokensUsed: 320,
            safetyFlags: [],
            generatedAt: new Date().toISOString(),
            requestedAt: new Date().toISOString(),
            contextUsed: {},
            signatureBlock: null,
          },
          meta: {
            inputReframed: false,
            inputReframedTier: null,
            latencyMs: 520,
            usedFallback: false,
            errorCode: null,
          },
          usage: {
            plan: "free",
            currentMonthUsage: 3,
            limit: 5,
            remaining: 2,
          },
          deescalationSummary: null,
        },
      }
      return {
        ok: true,
        status: 200,
        json: async () => success,
        text: async () => textFrom(success),
      } as any
    }

    const msg =
      mockLocale === "de-DE"
        ? "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus."
        : "This doesn't look like a school report or parent message."
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        ok: false,
        code: "OUT_OF_SCOPE",
        message: msg,
        error: { code: "OUT_OF_SCOPE", message: msg },
      }),
      text: async () =>
        textFrom({
          success: false,
          ok: false,
          code: "OUT_OF_SCOPE",
          message: msg,
          error: { code: "OUT_OF_SCOPE", message: msg },
        }),
    } as any
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: {} }),
  } as any
})

beforeAll(() => {
  vi.stubGlobal("fetch", fetchMock)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockOnboardingCompleted = true
  mockOnboardingSkipped = false
  mockWelcomeEmailSent = true
  mockFirstLogin = false
  lastOnboardingPostBody = null
  failOnboardingSave = false
  window.localStorage.clear()
  window.sessionStorage.clear()
})

function getPromptTextarea() {
  const el = document.querySelector("textarea")
  if (!el) throw new Error("Prompt textarea not found")
  return el as HTMLTextAreaElement
}

function findGenerateButton() {
  const matchers = [
    /button\.generate/i,
    /write calm reply/i,
    /improve my draft/i,
    /generate comment/i,
    /generate/i,
    /ruhige antwort schreiben/i,
    /meinen entwurf verbessern/i,
    /kommentar erstellen/i,
    /entwurf/i,
    /draft/i,
  ]
  for (const matcher of matchers) {
    const button = screen.queryByRole("button", { name: matcher })
    if (button) {
      return button
    }
  }
  throw new Error("Generate button not found")
}

function clickGenerateButton() {
  fireEvent.click(findGenerateButton())
}

describe("MainEditor scope guard notice", () => {
  it("shows out-of-scope message and never renders DraftOutput (EN)", async () => {
    mockLocale = "en-GB"

    render(<MainEditor />)

    const prompt = getPromptTextarea()
    fireEvent.change(prompt, { target: { value: "How do I bake toffee muffins?" } })

    clickGenerateButton()

    const expected = "This doesn't look like a school report or parent message."

    await waitFor(() => {
      const noticeBody = screen.getByText(expected, { exact: false })
      expect(noticeBody.textContent).toContain(expected)
    })

    const noticeBody = screen.getByText(expected, { exact: false })
    expect(noticeBody.textContent).not.toContain("editor.")

    expect(screen.queryByTestId("draft-output-body")).toBeNull()
  })

  it("shows out-of-scope message (DE)", async () => {
    mockLocale = "de-DE"

    render(<MainEditor />)

    const prompt = getPromptTextarea()
    fireEvent.change(prompt, { target: { value: "Wie backe ich Toffee-Muffins?" } })

    clickGenerateButton()

    const expected = "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus."

    await waitFor(() => {
      const noticeBody = screen.getByText(expected, { exact: false })
      expect(noticeBody.textContent).toContain(expected)
    })

    const noticeBody = screen.getByText(expected, { exact: false })
    expect(noticeBody.textContent).not.toContain("editor.")

    expect(screen.queryByTestId("draft-output-body")).toBeNull()
  })

  it("renders onboarding banner content in German for first-run users", async () => {
    mockLocale = "de-DE"
    mockOnboardingCompleted = false
    mockWelcomeEmailSent = false
    mockFirstLogin = true

    render(<MainEditor />)

    await waitFor(() => {
      expect(screen.queryByText("Jetzt überspringen")).not.toBeNull()
    })

    expect(screen.getAllByText("Sicherer Entwurf").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Berichtskommentar").length).toBeGreaterThan(0)
    expect(screen.getByText("Ein wenig Kontext")).toBeInTheDocument()
    expect(logClientEventOnceMock).toHaveBeenCalledWith("onboarding_banner_shown", {
      payload: {
        surface: "main_editor",
      },
      scopeKey: "test-uid",
    })
  })

  it("tracks onboarding dismissal and completion when onboarding is intentionally skipped", async () => {
    mockLocale = "en-GB"
    mockOnboardingCompleted = false
    mockWelcomeEmailSent = false
    mockFirstLogin = true

    render(<MainEditor />)

    const dismissButton = await screen.findByRole("button", { name: "Skip for now" })
    fireEvent.click(dismissButton)

    await waitFor(() => {
      expect(logClientEventMock).toHaveBeenCalledWith("onboarding_dismissed", {
        surface: "main_editor",
      })
      expect(logClientEventMock).toHaveBeenCalledWith("onboarding_completed", {
        surface: "main_editor",
      })
    })
    expect(lastOnboardingPostBody).toEqual({
      action: "skip",
      profile: {
        role: null,
        schoolType: null,
        mainUseCase: null,
        writingStressPoint: null,
        tonePreference: null,
        region: null,
      },
    })

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Skip for now" })).toBeNull()
    })
  })

  it("captures onboarding answers and saves them on completion", async () => {
    mockLocale = "en-GB"
    mockOnboardingCompleted = false
    mockWelcomeEmailSent = false
    mockFirstLogin = true

    render(<MainEditor />)

    fireEvent.click(await screen.findByRole("button", { name: "Teacher" }))
    fireEvent.click(screen.getByRole("button", { name: "Primary school" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Both equally" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Finding the right tone" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Professional" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Germany / Austria / Switzerland" }))
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }))

    await waitFor(() => {
      expect(logClientEventMock).toHaveBeenCalledWith("onboarding_completed", {
        surface: "main_editor",
      })
    })

    expect(lastOnboardingPostBody).toEqual({
      action: "complete",
      profile: {
        role: "teacher",
        schoolType: "primary",
        mainUseCase: "both",
        writingStressPoint: "tone",
        tonePreference: "professional",
        region: "germany_austria_switzerland",
      },
    })

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Finish setup" })).toBeNull()
    })
  })

  it("does not block the UI when onboarding save fails", async () => {
    mockLocale = "en-GB"
    mockOnboardingCompleted = false
    mockWelcomeEmailSent = false
    mockFirstLogin = true
    failOnboardingSave = true

    render(<MainEditor />)

    fireEvent.click(await screen.findByRole("button", { name: "Teacher" }))
    fireEvent.click(screen.getByRole("button", { name: "Primary school" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Both equally" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Finding the right tone" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "Professional" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(screen.getByRole("button", { name: "USA / Canada" }))
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }))

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Finish setup" })).toBeNull()
    })
    expect(
      screen.queryByText("We couldn't save your onboarding preference."),
    ).toBeNull()
  })

  it("preloads a labelled demo sample for first-run free users and allows a blank editor escape hatch", async () => {
    mockLocale = "en-GB"
    mockOnboardingCompleted = false
    mockWelcomeEmailSent = false
    mockFirstLogin = true

    render(<MainEditor />)

    await waitFor(() => {
      expect(screen.getAllByText("Demo sample").length).toBeGreaterThan(0)
    })

    await waitFor(() => {
      expect(getPromptTextarea().value).toContain(
        "considering escalating the issue to the head teacher",
      )
    })
    expect(screen.getByText("This first-run example is sample content")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Use blank editor" }))

    await waitFor(() => {
      expect(getPromptTextarea().value).toBe("")
    })

    expect(screen.queryByText("This first-run example is sample content")).toBeNull()
  })

  it("shows a compact safer-summary block after the first demo rewrite", async () => {
    mockLocale = "en-GB"
    mockOnboardingCompleted = false
    mockWelcomeEmailSent = false
    mockFirstLogin = true

    render(<MainEditor />)

    const tryDemoButton = await screen.findByRole("button", { name: "Try safer rewrite" })
    fireEvent.click(tryDemoButton)

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toBeInTheDocument()
    })

    expect(screen.getByText("Why this is safer")).toBeInTheDocument()
    expect(screen.getByText("Softened escalation")).toBeInTheDocument()
    expect(screen.getByText("Reduced blame")).toBeInTheDocument()
    expect(screen.getByText("Clearer next step")).toBeInTheDocument()
    expect(screen.getByText("More professional tone")).toBeInTheDocument()
  })

  it("removes a previously generated draft after an out-of-scope prompt", async () => {
    mockLocale = "en-GB"

    render(<MainEditor />)

    const prompt = getPromptTextarea()
    fireEvent.change(prompt, { target: { value: "Write a parent message about reading progress." } })

    clickGenerateButton()

    await waitFor(() => {
      expect(screen.queryByTestId("draft-output-body")).not.toBeNull()
    })

    expect(logClientEventOnceMock).toHaveBeenCalledWith("first_draft_started", {
      payload: {
        mode: "parent_message",
        sourceFlow: "safe_draft",
      },
      scopeKey: "test-uid",
    })
    expect(logClientEventOnceMock).toHaveBeenCalledWith("first_draft_generated", {
      payload: {
        mode: "parent_message",
        sourceFlow: "safe_draft",
      },
      scopeKey: "test-uid",
    })

    fireEvent.change(prompt, { target: { value: "What is the capital of France?" } })
    clickGenerateButton()

    const expected = "This doesn't look like a school report or parent message."
    await waitFor(() => {
      const noticeBody = screen.getByText(expected, { exact: false })
      expect(noticeBody.textContent).toContain(expected)
      expect(noticeBody.textContent).not.toContain("editor.")
    })

    expect(screen.queryByTestId("draft-output-body")).toBeNull()
  })

  it("clears the generated output after moving the draft into the editor for editing", async () => {
    mockLocale = "en-GB"

    render(<MainEditor />)

    const prompt = getPromptTextarea()
    fireEvent.change(prompt, { target: { value: "Write a parent message about reading progress." } })

    clickGenerateButton()

    await waitFor(() => {
      expect(screen.queryByTestId("draft-output-body")).not.toBeNull()
    })

    fireEvent.click(screen.getAllByRole("button", { name: "draft.button.edit" })[0])

    await waitFor(() => {
      expect(screen.queryByTestId("draft-output-body")).toBeNull()
    })

    expect(getPromptTextarea().value).toContain("reading progress update for Jamie")
  })

  it("shows the diagnostic safety pause instead of an out-of-scope notice", async () => {
    mockLocale = "en-GB"

    render(<MainEditor />)

    fireEvent.change(
      getPromptTextarea(),
      { target: { value: "I wonder if he might be on the autism spectrum because he seems anxious and deliberately ignores instructions." } },
    )
    clickGenerateButton()

    await waitFor(() => {
      expect(screen.getByText("Draft paused this message for safety")).toBeInTheDocument()
    })

    expect(
      screen.getByText(/medical or diagnostic speculation/i),
    ).toBeInTheDocument()
    expect(screen.getByText("Safer example")).toBeInTheDocument()
    expect(screen.getByText("Parent-safe version")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create a parent-safe version" })).toBeInTheDocument()
    expect(screen.queryByText(/Unsafe:/i)).toBeNull()
    expect(screen.getByTestId("diagnostic-recovery-preview")).toHaveTextContent(
      "He sometimes finds it difficult to stay focused during longer tasks and benefits from clear step-by-step instructions.",
    )
    expect(screen.getByTestId("diagnostic-recovery-preview")).not.toHaveTextContent(/autism|autistic|ADHD|anxious|deliberately/i)
    expect(screen.queryByText("Parent Reaction Predictor")).toBeNull()
    expect(screen.queryByText("This doesn't look like a school report or parent message.")).toBeNull()
    expect(screen.queryByTestId("draft-output-body")).toBeNull()
    expect(screen.queryByText("Why Draft adjusted this message")).toBeNull()
  })

  it("places the diagnostic safety card above advanced options in the UI flow", async () => {
    mockLocale = "en-GB"

    render(<MainEditor />)

    fireEvent.change(getPromptTextarea(), { target: { value: "I think he may have ADHD" } })
    clickGenerateButton()

    const card = await screen.findByTestId("diagnostic-safety-card")
    const advancedSummary = screen.getByText("editor.advanced.summaryTitle")

    expect(
      card.compareDocumentPosition(advancedSummary) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("can recover from a blocked diagnostic draft without overwriting the teacher's original input", async () => {
    mockLocale = "en-GB"

    render(<MainEditor />)

    fireEvent.change(
      getPromptTextarea(),
      { target: { value: "I think he may have ADHD because he loses focus during longer tasks." } },
    )
    clickGenerateButton()

    const recoverButton = await screen.findByRole("button", { name: "Create a parent-safe version" })
    fireEvent.click(recoverButton)

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toBeInTheDocument()
    })

    expect(getPromptTextarea().value).toBe(
      "I think he may have ADHD because he loses focus during longer tasks.",
    )
    expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
      "he sometimes finds it difficult to stay focused during longer tasks",
    )
  })
})
