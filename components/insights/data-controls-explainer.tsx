"use client"

import { useState } from "react"
import { Info, Shield, TrendingUp, Users, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useLocale } from "@/hooks/use-locale"
import { useRouter } from "next/navigation"

interface DataControlsExplainerProps {
  shareData: boolean
  onShareDataChange: (value: boolean) => void
  onPrivacySettingsClick: () => void
}

export default function DataControlsExplainer({
  shareData,
  onShareDataChange,
  onPrivacySettingsClick,
}: DataControlsExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { t, locale } = useLocale()
  const router = useRouter()

  const handlePrivacyClick = () => {
    router.push("/account/privacy")
  }

  return (
    <Card className="p-8 bg-white/85 dark:bg-white/10 backdrop-blur-2xl border-2 border-purple-200/50 dark:border-purple-400/30 shadow-2xl shadow-purple-500/10 dark:shadow-purple-500/20 rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-3xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/30 hover:scale-[1.01]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/20 pointer-events-none rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-tl from-purple-500/10 via-transparent to-transparent dark:from-purple-400/20 pointer-events-none rounded-2xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-300 drop-shadow-lg" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("insights.dataControls.title")}
              </h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{t("insights.dataControls.shareData")}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t("insights.dataControls.helpTeachers")}</p>
              </div>
              <Switch
                checked={shareData}
                onCheckedChange={onShareDataChange}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2 hover:bg-purple-100/50 dark:hover:bg-purple-500/20 transition-colors"
          >
            <Info className="h-4 w-4 text-purple-600 dark:text-purple-300" />
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-8 pt-6 border-t border-purple-200/50 dark:border-purple-400/30">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-5 bg-white/90 dark:bg-white/15 backdrop-blur-xl border-2 border-green-300/50 dark:border-green-400/40 shadow-xl shadow-green-500/10 dark:shadow-green-500/20 rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20 dark:hover:shadow-green-500/30 hover:scale-[1.02] hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent dark:from-white/30 pointer-events-none rounded-xl" />
                <div className="absolute inset-0 bg-gradient-to-tl from-green-400/10 via-transparent to-transparent dark:from-green-400/20 pointer-events-none rounded-xl" />

                <div className="relative z-10">
                  <h3 className="font-semibold text-green-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-300 text-lg drop-shadow-md">✓</span>
                    {t("insights.dataControls.collect.title")}
                  </h3>
                  <ul className="space-y-2.5 text-sm text-green-800 dark:text-gray-100">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-300 mt-0.5 font-bold">✓</span>
                      <span>{t("insights.dataControls.collect.timestamps")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-300 mt-0.5 font-bold">✓</span>
                      <span>{t("insights.dataControls.collect.tones")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-300 mt-0.5 font-bold">✓</span>
                      <span>{t("insights.dataControls.collect.editPatterns")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-300 mt-0.5 font-bold">✓</span>
                      <span>{t("insights.dataControls.collect.performance")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-300 mt-0.5 font-bold">✓</span>
                      <span>{t("insights.dataControls.collect.languages")}</span>
                    </li>
                  </ul>
                </div>
              </Card>

              <Card className="p-5 bg-white/90 dark:bg-white/15 backdrop-blur-xl border-2 border-red-300/50 dark:border-red-400/40 shadow-xl shadow-red-500/10 dark:shadow-red-500/20 rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/20 dark:hover:shadow-red-500/30 hover:scale-[1.02] hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent dark:from-white/30 pointer-events-none rounded-xl" />
                <div className="absolute inset-0 bg-gradient-to-tl from-red-400/10 via-transparent to-transparent dark:from-red-400/20 pointer-events-none rounded-xl" />

                <div className="relative z-10">
                  <h3 className="font-semibold text-red-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-red-600 dark:text-red-300 text-lg drop-shadow-md">✗</span>
                    {t("insights.dataControls.neverCollect.title")}
                  </h3>
                  <ul className="space-y-2.5 text-sm text-red-800 dark:text-gray-100">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-300 mt-0.5 font-bold">✗</span>
                      <span>{t("insights.dataControls.neverCollect.content")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-300 mt-0.5 font-bold">✗</span>
                      <span>{t("insights.dataControls.neverCollect.students")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-300 mt-0.5 font-bold">✗</span>
                      <span>{t("insights.dataControls.neverCollect.parents")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-300 mt-0.5 font-bold">✗</span>
                      <span>{t("insights.dataControls.neverCollect.school")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-300 mt-0.5 font-bold">✗</span>
                      <span>{t("insights.dataControls.neverCollect.pii")}</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t("insights.dataControls.benefits.title")}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-white/90 dark:bg-white/15 backdrop-blur-xl border-2 border-purple-200/50 dark:border-purple-400/30 shadow-lg shadow-purple-500/10 dark:shadow-purple-500/20 rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/30 hover:scale-[1.02] hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/20 pointer-events-none rounded-xl" />
                  <div className="relative z-10 flex items-start gap-3 w-full">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-300 flex-shrink-0 mt-0.5 drop-shadow-lg" />
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {t("insights.dataControls.benefits.toneSuggestions")}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {t("insights.dataControls.benefits.toneSuggestions.desc")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white/90 dark:bg-white/15 backdrop-blur-xl border-2 border-purple-200/50 dark:border-purple-400/30 shadow-lg shadow-purple-500/10 dark:shadow-purple-500/20 rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/30 hover:scale-[1.02] hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/20 pointer-events-none rounded-xl" />
                  <div className="relative z-10 flex items-start gap-3 w-full">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-300 flex-shrink-0 mt-0.5 drop-shadow-lg" />
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {t("insights.dataControls.benefits.fasterGeneration")}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {t("insights.dataControls.benefits.fasterGeneration.desc")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white/90 dark:bg-white/15 backdrop-blur-xl border-2 border-purple-200/50 dark:border-purple-400/30 shadow-lg shadow-purple-500/10 dark:shadow-purple-500/20 rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/30 hover:scale-[1.02] hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/20 pointer-events-none rounded-xl" />
                  <div className="relative z-10 flex items-start gap-3 w-full">
                    <Info className="h-5 w-5 text-purple-600 dark:text-purple-300 flex-shrink-0 mt-0.5 drop-shadow-lg" />
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {t("insights.dataControls.benefits.catchIssues")}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {t("insights.dataControls.benefits.catchIssues.desc")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white/90 dark:bg-white/15 backdrop-blur-xl border-2 border-purple-200/50 dark:border-purple-400/30 shadow-lg shadow-purple-500/10 dark:shadow-purple-500/20 rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/30 hover:scale-[1.02] hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/20 pointer-events-none rounded-xl" />
                  <div className="relative z-10 flex items-start gap-3 w-full">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-300 flex-shrink-0 mt-0.5 drop-shadow-lg" />
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {t("insights.dataControls.benefits.buildFeatures")}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {t("insights.dataControls.benefits.buildFeatures.desc")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-6 border-t border-purple-200/50 dark:border-purple-400/30">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white/80 dark:bg-white/10 backdrop-blur-md border-purple-200 dark:border-purple-400/30 hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:border-purple-300 dark:hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105"
              >
                <Download className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                <span className="text-gray-900 dark:text-white">{t("insights.dataControls.downloadData")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrivacyClick}
                className="bg-white/80 dark:bg-white/10 backdrop-blur-md border-purple-200 dark:border-purple-400/30 hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:border-purple-300 dark:hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 text-gray-900 dark:text-white"
              >
                {t("insights.dataControls.privacySettings")}
              </Button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              {t("insights.dataControls.privacyNote", {
                link: "",
              })}{" "}
              <a
                href="https://www.zazatechnologies.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 hover:underline font-medium transition-colors"
              >
                {t("insights.dataControls.learnMore")}
              </a>
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
