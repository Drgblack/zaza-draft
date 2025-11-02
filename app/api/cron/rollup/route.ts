import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { subDays, startOfDay, endOfDay } from "date-fns";

export async function GET() {
  try {
    const day = subDays(new Date(), 1);
    const from = startOfDay(day).getTime();
    const to = endOfDay(day).getTime();

    const snap = await adminDb.collection("events")
      .where("receivedAt", ">=", from)
      .where("receivedAt", "<=", to)
      .get();

    const byUser: Record<string, any[]> = {};
    snap.forEach(doc => {
      const ev = doc.data();
      if (!byUser[ev.uid]) byUser[ev.uid] = [];
      byUser[ev.uid].push(ev);
    });

    const batch = adminDb.batch();
    for (const [uid, events] of Object.entries(byUser)) {
      let drafts = 0;
      let totalGenTime = 0;
      const tones: Record<string, number> = {};

      for (const e of events) {
        if (e.type === "draft.generate.success") {
          drafts += 1;
          if (e.props?.ms) totalGenTime += Number(e.props.ms);
        }
        if (e.type === "tone.select" && e.props?.toneId) {
          tones[e.props.toneId] = (tones[e.props.toneId] ?? 0) + 1;
        }
      }

      const avgGenTimeMs = drafts > 0 ? Math.round(totalGenTime / drafts) : 0;
      const dateKey = `${uid}_${day.toISOString().slice(0,10)}`;

      const ref = adminDb.collection("metrics_daily").doc(dateKey);
      batch.set(ref, {
        uid,
        date: day.toISOString().slice(0,10),
        drafts,
        avgGenTimeMs,
        tones,
        updatedAt: Date.now(),
      }, { merge: true });
    }

    await batch.commit();
    return NextResponse.json({ ok: true, usersProcessed: Object.keys(byUser).length });
  } catch {
    return NextResponse.json({ error: "rollup failed" }, { status: 500 });
  }
}
