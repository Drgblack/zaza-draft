"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Heart,
  Zap,
  Check,
  BarChart3,
  FileText,
  BookOpen,
} from "lucide-react"
import { useOnboarding } from "@/contexts/onboarding-context"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/lib/auth/hooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function OnboardingModal() {
  const router = useRouter()
  const { data, updateData, completeStep, skipOnboarding, shouldShowOnboarding } = useOnboarding()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDraft, setGeneratedDraft] = useState("")

  const totalSteps = 5

  if (!shouldShowOnboarding) return null

  const handleNext = () => {
    completeStep(currentStep)
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    skipOnboarding()
  }

  const handleComplete = () => {
    updateData({ hasCompletedOnboarding: true })
    skipOnboarding()
    const destination = user ? "/drafts" : "/auth/signup"
    router.push(destination)
  }

  const handleGenerateDraft = async () => {
    setIsGenerating(true)
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setGeneratedDraft(
      "Dear Parent/Guardian,\n\nI wanted to reach out regarding your child's progress with multiplication tables. I've noticed they're working really hard, and with a bit of extra practice at home, I'm confident they'll make great strides.\n\nI'd recommend spending 10-15 minutes each evening practicing with flashcards or online games. This consistent practice will help build their confidence and fluency.\n\nPlease don't hesitate to reach out if you have any questions or would like additional resources.\n\nWarm regards,\nSarah Johnson",
    )
    setIsGenerating(false)
    updateData({ hasTriedFirstDraft: true })
  }

  const progress = ((currentStep + 1) / (totalSteps + 1)) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Skip button */}
        {currentStep > 0 && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10"
          >
            Skip for now
          </button>
        )}

        {/* Progress bar */}
        {currentStep > 0 && (
          <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 pb-4">
            <div className="h-1 bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-8">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        )}

        <div className="p-8">
          {/* Welcome Screen */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center p-3">
                  <Image
                    src="/z-logo.png"
                    alt="Zaza Draft"
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Zaza Draft! 👋</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Your AI teaching assistant for parent communications
                </p>
              </div>

              <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                We'll help you reclaim your evenings and weekends by drafting professional, empathetic parent messages
                in seconds—while protecting your wellbeing.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
                  <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Save 3+ hours per week</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Generate drafts in seconds, not minutes</p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
                  <Heart className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Protect your boundaries</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Track and maintain work-life balance</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                  <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Write with confidence</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Professional, empathetic messages every time
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
              <Button
  onClick={() => {
    if (!user) return router.push("/auth/signup")
    handleNext()
  }}
  size="lg"
  className="w-full"
>
  Get Started
</Button>

<button
  onClick={() => {
    if (!user) return router.push("/auth/signup")
    router.push("/drafts")
  }}
  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
>
  I'll explore on my own
</button>

              </div>
            </div>
          )}

          {/* Step 1: Tell us about yourself */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tell us about yourself</h2>
                <p className="text-gray-600 dark:text-gray-400">Help us personalize your experience</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="Sarah"
                      value={data.firstName}
                      onChange={(e) => updateData({ firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Johnson"
                      value={data.lastName}
                      onChange={(e) => updateData({ lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="school">School Name</Label>
                  <Input
                    id="school"
                    placeholder="Greenfield Primary School"
                    value={data.school}
                    onChange={(e) => updateData({ school: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional - helps with context</p>
                </div>

                <div>
                  <Label>
                    What year group(s) do you teach? <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {[
                      "Reception",
                      "Year 1",
                      "Year 2",
                      "Year 3",
                      "Year 4",
                      "Year 5",
                      "Year 6",
                      "Year 7-11",
                      "Year 12-13",
                    ].map((grade) => (
                      <button
                        key={grade}
                        onClick={() => {
                          const current = data.gradeLevel
                          const updated = current.includes(grade)
                            ? current.filter((g) => g !== grade)
                            : [...current, grade]
                          updateData({ gradeLevel: updated })
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          data.gradeLevel.includes(grade)
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!data.firstName || !data.lastName || data.gradeLevel.length === 0}
                  className="flex-1"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Set your working hours */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Set your working hours</h2>
                <p className="text-gray-600 dark:text-gray-400">We'll help you maintain healthy boundaries</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-lg p-4">
                <div className="flex gap-3">
                  <Heart className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Zaza Draft tracks when you draft to help you maintain work-life balance. We'll gently remind you if
                    you're working outside your set hours.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Monday - Friday working hours</Label>
                  <div className="flex gap-3 mt-2">
                    <Input
                      type="time"
                      value={data.workingHoursStart}
                      onChange={(e) => updateData({ workingHoursStart: e.target.value })}
                    />
                    <span className="flex items-center text-gray-500">to</span>
                    <Input
                      type="time"
                      value={data.workingHoursEnd}
                      onChange={(e) => updateData({ workingHoursEnd: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Weekend drafting</Label>
                  <RadioGroup
                    value={data.weekendTracking}
                    onValueChange={(value: any) => updateData({ weekendTracking: value })}
                    className="mt-2 space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <RadioGroupItem value="track-remind" id="track-remind" />
                      <div className="flex-1">
                        <Label htmlFor="track-remind" className="font-medium cursor-pointer">
                          Track and remind me
                          <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          We'll track weekend drafts and include them in your wellbeing metrics
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <RadioGroupItem value="track-only" id="track-only" />
                      <div className="flex-1">
                        <Label htmlFor="track-only" className="font-medium cursor-pointer">
                          Track but don't remind me
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Count in metrics but no notifications
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <RadioGroupItem value="no-track" id="no-track" />
                      <div className="flex-1">
                        <Label htmlFor="no-track" className="font-medium cursor-pointer">
                          Don't track weekends
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Weekend drafts won't affect your metrics
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Choose your default tone */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose your default tone</h2>
                <p className="text-gray-600 dark:text-gray-400">You can always change this when drafting</p>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your default tone will be pre-selected when you start drafting. Choose the one that best matches your
                communication style.
              </p>

              <div className="space-y-3">
                {[
                  {
                    id: "warm",
                    name: "Warm & Encouraging",
                    description: "Supportive and positive, balancing warmth with professionalism",
                    example:
                      "I wanted to reach out to share some observations about [Student]'s progress. I've noticed they're working really hard, and with a bit of extra support, I'm confident they'll make great strides...",
                    badge: "Most Popular",
                  },
                  {
                    id: "professional",
                    name: "Professional & Neutral",
                    description: "Clear and professional, focused on facts and solutions",
                    example:
                      "I am writing regarding [Student]'s performance in [Subject]. I have observed the following areas that require attention. I would like to arrange a meeting to discuss...",
                  },
                  {
                    id: "direct",
                    name: "Direct & Clear",
                    description: "Concise and to the point, efficient communication",
                    example:
                      "I need to discuss [Student]'s [Issue]. I've noticed [Observation]. Please contact me to arrange a meeting at your earliest convenience...",
                  },
                  {
                    id: "empathetic",
                    name: "Empathetic & Supportive",
                    description: "Understanding and compassionate, especially for sensitive topics",
                    example:
                      "I wanted to reach out with care and understanding about [Situation]. I recognize this may be a challenging time, and I want you to know that we're here to support [Student] in every way we can...",
                  },
                ].map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => updateData({ defaultTone: tone.id as any })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      data.defaultTone === tone.id
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          data.defaultTone === tone.id
                            ? "border-purple-500 bg-purple-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {data.defaultTone === tone.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{tone.name}</h3>
                          {tone.badge && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                              {tone.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{tone.description}</p>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <p className="text-xs italic text-gray-600 dark:text-gray-400">{tone.example}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!data.defaultTone} className="flex-1">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Meet Zara (Interactive Tour) */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Meet Zara, your AI assistant</h2>
                <p className="text-gray-600 dark:text-gray-400">Your helpful teaching companion</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mb-4">
                  <Sparkles className="w-10 h-10 text-white animate-pulse" />
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-lg p-4 text-left">
                  <p className="text-gray-700 dark:text-gray-300">
                    Hi! I'm Zara, your AI teaching assistant. I'm here to help you craft perfect parent messages,
                    explain your metrics, and protect your wellbeing. Let me show you around!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Dashboard Metrics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track your teaching impact at a glance—time saved, consistency streak, and boundary protection.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Draft Editor</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Describe any situation, select a tone, and get a professional message in seconds.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <Heart className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Wellbeing Features</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gentle reminders to protect your boundaries and maintain work-life balance.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Templates Library</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Browse ready-made templates for common scenarios and customize them instantly.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Got it, let's try it!
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Try your first draft */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Let's create your first draft!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">Try it with a sample scenario</p>
              </div>

              {!generatedDraft ? (
                <>
                  <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        I've filled in a sample scenario for you. Click 'Generate Draft' to see how it works! This
                        usually takes 3-5 seconds.
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Scenario</Label>
                    <textarea
                      className="w-full mt-2 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[120px]"
                      defaultValue="Year 5 student is struggling with multiplication tables. Needs encouraging feedback and suggestion for practice at home."
                      readOnly
                    />
                  </div>

                  <div>
                    <Label>Tone</Label>
                    <div className="mt-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {data.defaultTone === "warm"
                          ? "Warm & Encouraging"
                          : data.defaultTone === "professional"
                            ? "Professional & Neutral"
                            : data.defaultTone === "direct"
                              ? "Direct & Clear"
                              : "Empathetic & Supportive"}
                      </span>
                    </div>
                  </div>

                  <Button onClick={handleGenerateDraft} disabled={isGenerating} size="lg" className="w-full">
                    {isGenerating ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing the situation...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Draft
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                          Your first draft is ready!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Brilliant! You can edit this directly, copy it, or regenerate with a different tone. Most
                          teachers use drafts with minimal edits.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{generatedDraft}</p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Copy to Clipboard
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Regenerate
                    </Button>
                  </div>

                  <Button onClick={handleComplete} size="lg" className="w-full">
                    Finish Setup
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}

              {!generatedDraft && (
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button variant="outline" onClick={handleComplete} className="flex-1 bg-transparent">
                    Skip to Dashboard
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
