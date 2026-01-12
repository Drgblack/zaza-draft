export type FirestoreTimestamp = { seconds?: number; nanoseconds?: number }

export type DiagnosticsDocument = Record<string, unknown> & {
  lastRunAt?: FirestoreTimestamp
}

export function mergeDiagnosticsWithLastRun(
  diagnosticsDoc: DiagnosticsDocument | null,
  fallbackLastRun?: FirestoreTimestamp | null,
): DiagnosticsDocument | null {
  const base = diagnosticsDoc ? { ...diagnosticsDoc } : null
  if (base && base.lastRunAt) {
    return base
  }
  if (fallbackLastRun) {
    return {
      ...(base ?? {}),
      lastRunAt: fallbackLastRun,
    }
  }
  return base
}
