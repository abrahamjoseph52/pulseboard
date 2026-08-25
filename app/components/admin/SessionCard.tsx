"use client"

import {
  ArrowRight,
  CalendarDays,
  Radio,
  Users,
} from "lucide-react"

import type { Session } from "@/lib/types"

type SessionCardProps = {
  session: Session
  onClick?: () => void
}

export default function SessionCard({
  session,
  onClick,
}: SessionCardProps) {
  const createdDate =
    session.createdAt?.toDate
      ? session.createdAt
          .toDate()
          .toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }
          )
      : "Recently"

  const isActive =
    session.status === "active"

  const participantCount =
    session.participantCount ??
    0

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative w-full overflow-hidden rounded-[2rem] border p-5 text-left",
        "bg-(--surface) shadow-(--shadow-sm)",
        "transition-all duration-200",
        "hover:-translate-y-1 hover:border-(--border-strong) hover:bg-(--surface-hover) hover:shadow-(--shadow-md)",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-(--background)",
      ].join(" ")}
    >
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          isActive
            ? "bg-emerald-400/10"
            : "bg-violet-500/10",
        ].join(" ")}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                isActive
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-violet-500/10 text-violet-300",
              ].join(" ")}
            >
              {isActive ? (
                <Radio className="h-5 w-5" />
              ) : (
                <CalendarDays className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-black tracking-tight text-(--foreground)">
                {session.title}
              </h3>

              <p className="mt-1 truncate text-xs font-semibold text-(--foreground-muted)">
                {session.courseCode ||
                  "Course"}
              </p>
            </div>
          </div>

          <span
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1",
              "text-[8px] font-black uppercase tracking-[0.14em]",
              isActive
                ? "border-emerald-400/10 bg-emerald-400/10 text-emerald-300"
                : "border-(--border) bg-(--background-soft) text-(--foreground-subtle)",
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
              ? "Live"
              : "Ended"}
          </span>
        </div>

        {/* Details */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <DetailBox
            icon={
              <Radio className="h-3.5 w-3.5" />
            }
            label="Join code"
            value={
              session.joinCode ||
              "------"
            }
            mono
          />

          <DetailBox
            icon={
              <Users className="h-3.5 w-3.5" />
            }
            label="Participants"
            value={String(
              participantCount
            )}
          />
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-(--border) pt-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-(--foreground-subtle)">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />

              <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em]">
                Created {createdDate}
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-black text-violet-300 transition-colors group-hover:text-violet-200">
            View session

            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  )
}

function DetailBox({
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
    <div className="min-w-0 rounded-2xl border border-(--border) bg-(--background-soft) p-3.5">
      <div className="flex items-center gap-1.5 text-violet-300">
        {icon}

        <p className="truncate text-[8px] font-black uppercase tracking-[0.15em] text-(--foreground-subtle)">
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