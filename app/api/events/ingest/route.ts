import { NextRequest, NextResponse } from "next/server";
import { EventSchema } from "@/lib/analytics/events";
import { adminDb } from "@/lib/firebase/admin";
import { limitPerMinute, requireUidFromRequest } from "@/lib/analytics/auth-limit";

export async function POST(req: NextRequest) {
  const uid = await requireUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  if (!limitPerMinute(`ingest:${uid}`, 20)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = EventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Bad event" }, { status: 400 });

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const analyticsOptIn = userDoc.exists && Boolean(userDoc.data()?.analyticsOptIn);
    if (!analyticsOptIn) return NextResponse.json({ ok: true, ignored: true });

    await adminDb.collection("events").add({ uid, ...parsed.data, receivedAt: Date.now() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ingest.error", { message: (e as Error).message });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
