export const COMMENT_BANK_CATEGORIES = [
  "effort",
  "behaviour",
  "participation",
  "literacy",
  "numeracy",
  "homework",
  "progress",
] as const

export type CommentBankCategory = (typeof COMMENT_BANK_CATEGORIES)[number]

export interface CommentBankEntry {
  commentId: string
  userId: string
  schoolId: string | null
  commentText: string
  categories: CommentBankCategory[]
  createdAt: string
  updatedAt: string
}

export function normalizeCommentBankCategories(
  value: unknown,
): CommentBankCategory[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is CommentBankCategory =>
    typeof entry === "string" &&
    (COMMENT_BANK_CATEGORIES as readonly string[]).includes(entry),
  )
}
