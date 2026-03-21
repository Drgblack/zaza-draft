function normalizeComparableText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

export function looksLikeHumanDisplayName(name?: string | null, email?: string | null) {
  if (typeof name !== "string") {
    return false
  }

  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 40) {
    return false
  }

  if (/@|https?:|www\.|\.com\b|\.de\b|\.at\b|\.ch\b/i.test(trimmed)) {
    return false
  }

  if (/\d/.test(trimmed)) {
    return false
  }

  if (/(bot|team|support|admin|service|account|system|no-?reply|noreply|info|draft|zaza)/i.test(trimmed)) {
    return false
  }

  const invalidCharacters = trimmed.replace(/[\p{L}\s.'-]/gu, "")
  if (invalidCharacters.length > 0) {
    return false
  }

  const letters = trimmed.match(/\p{L}/gu) ?? []
  if (letters.length < 2) {
    return false
  }

  if (email?.trim()) {
    const normalizedName = normalizeComparableText(trimmed)
    const normalizedEmail = email.trim().toLowerCase()
    const [localPart = "", domainPart = ""] = normalizedEmail.split("@")
    const domainRoot = domainPart.split(".")[0] ?? ""
    const isSingleToken = !/\s/.test(trimmed)
    const localPartLooksLikeIdentifier = /[._+-]/.test(localPart)

    if (
      (isSingleToken &&
        localPartLooksLikeIdentifier &&
        normalizedName === normalizeComparableText(localPart)) ||
      normalizedName === normalizeComparableText(domainRoot)
    ) {
      return false
    }
  }

  return true
}
