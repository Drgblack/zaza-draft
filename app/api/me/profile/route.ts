import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

// shape this to whatever your profile doc looks like
type Profile = {
  plan?: "free" | "pro";
  usage?: { snippetsThisMonth?: number };
  stripeSubscriptionStatus?: string;
  stripeCustomerId?: string;
};

export async function GET(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!token) {
      return Response.json({ error: "Missing token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const snap = await adminDb.collection("profiles").doc(uid).get();
    const data = (snap.exists ? snap.data() : {}) as Profile;

    return Response.json(data, { status: 200 });
  } catch (e) {
    console.error("GET /api/me/profile error", e);
    return Response.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
