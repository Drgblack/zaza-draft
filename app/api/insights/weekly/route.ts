import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-user-uid");
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
