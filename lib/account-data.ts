import type { CollectionReference, DocumentData, Firestore } from "firebase-admin/firestore"

const EXPORT_FILENAME_PREFIX = "zaza-draft-export"

export interface UserExportData {
  exportedAt: string
  user: Record<string, unknown> | null
  snippets: Array<{ id: string; data: Record<string, unknown> }>
  diagnostics: Record<string, unknown> | null
}

const SUBCOLLECTIONS = ["snippets", "diagnostics", "rateLimits"]

export function hasDeleteConfirm(payload: unknown): payload is { confirm: true } {
  return typeof payload === "object" && payload !== null && (payload as { confirm?: unknown }).confirm === true
}

async function deleteCollectionBatched(
  firestore: Firestore,
  collectionRef: CollectionReference<DocumentData>,
  batchSize = 250,
) {
  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get()
    if (snapshot.empty || snapshot.docs.length === 0) {
      break
    }
    const batch = firestore.batch()
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    await batch.commit()
  }
}

export async function deleteUserData(firestore: Firestore, uid: string) {
  const userRef = firestore.collection("users").doc(uid)
  for (const name of SUBCOLLECTIONS) {
    await deleteCollectionBatched(firestore, userRef.collection(name))
  }
  await userRef.delete()
}

function buildExportFilename(date = new Date()) {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(date.getUTCDate()).padStart(2, "0")
  return `${EXPORT_FILENAME_PREFIX}-${yyyy}${mm}${dd}.json`
}

async function fetchCollectionDocuments(collection: CollectionReference<DocumentData>) {
  try {
    const snapshot = await collection.get()
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }))
  } catch {
    return []
  }
}

export async function collectUserExportData(firestore: Firestore, uid: string): Promise<UserExportData> {
  const userRef = firestore.collection("users").doc(uid)
  const userSnap = await userRef.get()
  const userData = userSnap.exists ? userSnap.data() ?? null : null
  const snippets = await fetchCollectionDocuments(userRef.collection("snippets"))
  const diagnosticsRef = userRef.collection("diagnostics").doc("status")
  const diagnosticsSnap = await diagnosticsRef.get()
  const diagnostics = diagnosticsSnap.exists ? diagnosticsSnap.data() ?? null : null

  return {
    exportedAt: new Date().toISOString(),
    user: userData,
    snippets,
    diagnostics,
  }
}

export function createExportPayload(data: UserExportData) {
  const body = JSON.stringify(data, null, 2)
  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  headers.set(
    "Content-Disposition",
    `attachment; filename="${buildExportFilename(new Date())}"`,
  )
  return { body, headers }
}
