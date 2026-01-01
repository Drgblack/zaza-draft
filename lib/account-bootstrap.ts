import { FieldValue } from "firebase-admin/firestore"

export type FirestoreLike = {
  collection: (path: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean }>
      set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<unknown>
    }
  }
}

export async function ensureUserDocument(firestore: FirestoreLike, uid: string) {
  const userRef = firestore.collection("users").doc(uid)
  const snapshot = await userRef.get()
  const mergeFields = {
    plan: "free",
    preferredLanguage: "en",
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (!snapshot.exists) {
    await userRef.set(
      {
        createdAt: FieldValue.serverTimestamp(),
        ...mergeFields,
      },
      { merge: true },
    )
    return true
  }

  await userRef.set(mergeFields, { merge: true })
  return false
}
