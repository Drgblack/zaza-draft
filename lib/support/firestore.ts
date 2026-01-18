import type { Firestore } from "firebase-admin/firestore"

type FirebaseCredential = {
  projectId: string
  clientEmail: string
  privateKey: string
}

type FirestoreConfig = {
  projectId: string
  credential: FirebaseCredential
}

let firestorePromise: Promise<Firestore | null> | null = null
let firebaseAdmin: typeof import("firebase-admin") | null = null

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n")
}

function parseServiceAccountKey(): FirebaseCredential | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    return null
  }

  try {
    const data = JSON.parse(raw)
    if (
      typeof data.project_id === "string" &&
      typeof data.client_email === "string" &&
      typeof data.private_key === "string"
    ) {
      return {
        projectId: data.project_id,
        clientEmail: data.client_email,
        privateKey: data.private_key,
      }
    }
  } catch (error) {
    console.warn("[support-contact] Failed to parse Firebase service account key", error)
  }

  return null
}

function collectConfig(): FirestoreConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      credential: {
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKey),
      },
    }
  }

  const serviceAccount = parseServiceAccountKey()
  if (serviceAccount) {
    return {
      projectId: serviceAccount.projectId,
      credential: serviceAccount,
    }
  }

  return null
}

async function getFirestoreInstance(): Promise<Firestore | null> {
  if (firestorePromise) {
    return firestorePromise
  }

  const config = collectConfig()
  if (!config) {
    return null
  }

  firestorePromise = (async () => {
    try {
      const { default: admin } = await import("firebase-admin")
      firebaseAdmin = admin

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.credential.projectId,
            clientEmail: config.credential.clientEmail,
            privateKey: config.credential.privateKey,
          }),
          projectId: config.projectId,
        })
      }

      return admin.firestore()
    } catch (error) {
      console.error("[support-contact] Firestore initialization failed", error)
      return null
    }
  })()

  return firestorePromise
}

export async function logSupportTicketToFirestore(options: {
  ticketId: string
  name: string
  email: string
  message: string
  locale: string | null
  source: string
  userAgent: string | null
  ipHash: string | null
}) {
  const firestore = await getFirestoreInstance()
  if (!firestore || !firebaseAdmin) {
    return null
  }

  try {
    const FieldValue = firebaseAdmin.firestore.FieldValue
    const docRef = await firestore.collection("supportTickets").add({
      ticketId: options.ticketId,
      name: options.name,
      email: options.email,
      message: options.message,
      locale: options.locale,
      source: options.source,
      userAgent: options.userAgent,
      ipHash: options.ipHash,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    })

    return docRef.id
  } catch (error) {
    console.error("[support-contact] Firestore write failed", error)
    return null
  }
}
