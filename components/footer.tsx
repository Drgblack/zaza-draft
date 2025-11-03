"use client"

import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { Sparkles } from "lucide-react"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="w-full bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
          {/* Logo and social section - more compact */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Image src="/z-logo.png" alt="Zaza Draft" width={16} height={16} className="w-4 h-4 rounded-lg" />
              <span className="font-semibold text-gray-900 dark:text-white text-xs">{t.footerTagline}</span>
            </div>
            <div className="flex gap-2">
              <a
                href="https://www.tiktok.com/@zazateach"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a
                href="https://twitter.com/zazateach"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                aria-label="Twitter/X"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/zazateach"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 md:gap-12">
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-900 dark:text-white mb-1.5 leading-tight">
                {t.product}
              </h3>
              <div className="flex flex-col gap-0.5">
                <Link
                  href="https://www.zazadraft.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 leading-tight"
                >
                  {t.zazaDraft}
                </Link>
                <Link
                  href="/analytics"
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 leading-tight"
                >
                  {t.insights}
                </Link>
                <Link
                  href="https://www.zazateach.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 leading-tight"
                >
                  {t.zazaTeach}
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-900 dark:text-white mb-1.5 leading-tight">
                {t.company}
              </h3>
              <div className="flex flex-col gap-0.5">
                <Link
                  href="/about"
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 leading-tight"
                >
                  {t.about}
                </Link>
                <Link
                  href="/terms"
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 leading-tight"
                >
                  {t.terms}
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 leading-tight"
                >
                  {t.privacy}
                </Link>
                <Link
                  href="/contact"
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 leading-tight"
                >
                  {t.contact}
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400">
              <p className="leading-tight">{t.copyright}</p>
              <Link
                href="https://www.zazatechnologies.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline leading-tight"
              >
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                {t.poweredBy}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
