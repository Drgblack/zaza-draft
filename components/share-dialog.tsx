"use client"

import { useState, useEffect } from "react"
import { Copy, ExternalLink, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
}

export function ShareDialog({ open, onOpenChange, title }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const docId = title.toLowerCase().replace(/\s+/g, "-")
    setShareUrl(`${window.location.origin}/share/${docId}`)
  }, [title])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <>
      {copied && (
        <div className="fixed top-20 right-4 bg-foreground text-background px-4 py-2 rounded-lg shadow-lg copied-toast z-50">
          Copied!
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share document</DialogTitle>
            <DialogDescription>Anyone with the link can view this document.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button size="icon" variant="outline" onClick={handleCopyLink} aria-label="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleCopyLink} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy link
              </Button>
              <Button
                onClick={() => window.open(shareUrl, "_blank")}
                variant="outline"
                className="w-full bg-transparent"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in new tab
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      <Lock className="h-4 w-4 mr-2" />
                      Manage access
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
