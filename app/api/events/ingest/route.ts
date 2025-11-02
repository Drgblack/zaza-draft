import { NextRequest, NextResponse } from "next/server";
import { EventSchema } from "@/lib/analytics/events";
import { adminDb } from "@/lib/firebase/admin";

// Replace header validation with your real auth in production.
export async function POST(req: NextRequest) {
  try {
    const uid = req.headers.get("x-user-uid");
    if (!uid) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = EventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Bad event" }, { status: 400 });

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const analyticsOptIn = userDoc.exists && Boolean(userDoc.data()?.analyticsOptIn);
    if (!analyticsOptIn) return NextResponse.json({ ok: true, ignored: true });

    await adminDb.collection("events").add({ uid, ...parsed.data, receivedAt: Date.now() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
