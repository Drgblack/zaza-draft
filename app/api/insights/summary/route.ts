import { NextResponse } from "next/server"

import { buildTeacherHash } from "@/lib/analytics-identifiers"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import {
  buildFallbackInsightsSummary,
  buildInsightsSummaryFromEvents,
  type InsightEventRecord,
  normalizeInsightsRangeDays,
} from "@/lib/insights/summary"

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

    const eventsSnapshot = await firestore
      .collection("analyticsEvents")
      .where("teacher_hash", "==", teacherHash)
      .where("timestamp", ">=", fetchStart)
      .orderBy("timestamp", "desc")
      .limit(2000)
      .get()

    const events = eventsSnapshot.docs.map((doc) => doc.data() as InsightEventRecord)
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
    const summary =
      events.length > 0
        ? buildInsightsSummaryFromEvents(
            currentEvents,
            previousEvents,
            recentEvents,
            weeklyEvents,
          )
        : buildFallbackInsightsSummary(0, null)

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
