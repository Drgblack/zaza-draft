"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, MessageSquare, Undo2 } from "lucide-react"
import { useI18n } from "./providers/i18n-provider"

const mockHistory = [
  {
    id: "h1",
    action: "accept" as const,
    title: "Strengthen clarity",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "h2",
    action: "insert_as_comment" as const,
    title: "Consider differentiation",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "h3",
    action: "dismiss" as const,
    title: "Add scaffolding",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
]

export function HistoryTab() {
  const { t } = useI18n()

  if (mockHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-sm text-muted-foreground">
        {t("emptyHistory")}
      </div>
    )
  }

  const getActionIcon = (action: "accept" | "dismiss" | "insert_as_comment") => {
    if (action === "accept") {
      return <Check className="h-4 w-4 text-green-600" />
    }
    if (action === "insert_as_comment") {
      return <MessageSquare className="h-4 w-4 text-blue-600" />
    }
    return <X className="h-4 w-4 text-red-600" />
  }

  const getActionLabel = (action: "accept" | "dismiss" | "insert_as_comment") => {
    if (action === "accept") return "Accepted"
    if (action === "insert_as_comment") return "Inserted as comment"
    return "Dismissed"
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {mockHistory.map((item) => (
          <div key={item.id} className="p-3 border border-border rounded-lg bg-card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {getActionIcon(item.action)}
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              <Badge
                variant={item.action === "accept" ? "default" : "secondary"}
                className="text-xs capitalize shrink-0"
              >
                {getActionLabel(item.action)}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {new Date(item.timestamp).toLocaleTimeString()} • {new Date(item.timestamp).toLocaleDateString()}
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Undo2 className="h-3 w-3 mr-1" />
                Revert
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
