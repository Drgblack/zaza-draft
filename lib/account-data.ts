import type { CollectionReference, DocumentData, Firestore } from "firebase-admin/firestore"

const EXPORT_FILENAME_PREFIX = "zaza-draft-export"

export interface UserExportData {
  exportedAt: string
  user: Record<string, unknown> | null
  snippets: Array<{ id: string; data: Record<string, unknown> }>
  diagnostics: Record<string, unknown> | null
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
