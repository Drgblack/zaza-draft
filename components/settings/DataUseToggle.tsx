"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function DataUseToggle() {
  const [uid, setUid] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [optIn, setOptIn] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    async function load() {
      if (!uid) return;
      setLoading(true);
      try {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        const v = snap.exists() ? Boolean(snap.data().analyticsOptIn) : false;
        setOptIn(v);
      } catch {
        setMsg("Could not load preference.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uid]);

  async function save(next: boolean) {
    if (!uid) return;
    setSaving(true);
    setMsg("");
    try {
      const ref = doc(db, "users", uid);
      await setDoc(ref, { analyticsOptIn: next, updatedAt: Date.now() }, { merge: true });
      setOptIn(next);
      setMsg(next ? "Analytics enabled (optional, helps improve Zaza)." : "Analytics disabled.");
    } catch {
      setMsg("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border p-5 space-y-3">
      <h2 className="text-lg font-semibold">Data Use (Optional)</h2>
      <p className="text-sm text-gray-600">
        Share anonymised, non-PII usage telemetry to help improve Zaza Draft.
        This is optional and separate from data required for the app to function.
      </p>

      {loading ? (
        <div className="text-sm">Loading…</div>
      ) : (
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={optIn}
            disabled={saving}
            onChange={(e) => save(e.target.checked)}
          />
          <span className="text-sm">{optIn ? "Enabled" : "Disabled"}</span>
        </label>
      )}

      {msg && <div className="text-xs text-gray-500">{msg}</div>}

      <div className="pt-2 text-xs text-gray-500">
        You can change this any time. Insights never include raw student/parent text.
      </div>
    </div>
  );
}
