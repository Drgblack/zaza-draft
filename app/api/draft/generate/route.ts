import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";

export const runtime = "nodejs";       // enable Node APIs (fs)
export const dynamic = "force-dynamic";

type Tone = "supportive" | "firm" | "neutral" | "celebratory";
type Safeguard = "privacy" | "tone-check" | "de-escalation" | "bias-check" | "no-diagnosis";
type Lang = "EN" | "DE" | "ES" | "FR" | "IT";

type DraftOutput = {
  opening_line: string;
  main_comment: string;
  closing_line: string;
  tone: Tone;
  safeguards_applied: Safeguard[];
  meta: { language: Lang; reading_time_seconds: number; version: string };
};

// Load schema from gpts/draft/schema.json without relying on TS json imports
function loadSchema() {
  const p = resolve(process.cwd(), "gpts", "draft", "schema.json");
  return JSON.parse(readFileSync(p, "utf-8"));
}

const ajv = new Ajv({ allErrors: true, removeAdditional: "all" });
const draftSchema = loadSchema();
const validate = ajv.compile<DraftOutput>(draftSchema);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // TODO: Replace this mock with a real model call using `body` inputs.
    const mock: DraftOutput = {
      opening_line: "Thank you for your ongoing support.",
      main_comment:
        "Based on the details you shared, I drafted a clear, empathetic update that acknowledges strengths and outlines one next step. We will focus on structuring ideas before writing and using a simple checklist to get started independently.",
      closing_line: "If helpful, I can share example prompts for that checklist.",
      tone: "supportive",
      safeguards_applied: ["privacy", "tone-check", "bias-check"],
      meta: {
        language: (body?.language as Lang) || "EN",
        reading_time_seconds: 18,
        version: "1.0.0",
      },
    };

    if (!validate(mock)) {
      return new Response(
        JSON.stringify({ error: "Mock failed schema validation", details: validate.errors }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(mock), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Bad request", details: err?.message || String(err) }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
}
