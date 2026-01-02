import type { DraftMode } from "@/lib/types"

export interface SignaturePayload {
  line1?: string
  line2?: string
  line3?: string
  autoAppendParentMessage?: boolean
  autoAppendReportComment?: boolean
  fallbackName?: string
}

export interface ResolvedSignature {
  lines: string[]
  block: string
  placeholders: Record<string, string>
  appendForMode: Record<DraftMode, boolean>
}

const PLACEHOLDERS: Array<[string, number]> = [
  ["[Your Name]", 0],
  ["[Your Position]", 1],
  ["[School Name]", 2],
]

export function resolveSignature(options: SignaturePayload = {}): ResolvedSignature {
  const line1 = options.line1?.trim() || options.fallbackName?.trim() || ""
  const line2 = options.line2?.trim() ?? ""
  const line3 = options.line3?.trim() ?? ""
  const lines = [line1, line2, line3].filter(Boolean)
  const block = lines.join("\n")
  const appendParent = options.autoAppendParentMessage ?? true
  const appendReport = options.autoAppendReportComment ?? false
  const placeholders: Record<string, string> = {}
  PLACEHOLDERS.forEach(([placeholder, index]) => {
    const value = lines[index]
    if (value) {
      placeholders[placeholder] = value
    }
  })
  return {
    lines,
    block,
    placeholders,
    appendForMode: {
      parent_message: appendParent,
      report_comment: appendReport,
    },
  }
}

export function applySignatureToDraft(
  text: string,
  signature: ResolvedSignature,
  mode: DraftMode,
): string {
  let result = text
  Object.entries(signature.placeholders).forEach(([placeholder, value]) => {
    result = result.split(placeholder).join(value)
  })

  const block = signature.block.trim()
  if (block && signature.appendForMode[mode] && !result.includes(block)) {
    const trimmed = result.trimEnd()
    result = `${trimmed}\n\n${block}`
  }

  return result
}
