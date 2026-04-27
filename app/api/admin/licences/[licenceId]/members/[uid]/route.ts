import { NextResponse } from "next/server"

import { authorizeAdminRequest } from "@/lib/admin/api-auth"
import { removeUserFromLicence } from "@/lib/admin/licences"
import { assertZazaDraftProject, FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

type LicenceMemberRouteContext = {
  params: Promise<{ licenceId: string; uid: string }>
}

export async function DELETE(
  request: Request,
  { params }: LicenceMemberRouteContext,
) {
  try {
    assertZazaDraftProject({ context: "DELETE /api/admin/licences/:licenceId/members/:uid" })
    const authResult = await authorizeAdminRequest(request, "super_admin")
    if (!authResult.ok) {
      return authResult.response
    }

    const { licenceId, uid } = await params

    try {
      await removeUserFromLicence({
        firestore: authResult.firestore,
        targetUid: uid,
        licenceId,
      })
    } catch (error) {
      const message = (error as Error).message
      if (message === "LICENCE_NOT_FOUND") {
        return fail(404, "LICENCE_NOT_FOUND", "Licence not found.")
      }
      if (message === "SCHOOL_NOT_FOUND") {
        return fail(404, "SCHOOL_NOT_FOUND", "School not found.")
      }
      throw error
    }

    return NextResponse.json({ success: true, licenceId, uid })
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return fail(500, error.code, error.message)
    }

    return fail(500, "LICENCE_MEMBER_REMOVE_FAILED", "Unable to remove user from licence.")
  }
}
