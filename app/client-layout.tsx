"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Toaster } from "@/components/ui/toaster"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { LanguageProvider } from "@/hooks/use-locale"
import { PersonalizationProvider } from "@/hooks/use-personalization"
import { Header } from "@/components/header"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setIsDarkMode(isDark)
  }, [])

  const handleToggleDarkMode = () => {
    document.documentElement.classList.toggle("dark")
    setIsDarkMode((prev) => !prev)
  }

  return (
    <>
      <LanguageProvider>
        <PersonalizationProvider>
          <I18nProvider>
            <Header
              title="Zaza Draft"
              saveStatus="saved"
              onTitleChange={() => {}}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
              editable={false}
            />
            {children}
            <Toaster />
          </I18nProvider>
        </PersonalizationProvider>
      </LanguageProvider>
    </>
  )
}
