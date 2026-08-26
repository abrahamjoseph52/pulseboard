"use client"

import {
  Check,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Sparkles,
  ThumbsUp,
} from "lucide-react"

import type {
  ReactNode,
} from "react"

import type {
  SignalType,
} from "@/lib/types"

type FeedbackFormProps = {
  onSend: (
    signal: SignalType
  ) => Promise<void> | void

  loading?: boolean

  disabled?: boolean

  selectedSignal?: SignalType | null
}

type SignalOption = {
  type: SignalType
  label: string
  shortLabel: string
  description: string
  icon: ReactNode
  iconClassName: string
  iconGlowClassName: string
  selectedClassName: string
  hoverClassName: string
  accentClassName: string
}

const signalOptions: SignalOption[] = [
  {
    type: "got_it",

    label: "Got it",

    shortLabel: "Clear",

    description:
      "I understand this clearly.",

    icon: (
      <ThumbsUp className="h-6 w-6" />
    ),

    iconClassName:
      "bg-emerald-500/10 text-emerald-300 border border-emerald-400/10",

    iconGlowClassName:
      "bg-emerald-400/15",

    selectedClassName:
      "border-emerald-400/55 bg-emerald-400/[0.09] shadow-[0_0_35px_rgba(52,211,153,0.10)]",

    hoverClassName:
      "hover:border-emerald-400/25 hover:bg-emerald-400/[0.04]",

    accentClassName:
      "from-emerald-400 via-teal-300 to-emerald-400",
  },

  {
    type: "slightly_lost",

    label: "Slightly lost",

    shortLabel: "Need clarity",

    description:
      "I need a little clarification.",

    icon: (
      <Lightbulb className="h-6 w-6" />
    ),

    iconClassName:
      "bg-amber-500/10 text-amber-300 border border-amber-400/10",

    iconGlowClassName:
      "bg-amber-400/15",

    selectedClassName:
      "border-amber-400/55 bg-amber-400/[0.09] shadow-[0_0_35px_rgba(251,191,36,0.10)]",

    hoverClassName:
      "hover:border-amber-400/25 hover:bg-amber-400/[0.04]",

    accentClassName:
      "from-amber-400 via-orange-300 to-amber-400",
  },

  {
    type: "confused",

    label: "Confused",

    shortLabel: "Explain again",

    description:
      "I need more explanation.",

    icon: (
      <HelpCircle className="h-6 w-6" />
    ),

    iconClassName:
      "bg-rose-500/10 text-rose-300 border border-rose-400/10",

    iconGlowClassName:
      "bg-rose-400/15",

    selectedClassName:
      "border-rose-400/55 bg-rose-400/[0.09] shadow-[0_0_35px_rgba(251,113,133,0.11)]",

    hoverClassName:
      "hover:border-rose-400/25 hover:bg-rose-400/[0.04]",

    accentClassName:
      "from-rose-400 via-pink-300 to-rose-400",
  },

  {
    type: "interesting",

    label: "Interesting",

    shortLabel: "I'm engaged",

    description:
      "This is engaging.",

    icon: (
      <Sparkles className="h-6 w-6" />
    ),

    iconClassName:
      "bg-violet-500/10 text-violet-300 border border-violet-400/10",

    iconGlowClassName:
      "bg-violet-400/15",

    selectedClassName:
      "border-violet-400/55 bg-violet-400/[0.09] shadow-[0_0_35px_rgba(139,92,246,0.13)]",

    hoverClassName:
      "hover:border-violet-400/25 hover:bg-violet-400/[0.04]",

    accentClassName:
      "from-violet-400 via-indigo-300 to-violet-400",
  },
]

