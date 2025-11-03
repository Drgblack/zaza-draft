import { adminAuth } from "@/lib/firebase/admin";

const BYPASS_UID = process.env.ANALYTICS_DEV_BYPASS_UID;

export async function requireUidFromRequest(req: Request): Promise<string | null> {
  // Prefer Bearer token
  const authz = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authz?.startsWith("Bearer ")) {
    const idToken = authz.slice("Bearer ".length).trim();
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return decoded.uid ?? null;
    } catch {
      // fallthrough to dev bypass
    }
  }
  // Dev-only bypass to ease local testing
  if (process.env.NODE_ENV !== "production" && BYPASS_UID) return BYPASS_UID;
  return null;
}

const buckets = new Map<string, { count: number; ts: number }>();

export function limitPerMinute(key: string, limit = 20) {
  const now = Date.now();
  const rec = buckets.get(key);
  if (!rec || now - rec.ts > 60_000) {
    buckets.set(key, { count: 1, ts: now });
    return true;
  }
  if (rec.count < limit) {
    rec.count += 1;
    return true;
  }
  return false;
}
