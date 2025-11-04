export const revalidate = 0;

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    headers: { "content-type": "application/json" },
  });
}


