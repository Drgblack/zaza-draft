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

    // TODO: replace with model call using `body`
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

