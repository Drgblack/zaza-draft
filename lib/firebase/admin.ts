import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Reuse app in tests & dev; use applicationDefault so emulators work if set
const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
});

// Primary handles
export const dbAdmin   = getFirestore(app);
export const authAdmin = getAuth(app);

// Optional default export (some codebases import default)
export default app;