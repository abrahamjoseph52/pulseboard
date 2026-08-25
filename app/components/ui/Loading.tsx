type LoadingProps = {
  size?: "sm" | "md" | "lg"
  label?: string
  fullScreen?: boolean
  className?: string
  variant?: "spinner" | "pulse"
}

const sizeClasses = {
  sm: {
    spinner: "h-5 w-5 border-2",
    core: "h-1.5 w-1.5",
    ring: "h-8 w-8",
    glow: "h-14 w-14",
  },

  md: {
    spinner: "h-8 w-8 border-[3px]",
    core: "h-2 w-2",
    ring: "h-12 w-12",
    glow: "h-20 w-20",
  },

  lg: {
    spinner: "h-12 w-12 border-4",
    core: "h-2.5 w-2.5",
    ring: "h-16 w-16",
    glow: "h-28 w-28",
  },
}

export default function Loading({
  size = "md",
  label = "Loading...",
  fullScreen = false,
  className = "",
  variant = "pulse",
}: LoadingProps) {
  const sizes =
    sizeClasses[size]

  const content = (
    <div
      className={[
        "relative flex flex-col items-center justify-center gap-4",
        "animate-fade-up",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Ambient glow */}
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none absolute rounded-full",
          "bg-violet-500/10 blur-3xl",
          "animate-pulse-glow",
          sizes.glow,
        ].join(" ")}
      />

      {variant === "spinner" ? (
        <div
          className={[
            "relative z-10 animate-spin rounded-full",
            "border-(--border-strong)",
            "border-t-violet-400",
            "border-r-indigo-400/60",
            sizes.spinner,
          ].join(" ")}
          aria-hidden="true"
        />
      ) : (
        <div
          className="relative z-10 flex items-center justify-center"
          aria-hidden="true"
        >
          {/* Outer glow ring */}
          <span
            className={[
              "absolute rounded-full",
              "border border-violet-400/10",
              "animate-pulse-glow",
              sizes.ring,
            ].join(" ")}
          />

          {/* Rotating ring */}
          <span
            className={[
              "absolute rounded-full",
              "border border-indigo-400/10",
              "border-t-violet-400/40",
              "animate-spin",
              sizes.ring,
            ].join(" ")}
            style={{
              animationDuration:
                "2.2s",
            }}
          />

          {/* Main loader */}
          <span
            className={[
              "relative z-10 animate-spin rounded-full",
              "border-[3px]",
              "border-white/10",
              "border-t-violet-400",
              "border-r-indigo-400/70",
              sizes.spinner,
            ].join(" ")}
          />

          {/* Core */}
          <span
            className={[
              "absolute z-20 rounded-full",
              "bg-linear-to-br from-violet-400 to-indigo-400",
              "shadow-lg shadow-violet-500/30",
              "animate-pulse-glow",
              sizes.core,
            ].join(" ")}
          />
        </div>
      )}

      {label && (
        <div className="relative z-10 flex flex-col items-center gap-2">
          <p className="text-sm font-black tracking-tight text-(--foreground-secondary)">
            {label}
          </p>

          <div
            aria-hidden="true"
            className="flex items-center gap-1.5"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />

            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400"
              style={{
                animationDelay:
                  "140ms",
              }}
            />

            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"
              style={{
                animationDelay:
                  "280ms",
              }}
            />
          </div>
        </div>
      )}

      <span className="sr-only">
        {label || "Loading"}
      </span>
    </div>
  )

  if (fullScreen) {
    return (
      <div
        className={[
          "fixed inset-0 z-50",
          "flex min-h-screen items-center justify-center",
          "overflow-hidden",
          "bg-(--background)/90",
          "backdrop-blur-xl",
        ].join(" ")}
      >
        {/* Background atmosphere */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
        />

        <div className="relative z-10 rounded-[2rem] border border-(--border) bg-(--surface)/70 px-10 py-9 shadow-(--shadow-lg) backdrop-blur-xl">
          {content}
        </div>
      </div>
    )
  }

  return content
}