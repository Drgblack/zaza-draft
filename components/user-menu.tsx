"use client"

import { useState } from "react"
import { Settings, Download, Shield, ShieldCheck, Users, HelpCircle, LogOut, KeyRound } from "lucide-react"
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
import { useAuth } from "@/hooks/use-auth"
import { canAssignRoles, hasAdminAccess } from "@/lib/auth/roles"

export function UserMenu() {
  const { t } = useLocale()
  const router = useRouter()
  const { prefs } = useTeacherPrefs()
  const { user, role, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const profilePhoto = prefs.profilePhoto
  const showAdminDashboard = role ? hasAdminAccess(role) : false
  const showAdminUsers = role ? canAssignRoles(role) : false

  const displayName = user?.displayName ?? prefs.firstName
  const displayPhoto = user?.photoURL ?? profilePhoto
  const userInitials = displayName.charAt(0)
  const userEmail = user?.email ?? "user@example.com"

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("[user menu] logout failed", error)
    } finally {
      setOpen(false)
      router.push("/")
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("account.menu.userMenu")}
        >
          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all">
            {displayPhoto && <AvatarImage src={displayPhoto} alt={displayName} />}
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
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
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
        {showAdminDashboard ? (
          <>
            <DropdownMenuSeparator className="bg-purple-200/50 dark:bg-purple-700/50" />
            <DropdownMenuItem
              onClick={() => {
                router.push("/admin/analytics")
                setOpen(false)
              }}
              className="cursor-pointer"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>{t("account.menu.adminDashboard") || "Admin dashboard"}</span>
            </DropdownMenuItem>
            {showAdminUsers ? (
              <DropdownMenuItem
                onClick={() => {
                  router.push("/admin/users")
                  setOpen(false)
                }}
                className="cursor-pointer"
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{t("account.menu.adminUsers") || "Admin users"}</span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() => {
                router.push("/admin/licences")
                setOpen(false)
              }}
              className="cursor-pointer"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              <span>{t("userMenu.adminLicences") || "Admin licences"}</span>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuSeparator className="bg-purple-200/50 dark:bg-purple-700/50" />
        )}
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("account.menu.logout") || "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
