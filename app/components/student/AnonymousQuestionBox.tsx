
"use client";

import {
  CheckCircle2,
  Clock3,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
  submitAnonymousQuestion,
  validateQuestion,
} from "@/app/services/question.service";

interface AnonymousQuestionBoxProps {
  sessionId: string;
  topic: string;
  topicNumber?: number;
}

interface QuestionRecord {
  id: string;
  text: string;
  status: string;
  answer: string;
  createdAt?: unknown;
  answeredAt?: unknown;
}

interface RawQuestion {
  text?: unknown;
  question?: unknown;
  questionText?: unknown;
  content?: unknown;

  status?: unknown;
  answerStatus?: unknown;
  state?: unknown;

  answer?: unknown;
  answerText?: unknown;
  facultyAnswer?: unknown;
  reply?: unknown;
  response?: unknown;
  facultyReply?: unknown;

  createdAt?: unknown;
  answeredAt?: unknown;
}

const STORAGE_PREFIX =
  "pulseboard-anonymous-question-ids:";

/* -------------------------------------------------------------------------- */
/* Storage helpers                                                            */
/* -------------------------------------------------------------------------- */

function getStorageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId.trim()}`;
}

function readStoredQuestionIds(
  sessionId: string
): string[] {
  if (
    typeof window === "undefined" ||
    !sessionId.trim()
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        getStorageKey(sessionId)
      );

    if (!raw) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );
  } catch {
    return [];
  }
}

function saveQuestionId(
  sessionId: string,
  questionId: string
): void {
  if (
    typeof window === "undefined" ||
    !sessionId.trim() ||
    !questionId.trim()
  ) {
    return;
  }

  try {
    const existing =
      readStoredQuestionIds(sessionId);

    if (!existing.includes(questionId)) {
      const updated = [
        ...existing,
        questionId,
      ].slice(-20);

      window.localStorage.setItem(
        getStorageKey(sessionId),
        JSON.stringify(updated)
      );
    }
  } catch {
    // Ignore localStorage failures.
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getString(
  ...values: unknown[]
): string {
  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function normalizeStatus(
  data: RawQuestion
): string {
  return (
    getString(
      data.status,
      data.answerStatus,
      data.state
    ).toLowerCase() || "pending"
  );
}

function getAnswer(
  data: RawQuestion
): string {
  return getString(
    data.answer,
    data.answerText,
    data.facultyAnswer,
    data.reply,
    data.response,
    data.facultyReply
  );
}

function isAnswered(
  question: QuestionRecord
): boolean {
  return (
    Boolean(question.answer) ||
    [
      "answered",
      "resolved",
      "replied",
      "closed",
    ].includes(question.status)
  );
}

function getTimestampValue(
  value: unknown
): number {
  if (!value) {
    return 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    try {
      return (
        value as {
          toDate: () => Date;
        }
      ).toDate().getTime();
    } catch {
      return 0;
    }
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  return 0;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

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

  const [questions, setQuestions] =
    useState<QuestionRecord[]>([]);

  const [myQuestionIds, setMyQuestionIds] =
    useState<string[]>([]);

  const [
    questionsLoading,
    setQuestionsLoading,
  ] = useState(true);

  const [
    questionsError,
    setQuestionsError,
  ] = useState("");

  /*
   * Read the browser's stored question IDs.
   *
   * This is intentionally NOT done inside useEffect.
   * It prevents the react-hooks/set-state-in-effect
   * ESLint error.
   *
   * localStorage is only available in the browser,
   * so the initial server render simply uses [].
   */
  const cleanSessionId =
    sessionId.trim();

  const storedQuestionIds = useMemo(() => {
    if (
      typeof window === "undefined" ||
      !cleanSessionId
    ) {
      return [];
    }

    return readStoredQuestionIds(
      cleanSessionId
    );
  }, [cleanSessionId]);

  /*
   * Combine localStorage IDs with IDs captured
   * in React state after a new submission.
   */
  const trackedQuestionIds =
    useMemo(() => {
      return Array.from(
        new Set([
          ...storedQuestionIds,
          ...myQuestionIds,
        ])
      );
    }, [
      storedQuestionIds,
      myQuestionIds,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Realtime Firestore question listener                                    */
  /* ------------------------------------------------------------------------ */

useEffect(() => {
  if (!cleanSessionId) {
    return;
  }

  const questionsQuery = query(
    collection(db, "questions"),
    where("sessionId", "==", cleanSessionId)
  );

  const unsubscribe = onSnapshot(
    questionsQuery,
    (snapshot) => {
      const storedIds = new Set(
        readStoredQuestionIds(cleanSessionId)
      );

      for (const id of myQuestionIds) {
        storedIds.add(id);
      }

      const items: QuestionRecord[] = snapshot.docs
        .filter((document) =>
          storedIds.has(document.id)
        )
        .map((document) => {
          const data =
            document.data() as RawQuestion;

          return {
            id: document.id,

            text: getString(
              data.text,
              data.question,
              data.questionText,
              data.content
            ),

            status: normalizeStatus(data),

            answer: getAnswer(data),

            createdAt: data.createdAt,

            answeredAt: data.answeredAt,
          };
        });

      items.sort((a, b) => {
        const aTime = getTimestampValue(
          a.createdAt
        );

        const bTime = getTimestampValue(
          b.createdAt
        );

        return bTime - aTime;
      });

      setQuestions(items);
      setQuestionsLoading(false);
      setQuestionsError("");
    },
    (listenerError) => {
      console.error(
        "Failed to listen for question answers:",
        listenerError
      );

      setQuestionsLoading(false);

      setQuestionsError(
        "Unable to load your question replies."
      );
    }
  );

  return () => {
    unsubscribe();
  };
}, [
  cleanSessionId,
  myQuestionIds,
]);

  /* ------------------------------------------------------------------------ */
  /* Answered questions                                                      */
  /* ------------------------------------------------------------------------ */

  const answeredQuestions =
    useMemo(
      () =>
        questions.filter(
          isAnswered
        ),
      [questions]
    );

  /* ------------------------------------------------------------------------ */
  /* Submit question                                                          */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (sending) {
      return;
    }

    setError("");
    setSuccess(false);

    const validation =
      validateQuestion(question);

    if (!validation.valid) {
      setError(
        validation.reason ||
          "Please enter a valid question."
      );

      return;
    }

    if (!cleanSessionId) {
      setError(
        "This session is missing its ID."
      );

      return;
    }

    const cleanTopic =
      topic.trim() || "General";

    setSending(true);

    try {
      /*
       * submitAnonymousQuestion()
       * returns the Firestore document ID.
       */
      const questionId =
        await submitAnonymousQuestion(
          cleanSessionId,
          question,
          cleanTopic
        );

      /*
       * Immediately remember the ID in React state.
       */
      setMyQuestionIds(
        (previous) => {
          if (
            previous.includes(
              questionId
            )
          ) {
            return previous;
          }

          return [
            ...previous,
            questionId,
          ].slice(-20);
        }
      );

      /*
       * Persist the ID so the student can
       * still see the question after refresh.
       */
      saveQuestionId(
        cleanSessionId,
        questionId
      );

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

  /* ------------------------------------------------------------------------ */
  /* Character count                                                          */
  /* ------------------------------------------------------------------------ */

  const characterCount =
    question.length;

  const characterLimit = 500;

  /* ------------------------------------------------------------------------ */
  /* UI                                                                        */
  /* ------------------------------------------------------------------------ */

  return (
    <section className="relative overflow-hidden rounded-4xl border border-cyan-400/10 bg-linear-to-br from-cyan-400/7 via-(--surface) to-violet-500/5 p-5 shadow-(--shadow-lg) sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl"
      />

      <div className="relative">
        {/* Header */}
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
                      Round{" "}
                      {topicNumber}
                    </span>
                  )}
              </div>

              <h2 className="mt-1 text-xl font-black tracking-tight text-(--foreground)">
                Ask anonymously
              </h2>

              <p className="mt-1 max-w-xl text-xs leading-5 text-(--foreground-muted)">
                Have a question
                you&apos;re hesitant
                to ask aloud? Send
                it anonymously to
                your faculty.
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />

            <span className="text-[10px] font-bold text-emerald-300/80">
              Anonymous
            </span>
          </div>
        </div>

        {/* Current topic */}
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

        {/* Question form */}
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
              Academic questions
              only
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

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/15 bg-rose-500/6 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                  <MessageCircleQuestion className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black text-rose-300">
                    Question not
                    submitted
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-rose-300/80">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-black text-emerald-300">
                    Question sent
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-(--foreground-muted)">
                    Your anonymous
                    question has
                    been sent to
                    your faculty.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit row */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />

              <p className="text-[10px] leading-4 text-(--foreground-subtle)">
                Your identity is
                not stored with
                this question.
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

        {/* Faculty replies */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
                Faculty replies
              </p>

              <h3 className="mt-1 text-base font-black text-(--foreground)">
                Your answered
                questions
              </h3>
            </div>

            {answeredQuestions.length >
              0 && (
              <span className="rounded-full border border-emerald-400/10 bg-emerald-400/5 px-2.5 py-1 text-[9px] font-black text-emerald-300">
                {
                  answeredQuestions.length
                }{" "}
                answered
              </span>
            )}
          </div>

          {/* Listener error */}
          {questionsError && (
            <div className="mt-4 rounded-2xl border border-rose-500/10 bg-rose-500/5 px-4 py-3">
              <p className="text-[11px] leading-5 text-rose-300/80">
                {questionsError}
              </p>
            </div>
          )}

          {/* Loading */}
          {questionsLoading ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-(--border) bg-(--background-soft) px-4 py-4">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />

              <p className="text-[11px] text-(--foreground-muted)">
                Checking for faculty
                replies...
              </p>
            </div>
          ) : answeredQuestions.length ===
            0 ? (
            /* Empty state */
            <div className="mt-4 rounded-2xl border border-dashed border-(--border) bg-(--background-soft) px-5 py-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Clock3 className="h-4 w-4" />
              </div>

              <p className="mt-3 text-xs font-black text-(--foreground-secondary)">
                Waiting for your
                faculty
              </p>

              <p className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-(--foreground-subtle)">
                Your question will
                appear here with
                the faculty&apos;s
                reply as soon as
                it is answered.
              </p>
            </div>
          ) : (
            /* Answer list */
            <div className="mt-4 space-y-3">
              {answeredQuestions.map(
                (item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-emerald-400/10 bg-emerald-400/3"
                  >
                    {/* Student question */}
                    <div className="border-b border-white/5 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                          <MessageCircleQuestion className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-400">
                            Your anonymous
                            question
                          </p>

                          <p className="mt-1 text-xs leading-5 text-(--foreground-secondary)">
                            {item.text ||
                              "Question"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Faculty answer */}
                    <div className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-400">
                              Faculty answer
                            </p>

                            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300">
                              Answered
                            </span>
                          </div>

                          <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-(--foreground-secondary)">
                            {item.answer ||
                              "Your faculty has marked this question as answered."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>

        {/* Privacy note */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/5 bg-white/2 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" />

          <p className="text-[10px] leading-5 text-(--foreground-subtle)">
            PulseBoard stores the
            question, session, topic,
            status, and timestamp. It
            does not intentionally store
            your name, email, student ID,
            or Firebase UID with the
            question.
          </p>
        </div>
      </div>
    </section>
  );
}