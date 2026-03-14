import type { DraftMode } from "./types"

export const DRAFT_MODES: DraftMode[] = ["parent_message", "report_comment"]
export const DEFAULT_DRAFT_MODE: DraftMode = "parent_message"

export const MODE_DISPLAY_NAMES: Record<DraftMode, string> = {
  parent_message: "Parent message",
  report_comment: "Report comment",
}

export const MODE_LABEL_KEYS: Record<DraftMode, string> = {
  parent_message: "editor.mode.parentMessage",
  report_comment: "editor.mode.reportComment",
}

export const MODE_PROMPT_INSTRUCTIONS: Record<DraftMode, string> = {
  parent_message:
    "Frame the output as a parent message: start with a subject line prefixed with 'Subject:', include a greeting to the parent(s), write two to four concise paragraphs, keep the tone calm and teacher-authored, ground the message in the actual issue raised, and close with one practical next step.",
  report_comment:
    "Frame the output as a report comment: write two to five concise sentences with no subject line, no greeting, and no sign-off; keep the language observational, balanced, and suitable for direct inclusion in a report or comment bank; usually lead with progress or a clear strength, then add one precise area for development if needed, and finish with a brief classroom-based concluding observation; avoid parent-facing warmth, conversational email framing, repetitive sentence openings, or generic school-admin phrases such as 'continues to make progress' or 'is a valued member of the class'.",
}

export function resolveDraftMode(value: unknown): DraftMode | null {
  if (value === undefined || value === null) {
    return DEFAULT_DRAFT_MODE
  }

  if (typeof value === "string" && DRAFT_MODES.includes(value as DraftMode)) {
    return value as DraftMode
  }

  return null
}
