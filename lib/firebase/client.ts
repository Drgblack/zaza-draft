import { initializeApp, getApps } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Dev emulator support
if (typeof window !== "undefined") {
  const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  if (host) {
    const [h, p] = host.split(":");
    connectFirestoreEmulator(db, h, Number(p));
  }
  const authHost = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST;
  if (authHost) {
    connectAuthEmulator(auth, `http://${authHost}`);
  }
}
