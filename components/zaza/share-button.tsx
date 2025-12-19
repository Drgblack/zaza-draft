"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

const BRANDS = {
  generic: { hover: "#8B5CF6" },
  whatsapp: { base: "#25D366" },
  email: { base: "#6366F1" },
  facebook: { base: "#1877F2" },
}

interface ShareButtonProps {
  brand?: keyof typeof BRANDS
  Icon: LucideIcon | React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  className?: string
}

export function ShareButton({ brand = "generic", Icon, label, onClick, className }: ShareButtonProps) {
  const color = BRANDS[brand]?.base ?? BRANDS.generic.hover

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm transition will-change-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8B5CF6]",
        className,
      )}
    >
      <Icon className="h-5 w-5" style={{ color }} />
    </Button>
  )
}
