import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

type ClassRecord = {
  id: string;
  name?: string;
  createdAt?: FirebaseFirestore.Timestamp | null;
  // add fields as needed
};

export async function GET(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") ?? "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) {
      return Response.json({ error: "Missing token" }, { status: 401 });
    }

    const { uid } = await adminAuth.verifyIdToken(idToken);

    // Adjust collection/query to your schema
    const snap = await adminDb
      .collection("classes")
      .where("ownerUid", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const classes: ClassRecord[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClassRecord, "id">),
    }));

    return Response.json({ classes }, { status: 200 });
  } catch (e) {
    console.error("GET /api/classes error", e);
    return Response.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}
