import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"

export async function GET() {
  const now = new Date().toISOString()

  try {
    const firestore = getAdminDb()

    // Lightweight Firestore call to confirm credentials + connectivity
    await firestore.collection("_health").doc("ping").get()

    return NextResponse.json({
      ok: true,
      now,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      firebaseOk: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        now,
        env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        firebaseOk: false,
        error: (error as Error)?.message ?? "unknown",
      },
      { status: 500 }
    )
  }
}
