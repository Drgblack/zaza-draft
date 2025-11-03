"use client"

import { useState } from "react"
import { Download, Mail, FileText, File, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { exportDraftAsWord, exportDraftAsPDF, emailDraft, copyAsHTML, copyAsMarkdown } from "@/lib/export-utils"

interface ExportDraftMenuProps {
  draftContent: string
  onExport?: (format: string) => void
}

export function ExportDraftMenu({ draftContent, onExport }: ExportDraftMenuProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    try {
      switch (format) {
        case "word":
          await exportDraftAsWord(draftContent, `draft-${Date.now()}.docx`)
          break
        case "pdf":
          await exportDraftAsPDF(draftContent, `draft-${Date.now()}.pdf`)
          break
        case "email":
          emailDraft(draftContent, "Draft from Zaza")
          break
        case "html-gmail":
          await navigator.clipboard.writeText(copyAsHTML(draftContent, "gmail"))
          setCopiedFormat("html-gmail")
          setTimeout(() => setCopiedFormat(null), 2000)
          break
        case "html-outlook":
          await navigator.clipboard.writeText(copyAsHTML(draftContent, "outlook"))
          setCopiedFormat("html-outlook")
          setTimeout(() => setCopiedFormat(null), 2000)
          break
        case "markdown":
          await navigator.clipboard.writeText(copyAsMarkdown(draftContent))
          setCopiedFormat("markdown")
          setTimeout(() => setCopiedFormat(null), 2000)
          break
        case "plain":
          await navigator.clipboard.writeText(draftContent)
          setCopiedFormat("plain")
          setTimeout(() => setCopiedFormat(null), 2000)
          break
      }
      onExport?.(format)
    } catch (error) {
      console.error("[v0] Export failed:", error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 bg-transparent"
          aria-label="Export draft options"
        >
          <Download className="w-4 h-4 mr-2" aria-hidden="true" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport("word")}>
          <FileText className="w-4 h-4 mr-2" />
          Download as Word (.docx)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <File className="w-4 h-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("email")}>
          <Mail className="w-4 h-4 mr-2" />
          Email Draft
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Copy Formatted</DropdownMenuLabel>

        <DropdownMenuItem onClick={() => handleExport("plain")}>
          {copiedFormat === "plain" ? (
            <Check className="w-4 h-4 mr-2 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          Plain Text
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("html-gmail")}>
          {copiedFormat === "html-gmail" ? (
            <Check className="w-4 h-4 mr-2 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          HTML for Gmail
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("html-outlook")}>
          {copiedFormat === "html-outlook" ? (
            <Check className="w-4 h-4 mr-2 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          HTML for Outlook
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("markdown")}>
          {copiedFormat === "markdown" ? (
            <Check className="w-4 h-4 mr-2 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
