"use client";

export const revalidate = 0;
import { useState } from "react";

const FRIENDLY_TONES: { label: string; value: string }[] = [
  { label: "Warm & Encouraging", value: "Warm & Encouraging" },
  { label: "Professional & Neutral", value: "Professional & Neutral" },
  { label: "Direct & Clear", value: "Direct & Clear" },
  { label: "Empathetic & Supportive", value: "Empathetic & Supportive" },
];

const LANGS = [
  { label: "English", value: "en" },
  { label: "Deutsch", value: "de" },
  { label: "EspaÃ±ol", value: "es" },
  { label: "FranÃ§ais", value: "fr" },
];

// Client-side mapper mirrors server tone-map
function toCanonicalTone(label: string): "warm" | "professional" | "direct" | "empathetic" | undefined {
  const k = (label || "").trim().toLowerCase();
  const map: Record<string, any> = {
    "warm & encouraging": "warm",
    "professional & neutral": "professional",
    "direct & clear": "direct",
    "empathetic & supportive": "empathetic",
    supportive: "empathetic",
    firm: "direct",
    warm: "warm",
    professional: "professional",
    direct: "direct",
    empathetic: "empathetic",
  } as const;
  return map[k];
}

export default function Page() {
  const [notes, setNotes] = useState("");
  const [toneLabel, setToneLabel] = useState(FRIENDLY_TONES[0].value);
  const [language, setLanguage] = useState(LANGS[0].value);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const tone = toCanonicalTone(toneLabel) ?? toneLabel; // server also canonicalizes
      const res = await fetch("/api/draft/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes, tone, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      setResult(json);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Zaza Draft â€“ Dev</h1>
      <p>
        API: <code>/api/draft/generate</code>
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            style={{ width: "100%" }}
            placeholder="Key points to include..."
            required
          />
        </label>

        <label>
          Tone
          <select value={toneLabel} onChange={(e) => setToneLabel(e.target.value)} required>
            {FRIENDLY_TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value)} required>
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Generatingâ€¦" : "Generate"}
        </button>
      </form>

      {error && (
        <pre style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>Error: {error}</pre>
      )}
      {result && (
        <pre style={{ background: "#f3f4f6", padding: "0.75rem" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}



