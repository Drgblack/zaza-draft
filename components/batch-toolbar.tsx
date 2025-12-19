"use client"

import { Check, MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "./providers/i18n-provider"

interface BatchToolbarProps {
  count: number
  onAcceptAll: () => void
  onInsertAllAsComments: () => void
  onDismissAll: () => void
  onClear: () => void
}

export function BatchToolbar({ count, onAcceptAll, onInsertAllAsComments, onDismissAll, onClear }: BatchToolbarProps) {
  const { t } = useI18n()

  return (
    <div className="sticky top-0 z-10 bg-primary/10 border-b border-primary/20 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-primary text-primary-foreground">
            {count} selected
          </Badge>
          <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" onClick={onAcceptAll} className="h-8 text-xs" aria-label="Accept all selected (Shift+A)">
            <Check className="h-3 w-3 mr-1" />
            {t("acceptAll")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onInsertAllAsComments}
            className="h-8 text-xs bg-transparent"
            aria-label="Insert all as comments"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {t("insertAllAsComments")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismissAll}
            className="h-8 text-xs"
            aria-label="Dismiss all selected (Shift+D)"
          >
            <X className="h-3 w-3 mr-1" />
            {t("dismissAll")}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Keyboard: <kbd className="px-1 py-0.5 bg-background rounded text-xs">Shift+A</kbd> accept •{" "}
        <kbd className="px-1 py-0.5 bg-background rounded text-xs">Shift+D</kbd> dismiss •{" "}
        <kbd className="px-1 py-0.5 bg-background rounded text-xs">Esc</kbd> clear
      </p>
    </div>
  )
}
