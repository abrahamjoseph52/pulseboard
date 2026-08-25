"use client"

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react"

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"

type ButtonSize =
  | "sm"
  | "md"
  | "lg"

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    fullWidth?: boolean
  }

const variantClasses: Record<
  ButtonVariant,
  string
> = {
  primary: [
    "border border-violet-400/10",
    "bg-linear-to-r from-violet-600 via-violet-600 to-indigo-600",
    "text-white",
    "shadow-lg shadow-violet-500/20",

    "hover:from-violet-500",
    "hover:via-violet-500",
    "hover:to-indigo-500",
    "hover:-translate-y-0.5",
    "hover:shadow-xl",
    "hover:shadow-violet-500/25",

    "active:translate-y-0",
  ].join(" "),

  secondary: [
    "border border-(--border)",
    "bg-(--surface)",
    "text-(--foreground-secondary)",
    "shadow-sm",

    "hover:border-(--border-strong)",
    "hover:bg-(--surface-hover)",
    "hover:text-(--foreground)",
    "hover:-translate-y-0.5",
  ].join(" "),

  outline: [
    "border border-(--border-strong)",
    "bg-transparent",
    "text-(--foreground-secondary)",

    "hover:border-violet-400/30",
    "hover:bg-violet-500/[0.06]",
    "hover:text-violet-300",
    "hover:-translate-y-0.5",
  ].join(" "),

  ghost: [
    "border border-transparent",
    "bg-transparent",
    "text-(--foreground-muted)",

    "hover:bg-(--surface-hover)",
    "hover:text-(--foreground)",
  ].join(" "),

  danger: [
    "border border-rose-400/15",
    "bg-rose-500/10",
    "text-rose-300",

    "hover:border-rose-400/25",
    "hover:bg-rose-500/15",
    "hover:-translate-y-0.5",
    "hover:shadow-lg",
    "hover:shadow-rose-500/10",
  ].join(" "),
}

const sizeClasses: Record<
  ButtonSize,
  string
> = {
  sm: [
    "min-h-9",
    "rounded-xl",
    "px-3.5",
    "text-xs",
  ].join(" "),

  md: [
    "min-h-11",
    "rounded-xl",
    "px-4.5",
    "text-sm",
  ].join(" "),

  lg: [
    "min-h-12",
    "rounded-2xl",
    "px-6",
    "text-sm",
    "sm:text-base",
  ].join(" "),
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled =
    Boolean(disabled) ||
    loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={
        loading
          ? true
          : undefined
      }
      className={[
        "group relative inline-flex items-center justify-center gap-2.5",
        "overflow-hidden",
        "font-bold tracking-[-0.01em]",
        "transition-all duration-200 ease-out",

        "focus:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-violet-400/60",
        "focus-visible:ring-offset-2",
        "focus-visible:ring-offset-(--background)",

        "disabled:pointer-events-none",
        "disabled:cursor-not-allowed",
        "disabled:opacity-55",

        "active:scale-[0.985]",

        variantClasses[
          variant
        ],

        sizeClasses[
          size
        ],

        fullWidth
          ? "w-full"
          : "",

        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* Premium shine */}
      {variant ===
        "primary" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/[0.08] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}

      {/* Subtle hover glow */}
      {variant ===
        "primary" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-[inherit] bg-violet-500/10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
        />
      )}

      {/* Content */}
      <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
        {loading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}

        <span>
          {loading
            ? "Please wait..."
            : children}
        </span>
      </span>
    </button>
  )
}