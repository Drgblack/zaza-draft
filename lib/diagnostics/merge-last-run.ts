export type FirestoreTimestamp = { seconds?: number; nanoseconds?: number }

export type DiagnosticsDocument = Record<string, unknown> & {
  lastRunAt?: FirestoreTimestamp
}

function buildTimestampFromMillis(millis: number): FirestoreTimestamp | null {
  if (!Number.isFinite(millis)) {
    return null
  }
  const seconds = Math.floor(millis / 1000)
  const millisecondsPart = millis - seconds * 1000
  const nanoseconds = Math.round(millisecondsPart * 1_000_000)
  return { seconds, nanoseconds }
}

function normalizeTimestamp(value?: unknown): FirestoreTimestamp | null {
  if (value === undefined || value === null) return null

  if (typeof value === "number") {
    return buildTimestampFromMillis(value)
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) {
      return buildTimestampFromMillis(parsed)
    }
    return null
  }

  if (value instanceof Date) {
    return buildTimestampFromMillis(value.getTime())
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const seconds = typeof record.seconds === "number" ? record.seconds : undefined
    const nanoseconds = typeof record.nanoseconds === "number" ? record.nanoseconds : undefined
    if (seconds !== undefined || nanoseconds !== undefined) {
      return { seconds, nanoseconds }
    }
    if (typeof record.toMillis === "function") {
      const millis = record.toMillis()
      return buildTimestampFromMillis(millis)
    }
    if (typeof record.toDate === "function") {
      const dateValue = record.toDate()
      if (dateValue instanceof Date) {
        return buildTimestampFromMillis(dateValue.getTime())
      }
    }
  }

  return null
}

function normalizeDiagnosticsDocument(doc?: DiagnosticsDocument | null): DiagnosticsDocument | null {
  if (!doc) return null
  const normalizedLastRunAt = normalizeTimestamp(doc.lastRunAt)
  return {
    ...doc,
    lastRunAt: normalizedLastRunAt ?? undefined,
  }
}

export function mergeDiagnosticsWithLastRun(
  diagnosticsDoc: DiagnosticsDocument | null,
  fallbackLastRun?: FirestoreTimestamp | null,
): DiagnosticsDocument | null {
  const normalizedDoc = normalizeDiagnosticsDocument(diagnosticsDoc)
  if (normalizedDoc?.lastRunAt) {
    return normalizedDoc
  }
  const normalizedFallback = normalizeTimestamp(fallbackLastRun)
  if (normalizedFallback) {
    return {
      ...(normalizedDoc ?? diagnosticsDoc ?? {}),
      lastRunAt: normalizedFallback,
    }
  }
  return normalizedDoc ?? diagnosticsDoc
}
