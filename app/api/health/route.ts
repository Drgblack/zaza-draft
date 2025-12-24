import { NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"
import { getConfiguredModelNames } from "@/lib/ai/provider"

export async function GET() {
  const { auth, firestore } = getFirebaseAdmin()
  if (!auth || !firestore) {
    return NextResponse.json(
      {
        success: false,
        status: "degraded",
        message: "Firebase Admin is not initialized.",
      },
      { status: 503 },
    )
  }

  const models = getConfiguredModelNames()
  if (!models.primary) {
    return NextResponse.json(
      {
        success: false,
        status: "degraded",
        message: "OpenAI primary model not configured.",
      },
      { status: 503 },
    )
  }

  const docRef = firestore.collection("health_checks").doc("status")
  try {
    await docRef.set({ lastCheckedAt: FieldValue.serverTimestamp() }, { merge: true })
    const doc = await docRef.get()
    const lastChecked = doc.exists ? doc.data()?.lastCheckedAt?.toDate?.() ?? null : null

    return NextResponse.json({
      success: true,
      status: "ok",
      models,
      firestore: {
        status: "available",
        lastCheckedAt: lastChecked?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error("[health] Firestore readiness failed", error)
    return NextResponse.json(
      {
        success: false,
        status: "degraded",
        message: "Firestore health check failed.",
      },
      { status: 502 },
    )
  }
}
