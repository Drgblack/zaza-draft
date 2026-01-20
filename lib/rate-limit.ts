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

interface RateLimitConfig {
  docName?: string
  windowMs?: number
  limit?: number
}

export async function enforcePerUserRateLimit(
  uid: string,
  firestore: Firestore,
  config: RateLimitConfig = {},
) {
  const now = Date.now()
  const docName = config.docName ?? RATE_LIMIT_DOC_NAME
  const windowMs = config.windowMs ?? RATE_LIMIT_WINDOW_MS
  const limit = config.limit ?? RATE_LIMIT_COUNT

  const docRef = firestore.collection("users").doc(uid).collection("rateLimits").doc(docName)

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

    if (now - windowStart > windowMs) {
      tx.set(docRef, {
        windowStart: now,
        count: 1,
      })
      return
    }

    if (count >= limit) {
      const retryAfterMs = Math.max(windowMs - (now - windowStart), 0)
      throw new RateLimitError(retryAfterMs)
    }

    tx.update(docRef, {
      count: count + 1,
    })
  })
}

export async function enforceDraftRateLimit(uid: string, firestore: Firestore) {
  return enforcePerUserRateLimit(uid, firestore)
}
