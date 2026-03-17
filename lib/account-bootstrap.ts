import { FieldValue } from "firebase-admin/firestore"

export type FirestoreLike = {
  collection: (path: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data?: () => Record<string, unknown> | undefined }>
      set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<unknown>
    }
  }
}

export async function ensureUserDocument(firestore: FirestoreLike, uid: string) {
  const userRef = firestore.collection("users").doc(uid)
  const snapshot = await userRef.get()

  if (!snapshot.exists) {
    await userRef.set(
      {
        createdAt: FieldValue.serverTimestamp(),
        plan: "free",
        preferredLanguage: "en",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return true
  }

  const existingData = snapshot.data?.() ?? {}
  const safeBackfill: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  }

  const preferredLanguage = existingData.preferredLanguage
  if (typeof preferredLanguage !== "string" || !preferredLanguage.trim()) {
    safeBackfill.preferredLanguage = "en"
  }

  await userRef.set(safeBackfill, { merge: true })
  return false
}
