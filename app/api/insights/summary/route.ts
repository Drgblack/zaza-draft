import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import {
  buildFallbackInsightsSummary,
  buildInsightsSummaryFromSnippets,
  normalizeInsightsRangeDays,
} from "@/lib/insights/summary"

export async function GET(req: Request) {
  try {
    const { uid, firestore } = await authorizeFirebaseRequest(req)

    if (!firestore) {
      throw new FirebaseAuthorizationError("Firebase admin not configured", 500)
    }

    const userSnap = await firestore.collection("users").doc(uid).get()
    const userData = userSnap.exists ? userSnap.data() : null
    const requestedRange = new URL(req.url).searchParams.get("rangeDays")
    const rangeDays = normalizeInsightsRangeDays(requestedRange)
    const now = Date.now()
    const currentRangeStart = new Date(now - rangeDays * 86_400_000).toISOString()
    const previousRangeStart = new Date(now - rangeDays * 2 * 86_400_000).toISOString()
    const userRef = firestore.collection("users").doc(uid)
    const snippetCollection = userRef.collection("snippets")

    const [currentSnippetsSnap, previousSnippetsSnap] = await Promise.all([
      snippetCollection
        .where("createdAt", ">=", currentRangeStart)
        .orderBy("createdAt", "desc")
        .limit(500)
        .get(),
      snippetCollection
        .where("createdAt", ">=", previousRangeStart)
        .where("createdAt", "<", currentRangeStart)
        .orderBy("createdAt", "desc")
        .limit(500)
        .get(),
    ])

    const generationCount =
      (userData?.monthlyUsage && typeof userData.monthlyUsage.generationCount === "number")
        ? userData.monthlyUsage.generationCount
        : 0

    const summary =
      currentSnippetsSnap.size > 0
        ? buildInsightsSummaryFromSnippets(
            currentSnippetsSnap.docs.map((doc) => doc.data()),
            previousSnippetsSnap.docs.map((doc) => doc.data()),
          )
        : requestedRange
          ? buildFallbackInsightsSummary(0, userData?.updatedAt ?? null)
          : buildFallbackInsightsSummary(generationCount, userData?.updatedAt ?? null)

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401

    return NextResponse.json(
      {
        success: false,
        error: { code: "INSIGHTS_SUMMARY_ERROR", message: (error as Error)?.message || "Unauthorised" },
      },
      { status },
    )
  }
}
