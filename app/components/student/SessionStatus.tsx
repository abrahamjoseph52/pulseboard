"use client"

import {
  CheckCircle2,
  Clock3,
  Radio,
  Users,
  Zap,
} from "lucide-react"

type SessionStatusProps = {
  title: string
  courseCode: string
  status: "active" | "ended"
  joinCode?: string
  participantCount?: number
}

export default function SessionStatus({
  title,
  courseCode,
  status,
  joinCode,
  participantCount,
}: SessionStatusProps) {
  const isActive =
    status === "active"

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[2rem] border p-5 shadow-(--shadow-sm) transition-all duration-200 sm:p-6",
        isActive
          ? "border-emerald-400/10 bg-linear-to-br from-emerald-400/[0.06] via-(--surface) to-violet-500/[0.05]"
          : "border-(--border) bg-(--surface)",
      ].join(" ")}
    >
      {/* Decorative glow */}
      {isActive && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/8 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-violet-500/8 blur-3xl"
          />
        </>
      )}

      <div className="relative z-10">
        {/* Main row */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Session info */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]",
                  isActive
                    ? "border-emerald-400/10 bg-emerald-400/10 text-emerald-300"
                    : "border-(--border) bg-(--background-soft) text-(--foreground-muted)",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    isActive
                      ? "animate-pulse bg-emerald-400"
                      : "bg-(--foreground-subtle)",
                  ].join(" ")}
                />

                {isActive
                  ? "Live Session"
                  : "Session Ended"}
              </span>

              {courseCode && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/10 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                  <Zap className="h-3 w-3" />
                  {courseCode}
                </span>
              )}
            </div>

            <h2 className="mt-4 truncate text-2xl font-black tracking-tight sm:text-3xl">
              {title}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--foreground-muted)">
              {isActive
                ? "Your lecturer is currently collecting live learning feedback."
                : "This classroom feedback session has ended."}
            </p>
          </div>

          {/* Details */}
          <div className="grid shrink-0 grid-cols-2 gap-3">
            {joinCode && (
              <SessionDetail
                icon={
                  <Radio className="h-4 w-4" />
                }
                label="Session code"
                value={joinCode}
                mono
              />
            )}

            {typeof participantCount ===
              "number" && (
              <SessionDetail
                icon={
                  <Users className="h-4 w-4" />
                }
                label="Participants"
                value={String(
                  participantCount
                )}
              />
            )}
          </div>
        </div>

        {/* Status footer */}
        <div
          className={[
            "mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between",
            isActive
              ? "border-emerald-400/10"
              : "border-(--border)",
          ].join(" ")}
        >
          {isActive ? (
            <>
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400/20" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                </div>

                <div>
                  <p className="text-xs font-black text-emerald-300">
                    Classroom is live
                  </p>

                  <p className="mt-0.5 text-[10px] leading-5 text-(--foreground-muted)">
                    You can send your learning pulse now.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                <Clock3 className="h-3.5 w-3.5" />
                Receiving feedback
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--background-soft) text-(--foreground-subtle)">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-black text-(--foreground-secondary)">
                    Classroom completed
                  </p>

                  <p className="mt-0.5 text-[10px] leading-5 text-(--foreground-subtle)">
                    This session is no longer accepting feedback.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--background-soft) px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-(--foreground-subtle)">
                Completed
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function SessionDetail({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-30 rounded-2xl border border-(--border) bg-(--background-soft) p-3.5">
      <div className="flex items-center gap-1.5 text-violet-300">
        {icon}

        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
          {label}
        </p>
      </div>

      <p
        className={[
          "mt-2 truncate text-sm font-black text-(--foreground-secondary)",
          mono
            ? "font-mono tracking-[0.12em]"
            : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  )
}