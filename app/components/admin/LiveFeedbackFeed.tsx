"use client"

import { useMemo } from "react"

import Badge from "@/components/ui/Badge"
import Card from "@/components/ui/Card"
import type { Signal, SignalType } from "@/lib/types"

type LiveFeedbackFeedProps = {
  signals: Signal[]
  maxItems?: number
}

const signalConfig: Record<
  SignalType,
  {
    label: string
    description: string
    badge: "success" | "warning" | "danger" | "purple"
    icon: string
  }
> = {
  got_it: {
    label: "Got it",
    description: "Student understands the topic",
    badge: "success",
    icon: "✓",
  },

  slightly_lost: {
    label: "Slightly lost",
    description: "Needs a little clarification",
    badge: "warning",
    icon: "~",
  },

  confused: {
    label: "Confused",
    description: "Needs more explanation",
    badge: "danger",
    icon: "?",
  },

  interesting: {
    label: "Interesting",
    description: "Student found this engaging",
    badge: "purple",
    icon: "✦",
  },
}

export default function LiveFeedbackFeed({
  signals,
  maxItems = 8,
}: LiveFeedbackFeedProps) {
  const recentSignals = useMemo(() => {
    return [...signals]
      .sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() ?? 0
        const bTime = b.timestamp?.toMillis?.() ?? 0

        return bTime - aTime
      })
      .slice(0, maxItems)
  }, [signals, maxItems])

  return (
    <Card className="h-full">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>

            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              Live Feedback
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Real-time learning signals from students
          </p>
        </div>

        <Badge variant="info">
          {signals.length} total
        </Badge>
      </div>

      {recentSignals.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
            📡
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            Waiting for signals
          </h3>

          <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
            Student feedback will appear here instantly when they respond.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentSignals.map((item, index) => {
            const config = signalConfig[item.signal]

            return (
              <div
                key={item.id ?? `${item.studentId}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-base font-bold text-slate-700 shadow-sm">
                  {config.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {config.label}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {config.description}
                  </p>
                </div>

                <Badge variant={config.badge}>
                  Live
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}