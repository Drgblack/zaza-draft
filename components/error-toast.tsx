"use client"

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"
import { useEffect } from "react"

export type ToastType = "success" | "error" | "warning" | "info"

interface ErrorToastProps {
  message: string
  type?: ToastType
  onClose: () => void
  autoClose?: boolean
  duration?: number
}

export function ErrorToast({ message, type = "success", onClose, autoClose = true, duration = 5000 }: ErrorToastProps) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [onClose, autoClose, duration])

  const config = {
    success: {
      icon: CheckCircle2,
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-l-4 border-green-500",
      text: "text-green-900 dark:text-green-100",
      iconColor: "text-green-500",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-l-4 border-red-500",
      text: "text-red-900 dark:text-red-100",
      iconColor: "text-red-500",
    },
    warning: {
      icon: AlertCircle,
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-l-4 border-orange-500",
      text: "text-orange-900 dark:text-orange-100",
      iconColor: "text-orange-500",
    },
    info: {
      icon: Info,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-l-4 border-blue-500",
      text: "text-blue-900 dark:text-blue-100",
      iconColor: "text-blue-500",
    },
  }

  const { icon: Icon, bg, border, text, iconColor } = config[type]

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`${bg} ${border} rounded-lg shadow-xl p-4 flex items-start gap-3 min-w-[300px] max-w-md`}>
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <p className={`flex-1 font-medium text-sm ${text}`}>{message}</p>
        <button onClick={onClose} className={`${text} opacity-60 hover:opacity-100 transition-opacity`}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
