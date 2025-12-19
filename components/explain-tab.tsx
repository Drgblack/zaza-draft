"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import type { Suggestion } from "@/lib/types"
import { useI18n } from "./providers/i18n-provider"

interface ExplainTabProps {
  selectedSuggestion: Suggestion | null
}

export function ExplainTab({ selectedSuggestion }: ExplainTabProps) {
  const [showAlignment, setShowAlignment] = useState(false)
  const { t } = useI18n()

  if (!selectedSuggestion) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-sm text-muted-foreground">
        {t("emptyExplain")}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">What the AI considered</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Student level: Year 7</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Tone: Professional</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Language: English (UK)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Document type: Lesson Plan</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold mb-2">What the AI noticed</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{selectedSuggestion.rationale}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Suggestion type</h3>
          <Badge variant="secondary" className="capitalize">
            {selectedSuggestion.kind}
          </Badge>
        </div>

        {selectedSuggestion.pedagogyTag && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Pedagogy focus</h3>
            <Badge variant="outline" className="capitalize">
              {selectedSuggestion.pedagogyTag}
            </Badge>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-2">Confidence score</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${selectedSuggestion.confidence * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">{(selectedSuggestion.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <Label htmlFor="show-alignment" className="text-sm font-semibold">
              {t("showAlignment")}
            </Label>
            <Switch id="show-alignment" checked={showAlignment} onCheckedChange={setShowAlignment} />
          </div>

          {showAlignment && (
            <div className="text-sm text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="font-medium">Aligned with:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Clear communication standards for Year 7</li>
                <li>Differentiation best practices</li>
                <li>Accessible language guidelines</li>
              </ul>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold mb-2">Guardrails applied</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ No student PII processed</li>
            <li>✓ Age-appropriate language verified</li>
            <li>✓ Educational context maintained</li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  )
}
