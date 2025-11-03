"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Home, FileText, BarChart3, Database, Users, SettingsIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/contexts/language-context"

export function Sidebar() {
  const { t } = useLanguage()
  const pathname = usePathname()

  const navItems = [
    { href: "/", icon: Home, label: t.overview },
    { href: "/drafts", icon: FileText, label: t.myDrafts },
    { href: "/analytics", icon: BarChart3, label: t.analytics },
    { href: "/templates", icon: Database, label: t.templates },
    { href: "/community", icon: Users, label: t.community },
    { href: "/settings", icon: SettingsIcon, label: t.settings },
  ]

  return (
    <aside
      className="hidden lg:flex w-64 border-r border-gray-200 dark:border-gray-800 p-6 flex-col"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <Image
          src="/z-logo.png"
          alt="Zaza Draft logo"
          width={32}
          height={32}
          className="w-8 h-8 rounded-lg"
          loading="eager"
          priority
        />
        <span className="font-semibold text-gray-900 dark:text-white">Zaza Draft</span>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative" role="search">
          <label htmlFor="sidebar-search" className="sr-only">
            Search drafts and templates
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <Input
            id="sidebar-search"
            placeholder={t.searchAnything}
            className="pl-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            aria-label="Search drafts and templates"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 flex-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
