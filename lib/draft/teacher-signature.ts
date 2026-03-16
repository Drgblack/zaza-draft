const PLACEHOLDER_SIGNATURE_NAMES = new Set([
  "[your name]",
  "[ihr name]",
  "[lehrkraft name]",
])

const LEADING_TITLE_PATTERN =
  /^(mr|mrs|ms|miss|mx|dr|prof|professor)\.?\s+/i

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
  const candidate = explicitSignature || fallbackDisplayName.replace(LEADING_TITLE_PATTERN, "")
  if (!candidate) {
    return undefined
  }

  const normalized = candidate.toLowerCase()
  if (PLACEHOLDER_SIGNATURE_NAMES.has(normalized)) {
    return undefined
  }

  return candidate
}
