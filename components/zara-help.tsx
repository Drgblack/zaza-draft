"use client"

import { Sparkles } from "lucide-react"

interface ZaraHelpProps {
  message: string
  className?: string
}

export function ZaraHelp({ message, className = "" }: ZaraHelpProps) {
  return (
    <div className={`bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-lg p-3 mt-2 ${className}`}>
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-purple-900 dark:text-purple-100">{message}</p>
      </div>
    </div>
  )
}
