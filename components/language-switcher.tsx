"use client"

import { useState } from "react"
import { Globe, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLocale, type Locale } from "@/hooks/use-locale"
import { cn } from "@/lib/utils"

const localeLabels: Record<Locale, string> = {
  "en-GB": "EN-GB · English (UK)",
  "en-US": "EN-US · English (US)",
  "de-DE": "DE-DE · Deutsch (DE)",
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 text-xs rounded-full border-violet-300 dark:border-violet-700 transition-all",
            "hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:shadow-md hover:-translate-y-0.5",
            "focus-visible:ring-2 focus-visible:ring-violet-400 dark:focus-visible:ring-violet-300",
            locale &&
              "bg-violet-600 dark:bg-violet-700 text-white border-transparent hover:bg-violet-700 dark:hover:bg-violet-600",
          )}
          aria-label={t("language")}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="font-medium">{locale.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-[14px]">
        {(["en-US", "en-GB", "de-DE"] as Locale[]).map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={cn(
              "cursor-pointer rounded-[12px] focus:bg-violet-50 dark:focus:bg-violet-950/30",
              locale === loc && "bg-violet-50 dark:bg-violet-950/30",
            )}
            role="option"
            aria-selected={locale === loc}
          >
            <span className="flex items-center justify-between w-full">
              <span className="font-medium">{localeLabels[loc]}</span>
              {locale === loc && <span className="text-violet-600 dark:text-violet-400 text-xs">✓</span>}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          disabled
          className="text-muted-foreground text-xs cursor-default rounded-[12px] mt-2 border-t pt-2"
        >
          FR-FR, IT-IT coming soon
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
