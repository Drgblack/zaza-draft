import { inferGenderFromName } from "@/src/generated/name-gender"

export type PronounPreference = "auto" | "she" | "he" | "they" | "avoid"

export type PronounSet =
  | { mode: "avoid" }
  | { mode: "they" }
  | { mode: "he" }
  | { mode: "she" }

export function inferPronounsFromName(firstName: string): PronounSet {
  const g = inferGenderFromName(firstName)
  if (g === "m") return { mode: "he" }
  if (g === "f") return { mode: "she" }
  return { mode: "avoid" } // safest default
}

export function resolvePronouns(pref: PronounPreference, firstName?: string): PronounSet {
  if (pref === "he") return { mode: "he" }
  if (pref === "she") return { mode: "she" }
  if (pref === "they") return { mode: "they" }
  if (pref === "avoid") return { mode: "avoid" }

  // auto
  if (firstName) return inferPronounsFromName(firstName)
  return { mode: "avoid" }
}
