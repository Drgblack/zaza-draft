"use client"

import { CheckCircle2, X, Star, Copy, SettingsIcon } from "lucide-react"
import { useEffect } from "react"

interface SuccessToastProps {
  message: string
  type?: "success" | "info" | "achievement"
  icon?: "check" | "star" | "copy" | "settings"
  onClose: () => void
  duration?: number
}

export function SuccessToast({
  message,
  type = "success",
  icon = "check",
  onClose,
  duration = 3000,
}: SuccessToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [onClose, duration])

  const getIcon = () => {
    switch (icon) {
      case "star":
        return <Star className="w-5 h-5 flex-shrink-0 fill-current" />
      case "copy":
        return <Copy className="w-5 h-5 flex-shrink-0" />
      case "settings":
        return <SettingsIcon className="w-5 h-5 flex-shrink-0" />
      default:
        return <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case "achievement":
        return "bg-purple-600 border-l-4 border-purple-700"
      case "info":
        return "bg-blue-600 border-l-4 border-blue-700"
      default:
        return "bg-green-600 border-l-4 border-green-700"
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div
        className={`${getStyles()} text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px] max-w-md`}
      >
        {getIcon()}
        <p className="flex-1 font-medium">{message}</p>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
