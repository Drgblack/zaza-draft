export function parseQaUids(rawInput?: string) {
  const raw = rawInput ?? process.env.INTERNAL_QA_UIDS ?? ""
  // DEV NOTE: Add Sarah's QA UID (or other trusted test UIDs) to INTERNAL_QA_UIDS so unlimited drafts work in preview/prod without touching Stripe.
  return new Set(
    raw
      .split(/[,\n\r]+/)
      .map((uid) => uid.trim())
      .filter(Boolean),
  )
}

export function isInternalQaUid(uid: string) {
  if (!uid) {
    return false
  }
  const qaUids = parseQaUids()
  return qaUids.has(uid)
}

export function shouldRespectUsageLimit(uid: string) {
  return !isInternalQaUid(uid)
}
