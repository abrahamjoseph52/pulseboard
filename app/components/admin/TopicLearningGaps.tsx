"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  calculateOverallLearningScore,
  LearningGap,
  subscribeToLearningGaps,
} from "@/app/services/learning-gap.service";

interface TopicLearningGapsProps {
  sessionId: string;
}

export default function TopicLearningGaps({
  sessionId,
}: TopicLearningGapsProps) {
  const [gaps, setGaps] =
    useState<LearningGap[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const unsubscribe =
      subscribeToLearningGaps(
        sessionId,
        (items) => {
          setGaps(items);
          setLoading(false);
          setError("");
        },
        () => {
          setError(
            "Unable to calculate learning gaps."
          );

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  const overallScore = useMemo(
    () =>
      calculateOverallLearningScore(
        gaps
      ),
    [gaps]
  );

  const criticalTopics = useMemo(
    () =>
      gaps.filter(
        (gap) =>
          gap.level === "critical"
      ),
    [gaps]
  );

  const moderateTopics = useMemo(
    () =>
      gaps.filter(
        (gap) =>
          gap.level === "moderate"
      ),
    [gaps]
  );

  if (!sessionId) {
    return (
      <section className="rounded-3xl border border-red-400/10 bg-red-400/5 p-6">
        <p className="text-sm font-semibold text-red-300">
          Session ID is missing.
        </p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl backdrop-blur-xl sm:p-6">

      {/* Background glow */}

      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="relative">

        {/* Header */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10">
              <BookOpen className="h-5 w-5 text-cyan-400" />
            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                Classroom Intelligence
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Topic Learning Gaps
              </h2>

              <p className="mt-1 max-w-xl text-sm leading-5 text-white/40">
                Identify the concepts where your
                class needs more support.
              </p>

            </div>

          </div>

          {/* Overall score */}

          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">

            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
              Overall understanding
            </p>

            <div className="mt-1 flex items-end gap-2">

              <span className="text-3xl font-black text-white">
                {overallScore}%
              </span>

              {overallScore >= 70 ? (
                <TrendingUp className="mb-1 h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="mb-1 h-4 w-4 text-amber-400" />
              )}

            </div>

          </div>

        </div>

        {/* Summary cards */}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

            <p className="text-xs text-white/35">
              Topics detected
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {gaps.length}
            </p>

          </div>

          <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-4">

            <p className="text-xs text-red-300/60">
              Critical gaps
            </p>

            <p className="mt-2 text-2xl font-bold text-red-300">
              {criticalTopics.length}
            </p>

          </div>

          <div className="rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4">

            <p className="text-xs text-amber-300/60">
              Moderate gaps
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-300">
              {moderateTopics.length}
            </p>

          </div>

          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">

            <p className="text-xs text-emerald-300/60">
              Strong topics
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {
                gaps.filter(
                  (gap) =>
                    gap.level === "strong"
                ).length
              }
            </p>

          </div>

        </div>

        {/* Error */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/10 bg-red-400/5 p-4">

            <p className="text-sm text-red-300">
              {error}
            </p>

          </div>
        )}

        {/* Loading */}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-10 text-center">

            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

            <p className="mt-3 text-xs text-white/30">
              Analysing classroom understanding...
            </p>

          </div>
        ) : gaps.length === 0 ? (

          /* Empty state */

          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center">

            <BookOpen className="mx-auto h-10 w-10 text-white/10" />

            <p className="mt-4 text-sm font-semibold text-white/45">
              Not enough pulse data yet
            </p>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/25">
              Once students submit Live Pulse
              responses, PulseBoard will identify
              the topics with the highest confusion.
            </p>

          </div>

        ) : (

          /* Learning gap list */

          <div className="mt-6 space-y-3">

            <div className="mb-3">

              <p className="text-xs font-bold uppercase tracking-wider text-white/35">
                Topic breakdown
              </p>

            </div>

            {gaps.map(
              (gap, index) => {

                const isCritical =
                  gap.level ===
                  "critical";

                const isModerate =
                  gap.level ===
                  "moderate";

                return (
                  <article
                    key={`${gap.topic}-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                      {/* Topic */}

                      <div className="flex min-w-0 flex-1 items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">

                          {isCritical ? (
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          ) : isModerate ? (
                            <TrendingDown className="h-4 w-4 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          )}

                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="truncate text-sm font-bold text-white">
                              {gap.topic}
                            </h3>

                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                                isCritical
                                  ? "bg-red-400/10 text-red-400"
                                  : isModerate
                                  ? "bg-amber-400/10 text-amber-400"
                                  : "bg-emerald-400/10 text-emerald-400"
                              }`}
                            >
                              {isCritical
                                ? "Critical gap"
                                : isModerate
                                ? "Needs support"
                                : "Strong"}
                            </span>

                          </div>

                          <p className="mt-1 text-[11px] text-white/25">
                            {gap.totalResponses}{" "}
                            pulse responses
                          </p>

                        </div>

                      </div>

                      {/* Percentage */}

                      <div className="sm:w-44">

                        <div className="flex items-center justify-between text-[10px]">

                          <span className="text-white/30">
                            Confusion
                          </span>

                          <span
                            className={
                              isCritical
                                ? "font-bold text-red-400"
                                : isModerate
                                ? "font-bold text-amber-400"
                                : "font-bold text-emerald-400"
                            }
                          >
                            {
                              gap.confusionPercentage
                            }
                            %
                          </span>

                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">

                          <div
                            className="h-full rounded-full bg-current transition-all duration-700"
                            style={{
                              width: `${gap.confusionPercentage}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>

                    {/* Details */}

                    <div className="mt-4 grid grid-cols-3 gap-2">

                      <div className="rounded-xl bg-red-400/5 p-3">

                        <p className="text-[9px] uppercase tracking-wider text-red-300/40">
                          Confused
                        </p>

                        <p className="mt-1 text-sm font-bold text-red-300">
                          {gap.confusedCount}
                        </p>

                      </div>

                      <div className="rounded-xl bg-amber-400/5 p-3">

                        <p className="text-[9px] uppercase tracking-wider text-amber-300/40">
                          Partial
                        </p>

                        <p className="mt-1 text-sm font-bold text-amber-300">
                          {gap.partialCount}
                        </p>

                      </div>

                      <div className="rounded-xl bg-emerald-400/5 p-3">

                        <p className="text-[9px] uppercase tracking-wider text-emerald-300/40">
                          Understood
                        </p>

                        <p className="mt-1 text-sm font-bold text-emerald-300">
                          {gap.understoodCount}
                        </p>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </div>
    </section>
  );
}