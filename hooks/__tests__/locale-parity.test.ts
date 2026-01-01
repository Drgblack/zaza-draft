import { describe, expect, it } from "vitest"

import { localeMessages } from "@/hooks/use-locale"

describe("locale parity", () => {
  it("ensures de-DE covers every en-GB key", () => {
    const enKeys = Object.keys(localeMessages["en-GB"])
    const deKeys = new Set(Object.keys(localeMessages["de-DE"]))
    const missing = enKeys.filter((key) => !deKeys.has(key))
    expect(missing).toEqual([])
  })
})
