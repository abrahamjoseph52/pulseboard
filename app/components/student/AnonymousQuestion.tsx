"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  CheckCircle2,
  Loader2,
  MessageCircleQuestion,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  submitAnonymousQuestion,
  validateQuestion,
} from "@/app/services/question.service";

interface AnonymousQuestionProps {
  sessionId: string;
  topic?: string;
}

export default function AnonymousQuestion({
  sessionId,
  topic = "General",
}: AnonymousQuestionProps) {
  const [question, setQuestion] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const validation =
      validateQuestion(question);

    if (!validation.valid) {
      setError(
        validation.reason ||
          "Please check your question."
      );

      return;
    }

    try {
      setSending(true);

      await submitAnonymousQuestion(
        sessionId,
        question,
        topic
      );

      setQuestion("");
      setSuccess(true);

      window.setTimeout(() => {
        setSuccess(false);
      }, 4000);
    } catch (error) {
      console.error(
        "Question submission failed:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to send your question."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl backdrop-blur-xl sm:p-6">

      {/* Decorative glow */}

      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative">

        {/* Header */}

        <div className="flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10">
            <MessageCircleQuestion className="h-5 w-5 text-cyan-400" />
          </div>

          <div className="min-w-0">

            <h2 className="text-lg font-bold text-white">
              Ask anonymously
            </h2>

            <p className="mt-1 text-sm leading-5 text-white/45">
              Have a question? Ask your faculty
              without revealing your identity.
            </p>

          </div>

        </div>

        {/* Privacy badge */}

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 px-3 py-3">

          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />

          <div>
            <p className="text-xs font-semibold text-emerald-300">
              Your identity stays private
            </p>

            <p className="mt-0.5 text-[11px] leading-4 text-emerald-300/60">
              Your name, email and student ID are
              not attached to this question.
            </p>
          </div>

        </div>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="mt-5"
        >

          <label
            htmlFor="anonymous-question"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40"
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

              setError("");
              setSuccess(false);
            }}
            disabled={sending}
            maxLength={500}
            rows={5}
            placeholder="Example: Why does binary search have O(log n) time complexity?"
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Character count */}

          <div className="mt-2 flex items-center justify-between">

            <span className="text-[11px] text-white/25">
              Academic questions are encouraged.
            </span>

            <span className="text-[11px] text-white/30">
              {question.length}/500
            </span>

          </div>

          {/* Error */}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-400/10 bg-red-400/5 p-3">

              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

              <p className="text-xs leading-5 text-red-300">
                {error}
              </p>

            </div>
          )}

          {/* Success */}

          {success && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3">

              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />

              <div>
                <p className="text-xs font-semibold text-emerald-300">
                  Question submitted!
                </p>

                <p className="mt-0.5 text-[11px] text-emerald-300/60">
                  Your faculty can now see it
                  anonymously.
                </p>
              </div>

            </div>
          )}

          {/* Submit */}

          <button
            type="submit"
            disabled={
              sending ||
              !question.trim() ||
              !sessionId
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[190px]"
          >

            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageCircleQuestion className="h-4 w-4" />
                Ask anonymously
              </>
            )}

          </button>

        </form>

      </div>

    </section>
  );
}