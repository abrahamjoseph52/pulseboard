import type {
  HTMLAttributes,
  ReactNode,
} from "react"

type CardProps =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode
    hover?: boolean
    padding?:
      | "none"
      | "sm"
      | "md"
      | "lg"
    glow?: boolean
    elevated?: boolean
  }

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
}

export default function Card({
  children,
  hover = false,
  padding = "md",
  glow = false,
  elevated = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        /*
         * Base structure
         */
        "relative overflow-hidden rounded-3xl",

        /*
         * Surface
         */
        "border border-(--border)",
        "bg-(--surface)",

        /*
         * Depth
         */
        elevated
          ? "shadow-(--shadow-md)"
          : "shadow-(--shadow-sm)",

        /*
         * Interaction
         */
        "transition-all duration-200 ease-out",

        hover
          ? [
              "cursor-pointer",
              "hover:-translate-y-1",
              "hover:border-(--border-strong)",
              "hover:bg-(--surface-hover)",
              "hover:shadow-(--shadow-md)",
              "active:translate-y-0",
            ].join(" ")
          : "",

        /*
         * Optional violet glow
         */
        glow
          ? [
              "border-violet-500/20",
              "shadow-[0_0_0_1px_rgba(139,92,246,0.05),0_20px_60px_rgba(139,92,246,0.10)]",
            ].join(" ")
          : "",

        /*
         * Padding
         */
        paddingClasses[padding],

        /*
         * Custom classes
         */
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* Subtle top highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/[0.08] to-transparent dark:via-white/[0.06]"
      />

      {/* Ambient glow */}
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-violet-500/8 blur-3xl"
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}