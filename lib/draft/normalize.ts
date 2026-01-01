export function normalizeToken(value?: string | null): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const normalized = trimmed
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toLowerCase()
    .trim()

  return normalized || null
}

export function normalizeFirstToken(value?: string | null): string | null {
  if (!value) {
    return null
  }
  const firstToken = value.trim().split(/\s+/)[0]
  return normalizeToken(firstToken)
}
