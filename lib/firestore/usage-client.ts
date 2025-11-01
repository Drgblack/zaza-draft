/** Client-safe usage/profile stubs. Replace with real client SDK later. */

export async function getUsage(_uid?: string) {
  return { total: 0, month: 0 };
}

export async function incrementUsage(_uid?: string, _delta: number = 1) {
  return { ok: true };
}

/** Minimal shape to satisfy DraftClient.tsx expectations */
export async function getUserProfile(_uid?: string) {
  return {
    plan: "free",
    isPro: false,
    quota: { total: 0, month: 0 }
  };
}
