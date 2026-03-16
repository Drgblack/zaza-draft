import { NextResponse } from "next/server"

import { buildTeacherHash } from "@/lib/analytics-identifiers"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import {
  buildFallbackInsightsSummary,
  buildInsightsSummaryFromEvents,
  buildInsightsSummaryFromSnippets,
  mergeInsightsSummaries,
  type InsightEventRecord,
  type InsightSnippetRecord,
  normalizeInsightsRangeDays,
} from "@/lib/insights/summary"

function isFirestoreIndexPreconditionError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : ""
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : ""

  return (
    code.toLowerCase() === "failed-precondition" ||
    message.includes("FAILED_PRECONDITION") ||
    message.toLowerCase().includes("requires an index")
  )
}

function splitEventsByRange(
  events: InsightEventRecord[],
  currentRangeStartIso: string,
  previousRangeStartIso: string,
) {
  const currentEvents: InsightEventRecord[] = []
  const previousEvents: InsightEventRecord[] = []

  for (const event of events) {
    const timestamp = event.timestamp
    if (!timestamp) {
      continue
    }

    if (timestamp >= currentRangeStartIso) {
      currentEvents.push(event)
      continue
    }

    if (timestamp >= previousRangeStartIso) {
      previousEvents.push(event)
    }
  }

  return { currentEvents, previousEvents }
}

export async function GET(req: Request) {
  try {
    const { uid, firestore } = await authorizeFirebaseRequest(req)

    if (!firestore) {
      throw new FirebaseAuthorizationError("Firebase admin not configured", 500)
    }

    const requestedRange = new URL(req.url).searchParams.get("rangeDays")
    const rangeDays = normalizeInsightsRangeDays(requestedRange)
    const now = Date.now()
    const currentRangeStart = new Date(now - rangeDays * 86_400_000).toISOString()
    const previousRangeStart = new Date(now - rangeDays * 2 * 86_400_000).toISOString()
    const fourWeekTrendStart = new Date(now - 28 * 86_400_000).toISOString()
    const fetchStart = previousRangeStart < fourWeekTrendStart ? previousRangeStart : fourWeekTrendStart
    const teacherHash = buildTeacherHash(uid)
    const userRef = firestore.collection("users").doc(uid)
    const snippetCollection = userRef.collection("snippets")

    const [userSnapshot, eventsResult, currentSnippetsResult, previousSnippetsResult] =
      await Promise.allSettled([
        userRef.get(),
        firestore
          .collection("analyticsEvents")
          .where("teacher_hash", "==", teacherHash)
          .where("timestamp", ">=", fetchStart)
          .orderBy("timestamp", "desc")
          .limit(2000)
          .get(),
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

    const userData =
      userSnapshot.status === "fulfilled" && userSnapshot.value.exists
        ? (userSnapshot.value.data() as { updatedAt?: string | null; monthlyUsage?: { generationCount?: unknown } })
        : null
    const generationCount =
      typeof userData?.monthlyUsage?.generationCount === "number"
        ? userData.monthlyUsage.generationCount
        : 0

    const eventsError = eventsResult.status === "rejected" ? eventsResult.reason : null
    if (eventsError && !isFirestoreIndexPreconditionError(eventsError)) {
      console.error("[insights] analytics event query failed; falling back to snippets", eventsError)
    }
    if (currentSnippetsResult.status === "rejected") {
      console.error("[insights] current snippet query failed", currentSnippetsResult.reason)
    }
    if (previousSnippetsResult.status === "rejected") {
      console.error("[insights] previous snippet query failed", previousSnippetsResult.reason)
    }

    const events =
      eventsResult.status === "fulfilled"
        ? eventsResult.value.docs.map((doc) => doc.data() as InsightEventRecord)
        : []
    const currentSnippets =
      currentSnippetsResult.status === "fulfilled"
        ? currentSnippetsResult.value.docs.map((doc) => doc.data() as InsightSnippetRecord)
        : []
    const previousSnippets =
      previousSnippetsResult.status === "fulfilled"
        ? previousSnippetsResult.value.docs.map((doc) => doc.data() as InsightSnippetRecord)
        : []

    const { currentEvents, previousEvents } = splitEventsByRange(
      events,
      currentRangeStart,
      previousRangeStart,
    )
    const recentEvents = events.filter((event) =>
      typeof event.timestamp === "string" && event.timestamp >= fourWeekTrendStart,
    )
    const weeklyReflectionStart = new Date(now - 7 * 86_400_000).toISOString()
    const weeklyEvents = events.filter(
      (event) => typeof event.timestamp === "string" && event.timestamp >= weeklyReflectionStart,
    )
    const snippetSummary =
      currentSnippets.length > 0
        ? buildInsightsSummaryFromSnippets(currentSnippets, previousSnippets)
        : null
    const eventSummary =
      events.length > 0
        ? buildInsightsSummaryFromEvents(
            currentEvents,
            previousEvents,
            recentEvents,
            weeklyEvents,
          )
        : null
    const summary = eventSummary
      ? mergeInsightsSummaries(eventSummary, snippetSummary)
      : snippetSummary ??
        buildFallbackInsightsSummary(
          generationCount,
          typeof userData?.updatedAt === "string" ? userData.updatedAt : null,
        )

    return NextResponse.json({
      success: true,
      summary,
      degraded: Boolean(eventsError),
      emptyReason:
        isFirestoreIndexPreconditionError(eventsError) && !snippetSummary && generationCount === 0
          ? "index_building"
          : undefined,
    })
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
