export type CanonicalTone = "warm" | "professional" | "direct" | "empathetic";

const toneMap: Record<string, CanonicalTone> = {
  "warm & encouraging": "warm",
  "supportive": "empathetic",
  "firm": "direct",
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
