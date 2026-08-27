"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  getTimelineSummary,
  subscribeToSessionTimeline,
  TimelineRound,
} from "@/app/services/session-timeline.service";

interface SessionTimelineProps {
  sessionId: string;
}

function formatTime(
  date: Date | null
): string {
  if (!date) {
    return "--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLevelClasses(
  level: TimelineRound["level"]
) {
  switch (level) {
    case "critical":
      return {
        border:
          "border-red-400/20",
        background:
          "bg-red-400/5",
        icon:
          "bg-red-400/10",
        text:
          "text-red-400",
        line:
          "bg-red-400/20",
      };

    case "warning":
      return {
        border:
          "border-amber-400/20",
        background:
          "bg-amber-400/5",
        icon:
          "bg-amber-400/10",
        text:
          "text-amber-400",
        line:
          "bg-amber-400/20",
      };

    case "recovery":
      return {
        border:
          "border-cyan-400/20",
        background:
          "bg-cyan-400/5",
        icon:
          "bg-cyan-400/10",
        text:
          "text-cyan-400",
        line:
          "bg-cyan-400/20",
      };

    case "strong":
      return {
        border:
          "border-emerald-400/20",
        background:
          "bg-emerald-400/5",
        icon:
          "bg-emerald-400/10",
        text:
          "text-emerald-400",
        line:
          "bg-emerald-400/20",
      };

    default:
      return {
        border:
          "border-white/10",
        background:
          "bg-white/[0.02]",
        icon:
          "bg-white/5",
        text:
          "text-white/50",
        line:
          "bg-white/10",
      };
  }
}

function getLevelIcon(
  level: TimelineRound["level"]
) {
  switch (level) {
    case "critical":
      return AlertTriangle;

    case "warning":
      return TrendingDown;

    case "recovery":
      return TrendingUp;

    case "strong":
      return CheckCircle2;

    default:
      return Clock3;
  }
}

export default function SessionTimeline({
  sessionId,
}: SessionTimelineProps) {
  const [timeline, setTimeline] =
    useState<TimelineRound[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const unsubscribe =
      subscribeToSessionTimeline(
        sessionId,
        (items) => {
          setTimeline(items);
          setLoading(false);
          setError("");
        },
        () => {
          setError(
            "Unable to load session timeline."
          );

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  const summary = useMemo(
    () =>
      getTimelineSummary(
        timeline
      ),
    [timeline]
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

      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="relative">

        {/* Header */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10">

              <Clock3 className="h-5 w-5 text-cyan-400" />

            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                Classroom Story
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Session Timeline
              </h2>

              <p className="mt-1 max-w-xl text-sm leading-5 text-white/40">
                Follow how student understanding
                changed throughout the session.
              </p>

            </div>

          </div>

          {/* Live indicator */}

          <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-2">

            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-[10px] font-semibold text-emerald-300/80">
              Live analysis
            </span>

          </div>

        </div>

        {/* Summary */}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Rounds
            </p>

            <p className="mt-2 text-2xl font-black text-white">
              {summary.totalRounds}
            </p>

          </div>

          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">

            <p className="text-[10px] uppercase tracking-wider text-emerald-300/40">
              Highest
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-300">
              {summary.highestUnderstanding}%
            </p>

          </div>

          <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-4">

            <p className="text-[10px] uppercase tracking-wider text-red-300/40">
              Lowest
            </p>

            <p className="mt-2 text-2xl font-black text-red-300">
              {summary.lowestUnderstanding}%
            </p>

          </div>

          <div className="rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4">

            <p className="text-[10px] uppercase tracking-wider text-amber-300/40">
              Learning dips
            </p>

            <p className="mt-2 text-2xl font-black text-amber-300">
              {summary.criticalMoments}
            </p>

          </div>

          <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4">

            <p className="text-[10px] uppercase tracking-wider text-cyan-300/40">
              Recoveries
            </p>

            <p className="mt-2 text-2xl font-black text-cyan-300">
              {summary.recoveryMoments}
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
              Building classroom story...
            </p>

          </div>
        ) : timeline.length === 0 ? (

          /* Empty */

          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center">

            <Clock3 className="mx-auto h-10 w-10 text-white/10" />

            <p className="mt-4 text-sm font-semibold text-white/45">
              Timeline will appear here
            </p>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/25">
              Once your session receives Live
              Pulse responses, PulseBoard will
              reconstruct the classroom journey.
            </p>

          </div>

        ) : (

          /* Timeline */

          <div className="mt-8">

            {timeline.map(
              (round, index) => {

                const styles =
                  getLevelClasses(
                    round.level
                  );

                const Icon =
                  getLevelIcon(
                    round.level
                  );

                const isLast =
                  index ===
                  timeline.length - 1;

                return (
                  <div
                    key={`timeline-${round.round}`}
                    className="relative flex gap-4"
                  >

                    {/* Vertical line */}

                    {!isLast && (
                      <div
                        className={`absolute left-[18px] top-12 h-[calc(100%-12px)] w-px ${styles.line}`}
                      />
                    )}

                    {/* Icon */}

                    <div
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                    >

                      <Icon
                        className={`h-4 w-4 ${styles.text}`}
                      />

                    </div>

                    {/* Content */}

                    <article
                      className={`mb-5 min-w-0 flex-1 rounded-2xl border ${styles.border} ${styles.background} p-4`}
                    >

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                              Round{" "}
                              {round.round}
                            </span>

                            <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${styles.icon} ${styles.text}`}>
                              {round.level}
                            </span>

                          </div>

                          <h3 className="mt-2 text-sm font-bold text-white">
                            {round.title}
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-white/35">
                            {round.description}
                          </p>

                        </div>

                        <div className="shrink-0 text-left sm:text-right">

                          <p className="text-[10px] text-white/25">
                            {formatTime(
                              round.timestamp
                            )}
                          </p>

                          <p className={`mt-1 text-2xl font-black ${styles.text}`}>
                            {
                              round.understandingPercentage
                            }%
                          </p>

                          <p className="text-[9px] uppercase tracking-wider text-white/20">
                            understanding
                          </p>

                        </div>

                      </div>

                      {/* Response breakdown */}

                      <div className="mt-4 grid grid-cols-3 gap-2">

                        <div className="rounded-xl bg-red-400/5 p-2.5">

                          <p className="text-[9px] text-red-300/40">
                            Confused
                          </p>

                          <p className="mt-1 text-xs font-bold text-red-300">
                            {
                              round.confusedCount
                            }
                          </p>

                        </div>

                        <div className="rounded-xl bg-amber-400/5 p-2.5">

                          <p className="text-[9px] text-amber-300/40">
                            Partial
                          </p>

                          <p className="mt-1 text-xs font-bold text-amber-300">
                            {
                              round.partialCount
                            }
                          </p>

                        </div>

                        <div className="rounded-xl bg-emerald-400/5 p-2.5">

                          <p className="text-[9px] text-emerald-300/40">
                            Understood
                          </p>

                          <p className="mt-1 text-xs font-bold text-emerald-300">
                            {
                              round.understoodCount
                            }
                          </p>

                        </div>

                      </div>

                    </article>

                  </div>
                );
              }
            )}

          </div>
        )}

        {/* Insight */}

        {!loading &&
          timeline.length > 1 && (
            <div className="mt-2 flex items-start gap-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4">

              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />

              <div>

                <p className="text-xs font-bold text-cyan-300">
                  Timeline insight
                </p>

                <p className="mt-1 text-xs leading-5 text-cyan-300/50">

                  {summary.recoveryMoments >
                  0
                    ? "The class showed at least one meaningful recovery after a learning dip."
                    : summary.lowestUnderstanding <
                      50
                    ? "The session contains a significant learning dip that may need review."
                    : "The class maintained a relatively stable learning pattern."}

                </p>

              </div>

            </div>
          )}

      </div>

    </section>
  );
}