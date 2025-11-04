export const revalidate = 0;

export const dynamic = "force-dynamic";

// app/api/classes/[id]/route.ts
import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

type ClassRecord = {
  id: string;
  name?: string;
  description?: string;
  createdAt?: FirebaseFirestore.Timestamp | null;
  ownerUid?: string;
  // add fields you store
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authz = req.headers.get("authorization") ?? "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!token) return Response.json({ error: "Missing token" }, { status: 401 });

    const { uid } = await adminAuth.verifyIdToken(token);
    const id = params.id;

    const snap = await adminDb.collection("classes").doc(id).get();
    if (!snap.exists) return Response.json({ error: "Not found" }, { status: 404 });

    const data = snap.data() as ClassRecord;
    if (data.ownerUid && data.ownerUid !== uid) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ class: { id: snap.id, ...data } }, { status: 200 });
  } catch (e) {
    console.error("GET /api/classes/[id] error", e);
    return Response.json({ error: "Failed to fetch class" }, { status: 500 });
  }
}


