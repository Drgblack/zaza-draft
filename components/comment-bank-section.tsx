"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, BookmarkPlus, LibraryBig } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  COMMENT_BANK_CATEGORIES,
  type CommentBankCategory,
  type CommentBankEntry,
} from "@/lib/comment-bank"
import type { DraftMode } from "@/lib/types"
import { useLocale } from "@/hooks/use-locale"

interface CommentBankSectionProps {
  generatedComment: string | null
  mode: DraftMode
  getIdToken: () => Promise<string | null>
  onInsertComment: (commentText: string) => void
}

export function CommentBankSection({
  generatedComment,
  mode,
  getIdToken,
  onInsertComment,
}: CommentBankSectionProps) {
  const { t, locale } = useLocale()
  const [comments, setComments] = useState<CommentBankEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<CommentBankCategory[]>(["progress"])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const filteredComments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return comments
    }

    return comments.filter((comment) => {
      const searchable = `${comment.commentText} ${comment.categories.join(" ")}`.toLowerCase()
      return searchable.includes(normalizedQuery)
    })
  }, [comments, searchQuery])

  const refreshComments = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error(t("commentBank.errors.auth"))
      }

      const response = await fetch("/api/comment-bank?limit=50", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || t("commentBank.errors.load"))
      }

      setComments(payload.data?.comments ?? [])
    } catch (error) {
      console.error("[comment-bank] Failed to load comments", error)
      setLoadError(error instanceof Error ? error.message : t("commentBank.errors.load"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!saveMessage) {
      return undefined
    }
    const timeout = window.setTimeout(() => setSaveMessage(null), 2500)
    return () => window.clearTimeout(timeout)
  }, [saveMessage])

  const toggleCategory = (category: CommentBankCategory) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )
  }

  const handleSaveCurrentComment = async () => {
    const commentText = generatedComment?.trim() ?? ""
    if (!commentText || saving) {
      return
    }

    setSaving(true)
    setSaveMessage(null)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error(t("commentBank.errors.auth"))
      }

      const response = await fetch("/api/comment-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          commentText,
          categories: selectedCategories,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || t("commentBank.errors.save"))
      }

      setComments((current) => [payload.data.comment, ...current])
      setSaveMessage(t("commentBank.saved"))
    } catch (error) {
      console.error("[comment-bank] Failed to save comment", error)
      setSaveMessage(error instanceof Error ? error.message : t("commentBank.errors.save"))
    } finally {
      setSaving(false)
    }
  }

  const saveDisabled =
    mode !== "report_comment" ||
    !(generatedComment?.trim()) ||
    selectedCategories.length === 0 ||
    saving

  return (
    <details className="mt-6 rounded-xl bg-white/10 p-4 backdrop-blur border border-white/20 text-white shadow-lg">
      <summary className="text-lg font-semibold cursor-pointer flex items-center gap-2">
        <LibraryBig className="h-5 w-5" />
        {t("commentBank.title")}
        <span className="ml-1.5 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full">
          {comments.length}
        </span>
      </summary>

      <p className="mt-2 text-sm text-white/70">{t("commentBank.description")}</p>
      <p className="mt-1 text-xs text-white/50">
        {t("commentBank.personalOnly")}{" "}
        <Link href="/account/data" className="underline">
          {t("editor.history.viewData")}
        </Link>
      </p>

      <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-4">
        <div className="flex items-center gap-2">
          <BookmarkPlus className="h-4 w-4 text-white/70" />
          <p className="text-sm font-semibold text-white">{t("commentBank.saveTitle")}</p>
        </div>
        <p className="mt-1 text-xs text-white/60">
          {mode === "report_comment"
            ? t("commentBank.saveHint")
            : t("commentBank.reportOnlyHint")}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {COMMENT_BANK_CATEGORIES.map((category) => {
            const active = selectedCategories.includes(category)
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "border-white/70 bg-white text-purple-700"
                    : "border-white/25 bg-transparent text-white/75 hover:border-white/45 hover:text-white"
                }`}
              >
                {t(`commentBank.category.${category}`)}
              </button>
            )
          })}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="mt-4 text-white border-white/60"
          onClick={handleSaveCurrentComment}
          disabled={saveDisabled}
        >
          {saving ? t("commentBank.saving") : t("commentBank.saveButton")}
        </Button>

        {saveMessage ? <p className="mt-2 text-xs text-white/70">{saveMessage}</p> : null}
      </div>

      <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-white/70" />
          <p className="text-sm font-semibold text-white">{t("commentBank.searchTitle")}</p>
        </div>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("commentBank.searchPlaceholder")}
          className="mt-3 bg-white/85 text-gray-900"
        />

        {loading ? <p className="mt-3 text-sm text-white/70">{t("commentBank.loading")}</p> : null}
        {loadError ? <p className="mt-3 text-sm text-rose-200">{loadError}</p> : null}
        {!loading && !loadError && !filteredComments.length ? (
          <p className="mt-3 text-sm text-white/60">
            {comments.length ? t("commentBank.noResults") : t("commentBank.empty")}
          </p>
        ) : null}

        <ul className="mt-4 space-y-3">
          {filteredComments.map((comment) => (
            <li
              key={comment.commentId}
              className="rounded-xl bg-white/20 p-3 border border-white/20 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 text-xs text-white/60">
                <span>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(new Date(comment.createdAt))}
                </span>
                <div className="flex flex-wrap justify-end gap-1">
                  {comment.categories.map((category) => (
                    <Badge
                      key={`${comment.commentId}-${category}`}
                      variant="secondary"
                      className="rounded-full bg-white/85 text-purple-700"
                    >
                      {t(`commentBank.category.${category}`)}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                {comment.commentText}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 text-white border-white/60"
                onClick={() => onInsertComment(comment.commentText)}
              >
                {t("commentBank.insertButton")}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
