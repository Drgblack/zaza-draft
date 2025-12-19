"use client"

import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useLocale } from "@/hooks/use-locale"

interface ConfidenceChartProps {
  data: Array<{ week: string; editRate: number }>
  title: string
  insight: string
}

export function ConfidenceChart({ data, insight, title }: ConfidenceChartProps) {
  const { t } = useLocale()

  return (
    <Card className="p-6 bg-white/85 dark:bg-white/10 backdrop-blur-2xl border-white/30 shadow-2xl shadow-purple-500/10">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="week" className="text-xs" tick={{ fill: "var(--color-foreground)" }} />
          <YAxis
            className="text-xs"
            tick={{ fill: "var(--color-foreground)" }}
            /* Use translation for axis label */
            label={{
              value: t("insights.confidence.yAxisLabel"),
              angle: -90,
              position: "insideLeft",
              fill: "var(--color-foreground)",
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              color: "var(--color-foreground)",
            }}
          />
          <Line type="monotone" dataKey="editRate" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: "#8B5CF6" }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-100 dark:border-green-900">
        <p className="text-sm text-gray-900 dark:text-white font-medium">{insight}</p>
      </div>
    </Card>
  )
}
