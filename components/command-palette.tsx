"use client"

import { FileText, Sparkles, MessageSquare, Moon, PanelRightClose, Share2 } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useLocale } from "@/hooks/use-locale"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewDocument: () => void
  onAskAI: () => void
  onInsertAsComment: () => void
  onToggleDarkMode: () => void
  onToggleAIPanel: () => void
  onShareDocument: () => void
}

export function CommandPalette({
  open,
  onOpenChange,
  onNewDocument,
  onAskAI,
  onInsertAsComment,
  onToggleDarkMode,
  onToggleAIPanel,
  onShareDocument,
}: CommandPaletteProps) {
  const { t } = useLocale()

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("typeCommand")} />
      <CommandList>
        <CommandEmpty>{t("noResultsFound")}</CommandEmpty>
        <CommandGroup heading={t("commandActions")}>
          <CommandItem onSelect={onNewDocument}>
            <FileText className="mr-2 h-4 w-4" />
            <span>{t("newDocument")}</span>
          </CommandItem>
          <CommandItem onSelect={onAskAI}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>{t("askAi")}</span>
          </CommandItem>
          <CommandItem onSelect={onInsertAsComment}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>{t("insertAsComment")}</span>
          </CommandItem>
          <CommandItem onSelect={onShareDocument}>
            <Share2 className="mr-2 h-4 w-4" />
            <span>{t("shareDocument")}</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading={t("commandView")}>
          <CommandItem onSelect={onToggleDarkMode}>
            <Moon className="mr-2 h-4 w-4" />
            <span>{t("toggleDarkMode")}</span>
          </CommandItem>
          <CommandItem onSelect={onToggleAIPanel}>
            <PanelRightClose className="mr-2 h-4 w-4" />
            <span>{t("toggleAiPanel")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
