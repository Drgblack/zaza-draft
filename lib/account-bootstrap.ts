import { createHash } from "node:crypto"

import { FieldValue } from "firebase-admin/firestore"
import { FREE_TIER_LIMIT } from "@/lib/usage"
import { EMPTY_ONBOARDING_PROFILE } from "@/lib/onboarding-profile"
import { createDefaultUserProfile } from "@/lib/auth/roles"

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
  const userProfileRef = firestore.collection("user_profiles").doc(uid)
  const snapshot = await userRef.get()
  const userProfileSnapshot = await userProfileRef.get()
  const email = typeof profile.email === "string" && profile.email.trim() ? profile.email.trim() : null
  const displayName =
    typeof profile.displayName === "string" && profile.displayName.trim()
      ? profile.displayName.trim()
      : null
  const uidHash = createHash("sha256").update(uid).digest("hex").slice(0, 12)
  const now = Date.now()

  if (!snapshot.exists) {
    await userRef.set(
      {
        email,
        displayName,
        createdAt: FieldValue.serverTimestamp(),
        firstLoginAt: FieldValue.serverTimestamp(),
        onboardingCompleted: false,
        onboardingSkipped: false,
        onboardingProfile: EMPTY_ONBOARDING_PROFILE,
        welcomeEmailSent: false,
        plan: "free",
        monthlyDraftLimit: FREE_TIER_LIMIT,
        draftsUsedThisMonth: 0,
        preferredLanguage: "en",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    if (!userProfileSnapshot.exists) {
      await userProfileRef.set(
        createDefaultUserProfile({
          uid,
          uidHash,
          email: email ?? "",
          now,
        }) as unknown as Record<string, unknown>,
        { merge: true },
      )
    }
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

  const isFreePlanUser = existingData.plan !== "pro"
  if (isFreePlanUser && existingData.monthlyDraftLimit !== FREE_TIER_LIMIT) {
    safeBackfill.monthlyDraftLimit = FREE_TIER_LIMIT
  }

  if (isFreePlanUser && typeof existingData.draftsUsedThisMonth !== "number") {
    safeBackfill.draftsUsedThisMonth = 0
  }

  if (typeof existingData.onboardingCompleted !== "boolean") {
    safeBackfill.onboardingCompleted = true
  }

  if (typeof existingData.onboardingSkipped !== "boolean") {
    safeBackfill.onboardingSkipped = false
  }

  if (typeof existingData.welcomeEmailSent !== "boolean") {
    safeBackfill.welcomeEmailSent = true
  }

  if (!existingData.firstLoginAt) {
    safeBackfill.firstLoginAt = existingData.createdAt ?? FieldValue.serverTimestamp()
  }

  await userRef.set(safeBackfill, { merge: true })
  if (!userProfileSnapshot.exists) {
    await userProfileRef.set(
      createDefaultUserProfile({
        uid,
        uidHash,
        email: email ?? "",
        now,
      }) as unknown as Record<string, unknown>,
      { merge: true },
    )
  } else {
    const existingProfile = userProfileSnapshot.data?.() ?? {}
    const profileBackfill: Record<string, unknown> = {
      uid,
      uidHash,
      updatedAt: now,
    }

    if (!existingProfile.email && email) {
      profileBackfill.email = email
    }

    if (!existingProfile.planStatus) {
      profileBackfill.planStatus = "free"
    }

    if (!existingProfile.role) {
      profileBackfill.role = "teacher_free"
    }

    if (!existingProfile.createdAt) {
      profileBackfill.createdAt = now
    }

    await userProfileRef.set(profileBackfill, { merge: true })
  }
  return { created: false, firstLogin: false }
}
