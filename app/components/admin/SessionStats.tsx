import Card from "@/app/components/ui/Card"

import type {
  SignalCounts,
} from "@/lib/types"

import {
  getTotalSignalCount,
} from "@/app/services/feedback.service"

import {
  calculateUnderstandingScore,
} from "@/lib/utils"

type SessionStatsProps = {
  participantCount: number
  counts: SignalCounts
}

type StatCardProps = {
  label: string
  value: number | string
  description: string
  icon: string
}

function StatCard({
  label,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <Card
      padding="md"
      className="h-full"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
          {icon}
        </div>
      </div>
    </Card>
  )
}

export default function SessionStats({
  participantCount,
  counts,
}: SessionStatsProps) {
  const total =
    getTotalSignalCount(
      counts
    )

  const understandingScore =
    calculateUnderstandingScore(
      counts.got_it,
      counts.slightly_lost,
      counts.confused,
      total
    )

  const responseRate =
    participantCount > 0
      ? Math.min(
          100,
          Math.round(
            (total /
              participantCount) *
              100
          )
        )
      : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Participants"
        value={
          participantCount
        }
        description="Students currently in this session"
        icon="👥"
      />

      <StatCard
        label="Total Signals"
        value={total}
        description="Feedback responses received"
        icon="📡"
      />

      <StatCard
        label="Understanding"
        value={`${understandingScore}%`}
        description="Weighted classroom understanding score"
        icon="🧠"
      />

      <StatCard
        label="Response Rate"
        value={`${responseRate}%`}
        description="Signals compared with participants"
        icon="⚡"
      />
    </div>
  )
}