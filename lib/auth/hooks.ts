import { useContext } from 'react';
import { AuthContext } from './provider';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthStatus() {
  const { status } = useAuth();
  return status;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}