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
  const candidate = normalizeCandidate(userDisplayName) || normalizeCandidate(storedSignatureName)
  if (!candidate) {
    return undefined
  }

  const normalized = candidate.toLowerCase()
  if (PLACEHOLDER_SIGNATURE_NAMES.has(normalized)) {
    return undefined
  }

  return candidate
}

