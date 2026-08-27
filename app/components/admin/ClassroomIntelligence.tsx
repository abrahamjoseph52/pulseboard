"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MessageCircle,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import {
  ClassroomIntelligence as IntelligenceData,
  subscribeToClassroomIntelligence,
} from "@/app/services/classroom-intelligence.service";

interface ClassroomIntelligenceProps {
  sessionId: string;
}

function getStatusStyles(
  status: IntelligenceData["currentStatus"]
) {
  switch (status) {
    case "excellent":
      return {
        wrapper:
          "border-emerald-400/20 bg-emerald-400/5",
        icon:
          "bg-emerald-400/10",
        text:
          "text-emerald-400",
        label:
          "Excellent",
      };

    case "critical":
      return {
        wrapper:
          "border-red-400/20 bg-red-400/5",
        icon:
          "bg-red-400/10",
        text:
          "text-red-400",
        label:
          "Critical attention",
      };

    case "attention":
      return {
        wrapper:
          "border-amber-400/20 bg-amber-400/5",
        icon:
          "bg-amber-400/10",
        text:
          "text-amber-400",
        label:
          "Needs attention",
      };

    default:
      return {
        wrapper:
          "border-cyan-400/20 bg-cyan-400/5",
        icon:
          "bg-cyan-400/10",
        text:
          "text-cyan-400",
        label:
          "Healthy",
      };
  }
}

