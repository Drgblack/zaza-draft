"use client"

import { useState, useEffect } from "react"
import { Sparkles, Send, ArrowLeft, ChevronRight, Lightbulb, Copy, Quote, X } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"

interface Message {
  role: "user" | "assistant"
  content: string
}

const getTips = (t: (key: string) => string) => [
  {
    id: "empathetic-feedback",
    icon: (
      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
        />
      </svg>
    ),
    title: t("zara.tip.empathetic.title"),
    subtitle: t("zara.tip.empathetic.subtitle"),
    shortContent:
      "Start with a positive observation, acknowledge the challenge, and offer specific support. Example: 'I've noticed you're working hard on...'",
  },
  {
    id: "parent-templates",
    icon: (
      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
        />
      </svg>
    ),
    title: t("zara.tip.parent.title"),
    subtitle: t("zara.tip.parent.subtitle"),
    shortContent:
      "Use a warm greeting, state the purpose clearly, provide specific examples, and end with an invitation to discuss further.",
  },
  {
    id: "difficult-conversations",
    icon: (
      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09zM18.259 8.715L18 9.75l-.259-1.183a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
      </svg>
    ),
    title: t("zara.tip.difficult.title"),
    subtitle: t("zara.tip.difficult.subtitle"),
    shortContent:
      "Focus on behaviors not character, use 'I' statements, listen actively, and always end with a positive action plan.",
  },
]

const TIP_DETAILS: Record<string, { sections: Array<{ type: string; title: string; items: string[] }> }> = {
  "empathetic-feedback": {
    sections: [
      {
        type: "framework",
        title: "Framework for Empathetic Feedback",
        items: [
          "Start with a positive observation",
          "Acknowledge the student's effort or feelings",
          "Frame challenges as opportunities for growth",
          "Be specific about next steps",
          "End with encouragement",
        ],
      },
      {
        type: "phrases",
        title: "Helpful Phrases",
        items: [
          "I can see you're working hard on...",
          "I've noticed your dedication to...",
          "The effort you're putting in shows...",
          "Let's focus on...",
          "You've got this!",
        ],
      },
      {
        type: "example",
        title: "Example",
        items: [
          "I can see you're working hard on fractions. The effort you're putting in shows real dedication. Let's focus on breaking down the denominators into smaller steps - I think that will help it click for you. You've got this!",
        ],
      },
    ],
  },
  "parent-templates": {
    sections: [
      {
        type: "template",
        title: "Positive Progress Update",
        items: [
          "Dear [Parent Name],",
          "I wanted to share some wonderful news about [Student Name]'s progress in [subject]. They've shown significant improvement in [specific area], particularly [specific example].",
          "[Student Name] has been [specific behavior or effort], which has really helped them succeed. I'm proud of their dedication.",
          "Please let me know if you'd like to discuss their progress further.",
          "Best regards, [Your Name]",
        ],
      },
      {
        type: "template",
        title: "Addressing a Concern",
        items: [
          "Dear [Parent Name],",
          "I hope this message finds you well. I wanted to touch base regarding [Student Name]'s [specific area of concern].",
          "I've noticed [specific observation without judgment]. I believe with some support, we can help [Student Name] improve in this area.",
          "Would you be available for a brief conversation this week? I'd love to discuss some strategies we can try together.",
          "Thank you for your partnership in [Student Name]'s education.",
          "Warm regards, [Your Name]",
        ],
      },
    ],
  },
  "difficult-conversations": {
    sections: [
      {
        type: "framework",
        title: "Framework for Difficult Conversations",
        items: [
          "Start with empathy: 'I understand this might be hard to hear...'",
          "Be specific, not general: Use concrete examples",
          "Focus on behavior, not character: 'When X happens...' not 'You are...'",
          "Offer solutions: 'Here's what we can try...'",
          "Partner language: 'Together, we can...'",
          "End with hope: Remind them of their strengths",
        ],
      },
      {
        type: "phrases",
        title: "Helpful Phrases",
        items: [
          "I've noticed...",
          "I'm concerned about...",
          "I'd like to work together to...",
          "What would help you succeed?",
          "I believe in your ability to...",
        ],
      },
      {
        type: "avoid",
        title: "What to Avoid",
        items: [
          "Blame language",
          "Absolute terms (always, never)",
          "Comparisons to other students",
          "Focusing only on negatives",
        ],
      },
    ],
  },
}

