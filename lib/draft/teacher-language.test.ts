import { describe, expect, it } from "vitest"
import { enforceTeacherNameStyle } from "./teacher-language"

describe("enforceTeacherNameStyle", () => {
  it("limits 'your child' repeats, softens disruption phrasing, and adds reassurance", () => {
    const input =
      "Your child has had instances of disruption this week. There have been disruptions during class, and your child seemingly avoids focusing."
    const result = enforceTeacherNameStyle(input, {
      firstName: "Johnny",
      pronounPreference: "they",
      resolvedPronounPreference: "they",
    })

    const yourChildMatches = result.match(/\byour child\b/gi) ?? []
    expect(yourChildMatches.length).toBeLessThanOrEqual(1)
    expect(result).not.toMatch(/instances of disruption/i)
    expect(result).not.toMatch(/disruptions during class/i)
    expect(result).not.toMatch(/disruption/i)
    expect(result).not.toMatch(/\bthey\s+seems\b|\bthey\s+has\b|\bthey['’]s\b|\bthey\s+was\b/i)
    expect(result).toMatch(/moments where Johnny has found it difficult to stay focused/i)
    expect(result).toMatch(/a few occasions where lessons were interrupted/i)
    expect(result).not.toContain("My aim is to support Johnny positively")
  })

  it("appends reassurance when name is unknown and respects observations", () => {
    const input = "Your child has struggled with focus."
    const result = enforceTeacherNameStyle(input, {
      pronounPreference: "avoid",
      resolvedPronounPreference: "avoid",
    })
    expect(result).not.toContain("My aim is to support your child positively")
  })

  it("normalises Parent(s) greeting to Parent/Carer", () => {
    const result = enforceTeacherNameStyle("Dear Parent(s), I wanted to touch base.", {
      pronounPreference: "avoid",
      resolvedPronounPreference: "avoid",
    })
    expect(result).toMatch(/Dear Parent\/Carer,/)
  })

  it("rewrites 'the student is/has' using the resolved pronoun set", () => {
    const input =
      "The student is improving. The student's focus has come further than before."
    const result = enforceTeacherNameStyle(input, {
      firstName: "Johnny",
      pronounPreference: "he",
      resolvedPronounPreference: "he",
    })
    expect(result).not.toMatch(/the student is/i)
    expect(result).not.toMatch(/the student's/i)
    expect(result).toMatch(/Johnny is/i)
    expect(result).toMatch(/\bhis focus\b/i)
  })

  it("uses plural verb forms when the resolved preference is they", () => {
    const input = "The student is engaged and the student has been listening."
    const result = enforceTeacherNameStyle(input, {
      pronounPreference: "they",
      resolvedPronounPreference: "they",
    })
    expect(result).not.toMatch(/the student is/i)
    expect(result).toMatch(/They are/i)
    expect(result).toMatch(/They have/i)
  })
})
