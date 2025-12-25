import assert from "node:assert"
import { inferPronounResolution, enforcePronouns } from "../lib/text/pronouns"

const femaleResult = inferPronounResolution("auto", "Emily")
assert.strictEqual(femaleResult.resolvedPreference, "she", "Emily should resolve to she")

const maleResult = inferPronounResolution("auto", "Michael")
assert.strictEqual(maleResult.resolvedPreference, "he", "Michael should resolve to he")

const fallback = inferPronounResolution("auto", "Casey")
assert.strictEqual(fallback.resolvedPreference, "avoid", "Casey is ambiguous so fallback should be avoid")

const enforcedThey = enforcePronouns("They is ready to share their success.", "they")
assert.ok(!/they is/i.test(enforcedThey), "They is should be rewritten to they are")

console.log("Pronoun inference and enforcement tests passed.")
