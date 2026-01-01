import assert from "node:assert"
import { inferPronounResolution, enforcePronouns } from "../lib/text/pronouns"

const femaleResult = inferPronounResolution("auto", "Emily")
assert.strictEqual(femaleResult.resolvedPreference, "she", "Emily should resolve to she")

const maleResult = inferPronounResolution("auto", "Michael")
assert.strictEqual(maleResult.resolvedPreference, "he", "Michael should resolve to he")

const fallback = inferPronounResolution("auto", "Casey")
assert.strictEqual(fallback.resolvedPreference, "they", "Casey is ambiguous so fallback should be they")

const teacherHint = inferPronounResolution(
  "auto",
  "Casey",
  "I'm writing about his parents and his progress.",
)
assert.strictEqual(teacherHint.resolvedPreference, "he", "Teacher pronoun hint should win")
assert.strictEqual(teacherHint.reason, "teacher", "Reason should signal the teacher-provided hint")

const accented = inferPronounResolution("auto", "Élodie")
assert.strictEqual(accented.resolvedPreference, "she", "Élodie should still resolve to she")

const enforcedThey = enforcePronouns("They is ready to share their success.", "they")
assert.ok(!/they is/i.test(enforcedThey), "They is should be rewritten to they are")

console.log("Pronoun inference and enforcement tests passed.")
