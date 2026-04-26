import { NextResponse } from "next/server"
import type { Firestore } from "firebase-admin/firestore"
import type { NextRequest } from "next/server"

import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { getFirebaseAdmin } from "@/lib/firebase/admin"

import type { ZazaRole, ZazaUserProfile } from "./roles"
import { hasAdminAccess } from "./roles"

type CachedProfile = {
  expiresAt: number
  profile: ZazaUserProfile | null
}

const USER_PROFILE_COLLECTION = "user_profiles"
const ROLE_CACHE_TTL_MS = 60_000
const roleCache = new Map<string, CachedProfile>()

function normalizeUserProfile(
  uid: string,
  raw: Record<string, unknown> | undefined,
): ZazaUserProfile | null {
  if (!raw) {
    return null
  }

  const role = typeof raw.role === "string" ? raw.role : "teacher_free"
  const planStatus = typeof raw.planStatus === "string" ? raw.planStatus : "free"
  const email = typeof raw.email === "string" ? raw.email : ""
  const uidHash = typeof raw.uidHash === "string" ? raw.uidHash : ""
  const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : Date.now()
  const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : createdAt

  return {
    uid,
    uidHash,
    role: role as ZazaRole,
    email,
    schoolId: typeof raw.schoolId === "string" ? raw.schoolId : undefined,
    createdAt,
    updatedAt,
    stripeCustomerId:
      typeof raw.stripeCustomerId === "string" ? raw.stripeCustomerId : undefined,
    planStatus: planStatus as ZazaUserProfile["planStatus"],
  }
}

async function readUserProfileFromFirestore(
  uid: string,
  firestore?: Firestore | null,
): Promise<ZazaUserProfile | null> {
  const activeFirestore = firestore ?? getFirebaseAdmin().firestore
  if (!activeFirestore) {
    return null
  }

  const snapshot = await activeFirestore.collection(USER_PROFILE_COLLECTION).doc(uid).get()
  if (!snapshot.exists) {
    return null
  }

  return normalizeUserProfile(uid, snapshot.data() as Record<string, unknown> | undefined)
}

export async function getUserProfile(
  uid: string,
  firestore?: Firestore | null,
): Promise<ZazaUserProfile | null> {
  const now = Date.now()
  const cached = roleCache.get(uid)
  if (cached && cached.expiresAt > now) {
    return cached.profile
  }

  try {
    const profile = await readUserProfileFromFirestore(uid, firestore)
    roleCache.set(uid, {
      expiresAt: now + ROLE_CACHE_TTL_MS,
      profile,
    })
    return profile
  } catch (error) {
    return null
  }
}

export async function getUserRole(
  uid: string,
  firestore?: Firestore | null,
): Promise<ZazaRole> {
  try {
    const profile = await getUserProfile(uid, firestore)
    return profile?.role ?? "teacher_free"
  } catch (error) {
    return "teacher_free"
  }
}

export function invalidateUserRoleCache(uid: string) {
  roleCache.delete(uid)
}

export async function requireAdminRole(
  request: NextRequest,
): Promise<{ uid: string; role: ZazaRole } | NextResponse> {
  try {
    const authContext = await authorizeFirebaseRequest(request)
    const role = await getUserRole(authContext.uid, authContext.firestore)
    if (hasAdminAccess(role)) {
      return { uid: authContext.uid, role }
    }
  } catch (error) {
    // Fall through to redirect.
  }

  return NextResponse.redirect(new URL("/admin/login", request.url))
}
