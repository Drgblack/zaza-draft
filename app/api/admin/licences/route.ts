import { NextResponse } from "next/server"

import { authorizeAdminRequest } from "@/lib/admin/api-auth"
import {
  createSchoolAndLicence,
  normalizeDomains,
  normalizeLicenceStatus,
  normalizeLicenceType,
  normalizeSeatLimit,
  normalizeTimestampInput,
  type LicenceRecord,
  type SchoolMembershipRecord,
  type SchoolRecord,
} from "@/lib/admin/licences"
import { assertZazaDraftProject, FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function POST(request: Request) {
  try {
    assertZazaDraftProject({ context: "POST /api/admin/licences" })
    const authResult = await authorizeAdminRequest(request, "super_admin")
    if (!authResult.ok) {
      return authResult.response
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return fail(400, "INVALID_PAYLOAD", "Invalid payload.")
    }

    const schoolName = typeof body.schoolName === "string" ? body.schoolName.trim() : ""
    const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : ""
    if (!schoolName || !contactEmail) {
      return fail(400, "REQUIRED_FIELDS_MISSING", "schoolName and contactEmail are required.")
    }

    const result = await createSchoolAndLicence({
      firestore: authResult.firestore,
      adminUid: authResult.uid,
      input: {
        schoolName,
        contactEmail,
        domains: normalizeDomains(body.domains),
        licenceType: normalizeLicenceType(body.licenceType),
        seatLimit: normalizeSeatLimit(body.seatLimit),
        status: normalizeLicenceStatus(body.status),
        startDate: normalizeTimestampInput(body.startDate),
        endDate: normalizeTimestampInput(body.endDate),
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return fail(500, error.code, error.message)
    }

    return fail(500, "LICENCE_CREATE_FAILED", "Unable to create school licence.")
  }
}

export async function GET(request: Request) {
  try {
    assertZazaDraftProject({ context: "GET /api/admin/licences" })
    const authResult = await authorizeAdminRequest(request, "admin")
    if (!authResult.ok) {
      return authResult.response
    }

    const url = new URL(request.url)
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25))

    const [schoolsSnapshot, licencesSnapshot, membershipsSnapshot] = await Promise.all([
      authResult.firestore.collection("schools").get(),
      authResult.firestore.collection("licences").get(),
      authResult.firestore.collection("school_memberships").get(),
    ])

    const schoolsById = new Map<string, SchoolRecord>()
    for (const doc of schoolsSnapshot.docs) {
      schoolsById.set(doc.id, doc.data() as SchoolRecord)
    }

    const memberCountByLicence = new Map<string, number>()
    for (const doc of membershipsSnapshot.docs) {
      const membership = doc.data() as SchoolMembershipRecord
      if (membership.status !== "active") {
        continue
      }
      memberCountByLicence.set(
        membership.licenceId,
        (memberCountByLicence.get(membership.licenceId) ?? 0) + 1,
      )
    }

    const rows = licencesSnapshot.docs
      .map((doc) => {
        const licence = doc.data() as LicenceRecord
        const school = schoolsById.get(licence.schoolId)
        return {
          licenceId: doc.id,
          schoolId: licence.schoolId,
          schoolName: school?.schoolName ?? "Unknown school",
          contactEmail: school?.contactEmail ?? "",
          domains: school?.domains ?? [],
          notes: school?.notes ?? "",
          licenceType: licence.licenceType,
          seatLimit: licence.seatLimit,
          seatsUsed: licence.seatsUsed,
          status: licence.status,
          startDate: licence.startDate,
          endDate: licence.endDate,
          memberCount: memberCountByLicence.get(doc.id) ?? 0,
        }
      })
      .sort((left, right) => right.startDate - left.startDate)

    const total = rows.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const currentPage = Math.min(page, totalPages)
    const start = (currentPage - 1) * pageSize
    const items = rows.slice(start, start + pageSize)

    return NextResponse.json({
      success: true,
      items,
      page: currentPage,
      pageSize,
      total,
      totalPages,
    })
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return fail(500, error.code, error.message)
    }

    return fail(500, "LICENCES_LOAD_FAILED", "Unable to load school licences.")
  }
}
