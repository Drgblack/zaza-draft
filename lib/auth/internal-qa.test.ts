import { describe, expect, it } from "vitest"

import { parseQaUids } from "./internal-qa"

describe("parseQaUids", () => {
  it("parses comma- and newline-separated lists", () => {
    const parsed = parseQaUids("abc, def\nxyz ,\n\n123")
    expect(parsed.has("abc")).toBe(true)
    expect(parsed.has("def")).toBe(true)
    expect(parsed.has("xyz")).toBe(true)
    expect(parsed.has("123")).toBe(true)
    expect(parsed.size).toBe(4)
  })

  it("ignores empty values", () => {
    const parsed = parseQaUids(" , ,, ")
    expect(parsed.size).toBe(0)
  })

  it("parses comma lists with varying whitespace", () => {
    const combos = ["uid1,uid2", "uid1, uid2", " uid1 , uid2 "]
    combos.forEach((input) => {
      const parsed = parseQaUids(input)
      expect(parsed.has("uid1")).toBe(true)
      expect(parsed.has("uid2")).toBe(true)
      expect(parsed.size).toBe(2)
    })
  })
})
