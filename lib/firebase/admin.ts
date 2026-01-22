import admin from "firebase-admin"

let cachedApp: admin.app.App | null = null

const ERR_PROJECT_ID =
  "Missing FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID. Set FIREBASE_PROJECT_ID for server-only usage or expose the project through NEXT_PUBLIC_FIREBASE_PROJECT_ID."

const ERR_CREDENTIALS =
  "Missing FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS. Provide a service account JSON string via FIREBASE_SERVICE_ACCOUNT_JSON or point GOOGLE_APPLICATION_CREDENTIALS at a JSON file."

export function getProjectId() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId) {
    throw new Error(ERR_PROJECT_ID)
  }
  return projectId
}

function parseServiceAccountJson() {
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!rawJson) {
    return null
  }

  try {
    const decoded = JSON.parse(rawJson)
    if (decoded?.private_key) {
      decoded.private_key = decoded.private_key.replace(/\\n/g, "\n")
    }
    return decoded
  } catch {
    console.warn("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON")
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

  const projectId = getProjectId()
  const serviceAccount = parseServiceAccountJson()
  const useServiceAccount = Boolean(serviceAccount)
  const source: "serviceAccountJson" | "applicationDefault" = useServiceAccount
    ? "serviceAccountJson"
    : "applicationDefault"
  let credential: admin.credential.Credential

  if (useServiceAccount) {
    credential = admin.credential.cert(serviceAccount!)
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault()
  } else {
    throw new Error(ERR_CREDENTIALS)
  }

  try {
    cachedApp = admin.initializeApp({
      credential,
      projectId,
    })
    console.info(`[firebase-admin] initialized projectId=${projectId} using ${source}`)
    return cachedApp
  } catch {
    console.error("[firebase-admin] Initialization failed")
    return null
  }
}

export function getFirebaseAdmin() {
  const app = getAdminApp()
  if (!app) {
    return {
      auth: null,
      firestore: null,
      storage: null,
    }
  }

  return {
    auth: admin.auth(app),
    firestore: admin.firestore(app),
    storage: admin.storage(app),
  }
}
