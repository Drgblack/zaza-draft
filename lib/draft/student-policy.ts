import type { PronounPreference } from "@/lib/types"

const PRONOUN_DESCRIPTIONS: Record<PronounPreference, string> = {
  auto: "Use the resolved preference from the teacher's selection.",
  she: "Use she/her pronouns consistently throughout the message.",
  he: "Use he/him pronouns consistently throughout the message.",
  they: "Use they/them pronouns consistently throughout the message.",
  avoid: "Avoid gendered pronouns and rely on neutral phrasing such as \"your child\".",
}

const PRONOUN_LABELS: Record<Exclude<PronounPreference, "auto">, string> = {
  she: "she/her",
  he: "he/him",
  they: "they/them",
  avoid: "neutral language",
}

export interface StudentReferenceProps {
  firstName?: string
  pronoun: PronounPreference
}

export function buildStudentInstruction({ firstName, pronoun }: StudentReferenceProps): string {
  const nameTarget = firstName ? capitalizeName(firstName) : "your child"
  const pronounTarget =
    pronoun === "auto" ? "the teacher's resolved preference" : PRONOUN_LABELS[pronoun]
  const base = firstName
    ? `Refer to ${nameTarget} by name and use ${pronounTarget} pronouns consistently.`
    : `Refer to ${nameTarget} and keep the tone neutral while remaining warm.`
  return `${base} Keep the mentions flowing naturally and avoid reverting to a generic label more than once unless necessary.`
}

export function buildStudentNameForFallback({ firstName }: StudentReferenceProps): string {
  return firstName ? `${capitalizeName(firstName)}` : "your child"
}

function capitalizeName(name: string) {
  if (!name) return name
  return name[0].toUpperCase() + name.slice(1).toLowerCase()
}
