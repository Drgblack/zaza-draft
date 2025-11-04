export const revalidate = 0;

// app/layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/contexts/language-context"
import { OnboardingProvider } from "@/contexts/onboarding-context"
import { OnboardingModal } from "@/components/onboarding-modal"
import { ErrorBoundary } from "@/components/error-boundary"
import { FavoritesProvider } from "@/contexts/favorites-context"
import { ZaraChat } from "@/components/zara-chat"
import AuthProvider from "./providers/AuthProvider" // â¬…ï¸ add this

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = { /* â€¦unchangedâ€¦ */ }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const schemaData = { /* â€¦unchangedâ€¦ */ }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider> {/* â¬…ï¸ wrap everything that uses useAuth */}
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <LanguageProvider>
                <FavoritesProvider>
                  <OnboardingProvider>
                    <OnboardingModal />
                    {children}
                    <ZaraChat />
                  </OnboardingProvider>
                </FavoritesProvider>
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}



