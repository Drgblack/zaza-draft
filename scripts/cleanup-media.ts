import "dotenv/config"
import { getFirebaseAdmin } from "../lib/firebase/admin"
import type { Firestore } from "firebase-admin/firestore"
import { prepareFirebaseScriptEnvironment } from "./firebase-project"

async function runCleanup() {
  const { projectId } = prepareFirebaseScriptEnvironment({
    scriptName: "cleanup-media.ts",
  })
  const admin = getFirebaseAdmin()
  if (!admin.firestore || !admin.storage) {
    throw new Error("Firebase admin is not configured")
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  if (!bucketName) {
    throw new Error("FIREBASE_STORAGE_BUCKET is not configured")
  }

  const bucket = admin.storage.bucket(bucketName)
  console.info(`[firebase-project] target project ${projectId}`)
  await cleanupCollection("panic_scans", bucket, "mediaPath", admin.firestore)
  await cleanupCollection("voice_sessions", bucket, "mediaPath", admin.firestore)
}

async function cleanupCollection(
  collection: string,
  bucket: any,
  mediaField: string,
  firestore: Firestore,
) {
  const now = new Date().toISOString()
  const snapshot = await firestore.collection(collection).where("expiresAt", "<=", now).get()

  if (snapshot.empty) {
    console.log(`No expired documents in ${collection}`)
    return
  }

  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, any>
    const mediaPath = data[mediaField]
    if (mediaPath) {
      try {
        await bucket.file(mediaPath).delete({ ignoreNotFound: true })
        console.log(`Deleted media: ${mediaPath}`)
      } catch (error) {
        console.warn(`Failed to delete ${mediaPath}`, error)
      }
    }
    await doc.ref.delete()
    console.log(`Removed document ${doc.id} from ${collection}`)
  }
}

runCleanup()
  .then(() => {
    console.log("Media cleanup complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Media cleanup failed", error)
    process.exit(1)
  })
