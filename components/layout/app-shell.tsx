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

const APP_BACKGROUND_CLASSES =
  "app-gradient bg-gradient-to-br from-[#f43f5e] via-[#9333ea] to-[#f97316] dark:from-[#581c87] dark:via-[#4c1d95] dark:to-[#111827]"
const AUTH_BACKGROUND_CLASSES =
  "auth-gradient bg-gradient-to-br from-indigo-500 via-sky-600 to-purple-700 dark:from-[#04080f] dark:via-[#0c1a30] dark:to-[#140e26]"
const APP_ACCENT_CLASSES =
  "app-gradient-accent pointer-events-none absolute inset-0 z-0 opacity-70 bg-[radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.55),_rgba(244,115,182,0.1),_transparent_55%)] mix-blend-screen"

export function AppShell({ children }: AppShellProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const pathname = usePathname() ?? "/"
  const { status } = useAuth()

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"))
  }, [])

  const handleToggleDarkMode = () => {
    document.documentElement.classList.toggle("dark")
    setIsDarkMode((prev) => !prev)
  }

  const shouldUseAppTheme = useMemo(() => {
    if (status !== "authenticated") {
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

  return (
    <div data-testid="app-shell-root" className="min-h-dvh text-foreground relative isolate overflow-x-hidden">
      <div
        data-testid="app-shell-bg"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-0 ${
          shouldUseAppTheme ? APP_BACKGROUND_CLASSES : AUTH_BACKGROUND_CLASSES
        }`}
      />
      {shouldUseAppTheme && (
        <div data-testid="app-shell-accent" aria-hidden="true" className={APP_ACCENT_CLASSES} />
      )}

      <div className="relative z-10 flex flex-col min-h-dvh">
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
    </div>
  )
}
