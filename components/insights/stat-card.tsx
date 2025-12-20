"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  trend?: {
    value: string
    direction: "up" | "down"
    color: string
  }
  tooltip?: string
  icon?: React.ReactNode
  gradient?: string
  celebration?: string
  contextMessage?: string
  numericValue?: number
  sparklineData?: number[]
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  tooltip,
  icon,
  gradient,
  celebration,
  contextMessage,
  numericValue,
  sparklineData,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (numericValue !== undefined) {
      setIsAnimating(true)
      const duration = 1500 // 1.5 seconds
      const steps = 60
      const increment = numericValue / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= numericValue) {
          setDisplayValue(numericValue)
          setIsAnimating(false)
          clearInterval(timer)
        } else {
          setDisplayValue(Math.floor(current))
        }
      }, duration / steps)

      return () => clearInterval(timer)
    }
  }, [numericValue])

  return (
    <Card
      className={`p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${gradient || ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        <div className="flex items-center gap-2">
          {celebration && <span className="text-2xl">{celebration}</span>}
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {numericValue !== undefined ? displayValue : value}
          </p>
          {icon}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>

        {contextMessage && (
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-2">{contextMessage}</p>
        )}

        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3">
            <svg width="100%" height="24" className="overflow-visible">
              <polyline
                points={sparklineData
                  .map((val, i) => `${(i / (sparklineData.length - 1)) * 100}%,${24 - (val / 100) * 24}`)
                  .join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-purple-600 dark:text-purple-400"
              />
            </svg>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Last 7 days trend</p>
          </div>
        )}

        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.color}`}>
            {trend.direction === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </Card>
  )
}



