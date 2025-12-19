"use client"

import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"

interface ToneSelectorProps {
  value: "Professional" | "Friendly" | "Formal"
  onChange: (tone: "Professional" | "Friendly" | "Formal") => void
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  const { t } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge variant="secondary" className="cursor-pointer rounded-[14px] tone-chip-glow">
          {t("tone")}: {t(`tone${value}` as any)} <ChevronDown className="h-3 w-3 ml-1" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-[14px]">
        <DropdownMenuItem onClick={() => onChange("Professional")} className="rounded-[12px]">
          {t("toneProfessional")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("Friendly")} className="rounded-[12px]">
          {t("toneFriendly")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("Formal")} className="rounded-[12px]">
          {t("toneFormal")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
