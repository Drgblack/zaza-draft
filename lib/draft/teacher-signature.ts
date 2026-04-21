const PLACEHOLDER_SIGNATURE_NAMES = new Set([
  "[your name]",
  "[ihr name]",
  "[lehrkraft name]",
])

function normalizeCandidate(value?: string | null) {
  if (!value) {
    return ""
  }
  return value
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
    .trim()
}

export function resolveTeacherSignatureName(
  userDisplayName?: string | null,
  storedSignatureName?: string | null,
): string | undefined {
  const explicitSignature = normalizeCandidate(storedSignatureName)
  const fallbackDisplayName = normalizeCandidate(userDisplayName)
  if (explicitSignature) {
    const normalizedExplicitSignature = explicitSignature.toLowerCase()
    if (!PLACEHOLDER_SIGNATURE_NAMES.has(normalizedExplicitSignature)) {
      return explicitSignature
    }
  }

  if (!fallbackDisplayName) {
    return undefined
  }

  const normalizedFallbackDisplayName = fallbackDisplayName.toLowerCase()
  if (PLACEHOLDER_SIGNATURE_NAMES.has(normalizedFallbackDisplayName)) {
    return undefined
  }

  return fallbackDisplayName
}
