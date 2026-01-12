const LAST_RUN_STORAGE_KEY = "zaza:lastDiagnosticsRunAt"

function parseStoredTimestamp(value: string | null): { seconds: number; nanoseconds: number } | null {
  if (!value) {
    return null
  }
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null
  }
  const seconds = Math.floor(timestamp / 1000)
  const nanoseconds = (timestamp % 1000) * 1_000_000
  return { seconds, nanoseconds }
}

export function saveLastRunTimestamp(date: Date) {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(LAST_RUN_STORAGE_KEY, date.toISOString())
  } catch {
    // ignore storage errors
  }
}

export function getLastRunFromStorage() {
  if (typeof window === "undefined") {
    return null
  }
  try {
    const stored = window.localStorage.getItem(LAST_RUN_STORAGE_KEY)
    return parseStoredTimestamp(stored)
  } catch {
    return null
  }
}
