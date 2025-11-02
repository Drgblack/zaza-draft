import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { subDays } from "date-fns";
import { requireUidFromRequest } from "@/lib/analytics/auth-limit";

export async function GET(req: NextRequest) {
  const uid = await requireUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const from = subDays(new Date(), 7).toISOString().slice(0,10);
  const snap = await adminDb.collection("metrics_daily")
    .where("uid", "==", uid)
    .get();

  const items = snap.docs
    .map(d => d.data() as any)
    .filter(d => d.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ items });
}
