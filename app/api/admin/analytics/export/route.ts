import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  buildCsv,
  getTimeframeDays,
  normalizeAnalyticsTimeframe,
  type UsageSignalRecord,
} from "@/lib/admin/analytics-dashboard"
import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { requireAdminRole } from "@/lib/auth/get-user-role"

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminRole(request)
  if (adminResult instanceof NextResponse) {
    return adminResult
  }

  const timeframe = normalizeAnalyticsTimeframe(
    new URL(request.url).searchParams.get("days"),
  )
  const days = getTimeframeDays(timeframe)
  const { firestore } = getFirebaseAdmin()

  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FIRESTORE_UNAVAILABLE",
          message: "Firestore unavailable",
        },
      },
      { status: 500 },
    )
  }

  const collection = firestore.collection("usage_signals")
  const snapshot =
    days === null
      ? await collection.get()
      : await collection.where("timestamp", ">=", Date.now() - days * 86_400_000).get()
  const signals = snapshot.docs.map((doc) => doc.data() as UsageSignalRecord)
  const csv = buildCsv(signals)
  const exportDate = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zaza-signals-${exportDate}.csv"`,
      "Cache-Control": "max-age=300",
    },
  })
}
