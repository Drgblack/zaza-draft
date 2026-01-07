"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Header } from "@/components/header"
import FooterSlim from "@/components/FooterSlim"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        title="Zaza Draft"
        saveStatus="saved"
        onTitleChange={() => {}}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        editable={false}
      />
      <main className="flex-1 w-full">{children}</main>
      <FooterSlim />
    </div>
  )
}
