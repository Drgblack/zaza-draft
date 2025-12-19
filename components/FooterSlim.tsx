"use client"

import Link from "next/link"
import Image from "next/image"
import { useLocale } from "@/hooks/use-locale"
import RotatingTagline from "./RotatingTagline"

export default function FooterSlim() {
  const { t } = useLocale()
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="border-t border-white/10 relative overflow-hidden backdrop-blur-[64px]"
      data-testid="footer-slim"
    >
      <div className="absolute inset-0 bg-[#0f172a]/98 dark:bg-[#0f172a]/99" />

      <div className="h-px bg-gradient-to-r from-purple-500/30 via-purple-400/60 to-purple-500/30 shadow-[0_-4px_24px_rgba(168,85,247,0.25)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 relative">
        <div className="flex items-center justify-between gap-8 flex-wrap">
          <section aria-label="Brand" className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/50 to-purple-600/50 blur-xl rounded-lg" />
                <Image
                  src="/z-logo.png"
                  alt="Zaza Draft"
                  width={20}
                  height={20}
                  className="rounded-md flex-shrink-0 relative"
                />
              </div>
              <a
                href="https://www.zazadraft.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white dark:text-white text-sm hover:text-purple-300 dark:hover:text-purple-300 transition-colors duration-200"
              >
                Zaza Draft
              </a>
            </div>
            <div className="basis-[42ch] min-w-[42ch] max-w-[42ch] hidden sm:block">
              <RotatingTagline className="text-xs text-white/95 truncate" title="Zaza Draft footer tagline" />
            </div>
            <div className="flex items-center gap-3" data-testid="footer-socials">
              <a
                href="https://www.tiktok.com/@zazatechnologies"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow on TikTok"
                className="text-white/90 hover:text-purple-300 transition-all duration-200 hover:scale-110"
                aria-label="TikTok – @zazatechnologies"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a
                href="https://x.com/zazateachapp"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow on X"
                className="text-white/90 hover:text-purple-300 transition-all duration-200 hover:scale-110"
                aria-label="X – @zazateachapp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/zaza-technologies/"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow on LinkedIn"
                className="text-white/90 hover:text-purple-300 transition-all duration-200 hover:scale-110"
                aria-label="LinkedIn – Zaza Technologies"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </section>

          <div className="flex gap-8 text-xs">
            <nav aria-label="Footer - Product">
              <h3 className="font-bold text-white mb-1.5">{t("footer.product")}</h3>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/"
                    className="text-white/90 hover:text-purple-300 hover:underline transition-colors duration-200"
                  >
                    {t("footer.links.draft")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/insights"
                    className="text-white/90 hover:text-purple-300 hover:underline transition-colors duration-200"
                  >
                    Insights
                  </Link>
                </li>
                <li>
                  <a
                    href="https://zazateach.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-purple-300 hover:underline transition-colors duration-200"
                  >
                    {t("footer.links.teach")}
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Footer - Company">
              <h3 className="font-bold text-white mb-1.5">{t("footer.company")}</h3>
              <div className="flex gap-4">
                <ul className="space-y-1" data-testid="company-col-a">
                  <li>
                    <Link
                      href="/about"
                      className="text-white/90 hover:text-purple-300 hover:underline transition-colors duration-200"
                    >
                      {t("footer.links.about")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/privacy"
                      className="text-white/90 hover:text-purple-300 hover:underline transition-colors duration-200"
                    >
                      {t("footer.links.privacy")}
                    </Link>
                  </li>
                </ul>
                <ul className="space-y-1" data-testid="company-col-b">
                  <li>
                    <Link
                      href="/terms"
                      className="text-white/90 hover:text-purple-300 hover:underline transition-colors duration-200"
                    >
                      {t("footer.links.terms")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="text-white/90 hover:text-purple-300 hover:underline transition-colors duration-200"
                    >
                      {t("footer.links.contact")}
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </div>

          <div className="text-xs text-white/95 text-right">
            <p>
              {t("footer.copyrightPrefix")} {currentYear} {t("footer.copyrightSuffix")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
