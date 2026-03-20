import type { ActionCodeSettings } from "firebase/auth"

const EMAIL_LINK_STORAGE_KEY = "zaza.auth.emailLinkEmail"
const LOCAL_APP_ORIGIN = "http://localhost:3000"
const CANONICAL_PRODUCTION_APP_ORIGIN = "https://app.zazadraft.com"

function getFallbackOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin
  }
  return LOCAL_APP_ORIGIN
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1"
}

export function resolveEmailLinkRedirectUrl(currentOrigin = getFallbackOrigin()) {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const currentHostname = new URL(currentOrigin).hostname

  if (!configuredBaseUrl) {
    if (!isLocalHostname(currentHostname)) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL must be set for email-link sign-in outside local development.",
      )
    }
    return new URL("/", currentOrigin).toString()
  }

  let redirectUrl: URL
  try {
    redirectUrl = new URL("/", configuredBaseUrl)
  } catch {
    if (!isLocalHostname(currentHostname)) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL is invalid for email-link sign-in on this deployment.",
      )
    }
    return new URL("/", currentOrigin).toString()
  }

  if (
    currentOrigin === CANONICAL_PRODUCTION_APP_ORIGIN &&
    redirectUrl.origin !== CANONICAL_PRODUCTION_APP_ORIGIN
  ) {
    throw new Error(
      `NEXT_PUBLIC_APP_URL must be ${CANONICAL_PRODUCTION_APP_ORIGIN} when running on app.zazadraft.com.`,
    )
  }

  return redirectUrl.toString()
}

export function getEmailLinkRedirectUrl() {
  return resolveEmailLinkRedirectUrl(getFallbackOrigin())
}

export function getEmailLinkActionCodeSettings(): ActionCodeSettings {
  return {
    url: getEmailLinkRedirectUrl(),
    handleCodeInApp: true,
  }
}

export function storeEmailLinkEmail(email: string) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email.trim())
}

export function getStoredEmailLinkEmail() {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY)
}

export function clearStoredEmailLinkEmail() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY)
}
