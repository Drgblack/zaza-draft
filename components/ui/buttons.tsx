import * as React from "react"
import { cn } from "@/lib/utils"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

const BASE_STYLES =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg text-sm transition-all duration-[var(--transition-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"

const TOUCH_TARGET = "min-h-[44px] min-w-[44px] px-5 py-3"

const shadowStyles = {
  primary: "shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft),0_10px_25px_rgba(124,58,237,0.35)]",
}

const stateStyles = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border border-transparent hover:bg-[color-mix(in srgb, var(--color-primary), black 15%)] active:scale-[0.98]",
  secondary:
    "bg-[var(--color-neutral)] text-[var(--color-neutral-foreground)] border border-transparent hover:bg-[color-mix(in srgb, var(--color-neutral), black 10%)] active:scale-[0.98]",
  tertiary:
    "bg-transparent text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-white/10 active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--color-foreground)] border border-transparent hover:bg-white/10 active:scale-[0.98]",
}

const reducedMotionStyles = "motion-safe:transition none motion-safe:transform none"

type ButtonVariant = keyof typeof stateStyles

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

function Spinner({ reduced }: { reduced: boolean }) {
  return (
    <span
      className={cn(
        "h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent",
        reduced ? "animate-none" : "animate-spin",
      )}
      aria-hidden
      role="presentation"
    />
  )
}

function Button({
  variant = "primary",
  loading,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const isDisabled = disabled || loading
  const classes = cn(
    BASE_STYLES,
    TOUCH_TARGET,
    stateStyles[variant],
    !prefersReducedMotion && !isDisabled && shadowStyles[variant],
    reducedMotionStyles,
    className,
  )

  return (
    <button
      {...props}
      className={`${classes}`}
      disabled={isDisabled}
      aria-busy={loading ? true : undefined}
    >
      {loading && <Spinner reduced={prefersReducedMotion} />}
      {children}
    </button>
  )
}

/* PrimaryButton uses the brand color for high emphasis actions. */
export function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />
}

/* SecondaryButton is for medium-emphasis actions. */
export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />
}

/* TertiaryButton is for neutral text actions with a subtle border hint. */
export function TertiaryButton(props: ButtonProps) {
  return <Button variant="tertiary" {...props} />
}

/* GhostButton is ultra-lightweight for inline or link-like uses. */
export function GhostButton(props: ButtonProps) {
  return <Button variant="ghost" {...props} />
}
