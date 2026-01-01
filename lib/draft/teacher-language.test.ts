import { describe, expect, it } from "vitest"
import { enforceTeacherNameStyle } from "./teacher-language"

describe("enforceTeacherNameStyle", () => {
  it("limits 'your child' repeats, softens disruption phrasing, and adds reassurance", () => {
    const input =
      "Your child has had instances of disruption this week. Your child seemingly avoids focusing. Your child's energy dips during class."
    const result = enforceTeacherNameStyle(input, {
      firstName: "Johnny",
      pronounPreference: "they",
      resolvedPronounPreference: "they",
    })

    const yourChildMatches = result.match(/\byour child\b/gi) ?? []
    expect(yourChildMatches.length).toBeLessThanOrEqual(1)
    expect(result).not.toMatch(/instances of disruption/i)
    expect(result).toMatch(/moments where Johnny has found it difficult to stay focused/i)
    expect(result).toContain(
      "My aim is to support Johnny positively and help them feel confident and successful at school.",
    )
  })

  it("appends reassurance when name is unknown and respects observations", () => {
    const input = "Your child has struggled with focus."
    const result = enforceTeacherNameStyle(input, {
      pronounPreference: "avoid",
      resolvedPronounPreference: "avoid",
    })
    expect(result).toContain("My aim is to support your child positively and help them feel confident and successful at school.")
  })
})
