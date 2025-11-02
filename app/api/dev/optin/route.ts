import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUidFromRequest } from "@/lib/analytics/auth-limit";

export async function POST(req: NextRequest) {
  const uid = await requireUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  await adminDb.collection("users").doc(uid).set(
    { analyticsOptIn: true, updatedAt: Date.now() },
    { merge: true }
  );
  return NextResponse.json({ ok: true, uid });
}
