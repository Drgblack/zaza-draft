"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import FooterSlim from "@/components/FooterSlim"
import { useAuth } from "@/hooks/use-auth"

const APP_ROUTES = [
  "/",
  "/insights",
  "/support",
  "/account",
  "/settings",
  "/privacy",
  "/terms",
  "/contact",
  "/about",
  "/class-brain",
]

interface AppShellProps {
  children: ReactNode
}

const AUTH_THEME_CLASSES =
  "bg-gradient-to-br from-indigo-500 via-sky-600 to-purple-700 dark:from-[#04080f] dark:via-[#0c1a30] dark:to-[#140e26] text-white"
const APP_THEME_CLASSES =
  "bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-[#090226] dark:via-[#140b35] dark:to-[#12031a] text-white"

export function AppShell({ children }: AppShellProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const pathname = usePathname() ?? "/"
  const { status } = useAuth()

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setIsDarkMode(isDark)
  }, [])

  const handleToggleDarkMode = () => {
    document.documentElement.classList.toggle("dark")
    setIsDarkMode((prev) => !prev)
  }

  const shouldUseAppTheme = useMemo(() => {
    if (status === "unauthenticated") {
      return false
    }
    if (pathname.startsWith("/auth") || pathname.startsWith("/register") || pathname === "/login") {
      return false
    }
    return APP_ROUTES.some((route) => {
      if (route === "/") {
        return pathname === "/"
      }
      return pathname.startsWith(route)
    })
  }, [pathname, status])

  const themeClasses = shouldUseAppTheme ? APP_THEME_CLASSES : AUTH_THEME_CLASSES

  return (
    <div
      data-testid="app-shell"
      className={`min-h-screen flex flex-col transition-colors ${themeClasses}`}
    >
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
