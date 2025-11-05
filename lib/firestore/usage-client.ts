/** Client-side usage/profile functions using Firebase client SDK */
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function getUsage(_uid?: string) {
  // TODO: Implement if needed
  return { total: 0, month: 0 };
}

export async function incrementUsage(_uid?: string, _delta: number = 1) {
  // This is handled server-side in the API route
  return { ok: true };
}

/** Get user profile from Firestore */
export async function getUserProfile(uid?: string) {
  if (!uid) {
    return {
      plan: "free",
      isPro: false,
      quota: { total: 0, month: 0 },
      usage: { snippetsThisMonth: 0 },
    };
  }

  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Return default profile
      return {
        plan: "free",
        isPro: false,
        quota: { total: 0, month: 0 },
        usage: { snippetsThisMonth: 0 },
      };
    }

    const data = docSnap.data();
    return {
      plan: data.plan || "free",
      isPro: data.plan === "pro",
      quota: {
        total: data.usage?.snippetsThisMonth || 0,
        month: data.usage?.snippetsThisMonth || 0,
      },
      usage: {
        snippetsThisMonth: data.usage?.snippetsThisMonth || 0,
      },
      email: data.email,
      displayName: data.displayName,
      ...data,
    };
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    // Return safe default on error
    return {
      plan: "free",
      isPro: false,
      quota: { total: 0, month: 0 },
      usage: { snippetsThisMonth: 0 },
    };
  }
}
