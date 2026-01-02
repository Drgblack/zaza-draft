let qaUids = parseInvitedUids(process.env.INTERNAL_QA_UIDS ?? "")
let adminUids = parseInvitedUids(process.env.INTERNAL_ADMIN_UIDS ?? "")

function parseInvitedUids(source: string) {
  return new Set(
    source
      .replace(/[\n\r]+/g, ",")
      .split(",")
      .map((uid) => uid.trim())
      .filter(Boolean),
  )
}

export function parseQaUids(rawInput?: string) {
  if (typeof rawInput === "string") {
    return parseInvitedUids(rawInput)
  }
  return new Set(qaUids)
}

export function isInternalQaUid(uid: string) {
  if (!uid) {
    return false
  }
  return qaUids.has(uid)
}

export function shouldRespectUsageLimit(uid: string) {
  return !isInternalQaUid(uid)
}

export function refreshInternalUidLists() {
  qaUids = parseInvitedUids(process.env.INTERNAL_QA_UIDS ?? "")
  adminUids = parseInvitedUids(process.env.INTERNAL_ADMIN_UIDS ?? "")
}

export function isAdminUid(uid: string) {
  if (!uid) {
    return false
  }
  return adminUids.has(uid)
}
