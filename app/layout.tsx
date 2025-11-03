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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Zaza Draft - AI-Powered Parent Communication for Teachers",
  description:
    "Save hours drafting parent communications. Zaza Draft helps teachers write professional, empathetic emails in seconds while protecting work-life boundaries.",
  keywords: [
    "teacher communication",
    "parent emails",
    "teacher AI",
    "education technology",
    "teacher wellbeing",
    "parent teacher communication",
    "email assistant for teachers",
    "teacher productivity",
    "work-life balance for teachers",
  ],
  authors: [{ name: "Zaza Technologies" }],
  creator: "Zaza Technologies UG",
  publisher: "Zaza Technologies UG",
  metadataBase: new URL("https://www.zazadraft.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Zaza Draft - Write with Heart, Teach with Clarity",
    description: "AI-powered communication assistant for teachers",
    url: "https://www.zazadraft.com",
    siteName: "Zaza Draft",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Zaza Draft - AI-Powered Parent Communication for Teachers",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zaza Draft - Teacher Communication Assistant",
    description: "Save hours drafting parent communications",
    images: ["/twitter-card.png"],
    creator: "@zazadraft",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Zaza Draft",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
    },
    description:
      "AI-powered communication assistant that helps teachers write professional, empathetic parent emails in seconds while protecting work-life boundaries.",
    featureList: [
      "Generate professional parent communications in seconds",
      "Multiple tone options (professional, warm, firm, empathetic)",
      "Save 3+ hours per week on email drafting",
      "Protect work-life boundaries with smart scheduling",
      "Template library for common situations",
    ],
    screenshot: "https://www.zazadraft.com/screenshot.png",
    author: {
      "@type": "Organization",
      name: "Zaza Technologies UG",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Gumbertstraße 150",
        addressLocality: "Düsseldorf",
        postalCode: "40229",
        addressCountry: "DE",
      },
      email: "hello@zazatechnologies.com",
    },
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </body>
    </html>
  )
}