function formatTime(
  date: Date | null
) {
  if (!date) {
    return "--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClassroomIntelligence({
  sessionId,
}: ClassroomIntelligenceProps) {
  const [data, setData] =
    useState<IntelligenceData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const unsubscribe =
      subscribeToClassroomIntelligence(
        sessionId,
        (result) => {
          setData(result);
          setLoading(false);
          setError("");
        },
        () => {
          setError(
            "Some classroom intelligence data could not be loaded."
          );

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="rounded-3xl border border-red-400/10 bg-red-400/5 p-6">
        <p className="text-sm font-semibold text-red-300">
          Session ID is missing.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-12 text-center backdrop-blur-xl">

        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

        <p className="mt-4 text-sm font-semibold text-white/50">
          Building classroom intelligence...
        </p>

        <p className="mt-1 text-xs text-white/25">
          Combining pulse, questions, learning gaps
          and timeline data.
        </p>

      </div>
    );
  }

  if (!data) {
    return null;
  }

  const status =
    getStatusStyles(
      data.currentStatus
    );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl sm:p-6 lg:p-8">

      {/* Decorative glow */}

      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="relative">

        {/* ====================================================== */}
        {/* HEADER */}
        {/* ====================================================== */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

          <div className="flex items-start gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10">

              <Target className="h-6 w-6 text-cyan-400" />

            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400">
                PulseBoard Intelligence
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                Classroom Intelligence
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/35">
                One classroom view combining student
                pulses, anonymous questions, learning
                gaps and the session journey.
              </p>

            </div>

          </div>

          {/* Status */}

          <div
            className={`flex w-fit items-center gap-2 rounded-2xl border px-4 py-3 ${status.wrapper}`}
          >

            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${status.icon}`}
            >
              <CheckCircle2
                className={`h-4 w-4 ${status.text}`}
              />
            </div>

            <div>

              <p className="text-[9px] uppercase tracking-wider text-white/25">
                Classroom status
              </p>

              <p
                className={`mt-0.5 text-xs font-bold ${status.text}`}
              >
                {status.label}
              </p>

            </div>

          </div>

        </div>

        {/* ====================================================== */}
        {/* HERO SUMMARY */}
        {/* ====================================================== */}

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {/* Understanding */}

          <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5">

            <div className="flex items-center justify-between">

              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/50">
                Understanding
              </p>

              <TrendingUp className="h-4 w-4 text-cyan-400" />

            </div>

            <p className="mt-3 text-3xl font-black text-white">
              {data.understandingPercentage}%
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">

              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                style={{
                  width: `${data.understandingPercentage}%`,
                }}
              />

            </div>

            <p className="mt-2 text-[10px] text-white/25">
              {data.understoodCount} understood
            </p>

          </div>

          {/* Confusion */}

          <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-5">

            <div className="flex items-center justify-between">

              <p className="text-[10px] font-bold uppercase tracking-wider text-red-300/50">
                Confusion
              </p>

              <AlertTriangle className="h-4 w-4 text-red-400" />

            </div>

            <p className="mt-3 text-3xl font-black text-white">
              {data.confusionPercentage}%
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">

              <div
                className="h-full rounded-full bg-red-400 transition-all duration-700"
                style={{
                  width: `${data.confusionPercentage}%`,
                }}
              />

            </div>

            <p className="mt-2 text-[10px] text-white/25">
              {data.confusedCount} confused
            </p>

          </div>

          {/* Questions */}

          <div className="rounded-2xl border border-violet-400/10 bg-violet-400/5 p-5">

            <div className="flex items-center justify-between">

              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/50">
                Questions
              </p>

              <MessageCircle className="h-4 w-4 text-violet-400" />

            </div>

            <p className="mt-3 text-3xl font-black text-white">
              {data.totalQuestions}
            </p>

            <p className="mt-3 text-[10px] text-white/25">
              {data.answeredQuestions} answered ·{" "}
              {data.unansweredQuestions} awaiting
            </p>

          </div>

          {/* Pulse responses */}

          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-5">

            <div className="flex items-center justify-between">

              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/50">
                Pulse responses
              </p>

              <Users className="h-4 w-4 text-emerald-400" />

            </div>

            <p className="mt-3 text-3xl font-black text-white">
              {data.totalPulseResponses}
            </p>

            <p className="mt-3 text-[10px] text-white/25">
              Anonymous classroom signals
            </p>

          </div>

        </div>

        {/* ====================================================== */}
        {/* FACULTY ACTION */}
        {/* ====================================================== */}

        <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-5">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">

              <Zap className="h-4 w-4 text-cyan-400" />

            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Recommended faculty action
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                {data.facultyAction}
              </p>

            </div>

          </div>

        </div>

        {/* ====================================================== */}
        {/* CLASSROOM SUMMARY */}
        {/* ====================================================== */}

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">

          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
            Classroom summary
          </p>

          <p className="mt-2 text-base font-semibold leading-7 text-white/70">
            {data.classroomSummary}
          </p>

        </div>

        {/* ====================================================== */}
        {/* TWO COLUMN ANALYTICS */}
        {/* ====================================================== */}

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Learning gaps */}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

            <div className="flex items-center gap-2">

              <BookOpen className="h-4 w-4 text-cyan-400" />

              <h3 className="text-sm font-bold text-white">
                Learning gaps
              </h3>

            </div>

            {data.topics.length === 0 ? (

              <div className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center">

                <BookOpen className="mx-auto h-7 w-7 text-white/10" />

                <p className="mt-3 text-xs text-white/30">
                  No topic data available yet.
                </p>

              </div>

            ) : (

              <div className="mt-5 space-y-3">

                {data.topics
                  .slice(0, 5)
                  .map((topic) => (

                    <div
                      key={topic.topic}
                      className="rounded-xl border border-white/5 bg-white/[0.025] p-3"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <p className="min-w-0 truncate text-xs font-semibold text-white/70">
                          {topic.topic}
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold uppercase ${
                            topic.level ===
                            "critical"
                              ? "bg-red-400/10 text-red-400"
                              : topic.level ===
                                "moderate"
                              ? "bg-amber-400/10 text-amber-400"
                              : "bg-emerald-400/10 text-emerald-400"
                          }`}
                        >
                          {topic.level}
                        </span>

                      </div>

                      <div className="mt-3 flex items-center justify-between">

                        <span className="text-[9px] text-white/25">
                          Confusion
                        </span>

                        <span className="text-xs font-bold text-white/60">
                          {topic.confusionPercentage}%
                        </span>

                      </div>

                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">

                        <div
                          className={`h-full rounded-full ${
                            topic.level ===
                            "critical"
                              ? "bg-red-400"
                              : topic.level ===
                                "moderate"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                          style={{
                            width: `${topic.confusionPercentage}%`,
                          }}
                        />

                      </div>

                    </div>

                  ))}

              </div>

            )}

          </div>

          {/* Questions */}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

            <div className="flex items-center gap-2">

              <HelpCircle className="h-4 w-4 text-violet-400" />

              <h3 className="text-sm font-bold text-white">
                Student voice
              </h3>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-violet-400/5 p-4">

                <p className="text-[9px] uppercase tracking-wider text-violet-300/40">
                  Questions
                </p>

                <p className="mt-2 text-2xl font-black text-violet-300">
                  {data.totalQuestions}
                </p>

              </div>

              <div className="rounded-xl bg-emerald-400/5 p-4">

                <p className="text-[9px] uppercase tracking-wider text-emerald-300/40">
                  Answered
                </p>

                <p className="mt-2 text-2xl font-black text-emerald-300">
                  {data.answeredQuestions}
                </p>

              </div>

            </div>

            <div className="mt-3 rounded-xl bg-amber-400/5 p-4">

              <div className="flex items-center gap-2">

                <Clock3 className="h-4 w-4 text-amber-400" />

                <p className="text-xs font-semibold text-amber-300">
                  {data.unansweredQuestions} question
                  {data.unansweredQuestions ===
                  1
                    ? ""
                    : "s"} awaiting response
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ====================================================== */}
        {/* SESSION STORY */}
        {/* ====================================================== */}

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">

          <div className="flex items-center gap-2">

            <Clock3 className="h-4 w-4 text-cyan-400" />

            <h3 className="text-sm font-bold text-white">
              Classroom journey
            </h3>

          </div>

          {data.timeline.length === 0 ? (

            <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center">

              <Clock3 className="mx-auto h-7 w-7 text-white/10" />

              <p className="mt-3 text-xs text-white/30">
                Session timeline will appear once
                pulse responses arrive.
              </p>

            </div>

          ) : (

            <div className="mt-6 overflow-x-auto pb-2">

              <div className="flex min-w-max items-start">

                {data.timeline.map(
                  (item, index) => {

                    const isLast =
                      index ===
                      data.timeline.length -
                        1;

                    const isCritical =
                      item.level ===
                      "critical";

                    const isRecovery =
                      item.level ===
                      "recovery";

                    const isStrong =
                      item.level ===
                      "strong";

                    return (
                      <div
                        key={`${item.round}-${index}`}
                        className="flex items-start"
                      >

                        <div className="w-40">

                          <div
                            className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border ${
                              isCritical
                                ? "border-red-400/30 bg-red-400/10"
                                : isRecovery
                                ? "border-cyan-400/30 bg-cyan-400/10"
                                : isStrong
                                ? "border-emerald-400/30 bg-emerald-400/10"
                                : "border-white/10 bg-white/5"
                            }`}
                          >

                            {isCritical ? (
                              <AlertTriangle className="h-4 w-4 text-red-400" />
                            ) : isRecovery ? (
                              <TrendingUp className="h-4 w-4 text-cyan-400" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            )}

                          </div>

                          <div className="mt-3 text-center">

                            <p className="text-[9px] font-bold uppercase tracking-wider text-white/25">
                              Round{" "}
                              {item.round}
                            </p>

                            <p className="mt-1 text-xs font-bold text-white/70">
                              {item.title}
                            </p>

                            <p className="mt-1 text-lg font-black text-cyan-400">
                              {
                                item.understandingPercentage
                              }%
                            </p>

                            <p className="text-[9px] text-white/20">
                              {formatTime(
                                item.timestamp
                              )}
                            </p>

                          </div>

                        </div>

                        {!isLast && (
                          <div className="mt-5 h-px w-12 bg-white/10" />
                        )}

                      </div>
                    );
                  }
                )}

              </div>

            </div>

          )}

        </div>

        {/* ====================================================== */}
        {/* KEY SIGNALS */}
        {/* ====================================================== */}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

          <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-4">

            <div className="flex items-center gap-2">

              <AlertTriangle className="h-4 w-4 text-red-400" />

              <p className="text-xs font-bold text-red-300">
                Critical moments
              </p>

            </div>

            <p className="mt-3 text-2xl font-black text-white">
              {data.criticalMoments.length}
            </p>

            <p className="mt-1 text-[10px] text-white/25">
              Learning dips detected
            </p>

          </div>

          <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4">

            <div className="flex items-center gap-2">

              <TrendingUp className="h-4 w-4 text-cyan-400" />

              <p className="text-xs font-bold text-cyan-300">
                Recovery moments
              </p>

            </div>

            <p className="mt-3 text-2xl font-black text-white">
              {data.recoveryMoments.length}
            </p>

            <p className="mt-1 text-[10px] text-white/25">
              Understanding improved
            </p>

          </div>

          <div className="rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4">

            <div className="flex items-center gap-2">

              <BookOpen className="h-4 w-4 text-amber-400" />

              <p className="text-xs font-bold text-amber-300">
                Biggest gap
              </p>

            </div>

            <p className="mt-3 truncate text-sm font-black text-white">
              {data.biggestLearningGap
                ?.topic ??
                "Not detected"}
            </p>

            <p className="mt-1 text-[10px] text-white/25">
              {data.biggestLearningGap
                ? `${data.biggestLearningGap.confusionPercentage}% confusion`
                : "More data required"}
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}