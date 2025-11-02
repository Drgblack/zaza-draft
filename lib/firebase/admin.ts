import { getApps, initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

const isProd = process.env.NODE_ENV === "production";
const hasBypass = !!process.env.ANALYTICS_DEV_BYPASS_UID;
const hasEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

const projectId = process.env.FIREBASE_PROJECT_ID || "zaza-draft-dev";

function initAdmin() {
  if (getApps().length) return;

  if (isProd) {
    // Strict in production: require service account
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY!;
    const privateKey = privateKeyRaw?.includes("\\n") ? privateKeyRaw.replace(/\\n/g, "\n") : privateKeyRaw;
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount) });
    return;
  }

  // Development: allow running without creds (emulator or local dev)
  // Admin SDK + Firestore Emulator works with just projectId and FIRESTORE_EMULATOR_HOST
  initializeApp({ projectId });
}

initAdmin();

export const adminDb = getFirestore();
export const adminAuth = getAdminAuth();

// Firestore Admin SDK will auto-use emulator if FIRESTORE_EMULATOR_HOST is set.

export { adminAuth as authAdmin, adminDb as dbAdmin };
