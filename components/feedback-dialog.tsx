"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "./providers/i18n-provider"

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestionId: string
  onSubmit: (feedback: { reason: string; note?: string }) => void
}

const feedbackReasons = [
  { value: "off_prompt", label: "Off prompt" },
  { value: "tone_mismatch", label: "Tone mismatch" },
  { value: "fact_issue", label: "Factual issue" },
  { value: "too_generic", label: "Too generic" },
  { value: "too_long", label: "Too long" },
  { value: "other", label: "Other" },
]

export function FeedbackDialog({ open, onOpenChange, suggestionId, onSubmit }: FeedbackDialogProps) {
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const { t } = useI18n()

  const handleSubmit = () => {
    if (reason) {
      onSubmit({ reason, note: note || undefined })
      setReason("")
      setNote("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("notHelpful")}</DialogTitle>
          <DialogDescription>Help us improve future suggestions by sharing what went wrong.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t("reason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {feedbackReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t("noteOptional")}</Label>
            <Textarea
              id="note"
              placeholder="Tell us more (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!reason}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
