import assert from "node:assert"
import { detectBlockedLanguage, reframeBlockedLanguage } from "../lib/safety"

const tier1 = detectBlockedLanguage("Sally is dumb and lazy with maths.")
assert(tier1.detected, "tier1 term should be detected")
assert(tier1.tier === "tier1", "tier1 term must map to tier1")
const tier1Reframe = reframeBlockedLanguage("Sally is dumb", tier1.tier)
assert(tier1Reframe.applied, "tier1 should be reframed")
assert(!/dumb/i.test(tier1Reframe.text), "reframe should remove the word")

const tier2 = detectBlockedLanguage("Sally has ADHD and struggles to stay calm.")
assert(tier2.detected && tier2.tier === "tier2", "tier2 term should be detected")
const tier2Reframe = reframeBlockedLanguage("Sally has ADHD", tier2.tier)
assert(tier2Reframe.applied, "tier2 should be reframed")
assert(!/adhd/i.test(tier2Reframe.text), "reframe should not repeat diagnosis")

const tier3 = detectBlockedLanguage("I will kill them if they interrupt.")
assert(tier3.detected && tier3.tier === "tier3", "tier3 should be detected")

console.log("Safety tier tests passed.")
