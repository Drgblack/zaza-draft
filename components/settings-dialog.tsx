"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, Shield } from "lucide-react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [privacyOptIn, setPrivacyOptIn] = useState(true)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your preferences and privacy settings.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Privacy</h3>
            <div className="mb-4 p-3 bg-[#eef7f1] border border-[#8b9d83]/20 rounded-lg flex items-start gap-3">
              <Shield className="h-5 w-5 text-[#8b9d83] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">Your text is processed securely. No student PII required.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="privacy-opt-in" className="text-sm font-medium">
                    Share anonymous feedback
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Help improve Zaza Draft by sharing anonymous suggestion feedback. Your document content is never
                    shared.
                  </p>
                </div>
                <Switch
                  id="privacy-opt-in"
                  checked={privacyOptIn}
                  onCheckedChange={setPrivacyOptIn}
                  aria-label="Share anonymous feedback to improve Zaza Draft"
                />
              </div>

              <div className="pt-2">
                <a
                  href="#"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy and Safety Documentation
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">Accessibility</h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="high-contrast" className="text-sm font-medium">
                    High contrast mode
                  </Label>
                  <p className="text-xs text-muted-foreground">Increase contrast for better visibility.</p>
                </div>
                <Switch id="high-contrast" aria-label="Enable high contrast mode" />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="reduce-motion" className="text-sm font-medium">
                    Reduce motion
                  </Label>
                  <p className="text-xs text-muted-foreground">Minimize animations and transitions.</p>
                </div>
                <Switch id="reduce-motion" aria-label="Reduce motion and animations" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">About</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Zaza Draft v1.0.0</p>
              <p>by Zaza Technologies</p>
              <p className="pt-2">
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                •{" "}
                <a href="#" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
