import * as React from "react"
import { cn } from "@/lib/utils"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost"

type BaseButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled"
> & {
  /**
   * Visual hierarchy of the button.
   */
  variant?: ButtonVariant
  /**
   * Shows a lightweight loading state and prevents interaction.
   */
  loading?: boolean
  /**
   * Disabled state. When true, interaction is prevented.
   */
  disabled?: boolean
}

const BASE_STYLES =
  // Layout + typography
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap " +
  // Interaction + motion
  "transition-all duration-[var(--transition-standard)] " +
  // Focus (kept high-visibility for accessibility)
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500 " +
  // Disabled
  "disabled:cursor-not-allowed disabled:opacity-60"

const TOUCH_TARGET = "min-h-[44px] min-w-[44px] px-5 py-3"

/**
 * Shadow styles per variant.
 * Typed as Record<ButtonVariant, string> so indexing is always safe.
 */
const shadowStyles: Record<ButtonVariant, string> = {
  primary:
    "shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft),0_10px_25px_rgba(124,58,237,0.35)]",
  secondary: "shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft)]",
  tertiary: "shadow-none hover:shadow-none",
  ghost: "shadow-none hover:shadow-none",
}

/**
 * Visual styles per variant (surface + text + borders).
 * Keep these token-driven so the palette stays centralized in globals.css.
 */
const stateStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border border-transparent " +
    "hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] " +
    "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)]",
  tertiary:
    "bg-transparent text-[var(--color-foreground)] border border-transparent " +
    "hover:bg-white/10 active:bg-white/15",
  ghost:
    "bg-transparent text-[var(--color-foreground)] border border-[var(--color-border)] " +
    "hover:bg-white/10 active:bg-white/15",
}

const reducedMotionStyles =
  "motion-reduce:transition-none motion-reduce:hover:shadow-none motion-reduce:active:scale-100"

const pressFeedback = "active:scale-[0.98]"

function Spinner() {
  // Simple spinner that respects reduced motion via CSS class usage on the parent.
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
    />
  )
}

function BaseButton({
  className,
  variant = "primary",
  loading,
  disabled,
  children,
  ...props
}: BaseButtonProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const isDisabled = Boolean(disabled || loading)

  return (
    <button
      type="button"
      {...props}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      className={cn(
        BASE_STYLES,
        TOUCH_TARGET,
        stateStyles[variant],
        !prefersReducedMotion && !isDisabled && shadowStyles[variant],
        !prefersReducedMotion && !isDisabled && pressFeedback,
        reducedMotionStyles,
        className,
      )}
    >
      {loading ? (
        <>
          <Spinner />
          <span className="sr-only">Loading</span>
        </>
      ) : null}
      <span className={cn(loading ? "opacity-0" : "opacity-100")}>{children}</span>
    </button>
  )
}

export function PrimaryButton(props: Omit<BaseButtonProps, "variant">) {
  return <BaseButton {...props} variant="primary" />
}

export function SecondaryButton(props: Omit<BaseButtonProps, "variant">) {
  return <BaseButton {...props} variant="secondary" />
}

export function TertiaryButton(props: Omit<BaseButtonProps, "variant">) {
  return <BaseButton {...props} variant="tertiary" />
}

export function GhostButton(props: Omit<BaseButtonProps, "variant">) {
  return <BaseButton {...props} variant="ghost" />
}
