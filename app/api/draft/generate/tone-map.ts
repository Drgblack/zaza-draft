export const revalidate = 0;

export type CanonicalTone = "warm" | "professional" | "direct" | "empathetic";

const toneMap: Record<string, CanonicalTone> = {
  // Friendly UI labels → canonical
  "warm & encouraging": "warm",
  "professional & neutral": "professional",
  "direct & clear": "direct",
  "empathetic & supportive": "empathetic",
  // Common synonyms
  "supportive": "empathetic",
  "firm": "direct",
  // Already canonical
  "warm": "warm",
  "professional": "professional",
  "direct": "direct",
  "empathetic": "empathetic",
};

export function canonicalizeTone(input: any): CanonicalTone | undefined {
  if (typeof input !== "string") return undefined;
  const key = input.trim().toLowerCase();
  return toneMap[key] ?? (["warm","professional","direct","empathetic"].includes(key) ? (key as CanonicalTone) : undefined);
}


