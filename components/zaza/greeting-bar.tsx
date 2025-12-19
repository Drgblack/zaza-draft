"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { PanelRightClose, PanelRightOpen, Settings, User, UserX } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"
import { usePersonalization } from "@/hooks/use-personalization"

interface GreetingBarProps {
  name: string
  subtitle?: string
  onToggleAIPanel: () => void
  aiPanelVisible: boolean
}

export function GreetingBar({ name, subtitle, onToggleAIPanel, aiPanelVisible }: GreetingBarProps) {
  const { t } = useLocale()
  const { showPersonalizedGreeting, setShowPersonalizedGreeting } = usePersonalization()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (showPersonalizedGreeting && name) {
      if (hour < 12) return t("greeting.named", { name }).replace("{name}", name)
      if (hour < 18) return t("greetingAfternoon", { name })
      return t("greetingEvening", { name })
    }
    return t("greeting.generic")
  }

  return (
    <div className="px-6 py-4 border-b border-[var(--greeting-border)] bg-[var(--greeting-bg)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                aria-label="Personalization settings"
              >
                <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-[14px]">
              <DropdownMenuItem
                onClick={() => setShowPersonalizedGreeting(!showPersonalizedGreeting)}
                className="cursor-pointer rounded-[12px]"
              >
                {showPersonalizedGreeting ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Hide my name
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Show my name
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-muted-foreground text-xs cursor-default rounded-[12px]">
                <Settings className="h-3 w-3 mr-2" />
                More settings coming soon
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div>
            <h2 className="text-base font-medium fade-in-greeting">
              {getGreeting()} <span className="wave-animation">👋</span>
            </h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleAIPanel}
                aria-pressed={aiPanelVisible}
                aria-label={aiPanelVisible ? t("hideAiPanel") : t("showAiPanel")}
                className="rounded-[14px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {aiPanelVisible ? (
                  <>
                    <PanelRightClose className="h-4 w-4 mr-2" />
                    {t("hideAiPanel")}
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="h-4 w-4 mr-2" />
                    {t("showAiPanel")}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alt + ]</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
