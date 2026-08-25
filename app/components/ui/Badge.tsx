import type {
  HTMLAttributes,
  ReactNode,
} from "react"

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"

type BadgeSize =
  | "sm"
  | "md"

type BadgeProps =
  HTMLAttributes<HTMLSpanElement> & {
    children: ReactNode
    variant?: BadgeVariant
    size?: BadgeSize
    dot?: boolean
  }

const variantClasses: Record<
  BadgeVariant,
  string
> = {
  default:
    "border-(--border) bg-(--background-soft) text-(--foreground-secondary)",

  success:
    "border-emerald-400/10 bg-emerald-400/10 text-emerald-300",

  warning:
    "border-amber-400/10 bg-amber-400/10 text-amber-300",

  danger:
    "border-rose-400/10 bg-rose-400/10 text-rose-300",

  info:
    "border-blue-400/10 bg-blue-400/10 text-blue-300",

  purple:
    "border-violet-400/10 bg-violet-500/10 text-violet-300",
}

const dotClasses: Record<
  BadgeVariant,
  string
> = {
  default:
    "bg-(--foreground-subtle)",

  success:
    "bg-emerald-400",

  warning:
    "bg-amber-400",

  danger:
    "bg-rose-400",

  info:
    "bg-blue-400",

  purple:
    "bg-violet-400",
}

const sizeClasses: Record<
  BadgeSize,
  string
> = {
  sm:
    "px-2.5 py-1 text-[9px] tracking-[0.12em]",

  md:
    "px-3 py-1.5 text-[10px] tracking-[0.14em]",
}

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5",
        "rounded-full border",
        "font-black uppercase",
        "transition-colors duration-200",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {dot && (
        <span
          className={[
            "relative flex h-1.5 w-1.5 shrink-0 items-center justify-center rounded-full",
            dotClasses[variant],
          ].join(" ")}
          aria-hidden="true"
        />
      )}

      <span className="truncate">
        {children}
      </span>
    </span>
  )
}