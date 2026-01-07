"use client"

import type React from "react"
import { Toaster } from "@/components/ui/toaster"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { LanguageProvider } from "@/hooks/use-locale"
import { PersonalizationProvider } from "@/hooks/use-personalization"
import { AppShell } from "@/components/layout/app-shell"
import { AuthProvider } from "@/hooks/use-auth"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AuthProvider>
        <LanguageProvider>
          <PersonalizationProvider>
            <I18nProvider>
              <AppShell>{children}</AppShell>
              <Toaster />
            </I18nProvider>
          </PersonalizationProvider>
        </LanguageProvider>
      </AuthProvider>
    </>
  )
}
