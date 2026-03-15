"use client"

import { Button } from "@/components/ui/button"

interface DocumentationModeButtonProps {
  available: boolean
  onActivate: () => void
}

export function DocumentationModeButton({
  available,
  onActivate,
}: DocumentationModeButtonProps) {
  if (!available) {
    return null
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onActivate}
      className="w-full sm:w-auto border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      Switch to Documentation Mode
    </Button>
  )
}
