"use client"

import { useState } from "react"
import { Search, Plus, Settings, HelpCircle, FileText, Mail, ClipboardList, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SettingsDialog } from "./settings-dialog"
import { HelpDialog } from "./help-dialog"
import { cn } from "@/lib/utils"
import type { Document } from "@/lib/types"
import { useI18n } from "./providers/i18n-provider"
import Image from "next/image"

interface LeftNavProps {
  documents: Document[]
  currentDocId: string
  onDocumentSelect: (doc: Document) => void
  onCollapse: () => void
}

const typeIcons = {
  "lesson-plan": FileText,
  email: Mail,
  report: ClipboardList,
}

export function LeftNav({ documents, currentDocId, onDocumentSelect, onCollapse }: LeftNavProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const { t } = useI18n()

  const filteredDocs = documents.filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <>
      <nav
        className="h-full flex flex-col bg-card border-r border-border"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Image src="/z-logo.png" alt="Zaza Draft Logo" width={40} height={40} className="rounded-lg" />
              <div>
                <h2 className="text-xl font-semibold text-primary">Zaza Draft</h2>
                <p className="text-xs text-muted-foreground">by Zaza Technologies</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onCollapse} aria-label="Collapse navigation panel">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={t("searchDocs")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search documents"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="py-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2" id="recent-docs-heading">
              {t("recentDocuments")}
            </h3>
            {filteredDocs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {documents.length === 0 ? "No drafts yet — create your first document." : "No matching documents"}
              </div>
            ) : (
              <div className="space-y-1" role="list" aria-labelledby="recent-docs-heading">
                {filteredDocs.map((doc) => {
                  const Icon = typeIcons[doc.type]
                  return (
                    <button
                      key={doc.id}
                      onClick={() => onDocumentSelect(doc)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        currentDocId === doc.id ? "bg-[#eaf4f6] text-primary" : "hover:bg-secondary text-foreground",
                      )}
                      role="listitem"
                      aria-current={currentDocId === doc.id ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span className="text-sm truncate">{doc.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border space-y-2">
          <Button className="w-full glossy-button text-white" size="sm" aria-label="Create new document">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("newDoc")}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
              {t("settings")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={() => setShowHelp(true)}
              aria-label="Open help and guides"
            >
              <HelpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              Help & Guides
            </Button>
          </div>
        </div>
      </nav>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </>
  )
}
