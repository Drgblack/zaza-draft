export const revalidate = 0;

export const dynamic = "force-dynamic";

// app/api/draft/generate/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { canonicalizeTone } from "./tone-map";
import { withRetry } from "./retry";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

export const runtime = "nodejs"; // ensure server runtime for Next 14

type GeneratePayload = {
  notes: string; // The teacher's input/context
  tone?: string;
  language?: string;
};

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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load and compile schema
let schemaValidator: ValidateFunction | null = null;
function getValidator() {
  if (schemaValidator) return schemaValidator;
  
  const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: "all" });
  addFormats(ajv);
  
  const schemaPath = resolve(process.cwd(), "gpts", "draft", "schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8").replace(/^\uFEFF/, ""));
  schemaValidator = ajv.compile(schema);
  return schemaValidator;
}

// Calculate reading time (average reading speed: 200 words per minute)
function calculateReadingTime(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil((words / 200) * 60)); // Convert to seconds
}

// Determine which safeguards were applied based on content analysis
function determineSafeguards(draft: string, tone: Tone): Safeguard[] {
  const safeguards: Safeguard[] = ["privacy", "tone-check"]; // Always apply these
  
  // Check for de-escalation (if contains supportive/problem-solving language)
  if (draft.toLowerCase().includes("support") || draft.toLowerCase().includes("work together") || draft.toLowerCase().includes("next steps")) {
    safeguards.push("de-escalation");
  }
  
  // Bias-check: ensure inclusive language
  if (!draft.match(/\b(he|she|his|her)\b/i) || draft.toLowerCase().includes("they") || draft.toLowerCase().includes("student")) {
    safeguards.push("bias-check");
  }
  
  // No-diagnosis: check for absence of clinical terms
  const clinicalTerms = ["diagnosis", "disorder", "syndrome", "condition", "therapy", "treatment"];
  if (!clinicalTerms.some(term => draft.toLowerCase().includes(term))) {
    safeguards.push("no-diagnosis");
  }
  
  return safeguards;
}

