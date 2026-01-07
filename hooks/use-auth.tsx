"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
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

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  signInWithEmail: (email: string, password: string) => Promise<void>
  registerWithEmail: (email: string, password: string) => Promise<void>
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
    if (status === "loading") {
      return
    }

    if (status === "authenticated") {
      writeAuthCookie(AUTH_COOKIE_VALUE, AUTH_COOKIE_MAX_AGE)
    } else {
      writeAuthCookie("", 0)
    }
  }, [status])

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured.")
    }
    await signInWithEmailAndPassword(auth, email, password)
  }

  const registerWithEmail = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured.")
    }
    await createUserWithEmailAndPassword(auth, email, password)
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
      signInWithEmail,
      registerWithEmail,
      signInWithGoogle,
      signOut,
      getIdToken,
    }),
    [user, status],
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
