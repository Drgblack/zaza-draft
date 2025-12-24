import { NextResponse } from "next/server"

const REQUIRED_ENVS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL_PRIMARY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
]

export async function GET() {
  const missing = REQUIRED_ENVS.filter((name) => !process.env[name])
  const status = missing.length === 0 ? "ok" : "degraded"
  return NextResponse.json({
    status,
    missing,
    timestamp: new Date().toISOString(),
  })
}
