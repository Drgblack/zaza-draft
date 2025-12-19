"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

export function DashboardPreview() {
  const [isMinimized, setIsMinimized] = useState(false)

  if (isMinimized) {
    return (
      <Card className="p-4 mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        <button onClick={() => setIsMinimized(false)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-purple-900 dark:text-purple-100">Your Impact This Week</span>
          </div>
          <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </button>
      </Card>
    )
  }

  return (
    <Card className="p-6 mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-purple-900 dark:text-purple-100">Your Impact This Week</h3>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
          aria-label="Minimize"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">4.2 hours</p>
          <p className="text-sm text-purple-700 dark:text-purple-300">Time saved</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">18 drafts</p>
          <p className="text-sm text-purple-700 dark:text-purple-300">Created</p>
        </div>
      </div>

      <Link href="/insights">
        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">View full insights →</Button>
      </Link>
    </Card>
  )
}
