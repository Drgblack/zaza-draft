"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useLocale } from "@/hooks/use-locale"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useAuth } from "@/hooks/use-auth"
import { formatDiagnosticsLastRun } from "@/lib/text/format-last-run"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, LogOut, Upload, Trash2 } from "lucide-react"
import Link from "next/link"
import { logClientEvent } from "@/lib/analytics"
import { canShowDevUid } from "@/lib/dev/feature-flags"
import type { FirestoreTimestamp } from "@/lib/diagnostics/merge-last-run"
import { getLastRunFromStorage } from "@/lib/diagnostics/local-storage"

const mergeDiagnosticsWithLocalFallback = (
  diagnostics: { lastRunAt?: FirestoreTimestamp } | null,
) => {
  if (diagnostics?.lastRunAt) {
    return diagnostics
  }
  const fallback = getLastRunFromStorage()
  if (!fallback) {
    return diagnostics
  }
  return {
    ...(diagnostics ?? {}),
    lastRunAt: fallback,
  }
}

export default function AccountPage() {
  const { t, formatDate } = useLocale()
  const { prefs, updatePrefs } = useTeacherPrefs()
  const { user, status, signOut, getIdToken } = useAuth()
  const displayName = user?.displayName ?? prefs.firstName
  const [name, setName] = useState(displayName)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(prefs.profilePhoto)
  const [uidCopied, setUidCopied] = useState(false)
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
    isQaUser: boolean
  }>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [billingAction, setBillingAction] = useState<null | "upgrade" | "manage">(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<null | {
    models: { primary: string | null; fallback: string | null }
    plan: string
    usage: {
      plan: string
      currentMonthUsage: number
      limit: number | null
      remaining: number | null
    }
    diagnostics?: {
      lastModelUsed?: string
      lastErrorCode?: string | null
      lastUsage?: Record<string, unknown>
      lastRunAt?: { seconds?: number; nanoseconds?: number }
    } | null
  }>(null)
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null)
  const showDevUid = Boolean(user?.uid && canShowDevUid)
  const accountLimited =
    Boolean(accountInfo && accountInfo.usage.plan === "free" && !accountInfo.isQaUser)


  const handleSave = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setSaveStatus("error")
      setSaveFeedback(t("account.profile.saveError"))
      return
    }

    setSaveStatus("saving")
    try {
      updatePrefs({ firstName: trimmedName })
      setSaveStatus("success")
      setSaveFeedback(t("account.profile.saveSuccess"))
    } catch (error) {
      console.error("[v0] Failed to save profile", error)
      setSaveStatus("error")
      setSaveFeedback(t("account.profile.saveError"))
    } finally {
      window.setTimeout(() => {
        setSaveStatus("idle")
        setSaveFeedback(null)
      }, 2500)
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert(t("account.profile.invalidFileType"))
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(t("account.profile.fileTooLarge"))
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        setProfilePhoto(dataUrl)
        updatePrefs({ profilePhoto: dataUrl })
        console.log("[v0] Profile photo uploaded (UI-only, stored locally)")
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoRemove = () => {
    setProfilePhoto(null)
    updatePrefs({ profilePhoto: null })
    console.log("[v0] Profile photo removed (UI-only, needs backend integration)")
  }

  useEffect(() => {
    setName(displayName)
  }, [displayName])

  useEffect(() => {
    setProfilePhoto(prefs.profilePhoto)
  }, [prefs.profilePhoto])

  useEffect(() => {
    if (!uidCopied) {
      return undefined
    }

    const timer = window.setTimeout(() => setUidCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [uidCopied])

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setDiagnostics(null)
      setDiagnosticsError(null)
      return
    }
    let isMounted = true
    const loadDiagnostics = async () => {
      try {
        const token = await getIdToken()
        if (!token) {
          return
        }
        const response = await fetch("/api/diagnostics", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const payload = await response.json()
        if (response.ok && payload?.success && payload?.data && isMounted) {
          const diagnosticsData = payload.data
          const diagnosticsDoc = diagnosticsData?.diagnostics ?? diagnosticsData ?? null
          const mergedDiagnostics = mergeDiagnosticsWithLocalFallback(diagnosticsDoc)
          setDiagnostics({
            ...diagnosticsData,
            diagnostics: mergedDiagnostics,
          })
          setDiagnosticsError(null)
        } else if (isMounted) {
          setDiagnosticsError(payload?.error?.message || t("account.diagnostics.unavailable"))
        }
      } catch (error) {
        if (isMounted) {
          setDiagnosticsError(t("account.diagnostics.loadFailed"))
        }
      }
    }

    loadDiagnostics()

    return () => {
      isMounted = false
    }
  }, [getIdToken, status, user, t])

  const hasNameChanged = name.trim() !== "" && name.trim() !== prefs.firstName

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
          setAccountInfo({
            ...payload.data,
            isQaUser: Boolean(payload.data.isQaUser),
          })
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

  const handleCopyUid = async () => {
    if (!user?.uid) {
      return
    }
    try {
      await navigator.clipboard.writeText(user.uid)
      setUidCopied(true)
    } catch {
      // ignore copy failures
    }
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900">
        <div className="container mx-auto px-4 py-12 max-w-xl">
          <Card className="rounded-3xl border border-white/30 bg-white/80 dark:bg-white/10 backdrop-blur-xl text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">
                {t("account.signInRequired.title")}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                {t("account.signInRequired.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/auth/signin?next=/account" className="inline-flex w-full justify-center">
                <Button variant="secondary" className="w-full sm:w-auto">
                  {t("account.signInRequired.action")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

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
                    {(user?.photoURL || profilePhoto) && (
                      <AvatarImage src={user?.photoURL ?? profilePhoto ?? "/placeholder.svg"} alt={displayName} />
                    )}
                    <AvatarFallback className="bg-purple-600 text-white text-2xl">
                      {displayName.charAt(0)}
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
                {showDevUid && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-white/5 p-2">
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {t("account.profile.uidLabel")}:{" "}
                      <span className="font-mono text-xs text-gray-900 dark:text-white">
                        {user?.uid}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={handleCopyUid}
                    >
                      {uidCopied ? t("account.profile.uidCopied") : t("account.profile.copyUid")}
                    </Button>
                  </div>
                )}
              </div>
                <Button
                  onClick={handleSave}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={!hasNameChanged || saveStatus === "saving"}
                >
                  {t("account.profile.saveChanges")}
                </Button>
                {saveFeedback && (
                  <p
                    className={`text-sm ${
                      saveStatus === "success" ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {saveFeedback}
                  </p>
                )}
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
                {accountLimited
                  ? `${accountInfo?.usage.currentMonthUsage}/${accountInfo?.usage.limit ?? 0}`
                  : t("account.billing.unlimitedDrafts")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {accountInfo?.plan === "free" && accountLimited && (
                <Button onClick={handleUpgrade} disabled={billingAction === "upgrade"}>
                  {t("account.billing.upgrade")}
                </Button>
              )}
              <Button variant="outline" onClick={handleManage} disabled={billingAction === "manage"}>
                {t("account.billing.manage")}
              </Button>
            </div>
            {accountLimited &&
              accountInfo?.usage.remaining !== null &&
              accountInfo?.usage.remaining === 0 && (
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

          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  {t("account.diagnostics.title")}
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  {t("account.diagnostics.description")}
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-3">
              {diagnosticsError && (
                <p className="text-sm text-red-600 dark:text-red-300">{diagnosticsError}</p>
              )}
              {!diagnosticsError && !diagnostics && (
                <p className="text-sm text-gray-600 dark:text-gray-300">Loading diagnostics…</p>
              )}
              {diagnostics && (
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("account.diagnostics.primaryModel")}
                    </p>
                    <p className="font-semibold">{diagnostics.models.primary ?? "not configured"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("account.diagnostics.fallbackModel")}
                    </p>
                    <p className="font-semibold">{diagnostics.models.fallback ?? "none"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("account.diagnostics.planLabel")}
                    </p>
                    <p className="font-semibold capitalize">{diagnostics.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("account.diagnostics.usageLabel")}
                    </p>
                    <p className="font-semibold">
                      {diagnostics.usage.currentMonthUsage}/
                      {diagnostics.usage.limit ?? diagnostics.usage.currentMonthUsage}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("account.diagnostics.lastModelLabel")}
                    </p>
                    <p className="font-semibold">{diagnostics.diagnostics?.lastModelUsed ?? "n/a"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("account.diagnostics.lastErrorLabel")}
                    </p>
                    <p className="font-semibold">{diagnostics.diagnostics?.lastErrorCode ?? "none"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("diagnostics.lastRunLabel")}
                    </p>
                    <p className="font-semibold">
                      {formatDiagnosticsLastRun(
                        diagnostics.diagnostics?.lastRunAt,
                        formatDate,
                      ) ?? t("diagnostics.lastRunNever")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
