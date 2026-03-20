const EMAIL_LINK_STORAGE_KEY = "zaza.auth.emailLinkEmail"

function getFallbackOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin
  }
  return "http://localhost:3000"
}

export function getEmailLinkRedirectUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const baseUrl = configuredBaseUrl || getFallbackOrigin()

  try {
    return new URL("/", baseUrl).toString()
  } catch {
    return new URL("/", getFallbackOrigin()).toString()
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
