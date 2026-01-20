"use client"

import type { ReactNode } from "react"
import FooterSlim from "@/components/FooterSlim"

export default function VoiceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">{children}</main>
      <FooterSlim />
    </div>
  )
}
