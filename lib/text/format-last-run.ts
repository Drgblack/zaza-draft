"use client"

export function formatDiagnosticsLastRun(
  lastRunAt:
    | { seconds?: number; nanoseconds?: number }
    | null
    | undefined,
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string,
): string | null {
  if (!lastRunAt) {
    return null
  }
  const seconds = lastRunAt.seconds ?? 0
  const nanoseconds = lastRunAt.nanoseconds ?? 0
  const timestamp = seconds * 1000 + nanoseconds / 1_000_000
  if (!Number.isFinite(timestamp)) {
    return null
  }
  const MIN_VALID_TIMESTAMP = 24 * 60 * 60 * 1000
  if (timestamp <= MIN_VALID_TIMESTAMP) {
    return null
  }
  return formatDate(new Date(timestamp), {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
