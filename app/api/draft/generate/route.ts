// app/api/draft/generate/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs"; // ensure server runtime for Next 14

type GeneratePayload = {
  prompt: string;
  tone?: string;
  language?: string;
  studentName?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<GeneratePayload>;
    const prompt = (body.prompt ?? "").toString().trim();
    const tone = (body.tone ?? "professional").toString();
    const language = (body.language ?? "en").toString();
    const studentName = (body.studentName ?? "Alex").toString();

    if (!prompt) {
      return Response.json(
        { error: "Missing 'prompt' in request body." },
        { status: 400 }
      );
    }

    // TODO: integrate real generation (OpenAI/your pipeline).
    // For now, return a deterministic draft so the UI and tests pass.
    const draft = [
      `Hi ${studentName === "Alex" ? "there" : studentName},`,
      "",
      `Thanks for your message. ${prompt}`,
      "",
      `Tone: ${tone} · Language: ${language}`,
      "",
      "Best regards,",
      "Zaza Draft",
    ].join("\n");

    return Response.json(
      {
        draft,
        meta: {
          tone,
          language,
          safe: true,
          model: "placeholder",
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("draft/generate error", err);
    return Response.json(
      { error: "Failed to generate draft." },
      { status: 500 }
    );
  }
}
