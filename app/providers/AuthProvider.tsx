"use client";
import type { ReactNode } from "react";
import { AuthContext, AuthContextValue } from "@/lib/auth/context";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    user: null,          // not signed in yet
    loading: false,      // no async in this stub
    signIn: async () => {},
    signOut: async () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
