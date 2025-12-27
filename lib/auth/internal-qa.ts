const parseQaUids = () => {
  const raw = process.env.INTERNAL_QA_UIDS ?? ""
  return new Set(
    raw
      .split(",")
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
