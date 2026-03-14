"use client"

import type React from "react"

import { useState } from "react"
import { Share2, Moon, Sun, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShareDialog } from "./zaza/share-dialog"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LanguageDropdown } from "./language-dropdown"
import { UserMenu } from "./user-menu"

interface HeaderProps {
  title: string
  saveStatus: "saved" | "saving" | "offline"
  onTitleChange: (title: string) => void
  isDarkMode?: boolean
  onToggleDarkMode?: () => void
  editable?: boolean
}

export function Header({
  title,
  saveStatus,
  onTitleChange,
  isDarkMode = false,
  onToggleDarkMode,
  editable = false,
}: HeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const { prefs } = useTeacherPrefs()
  const { t } = useLocale()
  const pathname = usePathname()
  const { user, status } = useAuth()
  const hasAccess = status === "authenticated" && Boolean(user)
  const showHomeLink = !editable && title === "Zaza Draft"

  const handleTitleSubmit = () => {
    onTitleChange(editedTitle)
    setIsEditingTitle(false)
  }

  const getSaveStatusText = () => {
    if (saveStatus === "saved") return t("saved")
    if (saveStatus === "saving") return t("saving")
    return t("offlineQueued")
  }

  return (
    <header
      className="glass sticky top-0 z-40 w-full border-b border-white/40 bg-white/85 px-4 py-3 shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-[32px] dark:border-white/30 dark:bg-white/15 sm:px-6"
      role="banner"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showHomeLink ? (
            <Link
              href="https://app.zazadraft.com/"
              className="flex items-center gap-3 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label="Go to Zaza Draft home"
            >
              <div className="flex items-center gap-2">
                <Image src="/z-logo.png" width={32} height={32} className="flex-shrink-0" alt="" />
              </div>
              <h1
                className="text-base font-semibold truncate text-gray-900 dark:text-white"
                style={isDarkMode ? { color: "#ffffff" } : {}}
              >
                {title}
              </h1>
            </Link>
          ) : isEditingTitle && editable ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit()
                if (e.key === "Escape") {
                  setEditedTitle(title)
                  setIsEditingTitle(false)
                }
              }}
              className="text-base font-semibold bg-transparent border-b-2 border-purple-600 focus:outline-none min-w-0 text-gray-900 dark:text-white"
              style={isDarkMode ? { color: "#ffffff" } : {}}
              aria-label={t("editDocTitle")}
              autoFocus
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Image src="/z-logo.png" width={32} height={32} className="flex-shrink-0" alt="" />
              </div>
              <h1
                className={`text-base font-semibold truncate ${
                  editable ? "cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors" : ""
                } text-gray-900 dark:text-white`}
                style={isDarkMode ? { color: "#ffffff" } : {}}
                {...(editable && {
                  onClick: () => setIsEditingTitle(true),
                  tabIndex: 0,
                  role: "button",
                  "aria-label": t("docTitleLabel", { title }),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setIsEditingTitle(true)
                    }
                  },
                })}
              >
                {title}
              </h1>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {hasAccess && (
            <div
              className="flex items-center gap-2 text-sm text-gray-800 dark:text-white font-semibold"
              style={isDarkMode ? { color: "#ffffff" } : {}}
              role="status"
              aria-live="polite"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  saveStatus === "saved"
                    ? "bg-emerald-500"
                    : saveStatus === "saving"
                      ? "bg-orange-500 animate-pulse"
                      : "bg-gray-500"
                }`}
                aria-hidden="true"
              />
              <span>{getSaveStatusText()}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 justify-end">
            {hasAccess && (
              <Link href="/insights">
                <Button
                  variant={pathname === "/insights" ? "secondary" : "ghost"}
                  size="sm"
                  aria-label={t("header.insightsButtonAria")}
                  leftIcon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
                  className="gap-2"
                >
                  <span className="hidden sm:inline">{t("header.insightsButtonLabel")}</span>
                </Button>
              </Link>
            )}

            <LanguageDropdown />

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDarkMode}
              aria-label={isDarkMode ? t("switchToLightMode") : t("switchToDarkMode")}
              className="rounded-full"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {hasAccess ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                  aria-label={t("shareDocLabel")}
                  leftIcon={<Share2 className="h-4 w-4" aria-hidden="true" />}
                  className="rounded-[14px]"
                >
                  {t("share")}
                </Button>
                <UserMenu />
              </>
            ) : (
              <Link href="/">
                <Button variant="secondary" size="sm">
                  {t("auth.cta.signin")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} title={title} docId="doc-1" />
    </header>
  )
}
