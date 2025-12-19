"use client"

import { useState, useEffect } from "react"
import { Settings, Download, Shield, HelpCircle, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/use-locale"
import { useRouter } from "next/navigation"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"

export function UserMenu() {
  const { t } = useLocale()
  const router = useRouter()
  const { prefs } = useTeacherPrefs()
  const [open, setOpen] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)

  const userInitials = prefs.firstName.charAt(0)
  const userEmail = "sarah@school.edu" // Mock email

  useEffect(() => {
    // TODO: In real implementation, sync profile photo from global state or storage
    // For now, this is UI-only and won't persist across sessions or sync between components
    // Example: fetchProfilePhoto().then(setProfilePhoto)
  }, [])

  const handleLogout = () => {
    // Mock logout action
    console.log("[v0] Logout clicked")
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("account.menu.userMenu")}
        >
          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all">
            {profilePhoto && <AvatarImage src={profilePhoto || "/placeholder.svg"} alt={prefs.firstName} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">{userInitials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-purple-200/50 dark:border-purple-700/50 shadow-xl"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{prefs.firstName}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-purple-200/50 dark:bg-purple-700/50" />
        <DropdownMenuItem
          onClick={() => {
            router.push("/account")
            setOpen(false)
          }}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>{t("account.menu.accountSettings") || "Account settings"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            router.push("/account/data")
            setOpen(false)
          }}
          className="cursor-pointer"
        >
          <Download className="mr-2 h-4 w-4" />
          <span>{t("account.menu.myData") || "My data / Export"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            router.push("/account/privacy")
            setOpen(false)
          }}
          className="cursor-pointer"
        >
          <Shield className="mr-2 h-4 w-4" />
          <span>{t("account.menu.privacySafety") || "Privacy & safety"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            router.push("/support")
            setOpen(false)
          }}
          className="cursor-pointer"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>{t("account.menu.helpSupport") || "Help / Support"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-purple-200/50 dark:bg-purple-700/50" />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("account.menu.logout") || "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
