'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/client';
import { AuthContextType, AuthState } from './types';

const initialState: AuthState = {
  user: null,
  status: 'loading',
  error: null,
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setState({
          user,
          status: user ? 'authenticated' : 'unauthenticated',
          error: null,
        });
      },
      (error) => {
        setState({
          user: null,
          status: 'unauthenticated',
          error: error as Error,
        });
      }
    );

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setState((s) => ({ ...s, error: error as Error }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Send verification email (non-blocking)
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        // ignore verification errors; user still created
        console.warn('sendEmailVerification failed', e);
      }
    } catch (error) {
      setState((s) => ({ ...s, error: error as Error }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      setState((s) => ({ ...s, error: error as Error }));
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setState((s) => ({ ...s, error: error as Error }));
      throw error;
    }
  };

  const value = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}