"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

type Daily = { date: string; drafts: number; avgGenTimeMs: number; tones?: Record<string, number> };

export default function InsightsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [data, setData] = useState<Daily[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    async function load() {
      if (!uid) return;
      setLoading(true);
      const res = await fetch("/api/insights/weekly", { headers: { "x-user-uid": uid } });
      const json = await res.json();
      setData(json.items ?? []);
      setLoading(false);
    }
    load();
  }, [uid]);

  function toCSV() {
    const rows = [["date","drafts","avgGenTimeMs"]];
    for (const d of data) rows.push([d.date, String(d.drafts), String(d.avgGenTimeMs)]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "zaza-draft-usage.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const totalDrafts = data.reduce((s, d) => s + (d.drafts ?? 0), 0);
  const avgGen = (() => {
    const arr = data.filter(d => d.avgGenTimeMs > 0).map(d => d.avgGenTimeMs);
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
  })();
  const timeSavedMin = Math.max(0, totalDrafts * 12 - Math.round((avgGen/1000/60) * totalDrafts));

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Your insights</h1>
      {loading ? <p>Loading…</p> : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Drafts this week</div>
              <div className="text-3xl font-semibold">{totalDrafts}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">Avg generate time</div>
              <div className="text-3xl font-semibold">{avgGen} ms</div>
            </div>
            <div className="rounded-lg border p-4 col-span-2">
              <div className="text-sm text-gray-500">Estimated time saved</div>
              <div className="text-xl font-medium">{timeSavedMin} minutes</div>
              <p className="text-xs mt-2">Assumes 12 min baseline per draft. This is a transparent estimate.</p>
            </div>
          </div>
          <button className="px-3 py-2 rounded-md border" onClick={toCSV}>
            Download my data (CSV)
          </button>
        </>
      )}
    </div>
  );
}
