"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
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
  status: AuthStatus
  emailLinkStatus: EmailLinkStatus
  emailLinkKnownEmail: string | null
  emailLinkRecoveryReason: EmailLinkRecoveryReason | null
  sendEmailLink: (email: string) => Promise<void>
  completeEmailLinkSignIn: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  getIdToken: () => Promise<string | null>
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
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [emailLinkStatus, setEmailLinkStatus] = useState<EmailLinkStatus>("idle")
  const [emailLinkKnownEmail, setEmailLinkKnownEmail] = useState<string | null>(null)
  const [emailLinkRecoveryReason, setEmailLinkRecoveryReason] =
    useState<EmailLinkRecoveryReason | null>(null)

  useEffect(() => {
    if (!auth) {
      setUser(null)
      setStatus("unauthenticated")
      return
    }

    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null)
        setStatus("unauthenticated")
        return
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
          const token = await nextUser.getIdToken()
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
          console.info("[auth] account bootstrap result", payload?.data ?? payload ?? null)
          logClientEvent(TRUST_FUNNEL_EVENTS.accountBootstrapCompleted, {
            created: Boolean(payload?.data?.created),
            firstLogin: Boolean(payload?.data?.firstLogin),
          })
        } catch (error) {
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
        await signInWithEmailLink(auth, knownEmail, currentUrl)
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
      await signInWithEmailLink(auth, normalizedEmail, window.location.href)
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
    await signInWithPopup(auth, googleAuthProvider)
  }

  const signOut = async () => {
    if (!auth) {
      return
    }
    await firebaseSignOut(auth)
  }

  const getIdToken = async () => {
    if (!auth?.currentUser) {
      return null
    }
    return auth.currentUser.getIdToken()
  }

  const contextValue = useMemo(
    () => ({
      user,
      status,
      emailLinkStatus,
      emailLinkKnownEmail,
      emailLinkRecoveryReason,
      sendEmailLink,
      completeEmailLinkSignIn,
      signInWithGoogle,
      signOut,
      getIdToken,
    }),
    [user, status, emailLinkKnownEmail, emailLinkRecoveryReason, emailLinkStatus],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
