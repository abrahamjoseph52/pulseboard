"use client";

import {
  CheckCircle2,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  FormEvent,
  useState,
} from "react";

import {
  submitAnonymousQuestion,
  validateQuestion,
} from "@/app/services/question.service";

interface AnonymousQuestionBoxProps {
  sessionId: string;
  topic: string;
  topicNumber?: number;
}

export default function AnonymousQuestionBox({
  sessionId,
  topic,
  topicNumber,
}: AnonymousQuestionBoxProps) {
  const [question, setQuestion] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  /*
   * ----------------------------------------------------------
   * Submit question
   * ----------------------------------------------------------
   */

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (sending) {
        return;
      }

      setError("");
      setSuccess(false);

      /*
       * Validate before sending.
       */

      const validation =
        validateQuestion(question);

      if (!validation.valid) {
        setError(
          validation.reason ||
            "Please enter a valid question."
        );

        return;
      }

      if (!sessionId.trim()) {
        setError(
          "This session is missing its ID."
        );

        return;
      }

      const cleanTopic =
        topic.trim() || "General";

      setSending(true);

      try {
        await submitAnonymousQuestion(
          sessionId,
          question,
          cleanTopic
        );

        /*
         * Clear the input only after
         * Firestore successfully accepts it.
         */

        setQuestion("");
        setSuccess(true);
      } catch (submitError) {
        console.error(
          "Failed to submit anonymous question:",
          submitError
        );

        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to submit your question. Please try again."
        );
      } finally {
        setSending(false);
      }
    };

  /*
   * ----------------------------------------------------------
   * Character count
   * ----------------------------------------------------------
   */

  const characterCount =
    question.length;

  const characterLimit = 500;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/10 bg-linear-to-br from-cyan-400/[0.07] via-(--surface) to-violet-500/[0.05] p-5 shadow-(--shadow-lg) sm:p-6">

      {/* Decorative glow */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl"
      />

      <div className="relative">

        {/* --------------------------------------------------
            Header
        -------------------------------------------------- */}

        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              <MessageCircleQuestion className="h-5 w-5" />
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
                  Student Voice
                </p>

                {typeof topicNumber ===
                  "number" &&
                  topicNumber > 0 && (
                    <span className="rounded-full border border-cyan-400/10 bg-cyan-400/5 px-2 py-1 text-[9px] font-bold text-cyan-300/70">
                      Round {topicNumber}
                    </span>
                  )}

              </div>

              <h2 className="mt-1 text-xl font-black tracking-tight text-(--foreground)">
                Ask anonymously
              </h2>

              <p className="mt-1 max-w-xl text-xs leading-5 text-(--foreground-muted)">
                Have a question you&apos;re
                hesitant to ask aloud? Send it
                anonymously to your faculty.
              </p>

            </div>

          </div>

          {/* Privacy badge */}

          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 sm:flex">

            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />

            <span className="text-[10px] font-bold text-emerald-300/80">
              Anonymous
            </span>

          </div>

        </div>

        {/* --------------------------------------------------
            Current topic
        -------------------------------------------------- */}

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">

          <Sparkles className="h-4 w-4 shrink-0 text-violet-300" />

          <div className="min-w-0">

            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
              Current topic
            </p>

            <p className="mt-1 truncate text-xs font-bold text-(--foreground-secondary)">
              {topic || "General"}
            </p>

          </div>

        </div>

        {/* --------------------------------------------------
            Question form
        -------------------------------------------------- */}

        <form
          onSubmit={handleSubmit}
          className="mt-5"
        >

          <label
            htmlFor="anonymous-question"
            className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)"
          >
            Your question
          </label>

          <textarea
            id="anonymous-question"
            value={question}
            onChange={(event) => {
              setQuestion(
                event.target.value
              );

              /*
               * Remove previous feedback
               * when the student starts editing.
               */

              if (error) {
                setError("");
              }

              if (success) {
                setSuccess(false);
              }
            }}
            placeholder="What would you like to ask about this topic?"
            maxLength={characterLimit}
            disabled={sending}
            rows={4}
            className="w-full resize-none rounded-2xl border border-(--border) bg-(--background-soft) px-4 py-3.5 text-sm leading-6 text-(--foreground) outline-none transition placeholder:text-(--foreground-subtle) focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-2 flex items-center justify-between">

            <p className="text-[10px] text-(--foreground-subtle)">
              Academic questions only
            </p>

            <span
              className={[
                "text-[10px] font-semibold",
                characterCount >
                  450
                  ? "text-amber-300"
                  : "text-(--foreground-subtle)",
              ].join(" ")}
            >
              {characterCount}/
              {characterLimit}
            </span>

          </div>

          {/* ------------------------------------------------
              Error
          ------------------------------------------------ */}

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] px-4 py-3">

              <div className="flex items-start gap-3">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                  <MessageCircleQuestion className="h-4 w-4" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-black text-rose-300">
                    Question not submitted
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-rose-300/80">
                    {error}
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* ------------------------------------------------
              Success
          ------------------------------------------------ */}

          {success && (
            <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3">

              <div className="flex items-start gap-3">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

                <div>

                  <p className="text-xs font-black text-emerald-300">
                    Question sent
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-(--foreground-muted)">
                    Your anonymous question has
                    been sent to your faculty.
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* ------------------------------------------------
              Submit
          ------------------------------------------------ */}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-2">

              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />

              <p className="text-[10px] leading-4 text-(--foreground-subtle)">
                Your identity is not stored
                with this question.
              </p>

            </div>

            <button
              type="submit"
              disabled={
                sending ||
                !question.trim()
              }
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-cyan-500 to-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-cyan-500/10 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >

              {sending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />

                  Send anonymously
                </>
              )}

            </button>

          </div>

        </form>

        {/* --------------------------------------------------
            Privacy note
        -------------------------------------------------- */}

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">

          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" />

          <p className="text-[10px] leading-5 text-(--foreground-subtle)">
            PulseBoard stores the question,
            session, topic, status, and
            timestamp. It does not intentionally
            store your name, email, student ID,
            or Firebase UID with the question.
          </p>

        </div>

      </div>

    </section>
  );
}