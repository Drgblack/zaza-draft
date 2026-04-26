"use client"

import { useLocale } from "@/hooks/use-locale"
import { useAnalyticsConsent } from "@/hooks/use-analytics-consent"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Check, X, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
  const { t } = useLocale()
  const { analyticsConsent, setAnalyticsConsent } = useAnalyticsConsent()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/account">
          <Button variant="ghost" className="mb-6 text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("account.backToAccount")}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">{t("account.privacy.title")}</h1>

        <div className="space-y-6">
          {/* Data Sharing Toggle */}
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t("account.privacy.sharing.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">
                {t("account.privacy.sharing.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data-sharing" className="text-gray-900 dark:text-white cursor-pointer">
                    {t("account.privacy.sharing.label")}
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t("account.privacy.sharing.explainer")}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t("account.privacy.sharing.learningSignal")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("account.privacy.sharing.controlHint")}
                  </p>
                </div>
                <Switch
                  id="data-sharing"
                  checked={analyticsConsent}
                  onCheckedChange={setAnalyticsConsent}
                />
              </div>
            </CardContent>
          </Card>

          {/* What We Collect */}
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t("account.privacy.collect.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  t("account.privacy.collect.item1"),
                  t("account.privacy.collect.item2"),
                  t("account.privacy.collect.item3"),
                  t("account.privacy.collect.item4"),
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-200">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* What We Never Collect */}
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t("account.privacy.neverCollect.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  t("account.privacy.neverCollect.item1"),
                  t("account.privacy.neverCollect.item2"),
                  t("account.privacy.neverCollect.item3"),
                  t("account.privacy.neverCollect.item4"),
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-200">
                    <X className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Privacy Policy Link */}
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardContent className="pt-6">
              <Link
                href="https://www.zazadraft.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:underline"
              >
                {t("account.privacy.policyLink")}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
