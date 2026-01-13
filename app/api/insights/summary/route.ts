import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { getFirebaseAdmin } from "@/lib/firebase/admin"

export async function GET(req: Request) {
  try {
    const { uid } = await authorizeFirebaseRequest(req)

    const admin = getFirebaseAdmin()
    const firestore = admin?.firestore

    if (!firestore) {
      throw new FirebaseAuthorizationError("Firebase admin not configured", 500)
    }

    const userSnap = await firestore.collection("users").doc(uid).get()
    const userData = userSnap.exists ? userSnap.data() : null

    const generationCount =
      (userData?.monthlyUsage && typeof userData.monthlyUsage.generationCount === "number")
        ? userData.monthlyUsage.generationCount
        : 0

    // Minimal summary that can render from first use
    const summary = {
      draftsCreated: {
        total: generationCount,
        usedWithoutEdits: 0,
      },
      // Keep these present so the UI can safely read them even if you later enrich them
      timeSaved: { minutes: 0 },
      currentStreak: { days: 0 },
      qualityScore: { value: 0 },
      updatedAt: userData?.updatedAt ?? null,
    }

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401

    return NextResponse.json(
      {
        success: false,
        error: { code: "INSIGHTS_SUMMARY_ERROR", message: (error as Error)?.message || "Unauthorised" },
      },
      { status }
    )
  }
}
