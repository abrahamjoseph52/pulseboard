"use client"

import { useState } from "react"

import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import type { AISummary } from "@/lib/types"

type SummaryPanelProps = {
  summary: AISummary | null
  loading?: boolean
  error?: string | null
  onGenerate?: () => Promise<void> | void
}

export default function SummaryPanel({
  summary,
  loading = false,
  error = null,
  onGenerate,
}: SummaryPanelProps) {
  const [expanded, setExpanded] = useState(false)

  if (!summary) {
    return (
      <Card className="h-full">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-950">
                AI Session Insight
              </h2>

              <Badge variant="purple">AI</Badge>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Generate a concise analysis of your classroom feedback.
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-lg">
            ✦
          </div>
        </div>

        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            🤖
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            No AI insight yet
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Generate an AI-powered summary to understand what your
            students understood and where they need more support.
          </p>

          {onGenerate && (
            <div className="mt-6">
              <Button
                onClick={() => void onGenerate()}
                loading={loading}
              >
                Generate Insight
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </div>
      </Card>
    )
  }

  const keyInsights = summary.keyInsights ?? []
  const recommendations = summary.recommendations ?? []

  return (
    <Card className="h-full">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              AI Session Insight
            </h2>

            <Badge variant="purple">AI</Badge>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Generated from live classroom learning signals
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-lg">
          ✦
        </div>
      </div>

      {/* Main summary */}
      <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
        <p className="text-sm leading-7 text-slate-700">
          {summary.overview}
        </p>
      </div>

      {/* Insights */}
      {keyInsights.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-900">
            Key insights
          </h3>

          <div className="mt-3 space-y-2">
            {(expanded ? keyInsights : keyInsights.slice(0, 3)).map(
              (insight, index) => (
                <div
                  key={`${insight}-${index}`}
                  className="flex gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <span className="mt-0.5 text-purple-600">
                    ✦
                  </span>

                  <p className="text-sm leading-6 text-slate-600">
                    {insight}
                  </p>
                </div>
              )
            )}
          </div>

          {keyInsights.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-3 text-sm font-semibold text-purple-700 transition hover:text-purple-900"
            >
              {expanded
                ? "Show less"
                : `Show ${keyInsights.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-900">
            Recommended next steps
          </h3>

          <ol className="mt-3 space-y-3">
            {recommendations.map((recommendation, index) => (
              <li
                key={`${recommendation}-${index}`}
                className="flex gap-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {index + 1}
                </span>

                <p className="pt-0.5 text-sm leading-6 text-slate-600">
                  {recommendation}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {onGenerate && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <Button
            variant="outline"
            size="sm"
            loading={loading}
            onClick={() => void onGenerate()}
          >
            Regenerate Insight
          </Button>

          {error && (
            <p className="mt-3 text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}