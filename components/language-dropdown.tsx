"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/use-locale"
import Image from "next/image"

export function LanguageDropdown() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)

  const switchLanguage = (newLocale: "en-GB" | "de-DE") => {
    setLocale(newLocale)
    setOpen(false)

    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${365 * 24 * 60 * 60}`
  }

  const getCurrentLanguage = () => {
    return locale === "en-GB"
      ? { code: "EN", flag: "/flags/gb.svg", label: "English" }
      : { code: "DE", flag: "/flags/de.svg", label: "Deutsch" }
  }

  const current = getCurrentLanguage()

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 glass shadow-soft hover:bg-white/90 dark:hover:bg-white/20 border border-white/40 dark:border-white/30 bg-white/85 dark:bg-white/15 backdrop-blur-[24px] text-gray-900 dark:text-white hover:shadow-[0_4px_12px_rgba(124,58,237,0.2)]"
          aria-label="Select language"
        >
          <Image
            src={current.flag || "/placeholder.svg"}
            alt={current.label}
            width={20}
            height={20}
            className="rounded-sm"
          />
          <span>{current.code}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 glass border-white/40 dark:border-white/30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
      >
        <DropdownMenuItem
          onClick={() => switchLanguage("en-GB")}
          className="gap-2 cursor-pointer focus:bg-purple-100 dark:focus:bg-purple-900/30"
        >
          <Image src="/flags/gb.svg" alt="English" width={20} height={20} className="rounded-sm" />
          <span className="font-medium">English</span>
          {locale === "en-GB" && <span className="ml-auto text-purple-600 dark:text-purple-400">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLanguage("de-DE")}
          className="gap-2 cursor-pointer focus:bg-purple-100 dark:focus:bg-purple-900/30"
        >
          <Image src="/flags/de.svg" alt="Deutsch" width={20} height={20} className="rounded-sm" />
          <span className="font-medium">Deutsch</span>
          {locale === "de-DE" && <span className="ml-auto text-purple-600 dark:text-purple-400">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
