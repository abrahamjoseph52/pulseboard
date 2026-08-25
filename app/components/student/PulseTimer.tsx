"use client"

import {
  Clock3,
  Pause,
  Play,
  Zap,
} from "lucide-react"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type PulseTimerProps = {
  seconds: number
  running: boolean
  onComplete?: () => void
}

export default function PulseTimer({
  seconds,
  running,
  onComplete,
}: PulseTimerProps) {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(seconds)
    )

  const callbackRef =
    useRef<
      (() => void) | undefined
    >(undefined)

  const remainingRef =
    useRef(0)

  const completedRef =
    useRef(false)

  const previousRunningRef =
    useRef(false)

  const [timeLeft, setTimeLeft] =
    useState<number>(
      running
        ? safeSeconds
        : 0
    )

  /*
   * Keep callback synchronized.
   * This effect only updates the ref,
   * not React state.
   */
  useEffect(() => {
    callbackRef.current =
      onComplete
  }, [onComplete])

  /*
   * Detect a new timer start/stop.
   */
  useEffect(() => {
    const previousRunning =
      previousRunningRef.current

    previousRunningRef.current =
      running

    if (
      running &&
      !previousRunning
    ) {
      remainingRef.current =
        safeSeconds

      completedRef.current =
        false

      setTimeLeft(
        safeSeconds
      )
    }

    if (!running) {
      remainingRef.current =
        0

      completedRef.current =
        false
    }
  }, [
    running,
    safeSeconds,
  ])

  /*
   * Countdown loop.
   */
  useEffect(() => {
    if (!running) {
      return
    }

    if (
      remainingRef.current <=
      0
    ) {
      remainingRef.current =
        safeSeconds

      completedRef.current =
        false
    }

    const interval =
      window.setInterval(() => {
        const current =
          remainingRef.current

        if (
          current <= 1
        ) {
          remainingRef.current =
            0

          setTimeLeft(0)

          if (
            !completedRef.current
          ) {
            completedRef.current =
              true

            window.setTimeout(
              () => {
                callbackRef.current?.()
              },
              0
            )
          }

          return
        }

        const next =
          current - 1

        remainingRef.current =
          next

        setTimeLeft(
          next
        )
      }, 1000)

    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [
    running,
    safeSeconds,
  ])

  const displayedTime =
    running
      ? timeLeft > 0
        ? Math.min(
            timeLeft,
            safeSeconds
          )
        : safeSeconds
      : 0

  const minutes =
    Math.floor(
      displayedTime / 60
    )

  const secondsRemaining =
    displayedTime % 60

  const formattedTime =
    `${minutes
      .toString()
      .padStart(2, "0")}:${secondsRemaining
      .toString()
      .padStart(2, "0")}`

  const total =
    Math.max(
      1,
      safeSeconds
    )

  const progress =
    running
      ? Math.max(
          0,
          Math.min(
            100,
            ((total -
              displayedTime) /
              total) *
              100
          )
        )
      : 0

  const isAlmostDone =
    displayedTime > 0 &&
    displayedTime <=
      Math.min(
        10,
        total
      )

  const isComplete =
    !running &&
    timeLeft === 0

  /*
   * Circular progress.
   */
  const radius =
    72

  const circumference =
    2 *
    Math.PI *
    radius

  const dashOffset =
    circumference -
    (progress /
      100) *
      circumference

  const timerState =
    useMemo(() => {
      if (
        isAlmostDone
      ) {
        return {
          label:
            "Ending soon",
          color:
            "text-rose-300",
          ring:
            "stroke-rose-400",
          glow:
            "bg-rose-400/10",
        }
      }

      if (running) {
        return {
          label:
            "Live now",
          color:
            "text-emerald-300",
          ring:
            "stroke-violet-400",
          glow:
            "bg-violet-400/10",
        }
      }

      return {
        label:
          isComplete
            ? "Pulse complete"
            : "Waiting to start",
        color:
          "text-(--foreground-muted)",
        ring:
          "stroke-(--border-strong)",
        glow:
          "bg-(--foreground)/[0.02]",
      }
    }, [
      isAlmostDone,
      isComplete,
      running,
    ])

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl",
        "border border-(--border)",
        "bg-(--surface)",
        "shadow-(--shadow-sm)",
        "transition-all duration-300",
        running
          ? "border-violet-400/15 shadow-[0_0_40px_rgba(139,92,246,0.08)]"
          : "",
      ].join(" ")}
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-16 -top-16",
          "h-40 w-40 rounded-full blur-3xl",
          timerState.glow,
          running
            ? "animate-pulse-glow"
            : "",
        ].join(" ")}
      />

      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                "border border-violet-400/10",
                running
                  ? "bg-violet-500/10 text-violet-300"
                  : "bg-(--background-soft) text-(--foreground-subtle)",
              ].join(" ")}
            >
              {running ? (
                <Zap className="h-4 w-4" />
              ) : (
                <Clock3 className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                Pulse timer
              </p>

              <p className="mt-1 truncate text-xs font-medium text-(--foreground-muted)">
                Live classroom feedback
              </p>
            </div>
          </div>

          {/* Status */}
          <div
            className={[
              "inline-flex shrink-0 items-center gap-2 rounded-full",
              "border px-2.5 py-1.5",
              "text-[9px] font-black uppercase tracking-[0.14em]",
              running
                ? "border-emerald-400/10 bg-emerald-400/10 text-emerald-300"
                : isComplete
                  ? "border-violet-400/10 bg-violet-400/5 text-(--foreground-muted)"
                  : "border-(--border) bg-(--background-soft) text-(--foreground-subtle)",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                running
                  ? "animate-pulse bg-emerald-400"
                  : isComplete
                    ? "bg-violet-400"
                    : "bg-(--foreground-subtle)",
              ].join(" ")}
            />

            {timerState.label}
          </div>
        </div>

        {/* Timer */}
        <div className="mt-6 flex justify-center">
          <div className="relative flex h-48 w-48 items-center justify-center sm:h-52 sm:w-52">
            {/* Outer glow */}
            <div
              className={[
                "absolute inset-7 rounded-full blur-2xl",
                running
                  ? isAlmostDone
                    ? "bg-rose-400/10"
                    : "bg-violet-400/10"
                  : "bg-transparent",
              ].join(" ")}
            />

            {/* SVG ring */}
            <svg
              className="absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 180 180"
              aria-hidden="true"
            >
              {/* Track */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                className="text-(--surface-hover)"
              />

              {/* Progress */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={
                  circumference
                }
                strokeDashoffset={
                  dashOffset
                }
                className={[
                  "transition-all duration-700 ease-linear",
                  timerState.ring,
                ].join(" ")}
              />
            </svg>

            {/* Inner surface */}
            <div
              className={[
                "relative flex h-32 w-32 flex-col items-center justify-center rounded-full",
                "border border-(--border)",
                "bg-(--background-soft)",
                "shadow-inner",
              ].join(" ")}
            >
              <p
                className={[
                  "font-mono text-4xl font-black tracking-[-0.04em]",
                  isAlmostDone
                    ? "text-rose-300"
                    : "text-(--foreground)",
                ].join(" ")}
              >
                {formattedTime}
              </p>

              <p
                className={[
                  "mt-2 text-[9px] font-black uppercase tracking-[0.18em]",
                  timerState.color,
                ].join(" ")}
              >
                {isComplete
                  ? "Complete"
                  : running
                    ? "Remaining"
                    : "Waiting"}
              </p>
            </div>
          </div>
        </div>

        {/* Progress information */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold text-(--foreground-subtle)">
              Pulse progress
            </p>

            <p
              className={[
                "text-[10px] font-black",
                timerState.color,
              ].join(" ")}
            >
              {Math.round(
                progress
              )}
              %
            </p>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--surface-hover)">
            <div
              className={[
                "h-full rounded-full",
                "transition-[width] duration-700 ease-linear",
                isAlmostDone
                  ? "bg-linear-to-r from-rose-500 to-orange-400"
                  : "bg-linear-to-r from-violet-500 via-indigo-500 to-blue-400",
              ].join(" ")}
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-(--foreground-subtle)">
              {running
                ? `${Math.round(progress)}% elapsed`
                : "No active pulse"}
            </span>

            <span className="text-[10px] font-semibold text-(--foreground-subtle)">
              {safeSeconds}s pulse
            </span>
          </div>
        </div>

        {/* State message */}
        <div
          className={[
            "mt-5 rounded-2xl border px-4 py-3",
            running
              ? isAlmostDone
                ? "border-rose-400/15 bg-rose-400/[0.05]"
                : "border-violet-400/10 bg-violet-500/[0.04]"
              : "border-(--border) bg-(--background-soft)",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                running
                  ? isAlmostDone
                    ? "bg-rose-400/10 text-rose-300"
                    : "bg-violet-400/10 text-violet-300"
                  : "bg-(--surface-hover) text-(--foreground-subtle)",
              ].join(" ")}
            >
              {running ? (
                <Play className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-(--foreground-secondary)">
                {isAlmostDone
                  ? "Pulse is almost finished"
                  : running
                    ? "Students can respond now"
                    : isComplete
                      ? "Waiting for the next pulse"
                      : "Pulse is paused"}
              </p>

              <p className="mt-0.5 text-[10px] leading-4 text-(--foreground-subtle)">
                {isAlmostDone
                  ? "Finish your current teaching segment or let the timer complete."
                  : running
                    ? "Keep teaching while PulseBoard collects classroom signals."
                    : "The next pulse will become available when the faculty starts it."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}