import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  buildProductDevelopmentFeed,
  getTimeframeDays,
  normalizeAnalyticsTimeframe,
  summarizeUsageSignals,
  type UsageSignalRecord,
} from "@/lib/admin/analytics-dashboard"
import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { getUserProfile, requireAdminRole } from "@/lib/auth/get-user-role"

function fail(status: number, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: message.replace(/\s+/g, "_").toUpperCase(),
        message,
      },
    },
    { status },
  )
}

async function loadSignals(request: NextRequest) {
  const timeframe = normalizeAnalyticsTimeframe(
    new URL(request.url).searchParams.get("days"),
  )
  const days = getTimeframeDays(timeframe)
  const { firestore } = getFirebaseAdmin()
  if (!firestore) {
    throw new Error("Firestore unavailable")
  }

  const collection = firestore.collection("usage_signals")
  const snapshot =
    days === null
      ? await collection.get()
      : await collection.where("timestamp", ">=", Date.now() - days * 86_400_000).get()

  const signals = snapshot.docs.map((doc) => doc.data() as UsageSignalRecord)
  return { timeframe, signals, firestore }
}

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminRole(request)
  if (adminResult instanceof NextResponse) {
    return adminResult
  }

  try {
    const { timeframe, signals, firestore } = await loadSignals(request)
    const summary = summarizeUsageSignals(signals, timeframe)
    const productDevelopmentFeed = buildProductDevelopmentFeed(summary)
    const viewerProfile = await getUserProfile(adminResult.uid, firestore)

    return NextResponse.json(
      {
        success: true,
        summary,
        productDevelopmentFeed,
        viewer: {
          uid: adminResult.uid,
          role: adminResult.role,
          schoolId: viewerProfile?.schoolId ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "max-age=300",
        },
      },
    )
  } catch (error) {
    return fail(500, (error as Error)?.message ?? "Unable to load analytics summary")
  }
}
