"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Header } from "./header"
import { Editor } from "./editor"
import { AiPanel } from "./ai-panel"
import { CommandPalette } from "./command-palette"
import { InsightsFAB } from "./insights-fab"
import FooterSlim from "./FooterSlim"
import { mockSuggestions } from "@/lib/mock-data"
import type { Suggestion } from "@/lib/types"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useLocale } from "@/hooks/use-locale"

export function AppShell() {
  const [content, setContent] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>(mockSuggestions)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline">("saved")
  const [rightPanelVisible, setRightPanelVisible] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // keep these if other parts of the app rely on them being initialised here
  const { prefs } = useTeacherPrefs()
  const { locale } = useLocale()

  // Avoid piling up timers if user types quickly
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024
    const stored = localStorage.getItem("aiPanelVisible")

    if (stored !== null) {
      setRightPanelVisible(stored === "true")
    } else {
      setRightPanelVisible(isDesktop)
    }

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setSaveStatus("saving")

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = window.setTimeout(() => {
      setSaveStatus("saved")
      saveTimerRef.current = null
    }, 1000)
  }, [])

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev)
    document.documentElement.classList.toggle("dark")
  }, [])

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelVisible((prev) => {
      const newState = !prev
      localStorage.setItem("aiPanelVisible", newState.toString())
      return newState
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "]") {
        e.preventDefault()
        handleToggleRightPanel()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleToggleRightPanel])

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({ locale, content }),
      })
      const data = await response.json()
      setSuggestions(data.suggestions)
    } catch (error) {
      console.error("[v0] Error fetching suggestions:", error)
    }
  }, [content, locale])

  return (
    <div className="h-screen flex flex-col bg-background overflow-x-hidden">
      <Header
        title="Untitled Document"
        saveStatus={saveStatus}
        onTitleChange={() => {}}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <div className={`flex-1 zd-app pb-0 md:pb-2 ${!rightPanelVisible ? "panel-hidden" : ""}`}>
        <div className="max-w-4xl mx-auto px-4 pt-6"></div>

        <Editor
          content={content}
          onChange={handleContentChange}
          rightPanelVisible={rightPanelVisible}
          onToggleRightPanel={handleToggleRightPanel}
        />

        {rightPanelVisible && (
          <AiPanel
            suggestions={suggestions}
            onSuggestionAction={(id, action) => {
              if (action === "dismiss" || action === "accept") {
                setSuggestions((prev) => prev.filter((s) => s.id !== id))
              }
            }}
            onCollapse={handleToggleRightPanel}
          />
        )}
      </div>

      <InsightsFAB />

      <div className="mt-8">
        <FooterSlim />
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNewDocument={() => {
          setContent("")
          setCommandPaletteOpen(false)
        }}
        onAskAI={() => {
          fetchSuggestions()
          setCommandPaletteOpen(false)
        }}
        onInsertAsComment={() => {
          setCommandPaletteOpen(false)
        }}
        onToggleDarkMode={() => {
          handleToggleDarkMode()
          setCommandPaletteOpen(false)
        }}
        onToggleAIPanel={() => {
          handleToggleRightPanel()
          setCommandPaletteOpen(false)
        }}
        onShareDocument={() => {
          setCommandPaletteOpen(false)
        }}
      />
    </div>
  )
}
