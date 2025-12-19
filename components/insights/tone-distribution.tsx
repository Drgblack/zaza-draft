"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface ToneDistributionProps {
  data: Array<{ tone: string; percentage: number; color: string }>
  title: string
  insight: string
}

export function ToneDistribution({ data, insight, title }: ToneDistributionProps) {
  return (
    <Card className="p-6 bg-white/85 dark:bg-white/10 backdrop-blur-2xl border-white/30 shadow-2xl shadow-purple-500/10">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ tone, percentage }) => `${percentage}%`}
            outerRadius={80}
            innerRadius={50}
            fill="#8884d8"
            dataKey="percentage"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "var(--color-foreground)" }}
          />
          <Legend wrapperStyle={{ color: "var(--color-foreground)" }} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-100 dark:border-purple-900">
        <p className="text-sm text-gray-900 dark:text-gray-100">{insight}</p>
      </div>
    </Card>
  )
}
