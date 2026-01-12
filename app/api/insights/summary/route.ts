import { NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

export async function GET(req: Request) {
  try {
    const { uid } = await authorizeFirebaseRequest(req)

    const admin = getFirebaseAdmin()
    const db = admin.firestore()

    const userSnap = await db.collection("users").doc(uid).get()
    const userData = userSnap.exists ? userSnap.data() : null

    const generationCount = Number(userData?.monthlyUsage?.generationCount ?? 0)

    // Minimal "works from first use" summary.
    // Use your preferred assumptions later - for now, just show real data.
    const minutesSaved = generationCount * 3
    const hoursSaved = minutesSaved / 60

    const summary = {
      timeSaved: {
        hours: hoursSaved,
        trendPercent: 0,
        contextCount: Math.min(generationCount, 10),
      },
      draftsCreated: {
        total: generationCount,
        usedWithoutEdits: 0,
      },
      currentStreak: {
        days: 0,
      },
      qualityScore: {
        score: 0,
        trendPoints: 0,
      },
    }

    return NextResponse.json({
      success: true,
      summary,
      empty: generationCount === 0,
    })
  } catch (error: any) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401

    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: error?.message || "Unauthorized" },
      },
      { status }
    )
  }
}
