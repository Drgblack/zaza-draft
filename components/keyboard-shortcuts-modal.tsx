"use client"

import { X, Command } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useEffect, useRef } from "react"

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { t } = useLanguage()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0
  const modKey = isMac ? "⌘" : "Ctrl"

  const shortcuts = [
    {
      category: t.shortcuts?.global || "Global",
      items: [
        { keys: [`${modKey}`, "/"], description: t.shortcuts?.showShortcuts || "Show keyboard shortcuts" },
        { keys: ["?"], description: t.shortcuts?.showHelp || "Show help" },
        { keys: [`${modKey}`, "B"], description: t.shortcuts?.toggleSidebar || "Toggle sidebar" },
        { keys: ["Esc"], description: t.shortcuts?.closeModal || "Close modal/dropdown" },
      ],
    },
    {
      category: t.shortcuts?.navigation || "Navigation",
      items: [
        { keys: ["G", "H"], description: t.shortcuts?.goHome || "Go to Home" },
        { keys: ["G", "A"], description: t.shortcuts?.goAnalytics || "Go to Analytics" },
        { keys: ["G", "T"], description: t.shortcuts?.goTemplates || "Go to Templates" },
        { keys: ["G", "S"], description: t.shortcuts?.goSettings || "Go to Settings" },
        { keys: ["G", "D"], description: t.shortcuts?.goDrafts || "Go to My Drafts" },
        { keys: [`${modKey}`, ","], description: t.shortcuts?.openSettings || "Open Settings" },
      ],
    },
    {
      category: t.shortcuts?.editor || "Editor",
      items: [
        { keys: [`${modKey}`, "Enter"], description: t.shortcuts?.generateDraft || "Generate draft" },
        { keys: [`${modKey}`, "S"], description: t.shortcuts?.saveDraft || "Save draft" },
        { keys: [`${modKey}`, "T"], description: t.shortcuts?.openTemplates || "Open Templates" },
        { keys: ["Tab"], description: t.shortcuts?.cycleTones || "Cycle through tones" },
      ],
    },
    {
      category: t.shortcuts?.templates || "Templates",
      items: [
        { keys: ["/"], description: t.shortcuts?.focusSearch || "Focus search" },
        { keys: [`${modKey}`, "F"], description: t.shortcuts?.focusSearchAlt || "Focus search (alt)" },
        { keys: ["Enter"], description: t.shortcuts?.useTemplate || "Use selected template" },
        { keys: ["S"], description: t.shortcuts?.starTemplate || "Star/unstar template" },
      ],
    },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] overflow-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <Command className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 id="shortcuts-modal-title" className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t.shortcuts?.title || "Keyboard Shortcuts"}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            aria-label="Close keyboard shortcuts dialog"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <section key={section.category} aria-labelledby={`${section.category}-heading`}>
              <h3
                id={`${section.category}-heading`}
                className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3"
              >
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-gray-400 dark:text-gray-600" aria-hidden="true">
                              +
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {t.shortcuts?.tip || "Tip: Press"}{" "}
            <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
              ?
            </kbd>{" "}
            {t.shortcuts?.tipEnd || "anytime to see this help"}
          </p>
        </div>
      </div>
    </>
  )
}
