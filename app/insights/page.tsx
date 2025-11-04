"use client";
export const revalidate = 0;

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

type Daily = { date: string; drafts: number; avgGenTimeMs: number; tones?: Record<string, number> };

export default function InsightsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [data, setData] = useState<Daily[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    async function load() {
      if (!uid) return;
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken?.();
        const res = await fetch("/api/insights/weekly", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        setData(json.items ?? []);
      } catch {
        setMsg("Could not load insights.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uid]);

  function toLocalCSV() {
    const rows = [["date","drafts","avgGenTimeMs"]];
    for (const d of data) rows.push([d.date, String(d.drafts), String(d.avgGenTimeMs)]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "zaza-draft-usage.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadServerCSV() {
    setMsg("");
    setDownloading(true);
    try {
      const token = await auth.currentUser?.getIdToken?.();
      const res = await fetch("/api/export/my-data.csv", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "zaza-draft-usage.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg("Download failed. Try again.");
    } finally {
      setDownloading(false);
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your insights</h1>
        <a className="text-sm underline" href="/settings">Settings →</a>
      </div>

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

          <div className="flex gap-3">
            <button className="px-3 py-2 rounded-md border" onClick={toLocalCSV}>
              Download my data (local CSV)
            </button>
            <button
              className="px-3 py-2 rounded-md border"
              onClick={downloadServerCSV}
              disabled={downloading}
              title="Uses a secure token so it works in production"
            >
              {downloading ? "Downloading…" : "Download my data (server CSV)"}
            </button>
          </div>

          {msg && <div className="text-xs text-red-600">{msg}</div>}
        </>
      )}
    </div>
  );
}






