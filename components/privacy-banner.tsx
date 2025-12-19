"use client"

import { Shield, X } from "lucide-react"
import { useI18n } from "./providers/i18n-provider"

interface PrivacyBannerProps {
  onDismiss: () => void
}

export function PrivacyBanner({ onDismiss }: PrivacyBannerProps) {
  const { t } = useI18n()

  return (
    <div className="bg-[#eef7f1] border-b border-[#8b9d83]/20 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-[#8b9d83] flex-shrink-0" />
          <p className="text-sm text-foreground">{t("privacyBanner")}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
