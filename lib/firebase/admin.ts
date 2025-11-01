/**
 * Test-time stub for Admin Firestore.
 * Prevents Vitest/Vite import errors for "@/lib/firebase/admin".
 * Replace with real Admin SDK in server/runtime if needed.
 */
export const dbAdmin = { __mock: true } as any;
