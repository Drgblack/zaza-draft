import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { ensureUserDocument } from "@/lib/account-bootstrap"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { normalizeOnboardingProfile } from "@/lib/onboarding-profile"

function unauthorizedResponse(error: unknown) {
  const status = error instanceof FirebaseAuthorizationError ? error.statusCode : 401
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: (error as Error).message || "Unauthorized",
      },
    },
    { status },
  )
}

function firestoreUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "FIRESTORE_UNAVAILABLE",
        message: "Unable to access Firestore.",
      },
    },
    { status: 500 },
  )
}

export async function GET(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return unauthorizedResponse(error)
  }

  const { uid, firestore, decodedToken } = authContext
  if (!firestore) {
    return firestoreUnavailableResponse()
  }

  try {
    const bootstrapResult = await ensureUserDocument(firestore, uid, {
      email: decodedToken.email ?? null,
      displayName: decodedToken.name ?? null,
    })
    const snapshot = await firestore.collection("users").doc(uid).get()
    const data = snapshot.data() ?? {}
    const onboardingCompleted = Boolean(data.onboardingCompleted)
    const onboardingSkipped = Boolean(data.onboardingSkipped)
    const welcomeEmailSent = Boolean(data.welcomeEmailSent)
    const onboardingProfile = normalizeOnboardingProfile(data.onboardingProfile)

    console.info("[onboarding] status loaded", {
      uid,
      onboardingCompleted,
      onboardingSkipped,
      welcomeEmailSent,
      firstLogin: bootstrapResult.firstLogin,
    })

    return NextResponse.json({
      success: true,
      data: {
        onboardingCompleted,
        onboardingSkipped,
        onboardingProfile,
        welcomeEmailSent,
        firstLogin: bootstrapResult.firstLogin,
      },
    })
  } catch (error) {
    console.error("[onboarding] Failed to load status", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ONBOARDING_FAILED",
          message: "Unable to load onboarding status.",
        },
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return unauthorizedResponse(error)
  }

  const { uid, firestore, decodedToken } = authContext
  if (!firestore) {
    return firestoreUnavailableResponse()
  }

  try {
    const body = await request.json().catch(() => null)
    const action = body && typeof body === "object" && body.action === "skip" ? "skip" : "complete"
    const onboardingProfile = normalizeOnboardingProfile(
      body && typeof body === "object" ? (body as Record<string, unknown>).profile : null,
    )

    await ensureUserDocument(firestore, uid, {
      email: decodedToken.email ?? null,
      displayName: decodedToken.name ?? null,
    })

    await firestore.collection("users").doc(uid).set(
      {
        onboardingCompleted: true,
        onboardingSkipped: action === "skip",
        onboardingProfile,
        onboardingCompletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    console.info("[onboarding] onboarding completed", {
      uid,
      onboardingCompleted: true,
      onboardingSkipped: action === "skip",
      answeredFields: Object.values(onboardingProfile).filter(Boolean).length,
    })

    return NextResponse.json({
      success: true,
      data: {
        onboardingCompleted: true,
        onboardingSkipped: action === "skip",
        onboardingProfile,
      },
    })
  } catch (error) {
    console.error("[onboarding] Failed to save completion state", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ONBOARDING_SAVE_FAILED",
          message: "Unable to save onboarding state.",
        },
      },
      { status: 500 },
    )
  }
}
