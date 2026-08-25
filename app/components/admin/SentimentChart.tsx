import Card from "@/app/components/ui/Card"
import type { SignalCounts, SignalType } from "@/lib/types"
import { calculatePercentage } from "@/lib/utils"

type SentimentChartProps = {
  counts: SignalCounts
}

type ChartItem = {
  type: SignalType
  label: string
  description: string
  value: number
  barClassName: string
  dotClassName: string
}

export default function SentimentChart({
  counts,
}: SentimentChartProps) {
  const items: ChartItem[] = [
    {
      type: "got_it",
      label: "Got it",
      description: "Students understand",
      value: counts.got_it,
      barClassName: "bg-emerald-500",
      dotClassName: "bg-emerald-500",
    },
    {
      type: "slightly_lost",
      label: "Slightly lost",
      description: "Need clarification",
      value: counts.slightly_lost,
      barClassName: "bg-amber-500",
      dotClassName: "bg-amber-500",
    },
    {
      type: "confused",
      label: "Confused",
      description: "Need more explanation",
      value: counts.confused,
      barClassName: "bg-red-500",
      dotClassName: "bg-red-500",
    },
    {
      type: "interesting",
      label: "Interesting",
      description: "Highly engaging",
      value: counts.interesting,
      barClassName: "bg-purple-500",
      dotClassName: "bg-purple-500",
    },
  ]

  return (
    <Card className="h-full">
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tight text-slate-950">
          Learning Pulse
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Live distribution of classroom feedback
        </p>
      </div>

      {counts.total === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
          <div className="text-3xl">📊</div>

          <h3 className="mt-4 font-bold text-slate-900">
            No feedback yet
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            The chart will update when students start sending signals.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            const percentage = calculatePercentage(
              item.value,
              counts.total
            )

            return (
              <div key={item.type}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={[
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        item.dotClassName,
                      ].join(" ")}
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.label}
                      </p>

                      <p className="text-xs text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {percentage}%
                    </p>

                    <p className="text-xs text-slate-400">
                      {item.value} signals
                    </p>
                  </div>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={[
                      "h-full rounded-full transition-all duration-500",
                      item.barClassName,
                    ].join(" ")}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}