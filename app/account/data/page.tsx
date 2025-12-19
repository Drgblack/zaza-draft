"use client"

import { useLocale } from "@/hooks/use-locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, Trash2 } from "lucide-react"
import Link from "next/link"

export default function DataPage() {
  const { t } = useLocale()

  const handleExportCSV = () => {
    console.log("[v0] Exporting data as CSV")
    // Mock CSV export
    const csvContent = "data:text/csv;charset=utf-8,Name,Email\nSarah,sarah@school.edu"
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "zaza-draft-data.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadData = () => {
    console.log("[v0] Downloading all data")
    // Mock data download
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/account">
          <Button variant="ghost" className="mb-6 text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("account.backToAccount")}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">{t("account.data.title")}</h1>

        <div className="space-y-6">
          {/* Export Data */}
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t("account.data.export.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("account.data.export.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleExportCSV} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Download className="mr-2 h-4 w-4" />
                {t("account.data.export.csvButton")}
              </Button>
              <Button onClick={handleDownloadData} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t("account.data.export.allDataButton")}
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account */}
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-red-300/40 dark:border-red-700/40">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">{t("account.data.delete.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("account.data.delete.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled variant="destructive" className="opacity-50 cursor-not-allowed">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("account.data.delete.button")}
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t("account.data.delete.comingSoon")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
