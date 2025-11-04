export const revalidate = 0;

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUidFromRequest } from "@/lib/analytics/auth-limit";

export async function GET(req: NextRequest) {
  const uid = await requireUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const snap = await adminDb.collection("metrics_daily").where("uid","==",uid).get();
  const rows = [["date","drafts","avgGenTimeMs","warm","professional","direct","empathetic"]];
  for (const d of snap.docs) {
    const x = d.data() as any;
    const t = x.tones || {};
    rows.push([x.date, x.drafts ?? 0, x.avgGenTimeMs ?? 0, t.warm ?? 0, t.professional ?? 0, t.direct ?? 0, t.empathetic ?? 0].map(String));
  }
  const csv = rows.map(r => r.join(",")).join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=zaza-draft-usage.csv",
      "Cache-Control": "no-store"
    }
  });
}


