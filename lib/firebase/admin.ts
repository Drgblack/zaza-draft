import admin from "firebase-admin"

let cachedApp: admin.app.App | null = null

function parseServiceAccount() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return null
  }

  try {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  } catch (error) {
    console.warn("[firebase-admin] Failed to parse service account key", error)
    return null
  }
}

function getAdminApp() {
  if (cachedApp) {
    return cachedApp
  }

  if (admin.apps.length > 0) {
    cachedApp = admin.apps[0]
    return cachedApp
  }

  const credentialData = parseServiceAccount()
  if (!credentialData) {
    return null
  }

  try {
    cachedApp = admin.initializeApp({
      credential: admin.credential.cert(credentialData),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
    return cachedApp
  } catch (error) {
    console.error("[firebase-admin] Initialization failed", error)
    return null
  }
}

export function getFirebaseAdmin() {
  const app = getAdminApp()
  if (!app) {
    return {
      auth: null,
      firestore: null,
    }
  }

  return {
    auth: admin.auth(app),
    firestore: admin.firestore(app),
  }
}
