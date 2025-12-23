import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientLayout from "./client-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Zaza Draft - AI Writing Assistant for Teachers",
  description: "Professional AI writing assistant designed for K-12 teachers",
  generator: "v0.app",
  icons: {
    icon: "/z-logo.png",
    shortcut: "/z-logo.png",
    apple: "/z-logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