// Build system prompt based on tone and language
function buildSystemPrompt(tone: Tone, language: Lang): string {
  const toneDescriptions: Record<Tone, string> = {
    warm: "warm, encouraging, and positive - celebrates progress and builds confidence",
    professional: "clear, balanced, and objective - maintains appropriate boundaries and formality",
    direct: "straightforward, specific, and focused - gets to key points efficiently",
    empathetic: "understanding, supportive, and compassionate - acknowledges challenges and shows care",
  };

  const languageNames: Record<Lang, string> = {
    en: "English",
    de: "German (Deutsch)",
    es: "Spanish (Español)",
    fr: "French (Français)",
  };

  return `You are Zaza Draft, a teacher-first assistant for writing parent comments and report notes.

ROLE
Help teachers produce clear, empathetic, and professional comments fast while preserving teacher voice and agency.

STYLE
- Write in a ${toneDescriptions[tone]} tone
- Be warm, supportive, and concise; never robotic or corporate
- Write in ${languageNames[language]}, keeping tone natural and school-appropriate

SAFETY / GUARDRAILS
- No diagnoses, labels, or sensitive personal details
- De-escalate conflict; avoid blame; propose constructive next steps
- Never invent facts about students - only use information provided in the prompt
- Emphasize teacher agency: "Here's a draft; please review before sending."

OUTPUT FORMAT
Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "opening_line": "A brief greeting or opening statement (3-50 words)",
  "main_comment": "The main message body (50-200 words, specific and actionable)",
  "closing_line": "A brief closing statement inviting partnership (3-30 words)",
  "tone": "${tone}",
  "safeguards_applied": ["privacy", "tone-check", "de-escalation", "bias-check", "no-diagnosis"],
  "meta": {
    "language": "${language}",
    "reading_time_seconds": 15,
    "version": "1.0.0"
  }
}

GUIDELINES
- opening_line: Friendly, professional greeting that sets context
- main_comment: Specific observations, evidence-based phrasing, concrete next steps
- closing_line: Invitation for partnership or offer of support
- Total length: 95-300 words across all three sections
- Use evidence-based phrasing with specific behaviors, goals, and strategies
- Keep language appropriate for parent-teacher communication`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Authenticate user
    const authz = req.headers.get("authorization") || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!token) {
      return Response.json({ error: "Missing authorization token" }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await adminAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch (authError) {
      console.error("Auth verification failed:", authError);
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = (await req.json()) as Partial<GeneratePayload>;
    const notes = (body.notes ?? "").toString().trim();
    const toneInput = (body.tone ?? "professional").toString();
    const languageInput = (body.language ?? "en").toString();

    if (!notes) {
      return Response.json(
        { error: "Missing 'notes' in request body." },
        { status: 400 }
      );
    }

    if (notes.length > 2000) {
      return Response.json(
        { error: "Notes exceed maximum length of 2000 characters." },
        { status: 400 }
      );
    }

    // 3. Canonicalize tone and validate language
    const tone = canonicalizeTone(toneInput) || "professional";
    const lang = ["en", "de", "es", "fr"].includes(languageInput) 
      ? (languageInput as Lang) 
      : "en";

    // 4. Check usage limits (only for free tier)
    try {
      const userDoc = await adminDb().collection("users").doc(uid).get();
      const userData = userDoc.data();
      const plan = userData?.plan || "free";
      
      if (plan === "free") {
        const snippetsThisMonth = userData?.usage?.snippetsThisMonth || 0;
        const FREE_SNIPPETS_PER_MONTH = 10;
        
        if (snippetsThisMonth >= FREE_SNIPPETS_PER_MONTH) {
          return Response.json(
            { error: "Free plan limit reached. Please upgrade to continue." },
            { status: 402 }
          );
        }
      }
    } catch (usageError) {
      console.error("Usage check failed:", usageError);
      // Continue anyway - don't block generation on usage check failure
    }

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt(tone, lang);

    // 6. Call OpenAI with retry logic and fallback
    let model = "gpt-4-turbo-preview";
    let responseText: string;
    let completion: OpenAI.Chat.Completions.ChatCompletion;

    try {
      completion = await withRetry(
        async () => {
          const result = await openai.chat.completions.create({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: notes }
            ],
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: "json_object" },
          });
          return result;
        },
        {
          attempts: 3,
          base: 500,
          factor: 1.5,
          timeoutMs: 30000,
          shouldRetry: (err) => {
            // Retry on network errors, rate limits, or timeouts
            if (err instanceof Error) {
              const msg = err.message.toLowerCase();
              return msg.includes("rate limit") || 
                     msg.includes("timeout") || 
                     msg.includes("network") ||
                     msg.includes("econnreset");
            }
            return false;
          },
        }
      );
      
      responseText = completion.choices[0]?.message?.content || "";
      
      if (!responseText) {
        throw new Error("Empty response from OpenAI");
      }
    } catch (openaiError: any) {
      console.error("GPT-4 failed, trying GPT-3.5 fallback:", openaiError);
      
      // Fallback to GPT-3.5-turbo
      try {
        model = "gpt-3.5-turbo";
        completion = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: notes }
          ],
          temperature: 0.7,
          max_tokens: 800,
          response_format: { type: "json_object" },
        });
        
        responseText = completion.choices[0]?.message?.content || "";
        
        if (!responseText) {
          throw new Error("Empty response from GPT-3.5 fallback");
        }
      } catch (fallbackError) {
        console.error("Both GPT-4 and GPT-3.5 failed:", fallbackError);
        return Response.json(
          { error: "AI generation failed. Please try again." },
          { status: 500 }
        );
      }
    }

    // 7. Parse and validate JSON response
    let parsed: any;
    try {
      // Remove markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Response:", responseText);
      return Response.json(
        { error: "Invalid response format from AI." },
        { status: 500 }
      );
    }

    // 8. Validate against schema
    const validate = getValidator();
    const valid = validate(parsed);
    
    if (!valid) {
      console.error("Schema validation failed:", validate.errors);
      // Try to fix common issues
      if (!parsed.meta) parsed.meta = {};
      if (!parsed.meta.language) parsed.meta.language = lang;
      if (!parsed.meta.version) parsed.meta.version = "1.0.0";
      
      // Recalculate reading time
      const fullText = `${parsed.opening_line || ""} ${parsed.main_comment || ""} ${parsed.closing_line || ""}`;
      parsed.meta.reading_time_seconds = calculateReadingTime(fullText);
      
      // Ensure safeguards
      if (!Array.isArray(parsed.safeguards_applied)) {
        parsed.safeguards_applied = determineSafeguards(
          `${parsed.opening_line} ${parsed.main_comment} ${parsed.closing_line}`,
          tone
        );
      }
      
      // Ensure tone matches
      parsed.tone = tone;
      
      // Validate again
      const revalidate = getValidator();
      if (!revalidate(parsed)) {
        console.error("Re-validation still failed:", revalidate.errors);
        return Response.json(
          { error: "AI response validation failed." },
          { status: 500 }
        );
      }
    }

    // 9. Post-process: calculate reading time if missing, ensure safeguards
    const fullText = `${parsed.opening_line} ${parsed.main_comment} ${parsed.closing_line}`;
    parsed.meta.reading_time_seconds = parsed.meta.reading_time_seconds || calculateReadingTime(fullText);
    
    if (!Array.isArray(parsed.safeguards_applied) || parsed.safeguards_applied.length === 0) {
      parsed.safeguards_applied = determineSafeguards(fullText, tone);
    }

    const output: DraftOutput = {
      opening_line: parsed.opening_line,
      main_comment: parsed.main_comment,
      closing_line: parsed.closing_line,
      tone: parsed.tone as Tone,
      safeguards_applied: parsed.safeguards_applied as Safeguard[],
      meta: {
        language: parsed.meta.language as Lang,
        reading_time_seconds: parsed.meta.reading_time_seconds,
        version: parsed.meta.version || "1.0.0",
      },
    };

    // 10. Increment usage counter (async, don't wait)
    adminDb()
      .collection("users")
      .doc(uid)
      .update({
        "usage.snippetsThisMonth": FieldValue.increment(1),
        updatedAt: Date.now(),
      })
      .catch((err) => console.error("Failed to increment usage:", err));

    // 11. Log generation event (async)
    const generationTime = Date.now() - startTime;
    adminDb()
      .collection("events")
      .add({
        uid,
        type: "draft.generate.success",
        timestamp: Date.now(),
        props: {
          model,
          tone,
          language: lang,
          ms: generationTime,
        },
      })
      .catch((err) => console.error("Failed to log event:", err));

    return Response.json(output, { status: 200 });
  } catch (err) {
    console.error("draft/generate error", err);
    
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    
    // Don't expose internal errors to client
    return Response.json(
      { error: "Failed to generate draft. Please try again." },
      { status: 500 }
    );
  }
}


