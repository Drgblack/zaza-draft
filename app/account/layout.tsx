import type { ReactNode } from "react"

import FooterSlim from "@/components/FooterSlim"

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <FooterSlim />
    </div>
  )
}
