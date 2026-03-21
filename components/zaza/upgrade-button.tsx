"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLocale } from "@/hooks/use-locale"
import { useToast } from "@/hooks/use-toast"

interface UpgradeButtonProps {
  snippetsUsed: number
  snippetsLimit: number
  className?: string
  variant?: "default" | "compact"
  userSignedIn?: boolean
  userPlan?: "free" | "pro"
}

export function UpgradeButton({
  snippetsUsed,
  snippetsLimit,
  className,
  variant = "default",
  userSignedIn = false,
  userPlan = "free",
}: UpgradeButtonProps) {
  const { t } = useLocale()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shouldPulse = snippetsLimit > 1 && snippetsUsed === snippetsLimit - 1

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!userSignedIn) {
        router.push("/auth/signin?next=/")
      } else if (userPlan === "free") {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          throw new Error("Failed to create checkout session")
        }

        const { url } = await response.json()
        if (url) {
          window.location.href = url
        }
      } else {
        const response = await fetch("/api/stripe/portal", {
          method: "GET",
        })

        if (!response.ok) {
          throw new Error("Failed to get portal URL")
        }

        const { url } = await response.json()
        if (url) {
          window.location.href = url
        }
      }
    } catch (err) {
      console.error("[v0] Upgrade error:", err)
      setError("Couldn't start checkout. Please try again.")
      toast({
        title: "Error",
        description: "Couldn't start checkout. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const upgradeState = isLoading
    ? "loading"
    : error
      ? "error"
      : !userSignedIn
        ? "signed_out"
        : userPlan === "free"
          ? "free"
          : "pro"

  if (variant === "compact") {
    return (
      <Button
        size="sm"
        disabled={isLoading}
        className={cn(
          "h-7 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-3 text-white text-xs font-medium shadow-sm hover:opacity-95 transition-all disabled:opacity-50",
          shouldPulse && !isLoading && "animate-[pulse_1s_ease-in-out_1]",
          className,
        )}
        onClick={handleClick}
        data-testid="upgrade-btn"
        data-upgrade-state={upgradeState}
      >
        {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
        {isLoading ? "Loading..." : "Upgrade"}
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      disabled={isLoading}
      className={cn(
        "h-8 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 text-white text-sm font-medium shadow-sm hover:opacity-95 transition-all disabled:opacity-50",
        shouldPulse && !isLoading && "animate-[pulse_1s_ease-in-out_1]",
        className,
      )}
      onClick={handleClick}
      data-testid="upgrade-btn"
      data-upgrade-state={upgradeState}
    >
      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
      {isLoading ? "Loading..." : "Upgrade to Pro"}
    </Button>
  )
}
