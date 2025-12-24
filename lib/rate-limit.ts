import type { Firestore } from "firebase-admin/firestore"

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_COUNT = 10
const RATE_LIMIT_DOC_NAME = "draftGenerate"

export class RateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("Rate limit exceeded")
    this.name = "RateLimitError"
  }
}

export async function enforceDraftRateLimit(uid: string, firestore: Firestore) {
  const now = Date.now()
  const docRef = firestore
    .collection("users")
    .doc(uid)
    .collection("rateLimits")
    .doc(RATE_LIMIT_DOC_NAME)

  await firestore.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef)
    if (!snapshot.exists) {
      tx.set(docRef, {
        windowStart: now,
        count: 1,
      })
      return
    }

    const data = snapshot.data() as { windowStart?: number; count?: number } | undefined
    const windowStart = typeof data?.windowStart === "number" ? data.windowStart : 0
    const count = typeof data?.count === "number" ? data.count : 0

    if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
      tx.set(docRef, {
        windowStart: now,
        count: 1,
      })
      return
    }

    if (count >= RATE_LIMIT_COUNT) {
      const retryAfterMs = Math.max(RATE_LIMIT_WINDOW_MS - (now - windowStart), 0)
      throw new RateLimitError(retryAfterMs)
    }

    tx.update(docRef, {
      count: count + 1,
    })
  })
}
