import type {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Transaction,
} from "firebase-admin/firestore"

export type LicenceType = "school" | "district"
export type LicenceStatus = "trial" | "active" | "expired" | "cancelled"
export type MembershipStatus = "active" | "removed"

export type SchoolRecord = {
  schoolName: string
  contactEmail: string
  domains: string[]
  licenceType: LicenceType
  seatLimit: number
  seatsUsed: number
  status: LicenceStatus
  startDate: number
  endDate: number
  notes: string
  createdAt: number
  updatedAt: number
  createdBy: string
}

export type LicenceRecord = {
  schoolId: string
  licenceType: LicenceType
  seatLimit: number
  seatsUsed: number
  status: LicenceStatus
  startDate: number
  endDate: number
  createdAt: number
  updatedAt: number
}

export type SchoolMembershipRecord = {
  schoolId: string
  licenceId: string
  assignedAt: number
  assignedBy: string
  status: MembershipStatus
}

export type CreateLicenceInput = {
  schoolName: string
  contactEmail: string
  domains: string[]
  licenceType: LicenceType
  seatLimit: number
  status: LicenceStatus
  startDate: number
  endDate: number
  notes: string
}

export type UpdateLicenceInput = Partial<CreateLicenceInput>

type UserProfileLike = {
  role?: string
  email?: string
  uidHash?: string
  createdAt?: number
  updatedAt?: number
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function normalizeDomains(domains: unknown) {
  if (!Array.isArray(domains)) {
    return []
  }

  return Array.from(
    new Set(
      domains
        .map((domain) => normalizeText(domain).toLowerCase())
        .filter(Boolean),
    ),
  )
}

export function normalizeSeatLimit(value: unknown) {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  if (!Number.isFinite(numeric) || numeric < 1) {
    return 1
  }
  return Math.max(1, Math.floor(numeric))
}

export function normalizeLicenceStatus(value: unknown): LicenceStatus {
  return value === "trial" || value === "active" || value === "expired" || value === "cancelled"
    ? value
    : "trial"
}

export function normalizeLicenceType(value: unknown): LicenceType {
  return value === "district" ? "district" : "school"
}

export function normalizeTimestampInput(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return Date.now()
}

export function isActiveLicenceRecord(
  licence: Pick<LicenceRecord, "status" | "endDate"> | null | undefined,
  now = Date.now(),
) {
  if (!licence) {
    return false
  }

  if (licence.status !== "active" && licence.status !== "trial") {
    return false
  }

  return licence.endDate >= now
}

function snapshotData<T>(snapshot: DocumentSnapshot) {
  return snapshot.exists ? (snapshot.data() as T) : null
}

export async function createSchoolAndLicence(options: {
  firestore: Firestore
  adminUid: string
  input: CreateLicenceInput
}) {
  const now = Date.now()
  const schoolRef = options.firestore.collection("schools").doc()
  const licenceRef = options.firestore.collection("licences").doc()

  await options.firestore.runTransaction(async (transaction) => {
    const schoolRecord: SchoolRecord = {
      schoolName: normalizeText(options.input.schoolName),
      contactEmail: normalizeText(options.input.contactEmail).toLowerCase(),
      domains: normalizeDomains(options.input.domains),
      licenceType: normalizeLicenceType(options.input.licenceType),
      seatLimit: normalizeSeatLimit(options.input.seatLimit),
      seatsUsed: 0,
      status: normalizeLicenceStatus(options.input.status),
      startDate: normalizeTimestampInput(options.input.startDate),
      endDate: normalizeTimestampInput(options.input.endDate),
      notes: normalizeText(options.input.notes),
      createdAt: now,
      updatedAt: now,
      createdBy: options.adminUid,
    }

    const licenceRecord: LicenceRecord = {
      schoolId: schoolRef.id,
      licenceType: schoolRecord.licenceType,
      seatLimit: schoolRecord.seatLimit,
      seatsUsed: 0,
      status: schoolRecord.status,
      startDate: schoolRecord.startDate,
      endDate: schoolRecord.endDate,
      createdAt: now,
      updatedAt: now,
    }

    transaction.set(schoolRef, schoolRecord)
    transaction.set(licenceRef, licenceRecord)
  })

  return { schoolId: schoolRef.id, licenceId: licenceRef.id }
}

export async function updateSchoolAndLicence(options: {
  firestore: Firestore
  licenceId: string
  input: UpdateLicenceInput
}) {
  const now = Date.now()
  const licenceRef = options.firestore.collection("licences").doc(options.licenceId)

  await options.firestore.runTransaction(async (transaction) => {
    const licenceSnap = await transaction.get(licenceRef)
    if (!licenceSnap.exists) {
      throw new Error("LICENCE_NOT_FOUND")
    }

    const licence = snapshotData<LicenceRecord>(licenceSnap)
    const schoolRef = options.firestore.collection("schools").doc(licence!.schoolId)
    const schoolSnap = await transaction.get(schoolRef)
    if (!schoolSnap.exists) {
      throw new Error("SCHOOL_NOT_FOUND")
    }

    const schoolPatch: Record<string, unknown> = { updatedAt: now }
    const licencePatch: Record<string, unknown> = { updatedAt: now }

    if (options.input.schoolName !== undefined) {
      schoolPatch.schoolName = normalizeText(options.input.schoolName)
    }
    if (options.input.contactEmail !== undefined) {
      schoolPatch.contactEmail = normalizeText(options.input.contactEmail).toLowerCase()
    }
    if (options.input.domains !== undefined) {
      schoolPatch.domains = normalizeDomains(options.input.domains)
    }
    if (options.input.notes !== undefined) {
      schoolPatch.notes = normalizeText(options.input.notes)
    }
    if (options.input.licenceType !== undefined) {
      const licenceType = normalizeLicenceType(options.input.licenceType)
      schoolPatch.licenceType = licenceType
      licencePatch.licenceType = licenceType
    }
    if (options.input.seatLimit !== undefined) {
      const seatLimit = normalizeSeatLimit(options.input.seatLimit)
      schoolPatch.seatLimit = seatLimit
      licencePatch.seatLimit = seatLimit
    }
    if (options.input.status !== undefined) {
      const status = normalizeLicenceStatus(options.input.status)
      schoolPatch.status = status
      licencePatch.status = status
    }
    if (options.input.startDate !== undefined) {
      const startDate = normalizeTimestampInput(options.input.startDate)
      schoolPatch.startDate = startDate
      licencePatch.startDate = startDate
    }
    if (options.input.endDate !== undefined) {
      const endDate = normalizeTimestampInput(options.input.endDate)
      schoolPatch.endDate = endDate
      licencePatch.endDate = endDate
    }

    transaction.set(schoolRef, schoolPatch, { merge: true })
    transaction.set(licenceRef, licencePatch, { merge: true })
  })
}

function buildProfilePatchFromExisting(existing: UserProfileLike | null, schoolId: string, licenceId: string, now: number) {
  const patch: Record<string, unknown> = {
    schoolId,
    licenceId,
    updatedAt: now,
  }

  if (!existing?.createdAt) {
    patch.createdAt = now
  }
  if (!existing?.role) {
    patch.role = "teacher_free"
  }

  return patch
}

export async function assignUserToLicence(options: {
  firestore: Firestore
  targetUid: string
  licenceId: string
  adminUid: string
  fallbackEmail?: string | null
}) {
  const now = Date.now()
  const licenceRef = options.firestore.collection("licences").doc(options.licenceId)
  const membershipRef = options.firestore.collection("school_memberships").doc(options.targetUid)
  const userProfileRef = options.firestore.collection("user_profiles").doc(options.targetUid)
  const userRef = options.firestore.collection("users").doc(options.targetUid)

  return options.firestore.runTransaction(async (transaction) => {
    const [licenceSnap, membershipSnap, profileSnap, userSnap] = await Promise.all([
      transaction.get(licenceRef),
      transaction.get(membershipRef),
      transaction.get(userProfileRef),
      transaction.get(userRef),
    ])

    if (!licenceSnap.exists) {
      throw new Error("LICENCE_NOT_FOUND")
    }

    const licence = snapshotData<LicenceRecord>(licenceSnap)!
    const schoolRef = options.firestore.collection("schools").doc(licence.schoolId)
    const schoolSnap = await transaction.get(schoolRef)
    if (!schoolSnap.exists) {
      throw new Error("SCHOOL_NOT_FOUND")
    }

    const profile = snapshotData<UserProfileLike>(profileSnap)
    if (profile?.role === "super_admin") {
      throw new Error("SUPER_ADMIN_PROTECTED")
    }

    const membership = snapshotData<SchoolMembershipRecord>(membershipSnap)
    if (membership?.status === "active" && membership.licenceId !== options.licenceId) {
      throw new Error("USER_ALREADY_ASSIGNED")
    }

    if (membership?.status === "active" && membership.licenceId === options.licenceId) {
      return { alreadyAssigned: true, schoolId: licence.schoolId }
    }

    if (!isActiveLicenceRecord(licence, now)) {
      throw new Error("LICENCE_INACTIVE")
    }

    if (licence.seatsUsed >= licence.seatLimit) {
      throw new Error("SEAT_LIMIT_REACHED")
    }

    const school = snapshotData<SchoolRecord>(schoolSnap)!
    transaction.set(
      membershipRef,
      {
        schoolId: licence.schoolId,
        licenceId: options.licenceId,
        assignedAt: now,
        assignedBy: options.adminUid,
        status: "active",
      } satisfies SchoolMembershipRecord,
      { merge: true },
    )

    const profilePatch = buildProfilePatchFromExisting(profile, licence.schoolId, options.licenceId, now)
    if (!profile?.email && options.fallbackEmail) {
      profilePatch.email = options.fallbackEmail
    }
    transaction.set(userProfileRef, profilePatch, { merge: true })

    const userData = snapshotData<Record<string, unknown>>(userSnap)
    const existingEntitlements =
      typeof userData?.entitlements === "object" && userData.entitlements !== null
        ? (userData.entitlements as Record<string, unknown>)
        : {}

    transaction.set(
      userRef,
      {
        email:
          typeof userData?.email === "string" && userData.email
            ? userData.email
            : options.fallbackEmail ?? undefined,
        plan: typeof userData?.plan === "string" ? userData.plan : "free",
        monthlyDraftLimit:
          typeof userData?.monthlyDraftLimit === "number" ? userData.monthlyDraftLimit : 5,
        entitlements: {
          ...existingEntitlements,
          planSource: "school_licence",
        },
        updatedAt: now,
      },
      { merge: true },
    )

    const nextSeatsUsed = licence.seatsUsed + 1
    transaction.set(
      licenceRef,
      {
        seatsUsed: nextSeatsUsed,
        updatedAt: now,
      },
      { merge: true },
    )
    transaction.set(
      schoolRef,
      {
        seatsUsed: nextSeatsUsed,
        updatedAt: now,
      },
      { merge: true },
    )

    return { alreadyAssigned: false, schoolId: school.schoolName ? licence.schoolId : licence.schoolId }
  })
}

export async function removeUserFromLicence(options: {
  firestore: Firestore
  targetUid: string
  licenceId: string
}) {
  const now = Date.now()
  const licenceRef = options.firestore.collection("licences").doc(options.licenceId)
  const membershipRef = options.firestore.collection("school_memberships").doc(options.targetUid)
  const userProfileRef = options.firestore.collection("user_profiles").doc(options.targetUid)
  const userRef = options.firestore.collection("users").doc(options.targetUid)

  return options.firestore.runTransaction(async (transaction) => {
    const [licenceSnap, membershipSnap, profileSnap, userSnap] = await Promise.all([
      transaction.get(licenceRef),
      transaction.get(membershipRef),
      transaction.get(userProfileRef),
      transaction.get(userRef),
    ])

    if (!licenceSnap.exists) {
      throw new Error("LICENCE_NOT_FOUND")
    }

    const licence = snapshotData<LicenceRecord>(licenceSnap)!
    const schoolRef = options.firestore.collection("schools").doc(licence.schoolId)
    const schoolSnap = await transaction.get(schoolRef)
    if (!schoolSnap.exists) {
      throw new Error("SCHOOL_NOT_FOUND")
    }

    const membership = snapshotData<SchoolMembershipRecord>(membershipSnap)
    const profile = snapshotData<UserProfileLike>(profileSnap)
    const userData = snapshotData<Record<string, unknown>>(userSnap)

    if (membership?.status === "active" && membership.licenceId === options.licenceId) {
      transaction.set(
        membershipRef,
        {
          status: "removed",
          assignedAt: membership.assignedAt,
          assignedBy: membership.assignedBy,
          schoolId: membership.schoolId,
          licenceId: membership.licenceId,
        } satisfies SchoolMembershipRecord,
        { merge: true },
      )
    }

    if (profileSnap.exists) {
      transaction.set(
        userProfileRef,
        {
          schoolId: null,
          licenceId: null,
          updatedAt: now,
        },
        { merge: true },
      )
    }

    const existingEntitlements =
      typeof userData?.entitlements === "object" && userData.entitlements !== null
        ? (userData.entitlements as Record<string, unknown>)
        : {}
    const planSource = existingEntitlements.planSource
    if (userSnap.exists && planSource === "school_licence") {
      transaction.set(
        userRef,
        {
          entitlements: {
            ...existingEntitlements,
            planSource: null,
          },
          updatedAt: now,
        },
        { merge: true },
      )
    }

    const nextSeatsUsed =
      membership?.status === "active" && membership.licenceId === options.licenceId
        ? Math.max(0, licence.seatsUsed - 1)
        : Math.max(0, licence.seatsUsed)

    transaction.set(
      licenceRef,
      {
        seatsUsed: nextSeatsUsed,
        updatedAt: now,
      },
      { merge: true },
    )
    transaction.set(
      schoolRef,
      {
        seatsUsed: nextSeatsUsed,
        updatedAt: now,
      },
      { merge: true },
    )
  })
}
