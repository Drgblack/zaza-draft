"use client"

import { Download, Mail, FileText, FileSpreadsheet, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { exportAnalyticsAsPDF, exportAnalyticsAsExcel } from "@/lib/export-utils"

interface ExportAnalyticsMenuProps {
  onExport?: (format: string) => void
}

export function ExportAnalyticsMenu({ onExport }: ExportAnalyticsMenuProps) {
  const handleExport = async (format: string) => {
    try {
      switch (format) {
        case "pdf":
          await exportAnalyticsAsPDF({}, `analytics-report-${Date.now()}.pdf`)
          break
        case "excel":
          await exportAnalyticsAsExcel({}, `analytics-data-${Date.now()}.xlsx`)
          break
        case "email":
          // In real implementation, send email with report
          alert("Report will be sent to your email!")
          break
        case "share":
          // In real implementation, generate shareable link
          alert("Shareable link generated!")
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
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-900/20 bg-transparent"
          aria-label="Export analytics report"
        >
          <Download className="w-4 h-4 mr-2" aria-hidden="true" />
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Report</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="w-4 h-4 mr-2" />
          Download as PDF (with charts)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Download as Excel/CSV
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("email")}>
          <Mail className="w-4 h-4 mr-2" />
          Email Report to Me
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("share")}>
          <Share2 className="w-4 h-4 mr-2" />
          Generate Share Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
