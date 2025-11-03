"use client";
<<<<<<< HEAD
import { useEffect, useState } from "react";
import { TONE_DESCRIPTIONS, SAFEGUARD_DESCRIPTIONS, ERROR_MESSAGES } from "./draft-constants";
import { Tooltip } from "./Tooltip";
import { useAuth } from "@/lib/auth/hooks";
import { getUserProfile } from "@/lib/firestore/usage-client";
import { UpgradeButton } from "./billing/UpgradeButton";
import toast from "react-hot-toast";
=======
import { useState } from "react";
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222

type Tone = "warm" | "professional" | "direct" | "empathetic";
type Lang = "en" | "de" | "es" | "fr";

export default function DraftClient() {
<<<<<<< HEAD
  const { user } = useAuth();
=======
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<Tone>("empathetic");
  const [language, setLanguage] = useState<Lang>("en");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
<<<<<<< HEAD
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      setLoadingProfile(true);
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      } catch (e) {
        console.error(e);
        toast.error('Could not load usage info');
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, [user]);

  async function onGenerate() {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }
    setLoading(true); setErr(null); setResp(null);
    try {
      const token = await user.getIdToken();
      const r = await fetch("/api/draft/generate", {
        method: "POST",
        headers: { 
          "content-type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ notes, tone, language }),
      });
      if (!r.ok) {
        const errJson = await r.json();
        if (r.status === 402) {
          setErr('Free plan limit reached. Please upgrade to continue.');
          return;
        }
        throw new Error(errJson.error || await r.text());
      }
      const json = await r.json();
      setResp(json);

      // Refresh profile to update usage count
      if (user) {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      }
    } catch (e: any) {
      const errMsg = e?.message?.toLowerCase() || "";
      if (errMsg.includes("network")) setErr(ERROR_MESSAGES.network);
      else if (errMsg.includes("validation")) setErr(ERROR_MESSAGES.validation);
      else if (errMsg.includes("openai")) setErr(ERROR_MESSAGES.openai);
      else if (errMsg.includes("bad request")) setErr(ERROR_MESSAGES.badRequest);
      else setErr(ERROR_MESSAGES.default);
=======

  async function onGenerate() {
    setLoading(true); setErr(null); setResp(null);
    try {
      const r = await fetch("/api/draft/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes, tone, language }),
      });
      if (!r.ok) throw new Error(await r.text());
      setResp(await r.json());
    } catch (e: any) {
      setErr(e?.message ?? "Request failed");
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Zaza Draft</h1>
<<<<<<< HEAD
        <div className="flex items-center gap-4">
          {profile && !loadingProfile && (
            <UpgradeButton
              snippetsUsed={profile.usage?.snippetsThisMonth ?? 0}
              snippetsLimit={profile.plan === 'pro' ? Infinity : 10}
              className="mt-1"
            />
          )}
          <span className="rounded-full border px-3 py-1 text-xs">Dev</span>
        </div>
=======
        <span className="rounded-full border px-3 py-1 text-xs">Dev</span>
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
      </header>

      <section className="rounded-2xl border p-4 space-y-3">
        <label className="block text-sm font-medium">Notes</label>
        <textarea
          className="w-full rounded-md border p-3 outline-none"
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Student improving in group work; needs help starting writing."
<<<<<<< HEAD
          data-testid="draft-notes"
        />
        <div className="flex gap-3 flex-wrap">
          {(["warm","professional","direct","empathetic"] as Tone[]).map(t => (
            <Tooltip key={t} content={TONE_DESCRIPTIONS[t]}>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-sm ${tone===t ? "bg-black text-white" : ""}`}
                onClick={() => setTone(t)}
                aria-pressed={tone === t}
                aria-label={`Set tone to ${t}`}
              >
                {t}
              </button>
            </Tooltip>
=======
        />
        <div className="flex gap-3 flex-wrap">
          {(["warm","professional","direct","empathetic"] as Tone[]).map(t => (
            <button
              key={t}
              type="button"
              className={`rounded-full border px-3 py-1 text-sm ${tone===t ? "bg-black text-white" : ""}`}
              onClick={() => setTone(t)}
            >
              {t}
            </button>
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
          ))}
          <select
            className="ml-auto rounded-md border px-3 py-1 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Lang)}
<<<<<<< HEAD
            aria-label="Select language"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
=======
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="es">EspaÃƒÂ±ol</option>
            <option value="fr">FranÃƒÂ§ais</option>
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
          </select>
          <button
            onClick={onGenerate}
            disabled={loading || !notes.trim()}
            className="ml-auto rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
<<<<<<< HEAD
            aria-busy={loading}
            aria-label="Generate draft comment"
            data-testid="draft-generate"
          >
            {loading ? "Generating..." : "Generate"}
=======
          >
            {loading ? "GeneratingÃ¢â‚¬Â¦" : "Generate"}
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
          </button>
        </div>
      </section>

<<<<<<< HEAD
      {!!err && <p className="text-sm text-red-600" data-testid="upgrade-cta">{err}</p>}

      {resp && (
        <section className="rounded-2xl border p-4 space-y-3" data-testid="draft-result">
          <div className="text-sm text-gray-500">
            tone: {resp.tone} - lang: {resp.meta?.language}
          </div>
          <div className="flex gap-2 flex-wrap" role="toolbar" aria-label="Copy options">
            <button 
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(resp.opening_line);
                toast.success('Opening line copied');
              }}
              aria-label="Copy opening line"
            >
              Copy opening
            </button>
            <button 
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(resp.main_comment);
                toast.success('Main comment copied');
              }}
              aria-label="Copy main comment"
            >
              Copy main
            </button>
            <button 
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(resp.closing_line);
                toast.success('Closing line copied');
              }}
              aria-label="Copy closing line"
            >
              Copy closing
            </button>
            <button 
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(resp));
                toast.success('JSON copied');
              }}
              aria-label="Copy raw JSON"
            >
              Copy JSON
            </button>
=======
      {!!err && <p className="text-sm text-red-600">{err}</p>}

      {resp && (
        <section className="rounded-2xl border p-4 space-y-3">
          <div className="text-sm text-gray-500">
            tone: {resp.tone} - lang: {resp.meta?.language}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="rounded-md border px-2 py-1 text-xs" onClick={() => navigator.clipboard.writeText(resp.opening_line)}>Copy opening</button>
            <button className="rounded-md border px-2 py-1 text-xs" onClick={() => navigator.clipboard.writeText(resp.main_comment)}>Copy main</button>
            <button className="rounded-md border px-2 py-1 text-xs" onClick={() => navigator.clipboard.writeText(resp.closing_line)}>Copy closing</button>
            <button className="rounded-md border px-2 py-1 text-xs" onClick={() => navigator.clipboard.writeText(JSON.stringify(resp))}>Copy JSON</button>
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
          </div>
          <p className="font-medium">{resp.opening_line}</p>
          <p>{resp.main_comment}</p>
          <p className="italic">{resp.closing_line}</p>
          {Array.isArray(resp.safeguards_applied) && (
            <div className="flex gap-2 flex-wrap pt-2">
<<<<<<< HEAD
              {resp.safeguards_applied.map((s: keyof typeof SAFEGUARD_DESCRIPTIONS) => (
                <Tooltip key={s} content={SAFEGUARD_DESCRIPTIONS[s]}>
                  <span className="rounded-full border px-2 py-0.5 text-xs cursor-help">{s}</span>
                </Tooltip>
=======
              {resp.safeguards_applied.map((s: string) => (
                <span key={s} className="rounded-full border px-2 py-0.5 text-xs">{s}</span>
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
              ))}
            </div>
          )}
        </section>
      )}

<<<<<<< HEAD
      {profile && (
        <div data-testid="plan-status" className="text-sm text-gray-500">
          {profile.plan === 'pro' ? 'Pro' : 'Free'} Plan
        </div>
      )}

=======
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
      <footer className="text-xs text-gray-500">
        AI assists; teachers approve. Please review before sending to parents.
      </footer>
    </main>
  );
}






