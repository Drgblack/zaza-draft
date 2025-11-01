"use client";
import { createContext } from "react";

export type AuthUser = { uid: string; email?: string | null } | null;

export type AuthContextValue = {
  user: AuthUser;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
