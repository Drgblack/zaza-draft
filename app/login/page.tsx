"use client"

import { Suspense } from "react"

import { AuthEntryScreen } from "@/components/auth/auth-entry-screen"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" />}>
      <AuthEntryScreen />
    </Suspense>
  )
}
