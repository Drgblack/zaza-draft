import * as React from "react"
import { cn } from "@/lib/utils"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

type Option = {
  value: string
  label: string
  icon?: React.ReactNode
  ariaLabel?: string
}

interface SegmentedControlProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  disabled,
}: SegmentedControlProps) {
  const prefersReduced = usePrefersReducedMotion()
  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (disabled) return
    const count = options.length
    let targetIdx = idx

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      targetIdx = (idx + 1) % count
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      targetIdx = (idx - 1 + count) % count
    }

    if (targetIdx !== idx) {
      buttonRefs.current[targetIdx]?.focus()
      onChange(options[targetIdx].value)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex overflow-hidden rounded-full border border-[var(--color-border)] bg-transparent p-1", className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        const baseClasses = cn(
          "flex-1 min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold transition-transform duration-[var(--transition-standard)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400 focus-visible:ring-offset-2",
          "flex gap-2 text-center",
          prefersReduced ? "transition-none" : "motion-safe:transform motion-safe:transition",
        )
        const stateClasses = selected
          ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_10px_25px_rgba(124,58,237,0.25)]"
          : "bg-transparent text-[var(--color-foreground)] hover:bg-white/10"
        return (
          <button
            key={option.value}
            ref={(el) => (buttonRefs.current[index] = el)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={option.ariaLabel ?? option.label}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            className={cn(baseClasses, stateClasses)}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.icon && <span className="text-base">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
