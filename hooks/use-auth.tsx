"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import {
  isSignInWithEmailLink,
  onIdTokenChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth"
import { auth, googleAuthProvider } from "@/lib/firebase/client"
import type { ZazaRole } from "@/lib/auth/roles"
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
} from "@/lib/auth/cookie"
import {
  classifyEmailLinkError,
  clearStoredEmailLinkEmail,
  getEmailLinkActionCodeSettings,
  getKnownEmailLinkEmail,
  getEmailLinkRedirectUrl,
  type EmailLinkRecoveryReason,
  storeEmailLinkEmail,
} from "@/lib/auth/email-link"
import { logClientEvent, TRUST_FUNNEL_EVENTS } from "@/lib/analytics"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"
type EmailLinkStatus = "idle" | "processing" | "awaiting_email" | "recovery"

interface AuthContextValue {
  user: User | null
  role: ZazaRole | null
  status: AuthStatus
  emailLinkStatus: EmailLinkStatus
  emailLinkKnownEmail: string | null
  emailLinkRecoveryReason: EmailLinkRecoveryReason | null
  sendEmailLink: (email: string) => Promise<void>
  completeEmailLinkSignIn: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function writeAuthCookie(value: string, maxAge: number) {
  if (typeof document === "undefined") {
    return
  }

  const maxAgeDirective = maxAge >= 0 ? `max-age=${maxAge}; ` : ""
  document.cookie = `${AUTH_COOKIE_NAME}=${value}; ${maxAgeDirective}path=/; sameSite=Lax`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<ZazaRole | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [emailLinkStatus, setEmailLinkStatus] = useState<EmailLinkStatus>("idle")
  const [emailLinkKnownEmail, setEmailLinkKnownEmail] = useState<string | null>(null)
  const [emailLinkRecoveryReason, setEmailLinkRecoveryReason] =
    useState<EmailLinkRecoveryReason | null>(null)
  const refreshedClaimUidRef = useRef<string | null>(null)
  const refreshInFlightRef = useRef<{
    uid: string | null
    promise: Promise<string | null> | null
  }>({
    uid: null,
    promise: null,
  })

  const resolveIdToken = async (
    nextUser: User,
    options?: {
      forceRefresh?: boolean
      reason?: string
    },
  ) => {
    const activeRefresh = refreshInFlightRef.current
    if (activeRefresh.uid === nextUser.uid && activeRefresh.promise) {
      return activeRefresh.promise
    }

    const shouldForceRefresh =
      options?.forceRefresh || refreshedClaimUidRef.current !== nextUser.uid

    if (!shouldForceRefresh) {
      return nextUser.getIdToken()
    }

    const refreshPromise = (async () => {
      const refreshedToken = await nextUser.getIdToken(true)
      refreshedClaimUidRef.current = nextUser.uid
      const tokenResult = await nextUser.getIdTokenResult()
      console.log("[auth] refreshed token result", {
        reason: options?.reason ?? "unspecified",
        claims: tokenResult.claims,
        authTime: tokenResult.authTime,
        issuedAtTime: tokenResult.issuedAtTime,
        expirationTime: tokenResult.expirationTime,
      })
      return refreshedToken
    })().finally(() => {
      if (refreshInFlightRef.current.promise === refreshPromise) {
        refreshInFlightRef.current = { uid: null, promise: null }
      }
    })

    refreshInFlightRef.current = {
      uid: nextUser.uid,
      promise: refreshPromise,
    }

    return refreshPromise
  }

  useEffect(() => {
    if (!auth) {
      setUser(null)
      setStatus("unauthenticated")
      return
    }

    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      if (!nextUser) {
        refreshedClaimUidRef.current = null
        refreshInFlightRef.current = { uid: null, promise: null }
        setUser(null)
        setRole(null)
        setStatus("unauthenticated")
        return
      }

      let token: string | null = null
      try {
        token = await resolveIdToken(nextUser, {
          reason: "on_id_token_changed",
        })
      } catch (error) {
        console.warn("[auth] token refresh failed", error)
        try {
          token = await nextUser.getIdToken()
        } catch (tokenError) {
          console.warn("[auth] fallback token read failed", tokenError)
        }
      }

      console.info("[auth] firebase auth success", {
        uid: nextUser.uid,
        email: nextUser.email ?? null,
      })
      setEmailLinkStatus("idle")
      setEmailLinkKnownEmail(nextUser.email ?? null)
      setEmailLinkRecoveryReason(null)
      setUser(nextUser)
      setStatus("authenticated")
      void (async () => {
        try {
          if (!token) {
            throw new Error("Missing ID token for bootstrap")
          }
          const response = await fetch("/api/account/bootstrap", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (!response.ok) {
            throw new Error(`Bootstrap failed with status ${response.status}`)
          }
          const payload = await response.json()
          const nextRole = normalizeRole(payload?.data?.role)
          setRole(nextRole)
          console.info("[auth] account bootstrap result", payload?.data ?? payload ?? null)
          logClientEvent(TRUST_FUNNEL_EVENTS.accountBootstrapCompleted, {
            created: Boolean(payload?.data?.created),
            firstLogin: Boolean(payload?.data?.firstLogin),
          })
        } catch (error) {
          setRole(null)
          console.warn("[auth] account bootstrap failed", error)
        }
      })()
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!auth || typeof window === "undefined") {
      return
    }

    const currentUrl = window.location.href
    if (!isSignInWithEmailLink(auth, currentUrl)) {
      return
    }

    const knownEmail = getKnownEmailLinkEmail(currentUrl)
    if (!knownEmail) {
      setEmailLinkStatus("awaiting_email")
      setEmailLinkKnownEmail(null)
      setEmailLinkRecoveryReason(null)
      setStatus("unauthenticated")
      return
    }

    storeEmailLinkEmail(knownEmail)
    setEmailLinkKnownEmail(knownEmail)
    setEmailLinkRecoveryReason(null)
    setEmailLinkStatus("processing")
    void (async () => {
      try {
        const result = await signInWithEmailLink(auth, knownEmail, currentUrl)
        await resolveIdToken(result.user, {
          forceRefresh: true,
          reason: "email_link_known_email",
        })
        logClientEvent(TRUST_FUNNEL_EVENTS.magicLinkCompleted, {
          completionMode: "stored_email",
        })
        clearStoredEmailLinkEmail()
        window.location.replace(getEmailLinkRedirectUrl())
      } catch (error) {
        console.warn("[auth] email-link completion failed", error)
        const recoveryReason = classifyEmailLinkError(error)
        if (recoveryReason === "expired_or_used") {
          setEmailLinkRecoveryReason(recoveryReason)
          setEmailLinkKnownEmail(knownEmail)
          setEmailLinkStatus("recovery")
        } else {
          clearStoredEmailLinkEmail()
          setEmailLinkRecoveryReason(null)
          setEmailLinkStatus("idle")
        }
        setStatus("unauthenticated")
      }
    })()
  }, [])

  useEffect(() => {
    if (status === "loading") {
      return
    }

    if (status === "authenticated") {
      writeAuthCookie(AUTH_COOKIE_VALUE, AUTH_COOKIE_MAX_AGE)
    } else {
      writeAuthCookie("", 0)
    }
  }, [status])

  const sendEmailLink = async (email: string) => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured.")
    }

