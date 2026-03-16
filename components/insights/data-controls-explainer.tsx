"use client"

import { useState } from "react"
import { Info, Shield, TrendingUp, Users, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useLocale } from "@/hooks/use-locale"

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
  const { t } = useLocale()

  return (
    <Card className="relative z-10 rounded-2xl border border-gray-200 bg-white/95 p-8 text-gray-900 shadow-xl transition-all duration-300 hover:shadow-2xl">
      <div className="space-y-4">
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
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("insights.dataControls.controlHint")}
                </p>
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
          <div className="space-y-8 pt-6 border-t border-gray-200">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                  <span className="text-lg font-bold text-green-600">V</span>
                  {t("insights.dataControls.collect.title")}
                </h3>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5 font-bold">V</span>
                    <span>{t("insights.dataControls.collect.timestamps")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5 font-bold">V</span>
                    <span>{t("insights.dataControls.collect.tones")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5 font-bold">V</span>
                    <span>{t("insights.dataControls.collect.editPatterns")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5 font-bold">V</span>
                    <span>{t("insights.dataControls.collect.performance")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5 font-bold">V</span>
                    <span>{t("insights.dataControls.collect.languages")}</span>
                  </li>
                </ul>
              </Card>

              <Card className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                  <span className="text-lg font-bold text-red-600">?</span>
                  {t("insights.dataControls.neverCollect.title")}
                </h3>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5 font-bold">?</span>
                    <span>{t("insights.dataControls.neverCollect.content")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5 font-bold">?</span>
                    <span>{t("insights.dataControls.neverCollect.students")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5 font-bold">?</span>
                    <span>{t("insights.dataControls.neverCollect.parents")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5 font-bold">?</span>
                    <span>{t("insights.dataControls.neverCollect.school")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5 font-bold">?</span>
                    <span>{t("insights.dataControls.neverCollect.pii")}</span>
                  </li>
                </ul>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">{t("insights.dataControls.benefits.title")}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <TrendingUp className="h-5 w-5 text-purple-600" />,
                    title: t("insights.dataControls.benefits.toneSuggestions"),
                    description: t("insights.dataControls.benefits.toneSuggestions.desc"),
                  },
                  {
                    icon: <Shield className="h-5 w-5 text-purple-600" />,
                    title: t("insights.dataControls.benefits.fasterGeneration"),
                    description: t("insights.dataControls.benefits.fasterGeneration.desc"),
                  },
                  {
                    icon: <Info className="h-5 w-5 text-purple-600" />,
                    title: t("insights.dataControls.benefits.catchIssues"),
                    description: t("insights.dataControls.benefits.catchIssues.desc"),
                  },
                  {
                    icon: <Users className="h-5 w-5 text-purple-600" />,
                    title: t("insights.dataControls.benefits.buildFeatures"),
                    description: t("insights.dataControls.benefits.buildFeatures.desc"),
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-4 rounded-2xl border border-gray-200 bg-white/95 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                  >
                    {item.icon}
                    <div>
                      <p className="font-medium text-sm text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white/80 backdrop-blur-md border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105"
              >
                <Download className="h-4 w-4 text-purple-600" />
                <span className="text-gray-900">{t("insights.dataControls.downloadData")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onPrivacySettingsClick}
                className="bg-white/80 backdrop-blur-md border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 text-gray-900"
              >
                {t("insights.dataControls.privacySettings")}
              </Button>
            </div>

            <p className="text-xs text-gray-600">
              {t("insights.dataControls.privacyNote", {
                link: "",
              })} 
              <a
                href="https://www.zazadraft.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 underline font-medium transition-colors"
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
