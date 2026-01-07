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
  "app-gradient pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.2),_rgba(234,179,8,0.12),_transparent_65%)] blur-2xl"
const AUTH_BACKGROUND_CLASSES =
  "auth-gradient pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.7),_rgba(76,29,149,0.8),_transparent_65%)]"

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
    <div
      data-testid="app-shell-root"
      className="min-h-dvh bg-background text-foreground relative overflow-x-hidden"
    >
      <div
        data-testid="app-shell-bg"
        aria-hidden="true"
        className={shouldUseAppTheme ? APP_BACKGROUND_CLASSES : AUTH_BACKGROUND_CLASSES}
      />

      <div className="relative z-0 flex flex-col min-h-dvh">
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
