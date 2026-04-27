import { NextResponse } from "next/server"

import { authorizeAdminRequest } from "@/lib/admin/api-auth"
import { assignUserToLicence } from "@/lib/admin/licences"
import { assertZazaDraftProject, FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

type LicenceMembersRouteContext = {
  params: Promise<{ licenceId: string }>
}

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function POST(request: Request, { params }: LicenceMembersRouteContext) {
  try {
    assertZazaDraftProject({ context: "POST /api/admin/licences/:licenceId/members" })
    const authResult = await authorizeAdminRequest(request, "super_admin")
    if (!authResult.ok) {
      return authResult.response
    }

    const body = (await request.json().catch(() => null)) as { targetUid?: string } | null
    const targetUid = typeof body?.targetUid === "string" ? body.targetUid.trim() : ""
    if (!targetUid) {
      return fail(400, "TARGET_UID_REQUIRED", "targetUid is required.")
    }

    const authUser = authResult.auth ? await authResult.auth.getUser(targetUid).catch(() => null) : null
    const { licenceId } = await params

    try {
      const result = await assignUserToLicence({
        firestore: authResult.firestore,
        targetUid,
        licenceId,
        adminUid: authResult.uid,
        fallbackEmail: authUser?.email ?? null,
      })

      return NextResponse.json({
        success: true,
        targetUid,
        licenceId,
        alreadyAssigned: result.alreadyAssigned,
      })
    } catch (error) {
      const message = (error as Error).message
      if (message === "SEAT_LIMIT_REACHED") {
        return fail(409, "SEAT_LIMIT_REACHED", "Seat limit reached.")
      }
      if (message === "SUPER_ADMIN_PROTECTED") {
        return fail(403, "SUPER_ADMIN_PROTECTED", "super_admin users cannot be assigned to licences.")
      }
      if (message === "USER_ALREADY_ASSIGNED") {
        return fail(409, "USER_ALREADY_ASSIGNED", "User already has an active school licence membership elsewhere.")
      }
      if (message === "LICENCE_NOT_FOUND") {
        return fail(404, "LICENCE_NOT_FOUND", "Licence not found.")
      }
      if (message === "LICENCE_INACTIVE") {
        return fail(409, "LICENCE_INACTIVE", "Licence is not active.")
      }
      if (message === "SCHOOL_NOT_FOUND") {
        return fail(404, "SCHOOL_NOT_FOUND", "School not found.")
      }
      throw error
    }
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return fail(500, error.code, error.message)
    }

    return fail(500, "LICENCE_MEMBER_ASSIGN_FAILED", "Unable to assign user to licence.")
  }
}
