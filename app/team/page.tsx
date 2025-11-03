"use client"

import { useState } from "react"
import { ChevronLeft, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"

export default function TeamPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [hasTeamMembers] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {t.backToDashboard}
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Team</h1>
          <p className="text-gray-600 dark:text-gray-400">Collaborate with your colleagues</p>
        </div>

        {!hasTeamMembers && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-300 mb-3">{t.emptyStates.noTeamMembers}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
              {t.emptyStates.noTeamMembersDesc}
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              {t.emptyStates.inviteTeamMember}
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
