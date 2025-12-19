"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const shortcuts = [
    { keys: ["Ctrl/Cmd", "B"], description: "Bold text" },
    { keys: ["Ctrl/Cmd", "I"], description: "Italic text" },
    { keys: ["Ctrl/Cmd", "U"], description: "Underline text" },
    { keys: ["Ctrl/Cmd", "K"], description: "Ask AI" },
    { keys: ["Ctrl/Cmd", "S"], description: "Save document" },
    { keys: ["Ctrl/Cmd", "Enter"], description: "Accept focused suggestion" },
    { keys: ["Shift", "A"], description: "Accept selected suggestions" },
    { keys: ["Shift", "D"], description: "Dismiss selected suggestions" },
    { keys: ["Esc"], description: "Clear selection" },
    { keys: ["?"], description: "Show keyboard shortcuts" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Speed up your workflow with these keyboard shortcuts.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd key={keyIndex} className="px-2 py-1 bg-muted rounded text-xs font-mono border border-border">
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
