import { buildBlockedLanguageResponse } from "@/lib/draft/blocked-response"

const response = buildBlockedLanguageResponse("tier3")
const hasTeacherNote = typeof response.teacherNote === "string" && response.teacherNote.trim().length > 0
const hasAlternatives =
  Array.isArray(response.safeAlternatives) && response.safeAlternatives.length >= 2

if (!hasTeacherNote) {
  console.error("Blocked response missing teacherNote")
  process.exit(1)
}

if (!hasAlternatives) {
  console.error("Blocked response missing safe alternatives")
  process.exit(1)
}

console.log("Blocked language response looks good")
