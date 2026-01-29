import { NextResponse } from "next/server"

import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { isAdminUid } from "@/lib/auth/internal-qa"

interface RevokeByUid {
  type: "uid"
  uid: string
}

interface RevokeByDomain {
  type: "domain"
  domain: string
}

function buildError(message: string, statusCode: number) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: message.replace(/\s+/g, "_").toUpperCase(),
        message,
      },
    },
    { status: statusCode },
  )
}

function normalizeDomain(domain?: string) {
  if (!domain) {
    return null
  }
  const normalized = domain.trim().toLowerCase()
  return normalized || null
}

async function authorizeAdmin(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    if (error instanceof FirebaseAuthorizationError) {
      return buildError(error.message, error.statusCode)
    }
    return buildError("Authentication required", 401)
  }

  const uid = authContext?.uid ?? ""
  if (!uid || !isAdminUid(uid)) {
    return buildError("Admin access required", 403)
  }

  const firestore = authContext.firestore
  if (!firestore) {
    return buildError("Missing Firestore context", 500)
  }

  return { uid, firestore }
}

export async function POST(request: Request) {
  const authResult = await authorizeAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { firestore } = authResult
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return buildError("Invalid payload", 400)
  }

  const now = new Date().toISOString()

  if ((body as RevokeByUid).type === "uid") {
    const payload = body as RevokeByUid
    if (!payload.uid) {
      return buildError("Missing uid", 400)
    }

    await firestore.collection("users").doc(payload.uid).set(
      {
        entitlements: {
          planOverride: null,
          schoolDomainOverride: null,
          expiresAt: null,
          reason: null,
          updatedAt: now,
        },
      },
      { merge: true },
    )

    return NextResponse.json({
      ok: true,
      revoked: {
        type: "uid",
        target: payload.uid,
      },
    })
  }

  if ((body as RevokeByDomain).type === "domain") {
    const payload = body as RevokeByDomain
    const domain = normalizeDomain(payload.domain)
    if (!domain) {
      return buildError("Invalid domain", 400)
    }

    await firestore.collection("schoolLicences").doc(domain).delete()

    return NextResponse.json({
      ok: true,
      revoked: {
        type: "domain",
        target: domain,
      },
    })
  }

  return buildError("Unsupported revoke type", 400)
}