export function ZaraAssistant() {
  const { t, locale } = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<"menu" | "tipDetail">("menu")
  const [selectedTipId, setSelectedTipId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: t("zara.greeting"),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null)

  const tips = getTips(t)

  useEffect(() => {
    const handleZaraOpen = (e: CustomEvent) => {
      setIsOpen(true)
      if (e.detail?.focusInput) {
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>(".zara-chat-input")
          input?.focus()
        }, 100)
      }
    }

    window.addEventListener("zaraOpen", handleZaraOpen as EventListener)

    return () => {
      window.removeEventListener("zaraOpen", handleZaraOpen as EventListener)
    }
  }, [])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    setMessages((prev) => [...prev, { role: "user", content: inputValue }])
    setInputValue("")

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
            content:
              locale === "de-DE"
                ? "Ich bin hier, um zu helfen! Während ich noch lerne, probiere die schnellen Tipps oben oder beschreibe deine Situation im Haupteditor für KI-generierte Entwürfe."
                : "I'm here to help! While I'm still learning, try the quick tips above or describe your situation in the main editor for AI-generated drafts.",
        },
      ])
    }, 800)
  }

  const handleQuickTip = (tipId: string) => {
    setSelectedTipId(tipId)
    setCurrentView("tipDetail")
  }

  const handleBackToMenu = () => {
    setCurrentView("menu")
    setSelectedTipId(null)
  }

  const handleCopyPhrase = (phrase: string) => {
    navigator.clipboard.writeText(phrase)
    setCopiedPhrase(phrase)
    setTimeout(() => setCopiedPhrase(null), 2000)
  }

  const selectedTip = tips.find((tip) => tip.id === selectedTipId)
  const selectedTipDetails = selectedTipId ? TIP_DETAILS[selectedTipId] : null

  return (
    <>
      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[70vh] glass shadow-[0_28px_88px_rgba(124,58,237,0.5),0_12px_28px_rgba(0,0,0,0.25)] border-2 border-[#7c3aed]/60 dark:border-[#a78bfa]/50 rounded-2xl flex flex-col z-50 animate-in slide-in-from-bottom-4 duration-300 md:bottom-24 md:right-6 md:w-96 backdrop-blur-[80px] bg-white/90 dark:bg-gray-900/98">
          <div className="flex items-center justify-between p-4 border-b-2 border-[#7c3aed]/50 bg-gradient-to-r from-[#7c3aed]/95 to-[#6d28d9]/90 backdrop-blur-xl rounded-t-2xl shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]">
            {currentView !== "menu" && (
              <button
                onClick={handleBackToMenu}
                className="text-white hover:text-gray-200 transition mr-2 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-600 rounded"
                aria-label="Back to menu"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
            )}
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09zM18.259 8.715L18 9.75l-.259-1.183a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
            <span className="font-semibold text-white">Zara - Your Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-600 rounded"
              aria-label="Close assistant"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          {currentView === "menu" && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <h3
                className="text-2xl font-bold text-gray-900 dark:!text-white drop-shadow-sm leading-tight"
                style={{
                  color: document.documentElement.classList.contains("dark") ? "#ffffff" : undefined,
                }}
              >
                {t("zara.greeting")}
              </h3>
              <p
                className="text-sm text-gray-700 dark:!text-gray-200 leading-relaxed"
                style={{
                  color: document.documentElement.classList.contains("dark") ? "#f0f0f0" : undefined,
                }}
              >
                {t("zara.description")}
              </p>

              <div className="space-y-3 mt-6">
                {tips.map((tip) => (
                  <button
                    key={tip.id}
                    onClick={() => {
                      setSelectedTipId(tip.id)
                      setCurrentView("tipDetail")
                    }}
                    className="w-full glass shadow-soft hover:bg-white/90 dark:hover:bg-white/20 hover:-translate-y-0.5 border border-white/40 dark:border-white/30 bg-white/80 dark:bg-white/15 backdrop-blur-[24px] hover:shadow-[0_12px_32px_rgba(124,58,237,0.35),inset_0_2px_4px_rgba(255,255,255,0.25)] transition-all duration-200 p-4 rounded-xl text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-800/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm border border-purple-200/50 dark:border-purple-600/30">
                        {tip.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-semibold text-base mb-1 text-gray-900 dark:!text-white group-hover:text-purple-700 dark:group-hover:!text-purple-300 transition-colors leading-tight"
                          style={{
                            color: document.documentElement.classList.contains("dark") ? "#ffffff" : undefined,
                          }}
                        >
                          {tip.title}
                        </h4>
                        <p
                          className="text-sm text-gray-700 dark:!text-white/80 leading-snug line-clamp-2"
                          style={{
                            color: document.documentElement.classList.contains("dark") ? "#e0e0e0" : undefined,
                          }}
                        >
                          {tip.subtitle}
                        </p>
                      </div>
                      <ChevronRight
                        className="w-5 h-5 text-purple-600 dark:!text-purple-400 flex-shrink-0 group-hover:translate-x-1 transition-transform"
                        size={16}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentView === "tipDetail" && selectedTip && selectedTipDetails && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {/* Tip header */}
              <div className="bg-purple-50 dark:bg-white/10 rounded-lg p-4 mb-4 border border-purple-200 dark:border-purple-500/30 backdrop-blur-[24px]">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="flex-shrink-0 text-purple-600 dark:text-purple-400">{selectedTip.icon}</div>
                  {selectedTip.title}
                </h3>
              </div>

              {/* Content sections */}
              <div className="space-y-4 md:space-y-6">
                {selectedTipDetails.sections.map((section, sectionIdx) => (
                  <div key={sectionIdx}>
                    {section.type === "framework" && (
                      <>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="text-purple-600 dark:text-purple-400">🧭</span>
                          {section.title}
                        </h4>
                        <div className="glass shadow-soft border border-white/60 dark:border-white/20 rounded-lg p-4 space-y-3 bg-white/90 dark:bg-white/10 backdrop-blur-[32px]">
                          {section.items.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="text-purple-600 dark:text-purple-400 font-semibold flex-shrink-0">
                                {idx + 1}.
                              </span>
                              <p className="text-sm text-gray-900 dark:text-white">{item}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {section.type === "phrases" && (
                      <>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="text-purple-600 dark:text-purple-400">💬</span>
                          {section.title}
                        </h4>
                        <div className="glass shadow-soft rounded-lg p-4 space-y-2 bg-white/90 dark:bg-white/10 backdrop-blur-[32px] border border-white/60 dark:border-white/20">
                          {section.items.map((phrase, idx) => (
                            <div key={idx} className="relative group">
                              <p className="text-sm text-gray-900 dark:text-white font-medium pr-8">{phrase}</p>
                          <button
                            onClick={() => handleCopyPhrase(phrase)}
                            className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 p-1"
                            title="Copy phrase"
                            aria-label={`Copy phrase: ${phrase}`}
                          >
                            {copiedPhrase === phrase ? <span className="text-xs">✓</span> : <Copy size={14} />}
                          </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {section.type === "avoid" && (
                      <>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="text-red-500 dark:text-red-400">⚠️</span>
                          {section.title}
                        </h4>
                        <div className="glass shadow-soft rounded-lg p-4 space-y-2 bg-white/90 dark:bg-white/10 backdrop-blur-[32px] border border-white/60 dark:border-white/20">
                          {section.items.map((item, idx) => (
                          <p key={idx} className="text-sm text-red-900 dark:text-red-200">
                            ✖️ {item}
                          </p>
                          ))}
                        </div>
                      </>
                    )}

                    {section.type === "example" && (
                      <>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="text-purple-600 dark:text-purple-400">💡</span>
                          {section.title}
                        </h4>
                        <div className="glass shadow-soft rounded-lg p-4 border-l-4 border-purple-600 bg-white/90 dark:bg-white/10 backdrop-blur-[32px]">
                          <p className="text-sm text-gray-900 dark:text-white italic">{section.items[0]}</p>
                        </div>
                      </>
                    )}

                    {section.type === "template" && (
                      <>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className="text-purple-600 dark:text-purple-400">✉️</span>
                          {section.title}
                        </h4>
                        <div className="glass shadow-soft rounded-lg p-4 space-y-2 bg-white/90 dark:bg-white/10 backdrop-blur-[32px] border border-white/60 dark:border-white/20">
                          {section.items.map((line, idx) => (
                            <p key={idx} className="text-sm text-gray-900 dark:text-white">
                              {line}
                            </p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleBackToMenu}
                className="w-full mt-6 mb-4 bg-purple-100 dark:bg-gray-700/80 text-purple-700 dark:text-white font-medium py-3 px-4 rounded-lg hover:bg-purple-200 dark:hover:bg-gray-600/80 transition flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-purple-600 backdrop-blur-[24px]"
              >
                <ArrowLeft size={18} />
                Back to Menu
              </button>
            </div>
          )}

          {/* Chat input at bottom */}
          <div className="p-6 space-y-4">
            {/* Chat Input */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 glass shadow-inner border border-white/40 dark:border-white/20 rounded-xl p-3 bg-white/70 dark:bg-white/10 backdrop-blur-[24px]">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={locale === "de-DE" ? "Frage Zara etwas..." : "Ask Zara anything..."}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:!text-white placeholder:text-gray-600 dark:placeholder:!text-white/60 font-medium zara-chat-input"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 shadow-md shadow-purple-500/30"
                  aria-label={locale === "de-DE" ? "Nachricht senden" : "Send message"}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            setCurrentView("menu")
          }
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white rounded-full shadow-[0_12px_32px_rgba(124,58,237,0.45),inset_0_1px_3px_rgba(255,255,255,0.3)] hover:shadow-[0_16px_40px_rgba(124,58,237,0.55),inset_0_2px_4px_rgba(255,255,255,0.35)] transition-all duration-200 flex items-center justify-center z-50 hover:scale-105 active:scale-95 border border-white/20"
        aria-label="Toggle Zara Assistant"
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.183a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
          />
        </svg>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(16,185,129,0.5)]" />
      </button>
    </>
  )
}


