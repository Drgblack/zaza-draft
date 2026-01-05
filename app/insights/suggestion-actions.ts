type ReminderToastProps = {
  title: string
  description: string
}

export const REMINDER_BUTTON_CLASS =
  "w-full bg-white/20 backdrop-blur-md border-purple-200 dark:border-purple-400/30 text-gray-900 dark:text-white hover:bg-white/30 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white focus-visible:border-purple-300 focus-visible:ring-2 focus-visible:ring-purple-200/60 transition-all duration-300 shadow-sm"

interface RouterWithPush {
  push: (url: string) => void
}

export function handleUpdatePreferences(router: RouterWithPush) {
  router.push("/settings")
}

export function handleGetStarted(router: RouterWithPush) {
  router.push("/class-brain")
}

export function handleSetReminder(
  toastFn: (props: ReminderToastProps) => void,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  toastFn({
    title: t("insights.suggestion.reminderToastTitle"),
    description: t("insights.suggestion.reminderToastDescription"),
  })
}
