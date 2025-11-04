"use client";
export const revalidate = 0;

import { useState, useEffect } from "react"
import {
  User,
  SettingsIcon,
  Heart,
  Bell,
  Shield,
  CreditCard,
  Loader2,
  Sparkles,
  CheckCircle,
  Keyboard,
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { Toast } from "@/components/toast"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormFieldSkeleton } from "@/components/skeletons"
import { useOnboarding } from "@/contexts/onboarding-context"
import { SuccessToast } from "@/components/success-toast"
import { MobileNav } from "@/components/mobile-nav"
import { Sidebar } from "@/components/sidebar"
import { Footer } from "@/components/footer"

export default function SettingsPage() {
  const { t } = useLanguage()
  const { toast, showToast, hideToast } = useToast()
  const { data: onboardingData, isOnboardingComplete, resumeOnboarding } = useOnboarding()
  const [activeSection, setActiveSection] = useState("profile")
  const [loadingButton, setLoadingButton] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [successToast, setSuccessToast] = useState<{
    message: string
    type?: "success" | "info" | "achievement"
    icon?: "check" | "star" | "copy" | "settings"
  } | null>(null)
  const [showZaraEncouragement, setShowZaraEncouragement] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalFormData, setOriginalFormData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (activeSection === "profile") {
      setIsLoadingProfile(true)
      const timer = setTimeout(() => {
        setIsLoadingProfile(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [activeSection])

  const handleFormChange = () => {
    setHasUnsavedChanges(true)
  }

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false)
    setSuccessToast({
      message: "Changes discarded",
      type: "info",
      icon: "check",
    })
  }

  const handleResetToDefaults = (section: string) => {
    setSuccessToast({
      message: `${section} settings reset to defaults`,
      type: "success",
      icon: "settings",
    })
  }

  const handleSaveWithFeedback = async (buttonId: string, successMessage: string, section?: string) => {
    setLoadingButton(buttonId)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    setLoadingButton(null)
    setHasUnsavedChanges(false)

    setSuccessToast({
      message: successMessage,
      type: "success",
      icon: "settings",
    })

    setTimeout(() => {
      setSuccessToast({
        message: `${successMessage} - Undo available`,
        type: "info",
        icon: "check",
      })
    }, 100)

    if (section === "wellbeing") {
      setTimeout(() => {
        setShowZaraEncouragement(true)
      }, 500)
    }
  }

  const sections = [
    { id: "profile", label: t.settingsPage.navProfile, icon: User },
    { id: "preferences", label: t.settingsPage.navPreferences, icon: SettingsIcon },
    { id: "wellbeing", label: t.settingsPage.navWellbeing, icon: Heart },
    { id: "notifications", label: t.settingsPage.navNotifications, icon: Bell },
    { id: "smart-suggestions", label: "Smart Suggestions", icon: Sparkles },
    { id: "keyboard-shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
    { id: "data-privacy", label: t.settingsPage.navDataPrivacy, icon: Shield },
    { id: "billing", label: t.settingsPage.navBilling, icon: CreditCard },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col lg:flex-row pb-16 lg:pb-0">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {toast && <Toast message={toast} onClose={hideToast} />}

          {successToast && (
            <SuccessToast
              message={successToast.message}
              type={successToast.type}
              icon={successToast.icon}
              onClose={() => setSuccessToast(null)}
            />
          )}

          {!isOnboardingComplete && (
            <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="font-medium text-purple-900 dark:text-purple-100">Complete your profile setup</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Unlock all features by finishing your onboarding
                    </p>
                  </div>
                </div>
                <Button onClick={resumeOnboarding} size="sm">
                  Resume Setup
                </Button>
              </div>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t.settingsPage.pageTitle}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
            {t.settingsPage.pageSubtitle}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="lg:col-span-1">
              <nav className="hidden lg:block space-y-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-2">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                    </button>
                  )
                })}
              </nav>

              <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-2">
                <div className="flex gap-2 min-w-max">
                  {sections.map((section) => {
                    const Icon = section.icon
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                          activeSection === section.id
                            ? "bg-purple-600 text-white"
                            : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {section.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6 lg:p-8">
                {activeSection === "profile" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t.settingsPage.profileTitle}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t.settingsPage.profileSubtitle}</p>
                    </div>

                    {isLoadingProfile ? (
                      <div className="space-y-4">
                        <FormFieldSkeleton />
                        <FormFieldSkeleton />
                        <FormFieldSkeleton />
                        <div className="animate-pulse">
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex gap-2">
                              <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                              <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                          </div>
                        </div>
                        <FormFieldSkeleton />
                        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fullName">{t.settingsPage.fullName}</Label>
                          <Input
                            id="fullName"
                            placeholder={t.settingsPage.fullNamePlaceholder}
                            defaultValue="Sarah Johnson"
                            onChange={handleFormChange}
                            className="w-full min-h-[44px] text-base"
                            style={{ fontSize: "16px" }}
                          />
                        </div>

                        <div>
                          <Label htmlFor="email">{t.settingsPage.email}</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder={t.settingsPage.emailPlaceholder}
                            defaultValue="sarah.johnson@school.edu"
                            onChange={handleFormChange}
                            className="w-full min-h-[44px] text-base"
                            style={{ fontSize: "16px" }}
                          />
                        </div>

                        <div>
                          <Label htmlFor="school">{t.settingsPage.school}</Label>
                          <Input
                            id="school"
                            placeholder={t.settingsPage.schoolPlaceholder}
                            defaultValue="Riverside Secondary School"
                            onChange={handleFormChange}
                            className="w-full min-h-[44px] text-base"
                            style={{ fontSize: "16px" }}
                          />
                        </div>

                        <div>
                          <Label>{t.settingsPage.profilePhoto}</Label>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                              SJ
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveWithFeedback("change-photo", t.photoUploaded)}
                                disabled={loadingButton === "change-photo"}
                              >
                                {loadingButton === "change-photo" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {t.settingsPage.changePhoto}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveWithFeedback("remove-photo", t.photoRemoved)}
                                disabled={loadingButton === "remove-photo"}
                              >
                                {loadingButton === "remove-photo" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {t.settingsPage.removePhoto}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>{t.settingsPage.subjects}</Label>
                          <div className="mt-2 space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.emptyStates.noSubjects}</p>
                            <Button variant="outline" size="sm">
                              {t.settingsPage.addCustomSubject}
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          {hasUnsavedChanges && (
                            <Button variant="outline" onClick={handleDiscardChanges} className="flex-1 bg-transparent">
                              Discard Changes
                            </Button>
                          )}
                          <Button
                            onClick={() => handleSaveWithFeedback("save-profile", "Profile updated successfully!")}
                            disabled={loadingButton === "save-profile"}
                            className={hasUnsavedChanges ? "flex-1" : "w-full"}
                          >
                            {loadingButton === "save-profile" ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t.settingsPage.saving}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t.settingsPage.saveChanges}
                              </>
                            )}
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetToDefaults("Profile")}
                          className="text-gray-600 dark:text-gray-400"
                        >
                          Reset to Defaults
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "wellbeing" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t.settingsPage.wellbeingTitle}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t.settingsPage.wellbeingSubtitle}</p>
                    </div>

                    <div className="space-y-4 pb-6 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Zara Wellbeing Support</h3>

                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="wellbeing-checkins" className="mt-1" defaultChecked />
                        <div>
                          <label
                            htmlFor="wellbeing-checkins"
                            className="font-medium text-gray-900 dark:text-white cursor-pointer"
                          >
                            Enable wellbeing check-ins
                          </label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Zara can proactively check in when she notices concerning patterns (e.g., frequent
                            late-night drafting)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="boundary-reminders" className="mt-1" defaultChecked />
                        <div>
                          <label
                            htmlFor="boundary-reminders"
                            className="font-medium text-gray-900 dark:text-white cursor-pointer"
                          >
                            Boundary reminders
                          </label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Get gentle nudges when working outside your set hours
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="wins-journal" className="mt-1" />
                        <div>
                          <label
                            htmlFor="wins-journal"
                            className="font-medium text-gray-900 dark:text-white cursor-pointer"
                          >
                            Wins journal
                          </label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Save positive moments to look back on later
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-green-500 p-8 text-white">
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
                          {t.settingsPage.shieldNew}
                        </span>
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="relative">
                            <Shield className="w-12 h-12" />
                            <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-yellow-300" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold">{t.settingsPage.shieldHeading}</h3>
                            <p className="text-purple-100">{t.settingsPage.shieldSubheading}</p>
                          </div>
                        </div>

                        <p className="text-white/90 mb-6 leading-relaxed">{t.settingsPage.shieldDescription}</p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                          {[
                            t.settingsPage.shieldFeature1,
                            t.settingsPage.shieldFeature2,
                            t.settingsPage.shieldFeature3,
                            t.settingsPage.shieldFeature4,
                            t.settingsPage.shieldFeature5,
                          ].map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span className="text-lg">âœ¨</span>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-3 mb-4">
                          <Button variant="secondary" size="lg">
                            {t.settingsPage.shieldLearnMore}
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                          >
                            {t.settingsPage.shieldWatchDemo}
                          </Button>
                        </div>

                        <p className="text-xs text-white/70 italic">{t.settingsPage.shieldNote}</p>
                      </div>
                    </div>

                    {showZaraEncouragement && (
                      <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg p-4 animate-in fade-in duration-300">
                        <div className="flex items-start gap-3">
                          <Heart className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                              Nice! You're taking steps to protect your personal time. Your wellbeing matters! ðŸ’š
                            </p>
                          </div>
                          <button
                            onClick={() => setShowZaraEncouragement(false)}
                            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                          >
                            Ã—
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{t.settingsPage.workingHours}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{t.settingsPage.workingHoursDesc}</p>
                        </div>
                        <div className="flex gap-2">
                          <div>
                            <Label htmlFor="work-start-time" className="sr-only">
                              Work start time
                            </Label>
                            <Input
                              id="work-start-time"
                              type="time"
                              defaultValue="08:00"
                              className="w-32"
                              aria-label="Work start time"
                            />
                          </div>
                          <div>
                            <Label htmlFor="work-end-time" className="sr-only">
                              Work end time
                            </Label>
                            <Input
                              id="work-end-time"
                              type="time"
                              defaultValue="16:00"
                              className="w-32"
                              aria-label="Work end time"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{t.settingsPage.weekendDrafting}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t.settingsPage.weekendDraftingDesc}
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex gap-3">
                        {hasUnsavedChanges && (
                          <Button variant="outline" onClick={handleDiscardChanges} className="flex-1 bg-transparent">
                            Discard Changes
                          </Button>
                        )}
                        <Button
                          onClick={() =>
                            handleSaveWithFeedback("save-wellbeing", "Work-life balance settings updated!", "wellbeing")
                          }
                          disabled={loadingButton === "save-wellbeing"}
                          className={hasUnsavedChanges ? "flex-1" : "w-full"}
                        >
                          {loadingButton === "save-wellbeing" ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t.settingsPage.saving}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t.settingsPage.saveChanges}
                            </>
                          )}
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetToDefaults("Wellbeing")}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        Reset to Defaults
                      </Button>
                    </div>
                  </div>
                )}

                {activeSection === "notifications" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t.settingsPage.notificationsTitle}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t.settingsPage.notificationsSubtitle}</p>
                    </div>

                    {/* In-App Notifications */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">In-App Notifications</h3>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Achievement notifications</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Get notified when you reach milestones and unlock achievements
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Wellbeing reminders</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Gentle reminders about work-life balance and boundaries
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Tips & suggestions</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Helpful tips based on your usage patterns
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Product updates</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Stay informed about new features and improvements
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Usage limit alerts</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Get notified when approaching your monthly draft limit
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>

                    {/* Email Notifications */}
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h3>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Weekly summary report</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Receive your weekly analytics and insights via email
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Milestone achievements</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Get an email when you reach important milestones
                            </p>
                          </div>
                          <Switch />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Wellbeing reminders</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Email reminders about maintaining healthy boundaries
                            </p>
                          </div>
                          <Switch />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Product updates</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Important product announcements and new features
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Tips & best practices</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Weekly tips to help you get the most out of Zaza Draft
                            </p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    </div>

                    {/* Quiet Hours */}
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quiet Hours</h3>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="quiet-hours-start">Don't send notifications between</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <div>
                              <Label htmlFor="quiet-hours-start" className="sr-only">
                                Quiet hours start time
                              </Label>
                              <Input
                                id="quiet-hours-start"
                                type="time"
                                defaultValue="21:00"
                                className="w-32"
                                aria-label="Quiet hours start time"
                              />
                            </div>
                            <span className="text-gray-600 dark:text-gray-400">and</span>
                            <div>
                              <Label htmlFor="quiet-hours-end" className="sr-only">
                                Quiet hours end time
                              </Label>
                              <Input
                                id="quiet-hours-end"
                                type="time"
                                defaultValue="07:00"
                                className="w-32"
                                aria-label="Quiet hours end time"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Respect my working hours</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Use working hours from Wellbeing settings
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {hasUnsavedChanges && (
                        <Button variant="outline" onClick={handleDiscardChanges} className="flex-1 bg-transparent">
                          Discard Changes
                        </Button>
                      )}
                      <Button
                        onClick={() =>
                          handleSaveWithFeedback("save-notifications", "Notification preferences updated!")
                        }
                        disabled={loadingButton === "save-notifications"}
                        className={hasUnsavedChanges ? "flex-1" : "w-full"}
                      >
                        {loadingButton === "save-notifications" ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t.settingsPage.saving}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {t.settingsPage.saveChanges}
                          </>
                        )}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetToDefaults("Notifications")}
                      className="text-gray-600 dark:text-gray-400"
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                )}

                {activeSection === "smart-suggestions" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Smart Suggestions</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Control how Zaza Draft provides intelligent suggestions and recommendations
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Show template suggestions while typing
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Get real-time template suggestions as you describe your situation
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Auto-detect communication type</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Automatically identify if you're writing about behavior, academics, etc.
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Recommend tones based on situation
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Get tone suggestions that match your communication type
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Auto-detect language</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Automatically detect if you're typing in a different language
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Show pattern-based insights</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Get helpful insights based on your usage patterns
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Allow Zara to offer proactive help
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Let Zara appear with helpful suggestions when you seem stuck
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Personalize suggestions based on my usage
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Learn from your preferences to provide better suggestions over time
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                      <Label>Suggestion frequency</Label>
                      <div className="mt-3">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          defaultValue="3"
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
                          <span>Fewer suggestions</span>
                          <span>More suggestions</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {hasUnsavedChanges && (
                        <Button variant="outline" onClick={handleDiscardChanges} className="flex-1 bg-transparent">
                          Discard Changes
                        </Button>
                      )}
                      <Button
                        onClick={() =>
                          handleSaveWithFeedback("save-suggestions", "Smart suggestions settings updated!")
                        }
                        disabled={loadingButton === "save-suggestions"}
                        className={hasUnsavedChanges ? "flex-1" : "w-full"}
                      >
                        {loadingButton === "save-suggestions" ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t.settingsPage.saving}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {t.settingsPage.saveChanges}
                          </>
                        )}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem("usagePatterns")
                        localStorage.removeItem("smartSuggestionsSettings")
                        setSuccessToast({
                          message: "Suggestion preferences reset",
                          type: "success",
                          icon: "settings",
                        })
                      }}
                      className="text-gray-600 dark:text-gray-400"
                    >
                      Reset Suggestion Preferences
                    </Button>
                  </div>
                )}

                {activeSection === "keyboard-shortcuts" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Keyboard Shortcuts</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Master these shortcuts to work faster and more efficiently
                      </p>
                    </div>

                    {/* General Shortcuts */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">General</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Open search</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Quickly search drafts and templates
                            </p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜K
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Open Zara chat</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Get help from your AI assistant</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜K
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Show keyboard shortcuts</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">View all available shortcuts</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜/
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Close modals/dropdowns</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Dismiss any open overlay</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            Esc
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Draft Editor Shortcuts */}
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Draft Editor</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Generate draft</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Create a draft from your description
                            </p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜â†µ
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Bold text</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Make selected text bold</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜B
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Italic text</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Make selected text italic</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜I
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Underline text</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Underline selected text</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜U
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Undo</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Undo last change</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜Z
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Redo</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Redo last undone change</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜â‡§Z
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Cycle through tones</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Switch between tone options</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            Tab
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Shortcuts */}
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Navigation</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Go to templates</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Jump to templates page</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜T
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Save draft</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Save current draft (prevented by default)
                            </p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            âŒ˜S
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Zara Chat Shortcuts */}
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zara Chat</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Send message</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Send your message to Zara</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            Enter
                          </kbd>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">New line in message</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Add a line break without sending</p>
                          </div>
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                            â‡§â†µ
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Pro Tips */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 mt-6">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Pro Tips</h4>
                          <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                            <li>â€¢ Most shortcuts work with Ctrl on Windows/Linux instead of âŒ˜</li>
                            <li>â€¢ Press âŒ˜/ anytime to see this shortcuts reference</li>
                            <li>â€¢ Keyboard shortcuts work even when modals are open</li>
                            <li>â€¢ Tab through tone options to quickly find the right one</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection !== "profile" &&
                  activeSection !== "wellbeing" &&
                  activeSection !== "notifications" &&
                  activeSection !== "smart-suggestions" &&
                  activeSection !== "keyboard-shortcuts" && (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">{activeSection} section coming soon...</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </main>

        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      <MobileNav />
    </div>
  )
}






