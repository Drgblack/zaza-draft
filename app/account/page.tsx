"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useLocale } from "@/hooks/use-locale"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, LogOut, Upload, Trash2 } from "lucide-react"
import Link from "next/link"
import { logClientEvent } from "@/lib/analytics"

export default function AccountPage() {
  const { t } = useLocale()
  const { prefs } = useTeacherPrefs()
  const { user, signOut, getIdToken } = useAuth()
  const [name, setName] = useState(prefs.firstName)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const email = user?.email ?? "-"
  const [accountInfo, setAccountInfo] = useState<null | {
    plan: "free" | "pro"
    subscriptionStatus: string
    usage: {
      plan: "free" | "pro"
      currentMonthUsage: number
      limit: number | null
      remaining: number | null
    }
    stripeCustomerId: string | null
  }>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [billingAction, setBillingAction] = useState<null | "upgrade" | "manage">(null)

  const handleSave = () => {
    console.log("[v0] Saving profile:", { name })
    // Mock save action
  }

  const handleLogout = async () => {
    await signOut()
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert(t("account.profile.invalidFileType"))
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(t("account.profile.fileTooLarge"))
        return
      }
      // Create local preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string)
        // TODO: Integrate with real storage backend (Vercel Blob, Supabase Storage, etc.)
        // Example: await uploadToStorage(file)
        console.log("[v0] Profile photo uploaded (UI-only, needs backend integration)")
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoRemove = () => {
    setProfilePhoto(null)
    // TODO: Integrate with real storage backend to delete photo
    // Example: await deleteFromStorage(photoId)
    console.log("[v0] Profile photo removed (UI-only, needs backend integration)")
  }

  const handleUpgrade = async () => {
    setBillingError(null)
    setBillingAction("upgrade")
    logClientEvent("upgrade_clicked")
    try {
      const token = await getIdToken()
      if (!token) {
        setBillingError("Please sign in again.")
        setBillingAction(null)
        return
      }

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json()
      if (response.ok && payload?.url) {
        logClientEvent("checkout_redirected")
        window.location.href = payload.url
        return
      }

      setBillingError(payload?.error?.message || "Unable to start checkout.")
    } catch (error) {
      setBillingError("Unable to start checkout. Please try again.")
    } finally {
      setBillingAction(null)
    }
  }

  const handleManage = async () => {
    setBillingError(null)
    setBillingAction("manage")
    logClientEvent("manage_subscription_clicked")
    try {
      const token = await getIdToken()
      if (!token) {
        setBillingError("Please sign in again.")
        setBillingAction(null)
        return
      }

      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json()
      if (response.ok && payload?.url) {
        window.location.href = payload.url
        return
      }

      setBillingError(payload?.error?.message || "Unable to open the billing portal.")
    } catch (error) {
      setBillingError("Unable to open the billing portal. Please try again.")
    } finally {
      setBillingAction(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    const fetchAccountInfo = async () => {
      setBillingError(null)
      try {
        const token = await getIdToken()
        if (!token) {
          await signOut()
          return
        }

        const response = await fetch("/api/account/status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.status === 401) {
          await signOut()
          return
        }

        const payload = await response.json()
        if (payload?.success && isMounted) {
          setAccountInfo(payload.data)
        } else if (isMounted) {
          setBillingError(payload?.error?.message || "Unable to load billing status.")
        }
      } catch (error) {
        if (isMounted) {
          setBillingError("Unable to load billing information.")
        }
      }
    }

    fetchAccountInfo()

    return () => {
      isMounted = false
    }
  }, [getIdToken, signOut])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6 text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("account.backToApp")}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">{t("account.title")}</h1>

        <div className="space-y-6">
        {/* Profile Section */}
        <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t("account.profile.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("account.profile.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-gray-900 dark:text-white">{t("account.profile.photoLabel")}</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-purple-300 dark:border-purple-600">
                    {profilePhoto && <AvatarImage src={profilePhoto || "/placeholder.svg"} alt={name} />}
                    <AvatarFallback className="bg-purple-600 text-white text-2xl">
                      {prefs.firstName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative overflow-hidden bg-white/50 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                        onClick={() => document.getElementById("photo-upload")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {t("account.profile.uploadPhoto")}
                        <input
                          id="photo-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </Button>
                      {profilePhoto && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/50 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          onClick={handlePhotoRemove}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("account.profile.removePhoto")}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t("account.profile.photoHelper")}</p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                      {t("account.profile.photoPrivacy")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-900 dark:text-white">
                  {t("account.profile.nameLabel")}
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/50 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-900 dark:text-white">
                  {t("account.profile.emailLabel")}
                </Label>
                <Input
                  id="email"
                  value={email}
                  readOnly
                  className="bg-gray-100 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("account.profile.emailReadonly")}</p>
              </div>
              <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
                {t("account.profile.saveChanges")}
              </Button>
          </CardContent>
        </Card>

        {/* Billing Section */}
        <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">{t("account.billing.title")}</CardTitle>
            <CardDescription className="dark:text-gray-300">{t("account.billing.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("account.billing.planLabel")}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {accountInfo?.plan === "pro" ? t("account.billing.planPro") : t("account.billing.planFree")}
              </p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("account.billing.status")}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{accountInfo?.subscriptionStatus ?? "—"}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("account.billing.usage")}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {accountInfo?.usage.plan === "free"
                  ? `${accountInfo.usage.currentMonthUsage}/${accountInfo.usage.limit ?? 0}`
                  : t("account.billing.unlimitedDrafts")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleUpgrade} disabled={billingAction === "upgrade"}>
                {t("account.billing.upgrade")}
              </Button>
              <Button variant="outline" onClick={handleManage} disabled={billingAction === "manage"}>
                {t("account.billing.manage")}
              </Button>
            </div>
            {accountInfo?.usage.plan === "free" && accountInfo.usage.remaining !== null && accountInfo.usage.remaining === 0 && (
              <p className="text-sm text-amber-900">
                {t("account.billing.paywallMessage")}
              </p>
            )}
            {billingError && (
              <p className="text-sm text-red-600 dark:text-red-300">{billingError}</p>
            )}
          </CardContent>
        </Card>

          {/* Session Section */}
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t("account.session.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("account.session.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("account.session.logout")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
