import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { fetchDraftEntitlement, ZazaIdClientError } from "@/lib/zaza-id/client"

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.slice("Bearer ".length).trim()
  return token || null
}

export async function GET(request: Request) {
  try {
    await authorizeFirebaseRequest(request)
  } catch (error) {
    const statusCode = error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status: statusCode },
    )
  }

  const idToken = extractBearerToken(request)
  if (!idToken) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing authorization token",
        },
      },
      { status: 401 },
    )
  }

  try {
    const entitlement = await fetchDraftEntitlement(idToken)
    return NextResponse.json({
      success: true,
      data: entitlement,
    })
  } catch (error) {
    if (error instanceof ZazaIdClientError && (error.statusCode === 401 || error.statusCode === 403)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ENTITLEMENT_FORBIDDEN",
            message: "Entitlement lookup was rejected by Zaza ID.",
          },
        },
        { status: 403 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ENTITLEMENT_UNAVAILABLE",
          message: "Unable to fetch entitlements right now.",
        },
      },
      { status: 502 },
    )
  }
}
