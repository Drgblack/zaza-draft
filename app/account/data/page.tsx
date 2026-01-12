"use client"

import { useState } from "react"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, Trash2 } from "lucide-react"
import Link from "next/link"

const getFilenameFromContentDisposition = (header: string | null): string | null => {
  if (!header) return null
  const filenameStarMatch = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (filenameStarMatch) {
    return decodeURIComponent(filenameStarMatch[1])
  }
  const filenameMatch = header.match(/filename="([^"]+)"/i)
  if (filenameMatch) {
    return filenameMatch[1]
  }
  return null
}

export default function DataPage() {
  const { t } = useLocale()
  const { getIdToken, signOut } = useAuth()
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null)
  const [deleteCheckbox, setDeleteCheckbox] = useState(false)
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirming" | "ready" | "done">("idle")
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")

  const handleExportData = async () => {
    setExportStatus("Preparing your export…")
    setIsExporting(true)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error("Unauthenticated")
      }
      const response = await fetch("/api/account/export", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const blob = await response.blob()
      const filename =
        getFilenameFromContentDisposition(response.headers.get("content-disposition")) ??
        `zaza-draft-export-${new Date().toISOString().slice(0, 10)}.json`
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      setExportStatus("Downloaded.")
    } catch (error) {
      setExportStatus("Sorry – something went wrong. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteData = async () => {
    if (!deleteCheckbox) {
      setDeleteStatus("Please acknowledge the statement before deleting.")
      return
    }

    if (deleteStage === "idle") {
      setDeleteStage("confirming")
      setDeleteStatus("Type DELETE in the box below to unlock final confirmation.")
      return
    }

    if (deleteStage === "confirming") {
      if (deleteInput.trim().toUpperCase() !== "DELETE") {
        setDeleteStatus("Please type DELETE exactly to proceed.")
        return
      }
      setDeleteStage("ready")
      setDeleteStatus("Click delete again to permanently remove your data.")
      return
    }

    if (deleteStage !== "ready") {
      return
    }

    setIsDeleting(true)
    setDeleteStatus("Deleting…")
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error("Unauthenticated")
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm: true }),
      })

      if (!response.ok) {
        throw new Error("Delete failed")
      }

      setDeleteStatus("Your data has been deleted.")
      setDeleteStage("done")
      await signOut()
    } catch (error) {
      setDeleteStatus("Sorry – something went wrong. Please try again.")
      setDeleteStage("idle")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900">
      <div
        className="flex-1 flex flex-col gap-6 container mx-auto px-4 py-5 max-w-4xl"
        data-testid="account-data-container"
      >
        <Link href="/account">
          <Button variant="ghost" className="mb-6 text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("account.backToAccount")}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">{t("account.data.title")}</h1>

        <div className="flex flex-col gap-6">
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t("account.data.export.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("account.data.export.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleExportData}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Export my data
              </Button>
              {exportStatus && <p className="text-sm text-gray-600 dark:text-gray-300">{exportStatus}</p>}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-red-300/40 dark:border-red-700/40">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">{t("account.data.delete.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("account.data.delete.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={deleteCheckbox}
                  onChange={(event) => setDeleteCheckbox(event.target.checked)}
                  disabled={isDeleting || deleteStage === "done"}
                />
                <span>{t("account.data.delete.confirmationLabel")}</span>
              </label>
              <div className="flex flex-col gap-2">
                {deleteStage !== "done" && (
                  <input
                    type="text"
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    value={deleteInput}
                    onChange={(event) => setDeleteInput(event.target.value)}
                    placeholder="Type DELETE to confirm"
                    disabled={isDeleting}
                  />
                )}
                <Button
                  onClick={handleDeleteData}
                  variant="destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteStage === "ready" ? "Delete my data" : "Delete my data"}
                </Button>
                {(isDeleting || deleteStatus) && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{deleteStatus}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