export default function FeedbackForm({
  onSend,
  loading = false,
  disabled = false,
  selectedSignal = null,
}: FeedbackFormProps) {
  /*
   * Once a signal has been successfully selected,
   * the student is locked to that one response.
   *
   * This prevents:
   *
   * Got it -> Confused -> Interesting
   *
   * during the same teaching pulse.
   */
  const responseLocked =
    Boolean(selectedSignal)

  const isDisabled =
    loading ||
    disabled ||
    responseLocked

  const handleSend = async (
    signal: SignalType
  ) => {
    if (
      loading ||
      disabled ||
      responseLocked
    ) {
      return
    }

    await onSend(signal)
  }

  const selectedOption =
    signalOptions.find(
      (option) =>
        option.type ===
        selectedSignal
    )

  return (
    <div className="w-full">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10">
          <Sparkles className="h-5 w-5" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-400">
          Learning Pulse
        </p>

        <h2 className="mt-3 text-2xl font-black tracking-tight text-(--foreground) sm:text-3xl">
          How are you following?
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-(--foreground-muted)">
          Choose the one response that best represents your
          understanding right now.
        </p>
      </div>

      {/* =====================================================
          SIGNAL GRID
      ===================================================== */}

      <div
        role="radiogroup"
        aria-label="Choose your classroom feedback"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {signalOptions.map(
          (option) => {
            const isSelected =
              selectedSignal ===
              option.type

            const isOtherOption =
              responseLocked &&
              !isSelected

            return (
              <button
                key={
                  option.type
                }
                type="button"
                disabled={
                  isDisabled
                }
                onClick={() =>
                  void handleSend(
                    option.type
                  )
                }
                role="radio"
                aria-checked={
                  isSelected
                }
                aria-label={
                  `${option.label}. ${option.description}`
                }
                className={[
                  "group relative min-h-38 overflow-hidden rounded-3xl border p-5 text-left",

                  "bg-(--surface)",

                  "transition-all duration-250 ease-out",

                  "focus:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-violet-400/60",

                  /*
                   * Selected option.
                   */
                  isSelected
                    ? option.selectedClassName
                    : "border-(--border) shadow-(--shadow-xs)",

                  /*
                   * Normal hover.
                   */
                  !isDisabled &&
                  !responseLocked
                    ? option.hoverClassName
                    : "",

                  /*
                   * After one selection:
                   * other choices are visually inactive.
                   */
                  isOtherOption
                    ? "opacity-40 grayscale-[0.2]"
                    : "",

                  /*
                   * Disabled / selected state.
                   */
                  isDisabled
                    ? "cursor-not-allowed"
                    : [
                        "cursor-pointer",
                        "hover:-translate-y-1",
                        "hover:shadow-(--shadow-md)",
                        "active:scale-[0.985]",
                      ].join(" "),
                ].join(" ")}
              >
                {/* Ambient glow */}
                <span
                  aria-hidden="true"
                  className={[
                    "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl",

                    option.iconGlowClassName,

                    isSelected
                      ? "opacity-100"
                      : !responseLocked
                        ? "opacity-0 transition-opacity duration-300 group-hover:opacity-60"
                        : "opacity-0",
                  ].join(" ")}
                />

                {/* Background shine */}
                <span
                  aria-hidden="true"
                  className={[
                    "pointer-events-none absolute inset-0",

                    "bg-linear-to-br from-white/[0.025] via-transparent to-transparent",

                    !responseLocked
                      ? "opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      : "opacity-0",
                  ].join(" ")}
                />

                {/* Top row */}
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <span
                    className={[
                      "flex h-12 w-12 items-center justify-center rounded-2xl",

                      "transition-transform duration-250",

                      option.iconClassName,

                      !isDisabled &&
                      !responseLocked
                        ? "group-hover:scale-110 group-hover:-rotate-2"
                        : "",
                    ].join(" ")}
                  >
                    {option.icon}
                  </span>

                  {isSelected ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <span
                      className={[
                        "text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)",
                        !responseLocked
                          ? "opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          : "opacity-0",
                      ].join(" ")}
                    >
                      Tap
                    </span>
                  )}
                </div>

                {/* Copy */}
                <div className="relative z-10 mt-5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-(--foreground)">
                      {
                        option.label
                      }
                    </p>

                    <span className="rounded-full bg-(--background-soft) px-2 py-0.5 text-[9px] font-bold text-(--foreground-subtle)">
                      {
                        option.shortLabel
                      }
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-(--foreground-muted)">
                    {
                      option.description
                    }
                  </p>
                </div>

                {/* Bottom accent */}
                <span
                  aria-hidden="true"
                  className={[
                    "absolute inset-x-0 bottom-0 h-0.5",
                    "bg-linear-to-r",
                    option.accentClassName,
                    "transition-opacity duration-200",

                    isSelected
                      ? "opacity-100"
                      : !responseLocked
                        ? "opacity-0 group-hover:opacity-60"
                        : "opacity-0",
                  ].join(" ")}
                />

                {/* Selected glow */}
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5"
                  />
                )}
              </button>
            )
          }
        )}
      </div>

      {/* =====================================================
          SENDING STATE
      ===================================================== */}

      {loading && (
        <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-violet-400/10 bg-violet-500/5 px-4 py-3">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300/20 border-t-violet-300"
            aria-hidden="true"
          />

          <p className="text-xs font-bold text-violet-300">
            Sending your pulse...
          </p>
        </div>
      )}

      {/* =====================================================
          SUCCESS STATE
      ===================================================== */}

      {!loading &&
        selectedOption && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045]">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-emerald-300">
                  Pulse recorded
                </p>

                <p className="mt-0.5 text-[11px] leading-5 text-(--foreground-muted)">
                  You selected{" "}
                  <span className="font-bold text-(--foreground-secondary)">
                    {
                      selectedOption.label
                    }
                  </span>
                  . Your faculty can now see the classroom pulse.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          LOCKED STATE
      ===================================================== */}

      {responseLocked &&
        !loading && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--background-soft) px-4 py-2.5 text-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />

            <p className="text-[10px] font-bold text-(--foreground-muted)">
              One response recorded for this pulse.
            </p>
          </div>
        )}

      {/* =====================================================
          DISABLED STATE
      ===================================================== */}

      {disabled &&
        !loading && (
          <div className="mt-5 rounded-2xl border border-(--border) bg-(--background-soft) px-4 py-3 text-center">
            <p className="text-xs font-bold text-(--foreground-muted)">
              Feedback is currently paused.
            </p>

            <p className="mt-1 text-[11px] text-(--foreground-subtle)">
              Your next pulse will become available when the
              faculty starts another teaching segment.
            </p>
          </div>
        )}
    </div>
  )
}