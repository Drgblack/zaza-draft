/**
 * Usage:
 *   npx tsx scripts/set-super-admin.ts --email=greg@zazadraft.com --role=super_admin
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
  const role = getRoleArg()
  if (!email) {
    throw new Error("Missing --email argument.")
  }

  const { auth, firestore } = getFirebaseAdmin()
  if (!auth || !firestore) {
    throw new Error("Firebase Admin SDK is not configured.")
  }

  const user = await auth.getUserByEmail(email)
  const uidHash = createHash("sha256").update(user.uid).digest("hex").slice(0, 12)
  const profileRef = firestore.collection("user_profiles").doc(user.uid)
  const profileSnapshot = await profileRef.get()

  await profileRef.set(
    profileSnapshot.exists
      ? {
          role,
          email: user.email ?? email,
          uidHash,
          updatedAt: Date.now(),
        }
      : {
          ...createDefaultUserProfile({
            uid: user.uid,
            uidHash,
            email: user.email ?? email,
          }),
          role,
          updatedAt: Date.now(),
        },
    { merge: true },
  )

  const updatedProfileSnapshot = await profileRef.get()
  const updatedProfile = updatedProfileSnapshot.data()
  if (!updatedProfile || updatedProfile.role !== role) {
    throw new Error(`Role assignment verification failed for ${email}.`)
  }

  console.log(`${role} role assigned to ${email} (${user.uid})`)
}

void main().catch((error) => {
  console.error((error as Error)?.message ?? error)
  process.exit(1)
})
