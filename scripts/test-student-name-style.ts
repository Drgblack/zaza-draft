import { enforceTeacherNameStyle } from "@/lib/draft/teacher-language"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(message)
    process.exit(1)
  }
}

const sample = "The student is making steady progress. He is punctual and calm in class. The student comes prepared."
const resultEric = enforceTeacherNameStyle(sample, { firstName: "Eric", pronounPreference: "he" })
assert(/\bEric\b/.test(resultEric), "Eric should appear in the text.")
assert(!/the student/i.test(resultEric), "The student should not appear in the final text.")
assert(/\bhe\b/i.test(resultEric), "He pronoun should remain in text.")

const sampleSally = "The student shows curiosity. She asks thoughtful questions. The student values feedback."
const resultSally = enforceTeacherNameStyle(sampleSally, { firstName: "Sally", pronounPreference: "she" })
assert(/\bSally\b/.test(resultSally), "Sally should appear in the text.")
assert(!/the student/i.test(resultSally), "No 'the student' for Sally.")
assert(/\bshe\b/i.test(resultSally), "She pronoun should remain.")

const sampleNoName = "The student is kind. They look after others."
const resultNoName = enforceTeacherNameStyle(sampleNoName, { pronounPreference: "they" })
assert(/\byour child\b/i.test(resultNoName), "Should default to 'your child'.")
assert(!/the student/i.test(resultNoName), "Should not keep 'the student'.")
assert(/\bthey\b/i.test(resultNoName), "They pronoun should remain.")

console.log("Student name style helper works as expected.")
