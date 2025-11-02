export async function track(uid: string | null | undefined, event: {
  type: string; ts?: number; ctx?: Record<string, any>; props?: Record<string, any>;
}) {
  if (!uid) return;
  try {
    await fetch("/api/events/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-uid": uid },
      body: JSON.stringify({
        type: event.type,
        ts: event.ts ?? Date.now(),
        ctx: event.ctx ?? {},
        props: event.props ?? {},
      }),
      keepalive: true,
    });
  } catch {}
}
