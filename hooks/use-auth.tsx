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
  clearStoredEmailLinkEmail,
  getEmailLinkRedirectUrl,
  getStoredEmailLinkEmail,
  storeEmailLinkEmail,
} from "@/lib/auth/email-link"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"
type EmailLinkStatus = "idle" | "processing" | "awaiting_email"

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  emailLinkStatus: EmailLinkStatus
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
      setUser(nextUser)
      setStatus("authenticated")
      void (async () => {
        try {
          const token = await nextUser.getIdToken()
          await fetch("/api/account/bootstrap", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
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

    const storedEmail = getStoredEmailLinkEmail()
    if (!storedEmail) {
      setEmailLinkStatus("awaiting_email")
      setStatus("unauthenticated")
      return
    }

    setEmailLinkStatus("processing")
    void (async () => {
      try {
        await signInWithEmailLink(auth, storedEmail, currentUrl)
        clearStoredEmailLinkEmail()
        window.location.replace(getEmailLinkRedirectUrl())
      } catch (error) {
        console.warn("[auth] email-link completion failed", error)
        clearStoredEmailLinkEmail()
        setEmailLinkStatus("idle")
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
    storeEmailLinkEmail(normalizedEmail)

    try {
      await sendSignInLinkToEmail(auth, normalizedEmail, {
        url: getEmailLinkRedirectUrl(),
        handleCodeInApp: true,
      })
      setEmailLinkStatus("idle")
    } catch (error) {
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

    setEmailLinkStatus("processing")

    try {
      await signInWithEmailLink(auth, normalizedEmail, window.location.href)
      clearStoredEmailLinkEmail()
      window.location.replace(getEmailLinkRedirectUrl())
    } catch (error) {
      setEmailLinkStatus("awaiting_email")
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
      sendEmailLink,
      completeEmailLinkSignIn,
      signInWithGoogle,
      signOut,
      getIdToken,
    }),
    [user, status, emailLinkStatus],
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
