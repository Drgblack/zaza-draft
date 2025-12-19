import type { Document, Suggestion } from "./types"

export const mockDocuments: Document[] = [
  {
    id: "1",
    title: "Year 7 Science Lesson Plan",
    type: "lesson-plan",
    content: "Today we will explore photosynthesis...",
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "2",
    title: "Parent Email - Progress Update",
    type: "email",
    content: "Dear Parents, I wanted to update you...",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "3",
    title: "Term 2 Assessment Report",
    type: "report",
    content: "Student has shown excellent progress...",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

export const mockSuggestions: Suggestion[] = [
  {
    id: "s1",
    kind: "clarify",
    confidence: 0.92,
    title: "Strengthen clarity",
    rationale: "The sentence structure can be simplified to improve readability for Year 7 students.",
    pedagogyTag: "clarity",
    diffHtml:
      '<span class="bg-green-100">Plants use sunlight, water, and carbon dioxide to make food through photosynthesis.</span>',
    range: { from: 0, to: 50 },
    createdAt: new Date().toISOString(),
    viewed: false,
  },
  {
    id: "s2",
    kind: "tone",
    confidence: 0.68,
    title: "Adjust tone for parents",
    rationale: "A warmer, more collaborative tone will help build trust with parents.",
    pedagogyTag: "tone",
    diffHtml:
      '<span class="bg-green-100">I would love to share some wonderful progress your child has made this term.</span>',
    range: { from: 0, to: 40 },
    createdAt: new Date().toISOString(),
    viewed: true,
  },
  {
    id: "s3",
    kind: "structure",
    confidence: 0.45,
    title: "Add scaffolding",
    rationale: "Breaking this into steps will help students follow the process more easily.",
    pedagogyTag: "scaffolding",
    diffHtml: '<span class="bg-green-100">Step 1: Observe the plant. Step 2: Record your observations.</span>',
    range: { from: 100, to: 150 },
    createdAt: new Date().toISOString(),
    viewed: false,
  },
]
