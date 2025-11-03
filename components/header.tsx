"use client"

import Image from "next/image"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { NotificationBell } from "@/components/notification-bell"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useLanguage } from "@/contexts/language-context"

interface HeaderProps {
  title: string
  subtitle?: string
  onOpenKeyboardShortcuts?: () => void
}

export function Header({ title, subtitle, onOpenKeyboardShortcuts }: HeaderProps) {
  const { t } = useLanguage()

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-4" role="banner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 lg:gap-4">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Image
              src="/z-logo.png"
              alt="Zaza Draft logo"
              width={28}
              height={28}
              className="w-7 h-7 rounded-lg"
              loading="eager"
              priority
            />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">Zaza Draft</span>
          </div>

          {/* Desktop title and breadcrumb */}
          <div className="hidden lg:flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && (
              <>
                <span className="text-gray-400" aria-hidden="true">
                  /
                </span>
                <span className="text-gray-600 dark:text-gray-400">{subtitle}</span>
              </>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search bar (desktop only) */}
          <div className="hidden md:block relative w-60 lg:w-80" role="search">
            <label htmlFor="header-search" className="sr-only">
              Search drafts and templates
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <Input
              id="header-search"
              placeholder={t.searchPlaceholder}
              className="pl-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              title="Press / to focus"
              aria-label="Search drafts and templates"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-600 hidden lg:block"
              aria-hidden="true"
            >
              ⌘K
            </span>
          </div>

          <LanguageSelector />
          <ThemeToggle />
          <NotificationBell />
          <ProfileDropdown onOpenKeyboardShortcuts={onOpenKeyboardShortcuts} />
        </div>
      </div>
    </header>
  )
}