    const normalizedEmail = email.trim()
    const actionCodeSettings = getEmailLinkActionCodeSettings()
    storeEmailLinkEmail(normalizedEmail)
    setEmailLinkKnownEmail(normalizedEmail)
    setEmailLinkRecoveryReason(null)
    console.info("[auth] sendSignInLinkToEmail actionCodeSettings", actionCodeSettings)

    try {
      await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings)
      console.info("[auth] sendSignInLinkToEmail success", { email: normalizedEmail })
      setEmailLinkStatus("idle")
    } catch (error) {
      console.error("[auth] sendSignInLinkToEmail error", error)
      clearStoredEmailLinkEmail()
      throw error
    }
  }

  const completeEmailLinkSignIn = async (email: string) => {
    if (!auth || typeof window === "undefined") {
      throw new Error("Firebase Auth is not configured.")
    }

    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      throw new Error("Email is required to complete sign-in.")
    }

    storeEmailLinkEmail(normalizedEmail)
    setEmailLinkKnownEmail(normalizedEmail)
    setEmailLinkRecoveryReason(null)
    setEmailLinkStatus("processing")

    try {
      const result = await signInWithEmailLink(auth, normalizedEmail, window.location.href)
      await resolveIdToken(result.user, {
        forceRefresh: true,
        reason: "email_link_manual_completion",
      })
      logClientEvent(TRUST_FUNNEL_EVENTS.magicLinkCompleted, {
        completionMode: "manual_email_entry",
      })
      clearStoredEmailLinkEmail()
      window.location.replace(getEmailLinkRedirectUrl())
    } catch (error) {
      const recoveryReason = classifyEmailLinkError(error)
      if (recoveryReason === "expired_or_used") {
        setEmailLinkRecoveryReason(recoveryReason)
        setEmailLinkStatus("recovery")
      } else {
        setEmailLinkStatus("awaiting_email")
      }
      throw error
    }
  }

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured.")
    }
    const result = await signInWithPopup(auth, googleAuthProvider)
    await resolveIdToken(result.user, {
      forceRefresh: true,
      reason: "google_sign_in",
    })
  }

  const signOut = async () => {
    if (!auth) {
      return
    }
    refreshedClaimUidRef.current = null
    refreshInFlightRef.current = { uid: null, promise: null }
    setRole(null)
    await firebaseSignOut(auth)
  }

  const getIdToken = async (forceRefresh = false) => {
    if (!auth?.currentUser) {
      return null
    }
    return resolveIdToken(auth.currentUser, {
      forceRefresh,
      reason: forceRefresh ? "explicit_force_refresh" : "api_request",
    })
  }

  const contextValue = {
    user,
    role,
    status,
    emailLinkStatus,
    emailLinkKnownEmail,
    emailLinkRecoveryReason,
    sendEmailLink,
    completeEmailLinkSignIn,
    signInWithGoogle,
    signOut,
    getIdToken,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

function normalizeRole(value: unknown): ZazaRole | null {
  if (
    value === "super_admin" ||
    value === "admin" ||
    value === "school_admin" ||
    value === "teacher" ||
    value === "teacher_free"
  ) {
    return value
  }

  return null
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
