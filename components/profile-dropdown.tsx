"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  User,
  FileText,
  Star,
  Settings,
  Moon,
  Globe,
  HelpCircle,
  Keyboard,
  Sparkles,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"

interface ProfileDropdownProps {
  onOpenKeyboardShortcuts?: () => void
}

export function ProfileDropdown({ onOpenKeyboardShortcuts }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const handleToggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleLogout = () => {
    // TODO: Implement actual logout logic
    window.location.href = "/login"
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded-full"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
          <AvatarImage src="/placeholder-user.jpg" alt="Profile photo of Sarah Evans" />
          <AvatarFallback>SE</AvatarFallback>
        </Avatar>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} aria-hidden="true" />

          <div
            ref={dropdownRef}
            className="fixed w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-[10000] animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-5rem)] overflow-y-auto"
            style={{
              top: "4rem",
              right: "1rem",
            }}
            role="menu"
            aria-orientation="vertical"
          >
            {/* Section 1 - User Profile */}
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="/placeholder-user.jpg" alt="Profile photo of Sarah Evans" />
                  <AvatarFallback>SE</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Sarah Evans</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">sarah.evans@school.com</p>
                </div>
              </div>
            </div>

            {/* Section 2 - Navigation Links */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4" aria-hidden="true" />
                View Profile
              </Link>
              <Link
                href="/drafts"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                My Drafts
              </Link>
              <Link
                href="/templates?tab=favorites"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Star className="w-4 h-4" aria-hidden="true" />
                My Favorites
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
                Account Settings
              </Link>
            </div>

            {/* Section 3 - Preferences */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleToggleDarkMode}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4" aria-hidden="true" />
                  Dark Mode
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors ${theme === "dark" ? "bg-purple-600" : "bg-gray-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0.5"} mt-0.5`}
                  />
                </div>
              </button>
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4" aria-hidden="true" />
                  Language
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  English (UK)
                  <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </div>
              </button>
            </div>

            {/* Section 4 - Help & Support */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/help"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
                Help Center
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false)
                  onOpenKeyboardShortcuts?.()
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  <Keyboard className="w-4 h-4" aria-hidden="true" />
                  Keyboard Shortcuts
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  English (UK)
                  <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </div>
              </button>
              <Link
                href="/changelog"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                What's New
              </Link>
            </div>

            {/* Section 5 - Log Out */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 rounded-b-xl"
                role="menuitem"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Log Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
