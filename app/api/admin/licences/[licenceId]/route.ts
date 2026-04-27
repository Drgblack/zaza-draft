import { NextResponse } from "next/server"

import { authorizeAdminRequest } from "@/lib/admin/api-auth"
import { updateSchoolAndLicence, type LicenceRecord, type SchoolMembershipRecord, type SchoolRecord } from "@/lib/admin/licences"
import { assertZazaDraftProject, FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function GET(request: Request, { params }: { params: { licenceId: string } }) {
  try {
    assertZazaDraftProject({ context: "GET /api/admin/licences/:licenceId" })
    const authResult = await authorizeAdminRequest(request, "admin")
    if (!authResult.ok) {
      return authResult.response
    }

    const licenceSnap = await authResult.firestore.collection("licences").doc(params.licenceId).get()
    if (!licenceSnap.exists) {
      return fail(404, "LICENCE_NOT_FOUND", "Licence not found.")
    }

    const licence = licenceSnap.data() as LicenceRecord
    const [schoolSnap, membershipsSnap] = await Promise.all([
      authResult.firestore.collection("schools").doc(licence.schoolId).get(),
      authResult.firestore.collection("school_memberships").where("licenceId", "==", params.licenceId).get(),
    ])

    if (!schoolSnap.exists) {
      return fail(404, "SCHOOL_NOT_FOUND", "School not found.")
    }

    const memberships = membershipsSnap.docs.map((doc) => ({
      uid: doc.id,
      ...(doc.data() as SchoolMembershipRecord),
    }))

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const [userSnap, profileSnap] = await Promise.all([
          authResult.firestore.collection("users").doc(membership.uid).get(),
          authResult.firestore.collection("user_profiles").doc(membership.uid).get(),
        ])
        const userData = userSnap.data() as Record<string, unknown> | undefined
        const profileData = profileSnap.data() as Record<string, unknown> | undefined

        return {
          uid: membership.uid,
          email:
            (typeof profileData?.email === "string" && profileData.email) ||
            (typeof userData?.email === "string" && userData.email) ||
            "",
          role: typeof profileData?.role === "string" ? profileData.role : "teacher_free",
          assignedAt: membership.assignedAt,
          status: membership.status,
        }
      }),
    )

    return NextResponse.json({
      success: true,
      school: { id: schoolSnap.id, ...(schoolSnap.data() as SchoolRecord) },
      licence: { id: licenceSnap.id, ...licence },
      members,
    })
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return fail(500, error.code, error.message)
    }

    return fail(500, "LICENCE_DETAIL_FAILED", "Unable to load school licence.")
  }
}

export async function PATCH(request: Request, { params }: { params: { licenceId: string } }) {
  try {
    assertZazaDraftProject({ context: "PATCH /api/admin/licences/:licenceId" })
    const authResult = await authorizeAdminRequest(request, "super_admin")
    if (!authResult.ok) {
      return authResult.response
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return fail(400, "INVALID_PAYLOAD", "Invalid payload.")
    }

    try {
      await updateSchoolAndLicence({
        firestore: authResult.firestore,
        licenceId: params.licenceId,
        input: body,
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

    return NextResponse.json({ success: true, licenceId: params.licenceId })
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return fail(500, error.code, error.message)
    }

    return fail(500, "LICENCE_UPDATE_FAILED", "Unable to update school licence.")
  }
}
