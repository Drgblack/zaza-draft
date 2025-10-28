import { canonicalizeTone } from './tone-map';
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tone = "warm" | "professional" | "direct" | "empathetic";
type Safeguard = "privacy" | "tone-check" | "de-escalation" | "bias-check" | "no-diagnosis";
type Lang = "en" | "de" | "es" | "fr";

type DraftOutput = {
  opening_line: string;
  main_comment: string;
  closing_line: string;
  tone: Tone;
  safeguards_applied: Safeguard[];
  meta: { language: Lang; reading_time_seconds: number; version: string };
};

const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: "all" });
addFormats(ajv);

function loadSchema() {
  const p = resolve(process.cwd(), "gpts", "draft", "schema.json");
  return JSON.parse(readFileSync(p, "utf-8").replace(/^\uFEFF/, ""));
}

// Simple request schema (mapped to Tech/Product spec)
const requestSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    language: { type: "string", enum: ["en", "de", "es", "fr"] },
    // Accept friendly labels; route will canonicalize via tone-map
    tone: { type: "string" },
    notes: { type: "string", maxLength: 2000 } // teacher's draft notes/context
  },
  required: ["language", "tone", "notes"]
};

const validateReq = ajv.compile(requestSchema);
const validateOut = ajv.compile<DraftOutput>(loadSchema());

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!validateReq(body)) {
      return new Response(JSON.stringify({ error: "Invalid request", details: validateReq.errors }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }
    const toneCanon = canonicalizeTone(body.tone);
    if (!toneCanon) {
      // lightweight telemetry for drift
      try { console.warn("TELEMETRY: unmapped_tone_label", { received: body.tone }); } catch {}
      return new Response(
        JSON.stringify({
          error: "Unsupported tone label",
          allowedLabels: [
            "Warm & Encouraging",
            "Professional & Neutral",
            "Direct & Clear",
            "Empathetic & Supportive",
            "Warm",
            "Professional",
            "Direct",
            "Empathetic",
            "Supportive",
            "Firm"
          ],
          canonical: ["warm", "professional", "direct", "empathetic"]
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Prefer OpenAI when configured; fall back to mock
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const prompt = [
          "You are Zaza Draft, a teacher-first assistant.",
          "Write a short parent-ready comment in the requested tone and language.",
          "Return strictly the following JSON keys: opening_line, main_comment, closing_line, tone, safeguards_applied, meta.",
          "- tone must be one of: warm, professional, direct, empathetic.",
          "- meta.language must be one of: en, de, es, fr.",
          "- No extra keys.",
          "Notes:",
          String(body.notes || "")
        ].join("\n");

        // Import withRetry at the top of the file
        const { withRetry } = await import('./retry');
        
        const resp = await withRetry(() => fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json; charset=utf-8",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are Zaza Draft. Always return only JSON as specified." },
              { role: "user", content: `tone=${toneCanon}; language=${body.language}; ${prompt}` },
            ],
            temperature: 0.4,
          })
        }));

        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.choices?.[0]?.message?.content || "";
          // Attempt to extract JSON block
          const jsonStr = (() => {
            const m = text.match(/\{[\s\S]*\}/);
            return m ? m[0] : text;
          })();
          const candidate = JSON.parse(jsonStr);
          // Inject enforced fields
          candidate.tone = toneCanon;
          candidate.meta = candidate.meta || {};
          candidate.meta.language = body.language;
          if (!validateOut(candidate)) {
            // fall through to mock if invalid
            console.warn("OpenAI output failed schema validation", validateOut.errors);
          } else {
            return new Response(JSON.stringify(candidate), { status: 200, headers: { "content-type": "application/json" } });
          }
        } else {
          const errtxt = await resp.text();
          console.warn("OpenAI request failed", resp.status, errtxt);
        }
      } catch (e) {
        console.warn("OpenAI integration error", e);
      }
    }

    const mock: DraftOutput = {
      opening_line: "Thank you for your ongoing support.",
      main_comment:
        "Based on the details you shared, here is a clear, school-ready draft that acknowledges strengths and suggests one next step. We will focus on structuring ideas before writing and using a simple checklist to get started independently.",
      closing_line: "If helpful, I can share example prompts for that checklist.",
      tone: toneCanon,
      safeguards_applied: ["privacy", "tone-check", "bias-check"],
      meta: { language: (body.language as Lang) || "en", reading_time_seconds: 18, version: "1.0.0" }
    };

    if (!validateOut(mock)) {
      return new Response(JSON.stringify({ error: "Output failed schema validation", details: validateOut.errors }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify(mock), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Bad request", details: err?.message || String(err) }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }
}

