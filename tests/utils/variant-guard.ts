const GENERAL_INFLECTION_SUFFIXES = ["s", "es", "ing", "ed", "ness", "ity"]

type CuratedMap = Record<string, string[]>

const CURATED_VARIANTS: CuratedMap = {
  lie: ["lies", "lying", "lied"],
  lazy: ["lazy", "lazier", "laziest", "laziness"],
  damn: ["damn", "damned", "damning"],
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildBaseVariants(term: string) {
  const variants = new Set<string>()
  variants.add(term)
  for (const suffix of GENERAL_INFLECTION_SUFFIXES) {
    variants.add(`${term}${suffix}`)
  }
  return variants
}

export function buildVariantRegexes(terms: string[]) {
  const variants = new Set<string>()
  for (const term of terms) {
    const baseVariants = buildBaseVariants(term)
    for (const variant of baseVariants) {
      variants.add(variant)
    }

    const curated = CURATED_VARIANTS[term.toLowerCase()]
    if (curated) {
      curated.forEach((variant) => variants.add(variant))
    }
  }

  return Array.from(variants).map(
    (variant) => new RegExp(`\\b${escapeRegExp(variant)}\\b`, "i"),
  )
}
