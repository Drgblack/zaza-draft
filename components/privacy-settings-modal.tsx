"use client"

import { useState, useEffect } from "react"
import { Shield, Database, Eye, Download, Trash2, X, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"

interface PrivacySettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PrivacySettingsModal({ isOpen, onClose }: PrivacySettingsModalProps) {
  const [shareData, setShareData] = useState(true)
  const [showInsights, setShowInsights] = useState(true)
  const [showWellbeingInsights, setShowWellbeingInsights] = useState(true)

  useEffect(() => {
    const savedShowWellbeing = localStorage.getItem("show_wellbeing_insights")
    if (savedShowWellbeing !== null) {
      setShowWellbeingInsights(savedShowWellbeing === "true")
    }
  }, [])

  const handleWellbeingToggle = (checked: boolean) => {
    setShowWellbeingInsights(checked)
    localStorage.setItem("show_wellbeing_insights", String(checked))

    // Trigger a custom event to notify components of the change
    window.dispatchEvent(new CustomEvent("wellbeingSettingsChanged", { detail: { enabled: checked } }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Privacy Settings</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Data Sharing Toggles */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Data Preferences</h3>

            <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Share anonymized usage data</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Help us improve Zaza by sharing how you use the app. We never collect message content, student
                    names, or personal information.
                  </p>
                </div>
                <Switch checked={shareData} onCheckedChange={setShareData} />
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Show insights dashboard</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Display your personal analytics and teaching impact metrics.
                  </p>
                </div>
                <Switch checked={showInsights} onCheckedChange={setShowInsights} />
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Show wellbeing insights on home screen
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Display progress metrics and contextual tips on the main editor page.
                  </p>
                </div>
                <Switch checked={showWellbeingInsights} onCheckedChange={handleWellbeingToggle} />
              </div>
            </Card>
          </div>

          {/* Data Management */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Data Management</h3>

            <div className="grid gap-3">
              <button className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Download your data</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Export all your data as CSV</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              <button className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">View data we collect</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">See what information we store</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              <button className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-red-600 dark:text-red-400">Delete all my data</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Permanently remove your information</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Legal Links */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4 text-sm">
              <a
                href="https://www.zazatechnologies.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:underline"
              >
                Privacy Policy
              </a>
              <a href="/terms" className="text-purple-600 dark:text-purple-400 hover:underline">
                Terms of Service
              </a>
              <a href="/gdpr" className="text-purple-600 dark:text-purple-400 hover:underline">
                GDPR Compliance
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>Save Changes</Button>
        </div>
      </div>
    </div>
  )
}
