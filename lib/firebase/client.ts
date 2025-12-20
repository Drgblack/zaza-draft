import { initializeApp, getApps, type FirebaseOptions } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
}

const hasClientConfig =
  typeof window !== "undefined" &&
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId

const firebaseApp =
  hasClientConfig
    ? getApps().length > 0
      ? getApps()[0]
      : initializeApp(firebaseConfig)
    : undefined

export const auth = hasClientConfig && firebaseApp ? getAuth(firebaseApp) : null
export const googleAuthProvider = new GoogleAuthProvider()
