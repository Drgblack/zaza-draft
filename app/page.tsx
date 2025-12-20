"use client"

import { MainEditor } from "@/components/main-editor"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useAuth } from "@/hooks/use-auth"

export default function Home() {
  const { status } = useAuth()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-900 dark:text-white">Loading…</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <AuthScreen />
  }

  return <MainEditor />
}
