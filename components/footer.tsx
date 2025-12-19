"use client"

import Link from "next/link"
import Image from "next/image"
import { useLocale, type Locale, localeNativeNames } from "@/hooks/use-locale"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const localeLabels: Record<Locale, string> = {
  "en-GB": "EN-GB",
  "en-US": "EN-US",
  "de-DE": "DE-DE",
}

export function Footer() {
  const { locale, setLocale, t } = useLocale()
  const currentYear = new Date().getFullYear()

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale)
  }

  return (
    <footer className="w-full border-t-2 border-transparent bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-border">
      <div className="bg-[#F8FAFC] dark:bg-[#0F1115]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Brand Section */}
            <section aria-label="Brand" className="space-y-4">
              <div className="flex items-center gap-2">
                <Image src="/z-logo.png" alt="Zaza Draft" width={24} height={24} className="rounded-md" />
                <span className="font-semibold text-[#0F172A] dark:text-[#ECECEC]">Zaza Draft</span>
              </div>
              <p className="text-sm text-[#0F172A] dark:text-[#ECECEC] leading-relaxed max-w-xs">
                {t("footer.tagline")}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://tiktok.com/@zazadraft"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] transition-colors"
                  aria-label="TikTok"
                  data-testid="footer-social-tiktok"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/zazadraft"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] transition-colors"
                  aria-label="X (Twitter)"
                  data-testid="footer-social-x"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com/company/zazadraft"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] transition-colors"
                  aria-label="LinkedIn"
                  data-testid="footer-social-linkedin"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </section>

            {/* Product & Resources Links */}
            <nav aria-label="Product & Resources" className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEC]">{t("footer.product")}</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/"
                      className="text-sm text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] hover:underline transition-colors"
                      data-testid="footer-link-draft"
                    >
                      {t("footer.links.draft")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/teach"
                      className="text-sm text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] hover:underline transition-colors"
                      data-testid="footer-link-teach"
                    >
                      {t("footer.links.teach")}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEC]">{t("footer.resources")}</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/help"
                      className="text-sm text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] hover:underline transition-colors"
                      data-testid="footer-link-help"
                    >
                      {t("footer.links.help")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/ai-literacy"
                      className="text-sm text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] hover:underline transition-colors"
                      data-testid="footer-link-ai-literacy"
                    >
                      {t("footer.links.aiLiteracy")}
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>

            {/* Company & Language */}
            <nav aria-label="Company & Language" className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEC]">{t("footer.company")}</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/about"
                      className="text-sm text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] hover:underline transition-colors"
                      data-testid="footer-link-about"
                    >
                      {t("footer.links.about")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/privacy"
                      className="text-sm text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] hover:underline transition-colors"
                      data-testid="footer-link-privacy"
                    >
                      {t("footer.links.privacy")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms"
                      className="text-sm text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] hover:underline transition-colors"
                      data-testid="footer-link-terms"
                    >
                      {t("footer.links.terms")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="text-sm text-[#6B7280] hover:text-[#8B5CF6] dark:text-[#9CA3AF] dark:hover:text-[#A78BFA] hover:underline transition-colors"
                      data-testid="footer-link-contact"
                    >
                      {t("footer.links.contact")}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Language Dropdown */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEC]">{t("footer.language")}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 text-sm hover:shadow-md hover:-translate-y-0.5 transition-all rounded-[14px] focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F1115] bg-transparent"
                      aria-label={t("footer.language")}
                      aria-haspopup="menu"
                      data-testid="footer-lang-button"
                    >
                      <Globe className="h-4 w-4" />
                      <span>{localeLabels[locale]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 rounded-[14px]">
                    {(["en-GB", "en-US", "de-DE"] as Locale[]).map((loc) => (
                      <DropdownMenuItem
                        key={loc}
                        onClick={() => handleLocaleChange(loc)}
                        className={cn("cursor-pointer rounded-[12px]", locale === loc && "bg-accent")}
                        role="menuitemradio"
                        aria-checked={locale === loc}
                        data-testid={`footer-lang-item-${loc.toLowerCase()}`}
                      >
                        <span className="flex items-center justify-between w-full">
                          <span className="font-medium">{localeLabels[loc]}</span>
                          <span className="text-muted-foreground text-xs ml-2">{localeNativeNames[loc]}</span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-muted-foreground text-xs cursor-default rounded-[12px]">
                      {t("otherLanguagesComingSoon")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </nav>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-[#E5E7EB] dark:border-[#2D2D33]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              <p>
                {t("footer.copyrightPrefix")} {currentYear} {t("footer.copyrightSuffix")}
              </p>
              <p className="font-medium text-[#8B5CF6] dark:text-[#A78BFA]">{t("footer.builtBy")}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
