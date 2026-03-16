const ANALYTICS_CONSENT_STORAGE_KEY = "draft_analytics_consent"
const ANALYTICS_CONSENT_STORAGE_KEY_PREFIX = `${ANALYTICS_CONSENT_STORAGE_KEY}:`

export const ANALYTICS_CONSENT_CHANGED_EVENT = "zaza:analytics-consent-changed"

function getScopedStorageKey(uid?: string | null) {
  if (!uid) {
    return ANALYTICS_CONSENT_STORAGE_KEY
  }

  return `${ANALYTICS_CONSENT_STORAGE_KEY_PREFIX}${uid}`
}

function parseConsentValue(value: string | null) {
  return value === "true"
}

export function readAnalyticsConsent(uid?: string | null) {
  if (typeof window === "undefined") {
    return false
  }

  const scopedValue = window.localStorage.getItem(getScopedStorageKey(uid))
  if (scopedValue !== null) {
    return parseConsentValue(scopedValue)
  }

  const legacyValue = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
  return parseConsentValue(legacyValue)
}

export function writeAnalyticsConsent(enabled: boolean, uid?: string | null) {
  if (typeof window === "undefined") {
    return
  }

  const scopedKey = getScopedStorageKey(uid)
  window.localStorage.setItem(scopedKey, String(enabled))
  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, String(enabled))

  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, {
      detail: { enabled, key: scopedKey },
    }),
  )
}

export function migrateAnalyticsConsent(uid?: string | null) {
  if (typeof window === "undefined" || !uid) {
    return
  }

  const scopedKey = getScopedStorageKey(uid)
  if (window.localStorage.getItem(scopedKey) !== null) {
    return
  }

  const legacyValue = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
  if (legacyValue === null) {
    return
  }

  window.localStorage.setItem(scopedKey, legacyValue)
}
