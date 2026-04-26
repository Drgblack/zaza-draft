import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { getUserProfile, requireAdminRole } from "@/lib/auth/get-user-role"

export async function GET(request: NextRequest) {
  const adminResult = await requireAdminRole(request)
  if (adminResult instanceof NextResponse) {
    return adminResult
  }

  const { firestore } = getFirebaseAdmin()
  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FIRESTORE_UNAVAILABLE", message: "Firestore unavailable." },
      },
      { status: 500 },
    )
  }

  const profile = await getUserProfile(adminResult.uid, firestore)

  return NextResponse.json({
    success: true,
    session: {
      uid: adminResult.uid,
      role: adminResult.role,
      schoolId: profile?.schoolId ?? null,
    },
  })
}
