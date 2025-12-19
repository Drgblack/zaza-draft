"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Lock, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useLocale } from "@/hooks/use-locale"

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  status: "earned" | "in-progress" | "locked"
  progress?: number
  total?: number
}

interface BadgesGridProps {
  badges: Badge[]
}

export function BadgesGrid({ badges }: BadgesGridProps) {
  const { t } = useLocale()

  return (
    <Card className="p-6 bg-white/85 dark:bg-white/10 backdrop-blur-2xl border-white/30 shadow-2xl shadow-purple-500/10">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t("insights.badges.title")}</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {badges.map((badge) => (
          <Dialog key={badge.id}>
            <DialogTrigger asChild>
              <button
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md hover:-translate-y-1 ${
                  badge.status === "earned"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                    : badge.status === "in-progress"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                      : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="text-3xl relative">
                    {badge.icon}
                    {badge.status === "earned" && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {badge.status === "locked" && (
                      <div className="absolute -top-1 -right-1 bg-gray-500 rounded-full p-0.5">
                        <Lock className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-center text-gray-900 dark:text-white">{badge.name}</p>
                  {badge.status === "in-progress" && badge.progress !== undefined && badge.total !== undefined && (
                    <div className="w-full space-y-1">
                      <Progress value={(badge.progress / badge.total) * 100} className="h-1" />
                      <p className="text-xs text-muted-foreground text-center dark:text-white/70">
                        {badge.progress}/{badge.total}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <span className="text-3xl">{badge.icon}</span>
                  {badge.name}
                </DialogTitle>
                <DialogDescription className="space-y-2 text-gray-700 dark:text-white/80">
                  <p>{badge.description}</p>
                  {badge.status === "in-progress" && badge.progress !== undefined && badge.total !== undefined && (
                    <div className="space-y-2 pt-2">
                      <Progress value={(badge.progress / badge.total) * 100} />
                      <p className="text-sm">
                        {t("insights.badge.progress")}: {badge.progress} / {badge.total}
                      </p>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </Card>
  )
}
