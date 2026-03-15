import { describe, expect, it } from "vitest"

import {
  ENGLISH_PARENT_FACING_BANNED_PHRASES,
  ENGLISH_HIGH_RISK_PARENT_REPLY_BANNED_PHRASES,
  ENGLISH_PARENT_REPLY_PARROTING_BANNED_PHRASES,
  ENGLISH_PARENT_FACING_PHRASE_INVENTORY,
} from "./teacher-phrase-inventory"

describe("teacher phrase inventory", () => {
  it("defines teacher-authentic English phrase patterns for all four tones", () => {
    expect(Object.keys(ENGLISH_PARENT_FACING_PHRASE_INVENTORY)).toEqual([
      "warm",
      "professional",
      "direct",
      "empathetic",
    ])

    for (const tone of Object.values(ENGLISH_PARENT_FACING_PHRASE_INVENTORY)) {
      expect(tone.teacherUpdateOpenings.length).toBeGreaterThan(0)
      expect(tone.parentReplyOpenings.length).toBeGreaterThan(0)
      expect(tone.highRiskParentReplyOpenings.length).toBeGreaterThan(0)
      expect(tone.actionPatterns.length).toBeGreaterThan(0)
      expect(tone.followUpPatterns.length).toBeGreaterThan(0)
    }
  })

  it("keeps banned product-mediated phrasing out of the preferred inventory", () => {
    const phrases = Object.values(ENGLISH_PARENT_FACING_PHRASE_INVENTORY).flatMap((tone) => [
      ...tone.teacherUpdateOpenings,
      ...tone.parentReplyOpenings,
      ...tone.highRiskParentReplyOpenings,
      ...tone.actionPatterns,
      ...tone.followUpPatterns,
    ])
    const normalizedPhrases = phrases.map((phrase) => phrase.toLowerCase())

    ENGLISH_PARENT_FACING_BANNED_PHRASES.forEach((bannedPhrase) => {
      normalizedPhrases.forEach((phrase) => {
        expect(phrase).not.toContain(bannedPhrase)
      })
    })
  })

  it("keeps parent-reply parroting openings out of the preferred inventory", () => {
    const phrases = Object.values(ENGLISH_PARENT_FACING_PHRASE_INVENTORY).flatMap((tone) => [
      ...tone.parentReplyOpenings,
    ])
    const normalizedPhrases = phrases.map((phrase) => phrase.toLowerCase())

    ENGLISH_PARENT_REPLY_PARROTING_BANNED_PHRASES.forEach((bannedPhrase) => {
      normalizedPhrases.forEach((phrase) => {
        expect(phrase).not.toContain(bannedPhrase)
      })
    })
  })

  it("keeps banned high-risk incident phrasing out of the preferred inventory", () => {
    const phrases = Object.values(ENGLISH_PARENT_FACING_PHRASE_INVENTORY).flatMap((tone) => [
      ...tone.highRiskParentReplyOpenings,
      ...tone.followUpPatterns,
    ])
    const normalizedPhrases = phrases.map((phrase) => phrase.toLowerCase())

    ENGLISH_HIGH_RISK_PARENT_REPLY_BANNED_PHRASES.forEach((bannedPhrase) => {
      normalizedPhrases.forEach((phrase) => {
        expect(phrase).not.toContain(bannedPhrase)
      })
    })
  })
})
