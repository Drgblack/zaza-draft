import { FieldValue } from "firebase-admin/firestore"

export type FirestoreLike = {
  collection: (path: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data?: () => Record<string, unknown> | undefined }>
      set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<unknown>
    }
  }
}

type UserProfileSeed = {
  email?: string | null
  displayName?: string | null
}

export async function ensureUserDocument(
  firestore: FirestoreLike,
  uid: string,
  profile: UserProfileSeed = {},
) {
  const userRef = firestore.collection("users").doc(uid)
  const snapshot = await userRef.get()
  const email = typeof profile.email === "string" && profile.email.trim() ? profile.email.trim() : null
  const displayName =
    typeof profile.displayName === "string" && profile.displayName.trim()
      ? profile.displayName.trim()
      : null

  if (!snapshot.exists) {
    await userRef.set(
      {
        email,
        displayName,
        createdAt: FieldValue.serverTimestamp(),
        firstLoginAt: FieldValue.serverTimestamp(),
        onboardingCompleted: false,
        welcomeEmailSent: false,
        plan: "free",
        monthlyDraftLimit: 10,
        draftsUsedThisMonth: 0,
        preferredLanguage: "en",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    console.info("[account-bootstrap] user document created", { uid, firstLogin: true })
    return { created: true, firstLogin: true }
  }

  const existingData = snapshot.data?.() ?? {}
  const safeBackfill: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  }

  const preferredLanguage = existingData.preferredLanguage
  if (typeof preferredLanguage !== "string" || !preferredLanguage.trim()) {
    safeBackfill.preferredLanguage = "en"
  }

  if (!existingData.email && email) {
    safeBackfill.email = email
  }

  if (!existingData.displayName && displayName) {
    safeBackfill.displayName = displayName
  }

  if (typeof existingData.onboardingCompleted !== "boolean") {
    safeBackfill.onboardingCompleted = true
  }

  if (typeof existingData.welcomeEmailSent !== "boolean") {
    safeBackfill.welcomeEmailSent = true
  }

  if (!existingData.firstLoginAt) {
    safeBackfill.firstLoginAt = existingData.createdAt ?? FieldValue.serverTimestamp()
  }

  await userRef.set(safeBackfill, { merge: true })
  return { created: false, firstLogin: false }
}
