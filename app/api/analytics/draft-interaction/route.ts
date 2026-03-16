import { NextResponse } from "next/server"

import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import {
  buildSchoolAnalyticsWeeklyDelta,
  buildTeacherAnalyticsWeeklyDelta,
} from "@/lib/analytics-school-aggregates"
import { resolveAnalyticsHashes } from "@/lib/analytics-identifiers"
import { buildDraftInteractionEventRecord } from "@/lib/draft-interaction-events"

function buildReactionPredictionIncrementPatch(
  FieldValue: { increment: (amount: number) => unknown },
  counts: Record<string, number>,
) {
  return Object.entries(counts).reduce<Record<string, unknown>>((patch, [prediction, amount]) => {
    if (amount > 0) {
      patch[`reaction_prediction_counts.${prediction}`] = FieldValue.increment(amount)
    }
    return patch
  }, {})
}

export async function POST(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status },
    )
  }

  const { uid, firestore } = authContext
  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FIRESTORE_UNAVAILABLE",
          message: "Unable to access Firestore.",
        },
      },
      { status: 500 },
    )
  }

  const body = await request.json().catch(() => null)
  if (body?.consent !== true) {
    return NextResponse.json({ success: true, stored: false })
  }

  const record = buildDraftInteractionEventRecord(body?.event ?? {})
  if (!record) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_EVENT",
          message: "Draft analytics event payload is invalid.",
        },
      },
      { status: 400 },
    )
  }

  try {
    const { FieldValue } = await import("firebase-admin/firestore")
    const userRef = firestore.collection("users").doc(uid)
    const userSnapshot = await userRef.get()
    const userData = userSnapshot.data() as
      | {
          email?: unknown
          entitlements?: {
            schoolDomainOverride?: unknown
          }
        }
      | undefined
    const identifiers = resolveAnalyticsHashes({
      uid,
      decodedEmail: authContext.decodedToken.email ?? null,
      userEmail: typeof userData?.email === "string" ? userData.email : null,
      schoolDomainOverride:
        typeof userData?.entitlements?.schoolDomainOverride === "string"
          ? userData.entitlements.schoolDomainOverride
          : null,
    })
    const teacherWeeklyDelta = buildTeacherAnalyticsWeeklyDelta(record, identifiers)
    const schoolWeeklyDelta = identifiers.school_hash
      ? buildSchoolAnalyticsWeeklyDelta(record, identifiers.school_hash)
      : null

    await firestore.collection("analyticsEvents").add({
      ...record,
      teacher_hash: identifiers.teacher_hash,
      school_hash: identifiers.school_hash,
      created_at: FieldValue.serverTimestamp(),
    })

    await firestore
      .collection("analyticsTeacherWeeklyMetrics")
      .doc(`${teacherWeeklyDelta.metrics.teacher_hash}_${teacherWeeklyDelta.weekStartIso}`)
      .set(
        {
          teacher_hash: teacherWeeklyDelta.metrics.teacher_hash,
          school_hash: teacherWeeklyDelta.metrics.school_hash ?? null,
          week_start: teacherWeeklyDelta.metrics.week_start,
          week_end: teacherWeeklyDelta.metrics.week_end,
          drafts_created: FieldValue.increment(teacherWeeklyDelta.metrics.drafts_created),
          rewrites: FieldValue.increment(teacherWeeklyDelta.metrics.rewrites),
          risk_flags_triggered: FieldValue.increment(
            teacherWeeklyDelta.metrics.risk_flags_triggered,
          ),
          after_hours_drafts: FieldValue.increment(teacherWeeklyDelta.metrics.after_hours_drafts),
          weekend_drafts: FieldValue.increment(teacherWeeklyDelta.metrics.weekend_drafts),
          documentation_mode_usage: FieldValue.increment(
            teacherWeeklyDelta.metrics.documentation_mode_usage,
          ),
          edit_depth_total: FieldValue.increment(teacherWeeklyDelta.metrics.edit_depth_total),
          teacher_communication_load: FieldValue.increment(
            teacherWeeklyDelta.metrics.teacher_communication_load,
          ),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

    if (schoolWeeklyDelta) {
      await firestore
        .collection("schoolAnalyticsWeeklyMetrics")
        .doc(`${schoolWeeklyDelta.metrics.school_hash}_${schoolWeeklyDelta.weekStartIso}`)
        .set(
          {
            school_hash: schoolWeeklyDelta.metrics.school_hash,
            week_start: schoolWeeklyDelta.metrics.week_start,
            week_end: schoolWeeklyDelta.metrics.week_end,
            draft_count: FieldValue.increment(schoolWeeklyDelta.metrics.draft_count),
            rewrite_count: FieldValue.increment(schoolWeeklyDelta.metrics.rewrite_count),
            risk_flags_triggered: FieldValue.increment(
              schoolWeeklyDelta.metrics.risk_flags_triggered,
            ),
            after_hours_messages: FieldValue.increment(
              schoolWeeklyDelta.metrics.after_hours_messages,
            ),
            weekend_messages: FieldValue.increment(schoolWeeklyDelta.metrics.weekend_messages),
            documentation_mode_usage: FieldValue.increment(
              schoolWeeklyDelta.metrics.documentation_mode_usage,
            ),
            teacher_communication_load_total: FieldValue.increment(
              schoolWeeklyDelta.metrics.teacher_communication_load_total,
            ),
            ...buildReactionPredictionIncrementPatch(
              FieldValue,
              schoolWeeklyDelta.metrics.reaction_prediction_counts,
            ),
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
    }

    return NextResponse.json({ success: true, stored: true })
  } catch (error) {
    console.error("[analytics] Failed to store draft interaction event", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ANALYTICS_WRITE_FAILED",
          message: "Unable to store analytics event.",
        },
      },
      { status: 500 },
    )
  }
}
