export const revalidate = 0;

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST() {
  const ninety = 90 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - ninety;
  const q = await adminDb.collection("events").where("receivedAt","<",cutoff).get();
  const batch = adminDb.batch();
  q.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return NextResponse.json({ ok: true, deleted: q.size });
}


