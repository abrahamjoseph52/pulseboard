"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock3,
  MessageCircleQuestion,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import {
  AnonymousQuestion,
  getQuestionTopicCounts,
  subscribeToQuestions,
} from "@/app/services/question.service";

interface AnonymousQuestionsProps {
  sessionId: string;
}

function formatTime(
  date: Date | null
): string {
  if (!date) {
    return "Just now";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnonymousQuestions({
  sessionId,
}: AnonymousQuestionsProps) {
  const [questions, setQuestions] =
    useState<AnonymousQuestion[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const unsubscribe =
      subscribeToQuestions(
        sessionId,
        (items) => {
          setQuestions(items);
          setLoading(false);
          setError("");
        },
        (listenerError) => {
          console.error(
            "Anonymous question listener error:",
            listenerError
          );

          setError(
            "Unable to load anonymous questions."
          );

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  const topicCounts = useMemo(
    () =>
      getQuestionTopicCounts(
        questions
      ),
    [questions]
  );

  const answeredCount = useMemo(
    () =>
      questions.filter(
        (question) =>
          question.status === "answered"
      ).length,
    [questions]
  );

  const openCount =
    questions.length - answeredCount;

  /*
  |--------------------------------------------------------------------------
  | Missing session ID
  |--------------------------------------------------------------------------
  */

  if (!sessionId) {
    return (
      <section className="rounded-3xl border border-red-400/10 bg-red-400/5 p-6">
        <p className="text-sm font-semibold text-red-300">
          Session ID is missing.
        </p>

        <p className="mt-1 text-xs text-red-300/60">
          Anonymous questions cannot be loaded
          without a valid session.
        </p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl backdrop-blur-xl sm:p-6">

      {/* Decorative glow */}

      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="relative">

        {/* Header */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10">
              <MessageCircleQuestion className="h-5 w-5 text-cyan-400" />
            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                Student Voice
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Anonymous Questions
              </h2>

              <p className="mt-1 max-w-xl text-sm leading-5 text-white/40">
                Questions students may be
                hesitant to ask publicly.
              </p>

            </div>

          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-2">

            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />

            <span className="text-[11px] font-semibold text-emerald-300/80">
              Identity protected
            </span>

          </div>

        </div>

        {/* Statistics */}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

          {/* Questions */}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex items-center justify-between">

              <p className="text-xs text-white/35">
                Questions
              </p>

              <MessageSquare className="h-4 w-4 text-cyan-400/50" />

            </div>

            <p className="mt-2 text-2xl font-bold text-white">
              {questions.length}
            </p>

          </div>

          {/* Topics */}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex items-center justify-between">

              <p className="text-xs text-white/35">
                Topics
              </p>

              <TrendingUp className="h-4 w-4 text-cyan-400/50" />

            </div>

            <p className="mt-2 text-2xl font-bold text-white">
              {topicCounts.length}
            </p>

          </div>

          {/* Answered */}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex items-center justify-between">

              <p className="text-xs text-white/35">
                Answered
              </p>

              <CheckCircle2 className="h-4 w-4 text-emerald-400/60" />

            </div>

            <p className="mt-2 text-2xl font-bold text-white">
              {answeredCount}
            </p>

          </div>

          {/* Open */}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex items-center justify-between">

              <p className="text-xs text-white/35">
                Open
              </p>

              <Clock3 className="h-4 w-4 text-amber-400/60" />

            </div>

            <p className="mt-2 text-2xl font-bold text-white">
              {openCount}
            </p>

          </div>

        </div>

        {/* Topic analysis */}

        {topicCounts.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">

            <div className="flex items-center gap-2">

              <TrendingUp className="h-4 w-4 text-cyan-400" />

              <p className="text-xs font-bold uppercase tracking-wider text-white/45">
                Most asked topics
              </p>

            </div>

            <div className="mt-4 flex flex-wrap gap-2">

              {topicCounts
                .slice(0, 8)
                .map(
                  ({
                    topic,
                    count,
                  }) => (
                    <div
                      key={topic}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2"
                    >

                      <span className="text-xs text-white/60">
                        {topic}
                      </span>

                      <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                        {count}
                      </span>

                    </div>
                  )
                )}

            </div>

          </div>
        )}

        {/* Error */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/10 bg-red-400/5 p-4">

            <p className="text-sm text-red-300">
              {error}
            </p>

          </div>
        )}

        {/* Question feed */}

        <div className="mt-6">

          <div className="mb-3 flex items-center justify-between">

            <p className="text-xs font-bold uppercase tracking-wider text-white/35">
              Live question feed
            </p>

            <span className="text-[10px] text-white/25">
              Updates automatically
            </span>

          </div>

          {/* Loading */}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">

              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

              <p className="mt-3 text-xs text-white/30">
                Loading student questions...
              </p>

            </div>

          ) : questions.length === 0 ? (

            /* Empty state */

            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center">

              <MessageCircleQuestion className="mx-auto h-9 w-9 text-white/10" />

              <p className="mt-4 text-sm font-semibold text-white/45">
                No questions yet
              </p>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-white/25">
                Anonymous academic questions
                from students will appear here
                during the session.
              </p>

            </div>

          ) : (

            /* Questions */

            <div className="space-y-3">

              {questions.map(
                (question) => (
                  <article
                    key={question.id}
                    className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-cyan-400/20 hover:bg-white/[0.035]"
                  >

                    <div className="flex items-start gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">

                        <MessageCircleQuestion className="h-4 w-4 text-cyan-400" />

                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/40">
                            {question.topic}
                          </span>

                          <span className="flex items-center gap-1 rounded-full bg-emerald-400/5 px-2 py-1 text-[10px] text-emerald-400/70">

                            <ShieldCheck className="h-3 w-3" />

                            Anonymous

                          </span>

                          <span className="ml-auto text-[10px] text-white/20">
                            {formatTime(
                              question.createdAt
                            )}
                          </span>

                        </div>

                        <p className="mt-3 text-sm leading-6 text-white/75">
                          {question.question}
                        </p>

                        {question.status === "answered" && (
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400/70">

                            <CheckCircle2 className="h-3.5 w-3.5" />

                            Answered

                          </div>
                        )}

                      </div>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </div>

      </div>

    </section>
  );
}