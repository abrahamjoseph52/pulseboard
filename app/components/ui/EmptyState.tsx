import type {
  ReactNode,
} from "react"

import {
  ArrowRight,
  Inbox,
  Sparkles,
} from "lucide-react"

import Button from "./Button"

type EmptyStateProps = {
  title: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "group relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden",
        "rounded-[2rem] border border-dashed border-(--border-strong)",
        "bg-linear-to-br from-violet-500/[0.04] via-(--background-soft) to-indigo-500/[0.03]",
        "px-6 py-12 text-center",
        "transition-all duration-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl opacity-70"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 left-1/4 h-36 w-36 rounded-full bg-indigo-500/8 blur-3xl"
      />

      <div className="relative z-10">
        {/* Icon */}
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-3xl bg-violet-400/5 transition-transform duration-300 group-hover:scale-110"
          />

          <span className="relative z-10">
            {icon ?? (
              <Inbox className="h-7 w-7" />
            )}
          </span>
        </div>

        {/* Label */}
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-(--surface) px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-(--foreground-subtle)">
          <Sparkles className="h-3 w-3 text-violet-300" />
          Nothing here yet
        </div>

        {/* Heading */}
        <h3 className="mt-4 text-xl font-black tracking-tight text-(--foreground)">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--foreground-muted)">
            {description}
          </p>
        )}

        {/* Action */}
        {actionLabel &&
          onAction && (
            <div className="mt-6">
              <Button
                onClick={
                  onAction
                }
                className="shadow-lg shadow-violet-500/15"
              >
                {actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
      </div>
    </div>
  )
}