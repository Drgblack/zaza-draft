// lib/firebase/admin.ts
import { cert, getApp, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length) return (_app = getApp());

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Support multiline or escaped newline formats:
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // Throw only when actually needed at runtime, not at import time
    throw new Error("Missing Firebase Admin env vars (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY).");
  }

  _app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return _app;
}

export function adminAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getAdminApp());
  return _auth;
}

export function adminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db;
}

// Back-compat aliases if some files import these names:
export { adminAuth as authAdmin };
export { adminDb as dbAdmin };
