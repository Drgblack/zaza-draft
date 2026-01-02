import { NextResponse } from "next/server"
import { createHash } from "crypto"

import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { isAdminUid, isInternalQaUid, parseQaUids } from "@/lib/auth/internal-qa"

function buildPreview(list: string[]) {
  if (!list.length) {
    return []
  }
  const previewCandidates = [
    ...list.slice(0, 2),
    ...list.slice(Math.max(list.length - 2, 0)),
  ]
  return Array.from(new Set(previewCandidates)).filter(Boolean)
}

export async function GET(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      },
      { status },
    )
  }

  const uid = authContext?.uid ?? null
  const qaSet = parseQaUids()
  const isQaUser = uid ? isInternalQaUid(uid) : false
  const isAdmin = uid ? isAdminUid(uid) : false

  if (!uid || (!isQaUser && !isAdmin)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "QA or admin access required.",
        },
      },
      { status: 403 },
    )
  }

  const qaArray = Array.from(qaSet)
  const envRaw = process.env.INTERNAL_QA_UIDS ?? ""
  const envRawHash = createHash("sha256").update(envRaw).digest("hex").slice(0, 8)

  return NextResponse.json({
    success: true,
    data: {
      uid,
      isQaUser,
      qaUidsCount: qaArray.length,
      qaUidsPreview: buildPreview(qaArray),
      envRawLength: envRaw.length,
      envRawHasWhitespace: /\s/.test(envRaw),
      envRawHash,
      deploymentInfo: {
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        nodeEnv: process.env.NODE_ENV ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
      },
      timestamp: new Date().toISOString(),
    },
  })
}
