"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useLocale } from "@/hooks/use-locale"
import FooterSlim from "@/components/FooterSlim"
import { ZaraAssistant } from "@/components/zara-assistant"
import { DraftOutput } from "@/components/draft-output"
import { MiniInsightsBar } from "@/components/MiniInsightsBar"
import { ContextualWellbeingTip } from "@/components/ContextualWellbeingTip"

const TONE_OPTIONS = [
  { id: "warm", key: "tone.warm" },
  { id: "professional", key: "tone.professional" },
  { id: "direct", key: "tone.direct" },
  { id: "empathetic", key: "tone.empathetic" },
]

export function MainEditor() {
  const [content, setContent] = useState("")
  const [selectedTone, setSelectedTone] = useState("warm")
  const [draftsUsed, setDraftsUsed] = useState(8)
  const [draftsLimit] = useState(10)
  const { prefs } = useTeacherPrefs()
  const { t, locale } = useLocale()

  const [greeting, setGreeting] = useState("Good morning")
  const [userName, setUserName] = useState("")
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null)
  const [draftMetadata, setDraftMetadata] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [showWellbeingInsights, setShowWellbeingInsights] = useState(true)
  const isDocumentDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")

  useEffect(() => {
    const handleSettingsChange = (e: CustomEvent) => {
      setShowWellbeingInsights(e.detail.enabled)
    }

    window.addEventListener("wellbeingSettingsChanged", handleSettingsChange as EventListener)

    // Check initial setting
    const savedSetting = localStorage.getItem("show_wellbeing_insights")
    if (savedSetting !== null) {
      setShowWellbeingInsights(savedSetting === "true")
    }

    return () => {
      window.removeEventListener("wellbeingSettingsChanged", handleSettingsChange as EventListener)
    }
  }, [])

  useEffect(() => {
    if (prefs.firstName) {
      setUserName(prefs.firstName)
    }

    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting(locale === "de-DE" ? "Guten Morgen" : "Good morning")
    } else if (hour < 17) {
      setGreeting(locale === "de-DE" ? "Guten Tag" : "Good afternoon")
    } else {
      setGreeting(locale === "de-DE" ? "Guten Abend" : "Good evening")
    }
  }, [prefs.firstName, locale])

  const handleGenerate = () => {
    console.log("[v0] Generating draft with tone:", selectedTone)
    console.log("[v0] Content:", content)

    const startTime = Date.now()

    // TODO: Replace with actual API call
    // Simulate draft generation
    setTimeout(() => {
      const mockDraft = `Dear Parent/Guardian,

I wanted to reach out to share some observations about your child's recent progress in class. I've noticed they've been working particularly hard on their reading comprehension skills, and it's wonderful to see their dedication.

While they're making great strides, I think there are a few areas where we could work together to support their continued growth. Specifically, I'd love to discuss strategies we can use both at school and at home to help them build confidence in their writing.

I believe that with consistent support and encouragement, your child will continue to thrive. Would you be available for a brief conversation next week to discuss this further?

Thank you for your partnership in your child's education.

Warm regards,
${userName || "Teacher"}`

      const generationTime = Date.now() - startTime
      const wordCount = mockDraft.split(/\s+/).length

      setGeneratedDraft(mockDraft)
      setDraftMetadata({
        generationTime,
        wordCount,
        tone: selectedTone,
      })

      // Increment drafts used
      setDraftsUsed((prev) => prev + 1)

    }, 1500)
  }

  const handleSaveDraft = (tags: string[]) => {
    console.log("[v0] Saving draft with tags:", tags)
    // TODO: Implement actual save to library functionality
    alert(`Draft saved with tags: ${tags.join(", ")}`)
  }

  const handleEditDraft = () => {
    console.log("[v0] Editing draft")
    setIsEditing(true)
    // TODO: Implement inline editing functionality
  }

  const handleRegenerateDraft = () => {
    console.log("[v0] Regenerating draft")
    setGeneratedDraft(null)
    setDraftMetadata(null)
    handleGenerate()
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        {/* Main Content Area */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            {greeting}, {userName || (locale === "de-DE" ? "da" : "there")}
          </h1>
          <p className="text-lg text-white/95 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)]">
            {locale === "de-DE"
              ? "Lassen Sie uns präzise und professionell bleiben."
              : "Let's keep it crisp and professional."}
          </p>
        </div>

        {showWellbeingInsights && <MiniInsightsBar />}

        <div className="glass shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] rounded-2xl p-8 mb-6 transition-all duration-200 hover:shadow-[0_16px_48px_rgba(0,0,0,0.2),0_6px_16px_rgba(255,255,255,0.12)] hover:-translate-y-0.5 border border-white/40 dark:border-white/30 bg-white/90 dark:bg-white/15 backdrop-blur-[32px]">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              locale === "de-DE"
                ? `Beschreiben Sie die Situation...

Beispiele:
• Schüler der 6. Klasse mit Schwierigkeiten bei Brüchen, braucht ermutigendes Feedback
• Eltern-E-Mail zu Hausaufgaben, professioneller und einfühlsamer Ton
• Zeugniskommentar für hervorragende Fortschritte beim Leseverständnis`
                : `Describe the situation...

Examples:
• Year 6 student struggling with fractions, needs encouraging feedback
• Parent email about homework concerns, professional and empathetic tone
• Report card comment for excellent progress in reading comprehension`
            }
            className="w-full h-96 text-lg text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0 resize-none placeholder:text-gray-600 dark:placeholder:text-white/60 leading-relaxed font-medium"
            style={{
              color: isDocumentDark ? "#ffffff" : undefined,
            }}
            aria-label={
              locale === "de-DE" ? "Beschreiben Sie die Situation" : "Describe the situation you need help with"
            }
          />
        </div>

        {showWellbeingInsights && <ContextualWellbeingTip />}

        <div className="flex flex-wrap gap-3 mb-6">
          {TONE_OPTIONS.map((tone) => {
            const isSelected = selectedTone === tone.id
            const isDark = isDocumentDark

            return (
              <button
                key={tone.id}
                onClick={() => setSelectedTone(tone.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${
                  isSelected
                    ? "bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white shadow-[0_8px_24px_rgba(124,58,237,0.4),inset_0_1px_3px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)] border border-white/20 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,58,237,0.5),inset_0_2px_4px_rgba(255,255,255,0.35)]"
                    : "glass shadow-soft hover:bg-white/90 dark:hover:bg-white/20 hover:-translate-y-0.5 border border-white/40 dark:border-white/30 bg-white/85 dark:bg-white/10 backdrop-blur-[24px] text-gray-900 dark:text-white"
                }`}
                aria-pressed={isSelected}
              >
                {t(tone.key)}
              </button>
            )
          })}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!content.trim()}
          className="w-full bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] hover:shadow-[0_20px_56px_rgba(124,58,237,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)] text-white dark:text-white text-lg font-bold py-6 rounded-xl transition-all duration-200 shadow-[0_12px_32px_rgba(124,58,237,0.4),inset_0_1px_3px_rgba(255,255,255,0.25),inset_0_-1px_2px_rgba(0,0,0,0.1)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100 border border-white/20"
          aria-label={t("button.generate")}
        >
          {t("button.generate")}
        </Button>

        <div className="text-center mt-4 text-sm text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)] font-medium">
          {t("insights.draftsUsed", { used: draftsUsed, limit: draftsLimit })}
        </div>

        {generatedDraft && draftMetadata && (
          <div className="mt-8">
            <DraftOutput
              draftText={generatedDraft}
              tone={draftMetadata.tone}
              metadata={draftMetadata}
              onSave={handleSaveDraft}
              onEdit={handleEditDraft}
              onRegenerate={handleRegenerateDraft}
              draftsUsed={draftsUsed}
              draftsLimit={draftsLimit}
            />
          </div>
        )}
      </main>

      <div className="main-editor-footer">
        <FooterSlim />
      </div>

      <ZaraAssistant />
    </div>
  )
}
