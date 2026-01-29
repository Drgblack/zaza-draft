import { NextResponse } from "next/server"

import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { isAdminUid } from "@/lib/auth/internal-qa"

interface GrantByUid {
  type: "uid"
  uid: string
  plan: "pro"
  expiresAt?: string
  reason?: string
}

interface GrantByDomain {
  type: "domain"
  domain: string
  plan: "pro"
  expiresAt?: string
  reason?: string
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

function normalizeExpires(value?: string) {
  if (!value) {
    return null
  }
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return null
  }
  return new Date(parsed).toISOString()
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

  const plan: string | undefined = (body as GrantByUid).plan
  if (plan !== "pro") {
    return buildError("Only pro plan supported", 400)
  }

  const now = new Date().toISOString()

  if ((body as GrantByUid).type === "uid") {
    const payload = body as GrantByUid
    if (!payload.uid) {
      return buildError("Missing uid", 400)
    }

    const entitlements = {
      planOverride: "pro" as const,
      schoolDomainOverride: null,
      expiresAt: normalizeExpires(payload.expiresAt),
      reason: typeof payload.reason === "string" ? payload.reason : null,
      updatedAt: now,
    }

    await firestore.collection("users").doc(payload.uid).set(
      {
        entitlements,
      },
      { merge: true },
    )

    return NextResponse.json({
      ok: true,
      granted: {
        type: "uid",
        target: payload.uid,
        plan: payload.plan,
        expiresAt: entitlements.expiresAt,
        reason: entitlements.reason,
      },
    })
  }

  if ((body as GrantByDomain).type === "domain") {
    const payload = body as GrantByDomain
    const domain = normalizeDomain(payload.domain)
    if (!domain) {
      return buildError("Invalid domain", 400)
    }

    const licence = {
      domain,
      plan: "pro" as const,
      expiresAt: normalizeExpires(payload.expiresAt),
      reason: typeof payload.reason === "string" ? payload.reason : null,
      createdAt: now,
      updatedAt: now,
    }

    await firestore.collection("schoolLicences").doc(domain).set(licence)

    return NextResponse.json({
      ok: true,
      granted: {
        type: "domain",
        target: domain,
        plan: payload.plan,
        expiresAt: licence.expiresAt,
        reason: licence.reason,
      },
    })
  }

  return buildError("Unsupported grant type", 400)
}


