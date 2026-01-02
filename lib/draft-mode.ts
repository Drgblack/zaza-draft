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
    "Frame the output as a parent message: start with a subject line prefixed with 'Subject:', include a greeting to the parent(s), write two to four concise paragraphs, keep the tone calm, professional, and supportive, and close with a clear next step or invitation to continue the conversation.",
  report_comment:
    "Frame the output as a report comment: write two to five sentences with no greeting or 'Dear', keep the language neutral and report-appropriate, focus on evidence and progress, and avoid calls to action such as 'please contact me' or 'call me'.",
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
