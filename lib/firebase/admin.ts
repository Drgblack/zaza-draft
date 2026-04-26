import fs from "fs"
import path from "path"
import admin from "firebase-admin"
import { getExplicitFirebaseProjectId } from "@/lib/firebase/project-policy"

let cachedApp: admin.app.App | null = null
let credentialError: string | null = null

const ERR_PROJECT_ID =
  "Missing FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID. Set FIREBASE_PROJECT_ID for server-only usage or expose the project through NEXT_PUBLIC_FIREBASE_PROJECT_ID."

const ERR_SERVER_PROJECT_ID =
  "Missing FIREBASE_PROJECT_ID. Server-side Firebase Admin must use an explicit FIREBASE_PROJECT_ID and must not rely on NEXT_PUBLIC_FIREBASE_PROJECT_ID."

const ERR_CREDENTIALS =
  "Missing FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS. Provide a service account JSON string via FIREBASE_SERVICE_ACCOUNT_JSON or point GOOGLE_APPLICATION_CREDENTIALS at a JSON file."

const GEO_CREDENTIAL_GUIDANCE =
  "Ensure GOOGLE_APPLICATION_CREDENTIALS points to a valid service-account JSON with 'type': 'service_account' and a 'client_email'."

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

  credentialError = null
  let projectId: string
  try {
    projectId = getExplicitFirebaseProjectId()
  } catch (error) {
    credentialError = error instanceof Error ? error.message : ERR_SERVER_PROJECT_ID
    console.error("[firebase-admin] Missing explicit server project id", credentialError)
    return null
  }
  const serviceAccount = parseServiceAccountJson()
  const useServiceAccount = Boolean(serviceAccount)
  const source: "serviceAccountJson" | "applicationDefault" = useServiceAccount
    ? "serviceAccountJson"
    : "applicationDefault"
  let credential: admin.credential.Credential

  if (useServiceAccount) {
    if (serviceAccount?.project_id && serviceAccount.project_id !== projectId) {
      credentialError = `FIREBASE_PROJECT_ID (${projectId}) does not match the service account project (${serviceAccount.project_id}).`
      console.error("[firebase-admin] Service account project mismatch", credentialError)
      return null
    }
    credential = admin.credential.cert(serviceAccount!)
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const applicationDefaultProjectId = validateApplicationDefaultCredential(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      )
      if (applicationDefaultProjectId && applicationDefaultProjectId !== projectId) {
        credentialError = `FIREBASE_PROJECT_ID (${projectId}) does not match the GOOGLE_APPLICATION_CREDENTIALS project (${applicationDefaultProjectId}).`
        console.error("[firebase-admin] Application default project mismatch", credentialError)
        return null
      }
      credential = admin.credential.applicationDefault()
    } catch (error) {
      credentialError =
        error instanceof Error ? error.message : "Invalid GOOGLE_APPLICATION_CREDENTIALS"
      console.error("[firebase-admin] Invalid application default credentials", credentialError)
      return null
    }
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

  const firestore = admin.firestore(app)
  ensureFirestoreSettings(firestore)

  return {
    auth: admin.auth(app),
    firestore,
    storage: admin.storage(app),
  }
}

function ensureFirestoreSettings(firestore: admin.firestore.Firestore) {
  const SETTINGS_KEY = "__ignoreUndefinedPropertiesConfigured"
  if ((firestore as any)[SETTINGS_KEY]) {
    return
  }

  firestore.settings({ ignoreUndefinedProperties: true })
  ;(firestore as any)[SETTINGS_KEY] = true
}

function validateApplicationDefaultCredential(filePath: string) {
  const resolvedPath = path.resolve(filePath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS path missing: ${resolvedPath}`)
  }

  const raw = fs.readFileSync(resolvedPath, "utf8")
  let parsed: Record<string, unknown>

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${resolvedPath}: ${(error as Error).message}. ${GEO_CREDENTIAL_GUIDANCE}`)
  }

  const missingFields: string[] = []
  if (parsed.type !== "service_account") {
    missingFields.push("type=service_account")
  }
  if (!parsed.client_email) {
    missingFields.push("client_email")
  }

  if (missingFields.length) {
    throw new Error(
      `Invalid service-account JSON at ${resolvedPath}. Missing ${missingFields.join(
        " & ",
      )}. ${GEO_CREDENTIAL_GUIDANCE}`,
    )
  }

  return typeof parsed.project_id === "string" ? parsed.project_id : null
}

export function getFirebaseCredentialError() {
  return credentialError
}

export function getAdminDb() {
  const { firestore } = getFirebaseAdmin()
  if (!firestore) {
    throw new Error("Missing Firebase Firestore client")
  }
  return firestore
}
