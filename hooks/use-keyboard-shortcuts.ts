"use client"

import { useEffect, useCallback, useState } from "react"
import { useRouter } from "next/navigation"

export function useKeyboardShortcuts() {
  const router = useRouter()
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [gPressed, setGPressed] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA"

      // Global shortcuts (work everywhere except in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault()
        setIsShortcutsModalOpen(true)
        return
      }

      if (e.key === "?" && !isInput) {
        e.preventDefault()
        setIsShortcutsModalOpen(true)
        return
      }

      if (e.key === "Escape") {
        setIsShortcutsModalOpen(false)
        setGPressed(false)
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault()
        const sidebar = document.querySelector("aside")
        if (sidebar) {
          sidebar.classList.toggle("hidden")
        }
        return
      }

      // Navigation shortcuts (G then key)
      if (e.key === "g" && !isInput && !gPressed) {
        setGPressed(true)
        setTimeout(() => setGPressed(false), 1000)
        return
      }

      if (gPressed && !isInput) {
        switch (e.key) {
          case "h":
            router.push("/")
            setGPressed(false)
            break
          case "a":
            router.push("/analytics")
            setGPressed(false)
            break
          case "t":
            router.push("/templates")
            setGPressed(false)
            break
          case "s":
            router.push("/settings")
            setGPressed(false)
            break
          case "d":
            router.push("/drafts")
            setGPressed(false)
            break
        }
      }

      // Settings shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault()
        router.push("/settings")
        return
      }
    },
    [router, gPressed],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return { isShortcutsModalOpen, setIsShortcutsModalOpen }
}
