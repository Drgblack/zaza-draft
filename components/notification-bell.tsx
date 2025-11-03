"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, BellOff, Trophy, Heart, Lightbulb, Sparkles, AlertCircle, Check, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"

interface Notification {
  id: string
  type: "achievement" | "wellbeing" | "tip" | "update" | "limit"
  title: string
  description: string
  timestamp: Date
  read: boolean
  icon: string
  action?: {
    type: "navigate" | "modal" | "external"
    target: string
  }
}

// Mock notifications for demonstration
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "achievement",
    title: "5-week streak unlocked!",
    description: "You've used Zaza Draft for 5 consecutive weeks—keep it going!",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    icon: "🎉",
    action: { type: "navigate", target: "/analytics" },
  },
  {
    id: "2",
    type: "wellbeing",
    title: "Weekend boundary reminder",
    description: "You've drafted 3 times this weekend. Remember to rest!",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    read: false,
    icon: "💚",
    action: { type: "navigate", target: "/settings" },
  },
  {
    id: "3",
    type: "tip",
    title: "Try 'Empathetic' tone",
    description: "You regenerate often on parent emails. The Empathetic tone might help.",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    read: true,
    icon: "💡",
  },
  {
    id: "4",
    type: "update",
    title: "New: German language support",
    description: "Zaza Draft now supports German! Change language in Settings.",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    read: true,
    icon: "✨",
    action: { type: "navigate", target: "/settings" },
  },
  {
    id: "5",
    type: "limit",
    title: "3 drafts remaining this month",
    description: "You've used 7/10 free drafts. Upgrade for unlimited.",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    read: true,
    icon: "⚠️",
    action: { type: "navigate", target: "/settings" },
  },
]

export function NotificationBell() {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)

  const unreadCount = notifications.filter((n) => !n.read).length
  const filteredNotifications = filter === "unread" ? notifications.filter((n) => !n.read) : notifications

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect())
    }
  }, [isOpen])

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close panel on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.action) {
      setIsOpen(false)
      // Navigation would happen here
    }
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "achievement":
        return <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      case "wellbeing":
        return <Heart className="w-5 h-5 text-green-600 dark:text-green-400" />
      case "tip":
        return <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      case "update":
        return <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      case "limit":
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
    }
  }

  const getNotificationBgColor = (type: Notification["type"]) => {
    switch (type) {
      case "achievement":
        return "bg-purple-100 dark:bg-purple-900/30"
      case "wellbeing":
        return "bg-green-100 dark:bg-green-900/30"
      case "tip":
        return "bg-blue-100 dark:bg-blue-900/30"
      case "update":
        return "bg-orange-100 dark:bg-orange-900/30"
      case "limit":
        return "bg-red-100 dark:bg-red-900/30"
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`
    if (diffInHours < 48) return "Yesterday"
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className={`absolute top-1 right-1 ${
              unreadCount > 9 ? "w-6 h-5" : "w-5 h-5"
            } bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center animate-pulse`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div className="fixed inset-0 bg-black/20 z-[9998] lg:hidden" onClick={() => setIsOpen(false)} />

          <div
            ref={panelRef}
            className="fixed w-96 max-w-[calc(100vw-2rem)] max-h-[600px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-[9999] flex flex-col"
            style={{
              top: buttonRect ? `${buttonRect.bottom + 8}px` : "60px",
              right: buttonRect ? `${window.innerWidth - buttonRect.right}px` : "16px",
            }}
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10 rounded-t-xl">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">({unreadCount} new)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === "unread"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <BellOff className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No notifications</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">You're all caught up!</p>
                </div>
              ) : (
                <div>
                  {filteredNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`relative px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors duration-150 ${
                        index !== filteredNotifications.length - 1
                          ? "border-b border-gray-100 dark:border-gray-800"
                          : ""
                      } ${!notification.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Unread indicator */}
                      {!notification.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}

                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationBgColor(
                            notification.type,
                          )}`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              !notification.read ? "font-medium" : "font-normal"
                            } text-gray-900 dark:text-white mb-1`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                            {notification.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-start gap-1">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className="w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              aria-label="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-4 py-3 sticky bottom-0 rounded-b-xl">
                <Link
                  href="/settings"
                  className="text-sm text-purple-600 hover:underline dark:text-purple-400 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Notification settings →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
