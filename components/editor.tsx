"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Bold, Italic, Underline, List, ListOrdered, Heading2, Undo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { LanguageSwitcher } from "./language-switcher"
import { GreetingBar } from "./zaza/greeting-bar"
import { ToneSelector } from "./zaza/tone-selector"
import { UpgradeButton } from "./zaza/upgrade-button"
import { useLocale } from "@/hooks/use-locale"

interface EditorProps {
  content: string
  onChange: (content: string) => void
  rightPanelVisible: boolean
  onToggleRightPanel: () => void
}

export function Editor({ content, onChange, rightPanelVisible, onToggleRightPanel }: EditorProps) {
  const [wordCount, setWordCount] = useState(0)
  const [tone, setTone] = useState<"Professional" | "Friendly" | "Formal">("Professional")
  const editorRef = useRef<HTMLDivElement>(null)
  const { prefs } = useTeacherPrefs()
  const { t } = useLocale()

  const isFreeUser = true
  const draftsUsed = 8
  const draftsLimit = 10

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length
    setWordCount(words)
  }, [content])

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || ""
    onChange(newContent)
  }

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const getSubline = () => {
    if (tone === "Friendly") return t("sublineFriendly")
    if (tone === "Professional") return t("sublineProfessional")
    return t("sublineFormal")
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden zd-editor">
      <GreetingBar
        name={prefs.firstName}
        subtitle={getSubline()}
        onToggleAIPanel={onToggleRightPanel}
        aiPanelVisible={rightPanelVisible}
      />

      <div className="border-b border-border bg-card px-6 py-2">
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormat("bold")}
                  aria-label={t("toolbarBold")}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("toolbarBold")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormat("italic")}
                  aria-label={t("toolbarItalic")}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("toolbarItalic")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormat("underline")}
                  aria-label={t("toolbarUnderline")}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("toolbarUnderline")}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormat("insertUnorderedList")}
                  aria-label={t("toolbarBulletList")}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("toolbarBulletList")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormat("insertOrderedList")}
                  aria-label={t("toolbarNumberedList")}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("toolbarNumberedList")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormat("formatBlock", "h2")}
                  aria-label={t("toolbarHeading")}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("toolbarHeading")}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormat("undo")}
                  aria-label={t("toolbarUndo")}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("toolbarUndo")}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="flex-1 overflow-auto px-12 py-8">
        <div className="max-w-3xl mx-auto">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="min-h-[600px] focus:outline-none text-lg leading-relaxed"
            style={{ lineHeight: "1.8" }}
            suppressContentEditableWarning
            data-placeholder={t("emptyGeneral")}
          >
            {content}
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-card px-12 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{t("statusBar.words", { count: wordCount })}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{t("statusBar.readingLevel", { level: "7" })}</span>
            {isFreeUser && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs">
                  {draftsUsed} / {draftsLimit} drafts used
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isFreeUser && <UpgradeButton snippetsUsed={draftsUsed} snippetsLimit={draftsLimit} variant="compact" />}
            <span className="text-xs">{t("statusBar.tone")}</span>
            <ToneSelector value={tone} onChange={setTone} />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  )
}
