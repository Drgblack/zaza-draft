const FORCE_PRO_ENV_KEY = "FORCE_PRO_USER_IDS"
export function getForcedProUsers() {
  const rawValue = process.env[FORCE_PRO_ENV_KEY] ?? ""
  return new Set(
    rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  )
}

export function refreshForcedProUserIds() {
  // No-op. Kept for compatibility with existing tests and imports.
}

export function isForcedProUser(uid?: string | null) {
  if (process.env.NODE_ENV !== "development") {
    return false
  }

  if (!uid) {
    return false
  }

  return getForcedProUsers().has(uid)
}
