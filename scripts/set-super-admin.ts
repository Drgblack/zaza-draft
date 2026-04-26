/**
 * Usage:
 *   npx tsx scripts/set-super-admin.ts --email=greg@zazadraft.com --role=super_admin
 *   npx tsx scripts/set-super-admin.ts --uid=KJ8ZDQdeflRxSyy1BXwSFNA2dt2 --role=super_admin
 *
 * Security notes:
 * - This script requires FIREBASE_ADMIN_SDK credentials.
 * - Never run this in a browser or client context.
 * - Record the resulting uid securely.
 * - This script should not be deployed to production runtime bundles.
 */

import { createHash } from "node:crypto"

import { getFirebaseAdmin } from "../lib/firebase/admin"
import { createDefaultUserProfile, type ZazaRole } from "../lib/auth/roles"

const ASSIGNABLE_SCRIPT_ROLES: ZazaRole[] = [
  "super_admin",
  "admin",
  "school_admin",
  "teacher",
]

function getEmailArg() {
  const emailArg = process.argv.find((arg) => arg.startsWith("--email="))
  return emailArg?.slice("--email=".length).trim() ?? ""
}

function getUidArg() {
  const uidArg = process.argv.find((arg) => arg.startsWith("--uid="))
  return uidArg?.slice("--uid=".length).trim() ?? ""
}

function getRoleArg(): ZazaRole {
  const roleArg = process.argv.find((arg) => arg.startsWith("--role="))
  const parsedRole = roleArg?.slice("--role=".length).trim() ?? "super_admin"

  if (!ASSIGNABLE_SCRIPT_ROLES.includes(parsedRole as ZazaRole)) {
    throw new Error(
      `Invalid --role value. Use one of: ${ASSIGNABLE_SCRIPT_ROLES.join(", ")}`,
    )
  }

  return parsedRole as ZazaRole
}

async function main() {
  const email = getEmailArg()
  const uid = getUidArg()
  const role = getRoleArg()
  if (!email && !uid) {
    throw new Error("Missing --email or --uid argument.")
  }

  const { auth, firestore } = getFirebaseAdmin()
  if (!auth || !firestore) {
    throw new Error("Firebase Admin SDK is not configured.")
  }

  let targetUid = uid
  let targetEmail = email

  if (!targetUid) {
    const user = await auth.getUserByEmail(email)
    targetUid = user.uid
    targetEmail = user.email ?? email
  }

  const uidHash = createHash("sha256").update(targetUid).digest("hex").slice(0, 12)
  const profileRef = firestore.collection("user_profiles").doc(targetUid)
  const profileSnapshot = await profileRef.get()
  const existingProfile = profileSnapshot.data() as Record<string, unknown> | undefined
  const resolvedEmail =
    targetEmail ||
    (typeof existingProfile?.email === "string" ? existingProfile.email : "")

  await profileRef.set(
    profileSnapshot.exists
      ? {
          role,
          email: resolvedEmail,
          uidHash,
          updatedAt: Date.now(),
        }
      : {
          ...createDefaultUserProfile({
            uid: targetUid,
            uidHash,
            email: resolvedEmail,
          }),
          role,
          updatedAt: Date.now(),
        },
    { merge: true },
  )

  const updatedProfileSnapshot = await profileRef.get()
  const updatedProfile = updatedProfileSnapshot.data()
  if (!updatedProfile || updatedProfile.role !== role) {
    throw new Error(`Role assignment verification failed for ${targetUid}.`)
  }

  const targetLabel = resolvedEmail || targetUid
  console.log(`${role} role assigned to ${targetLabel} (${targetUid})`)
}

void main().catch((error) => {
  console.error((error as Error)?.message ?? error)
  process.exit(1)
})
