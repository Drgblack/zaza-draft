import { canonicalizeTone } from './tone-map';
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

<<<<<<< HEAD
import { headers } from 'next/headers';
import { authAdmin } from '@/lib/firebase/admin';
import { incrementSnippetUsage } from '@/lib/firestore/usage';
import { rateLimit } from '@/lib/rateLimit';
import { writeAudit } from '@/lib/log';

=======
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
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
<<<<<<< HEAD
    // Check authentication and usage limits
    const authHeader = headers().get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await authAdmin.verifyIdToken(token);

    // Simple per-user rate limiting
    try {
      const rl = rateLimit(`uid:${decodedToken.uid}`, 60, 60_000);
      if (!rl.ok) {
        await writeAudit({ event: 'rate_limited', uid: decodedToken.uid, route: 'api/draft/generate', details: { remaining: rl.remaining } });
        return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (e) {
      // noop
    }

    // Increment usage (enforces freemium limits)
    try {
      await incrementSnippetUsage(decodedToken.uid);
    } catch (e: any) {
      if (e.message === 'Free plan limit reached') {
        await writeAudit({ event: 'snippet_blocked', uid: decodedToken.uid, route: 'api/draft/generate', details: { reason: 'limit_reached' } });
        return new Response(JSON.stringify({ error: 'Free plan limit reached' }), {
          status: 402, // Payment Required
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw e; // Re-throw other errors
    }

=======
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
    const body = await req.json().catch(() => ({}));
    if (!validateReq(body)) {
      return new Response(JSON.stringify({ error: "Invalid request", details: validateReq.errors }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }
    const toneCanon = canonicalizeTone(body.tone);
    if (!toneCanon) {
<<<<<<< HEAD
      // lightweight telemetry for drift
      try { console.warn("TELEMETRY: unmapped_tone_label", { received: body.tone }); } catch {}
=======
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
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

<<<<<<< HEAD
    // Import helpers
    const { withRetry } = await import('./retry');
    const { withTimeout } = await import('./timeout');
    const { logApiEvent } = await import('./logger');
    
    const startTime = Date.now();
    const timeoutMs = parseInt(process.env.DRAFT_AI_TIMEOUT_MS || '10000', 10);
    let mockUsed = false;

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
        
        const resp = await withTimeout(
          () => withRetry(() => fetch("https://api.openai.com/v1/chat/completions", {
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
          })), 
          { timeoutMs }
        );

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
      } catch (e: any) {
        const errorType = e.name === 'TimeoutError' ? 'timeout' :
                         e.status >= 500 ? 'server_error' :
                         e.status === 429 ? 'rate_limit' :
                         e.status >= 400 ? 'client_error' : 'network_error';
                         
        logApiEvent({
          ts: new Date().toISOString(),
          route: 'api/draft/generate',
          model: 'gpt-4o-mini',
          dur_ms: Date.now() - startTime,
          ok: false,
          status: e.status || 500,
          err_type: errorType,
          err_code: e.code,
          mock_used: false
        });
        
        console.warn("OpenAI integration error", { 
          type: errorType,
          status: e.status,
          code: e.code,
          message: e.message
        });
      }
    }

    mockUsed = true;
=======
    // TODO: replace with model call using `body`
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
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
<<<<<<< HEAD
      logApiEvent({
        ts: new Date().toISOString(),
        route: 'api/draft/generate',
        model: 'gpt-4o-mini',
        dur_ms: Date.now() - startTime,
        ok: false,
        status: 500,
        err_type: 'validation_error',
        mock_used: mockUsed
      });
      
=======
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
      return new Response(JSON.stringify({ error: "Output failed schema validation", details: validateOut.errors }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

<<<<<<< HEAD
    logApiEvent({
      ts: new Date().toISOString(),
      route: 'api/draft/generate',
      model: 'gpt-4o-mini',
      dur_ms: Date.now() - startTime,
      ok: true,
      status: 200,
      mock_used: mockUsed
    });

    return new Response(JSON.stringify(mock), { 
      status: 200, 
      headers: { "content-type": "application/json; charset=utf-8" } 
    });
  } catch (err: any) {
    logApiEvent({
      ts: new Date().toISOString(),
      route: 'api/draft/generate',
      model: 'gpt-4o-mini',
      dur_ms: Date.now() - startTime,
      ok: false,
      status: 400,
      err_type: 'bad_request',
      err_code: err?.code,
      mock_used: mockUsed
    });
    
    return new Response(JSON.stringify({ error: "Bad request", details: err?.message || String(err) }), {
      status: 400, headers: { "content-type": "application/json; charset=utf-8" }
=======
    return new Response(JSON.stringify(mock), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Bad request", details: err?.message || String(err) }), {
      status: 400, headers: { "content-type": "application/json" }
>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
    });
  }
}

