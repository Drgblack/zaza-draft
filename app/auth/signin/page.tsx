"use server"

import type { Metadata } from "next"
import { AuthScreen } from "@/components/auth/auth-screen"

export const metadata: Metadata = {
  title: "Sign in to Zaza Draft",
}

export default function AuthPage({ searchParams }: { searchParams?: { next?: string } }) {
  const nextRoute = searchParams?.next ?? "/"
  return <AuthScreen nextRoute={nextRoute} />
}
