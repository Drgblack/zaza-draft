"use client"

import { Card } from "@/components/ui/card"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/use-locale"

interface TimeHeatmapProps {
  data: Array<{ day: string; hour: number; intensity: number }>
  title: string
  insight: string
  warning?: string
}

export function TimeHeatmap({ data, title, insight, warning }: TimeHeatmapProps) {
  const { t, locale } = useLocale()

  const weekFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" })
  const baseDate = new Date(Date.UTC(2025, 0, 6)) // Monday
  const translatedDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseDate)
    date.setUTCDate(baseDate.getUTCDate() + index)
    return weekFormatter.format(date)
  })

  // Keep English day names for data lookup (matching the data structure)
  const dataLookupDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getIntensity = (day: string, hour: number) => {
    const point = data.find((d) => d.day === day && d.hour === hour)
    return point?.intensity || 0
  }

  const getColor = (intensity: number) => {
    if (intensity === 0) return "bg-gray-100 dark:bg-gray-800"
    if (intensity < 0.3) return "bg-purple-200 dark:bg-purple-900/30"
    if (intensity < 0.6) return "bg-purple-400 dark:bg-purple-700/50"
    return "bg-purple-600 dark:bg-purple-500"
  }

  return (
    <Card className="p-6 bg-white/85 dark:bg-white/10 backdrop-blur-2xl border-white/30 shadow-2xl shadow-purple-500/10">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-900 dark:text-gray-100">{t("insights.heatmap.tooltipText")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-4">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex gap-1">
              <div className="w-12 flex flex-col justify-around text-xs text-gray-600 dark:text-gray-400">
                {translatedDays.map((day, idx) => (
                  <div key={idx} className="h-4 flex items-center">
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex-1">
                {dataLookupDays.map((day, dayIndex) => (
                  <div key={day} className="flex gap-1 mb-1">
                    {hours.map((hour) => {
                      return (
                        <TooltipProvider key={hour}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`w-3 h-4 rounded-sm ${getColor(getIntensity(day, hour))} transition-colors hover:ring-2 hover:ring-purple-500`}
                              />
                            </TooltipTrigger>
                            <TooltipContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl">
                              <p className="text-xs text-gray-900 dark:text-white">
                                {translatedDays[dayIndex]} {hour}:00 - {(hour + 1) % 24}:00
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-100 dark:border-purple-900">
          <p className="text-sm text-gray-900 dark:text-gray-100">{insight}</p>
        </div>

        {warning && (
          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{warning}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
