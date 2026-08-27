"use client"

import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageCircleQuestion,
  Send,
  UserRound,
  X,
} from "lucide-react"

import { useEffect, useState } from "react"

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"

import { getAuth } from "firebase/auth"

import { db } from "@/lib/firebase"

type QuestionStatus = "visible" | "answered"

type AnonymousQuestion = {
  id: string
  sessionId: string
  question: string
  topic: string
  status: QuestionStatus
  createdAt: string
  answer: string
  answeredAt: string
  answeredBy: string
}

type AnonymousQuestionsProps = {
  sessionId: string
}

/*
 * =========================================================
 * SAFE STRING HELPERS
 * =========================================================
 */

function safeString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function timestampToText(value: unknown): string {
  if (!value) {
    return ""
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    try {
      const date = value.toDate()

      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toLocaleString()
      }
    } catch {
      return ""
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString()
  }

  return ""
}

/*
 * =========================================================
 * COMPONENT
 * =========================================================
 */

export default function AnonymousQuestions({
  sessionId,
}: AnonymousQuestionsProps) {
  const [questions, setQuestions] = useState<
    AnonymousQuestion[]
  >([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [answeringId, setAnsweringId] =
    useState<string | null>(null)

  const [answerText, setAnswerText] =
    useState<Record<string, string>>({})

  const [expandedId, setExpandedId] =
    useState<string | null>(null)

  /*
   * =========================================================
   * REALTIME QUESTIONS
   * =========================================================
   */

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const questionsQuery = query(
      collection(db, "questions"),
      orderBy("createdAt", "desc")
    )

    const unsubscribe = onSnapshot(
      questionsQuery,
      (snapshot) => {
        const nextQuestions: AnonymousQuestion[] =
          snapshot.docs
            .map((questionDoc) => {
              const data = questionDoc.data()

              const questionSessionId =
                safeString(data.sessionId)

              /*
               * Ignore questions belonging to another session.
               */
              if (
                questionSessionId !== sessionId
              ) {
                return null
              }

              const questionText =
                safeString(data.question) ||
                safeString(data.text)

              const answer =
                safeString(data.answer)

              const status: QuestionStatus =
                data.status === "answered"
                  ? "answered"
                  : "visible"

              return {
                id: questionDoc.id,

                sessionId:
                  questionSessionId,

                question:
                  questionText,

                topic:
                  safeString(data.topic),

                status,

                createdAt:
                  timestampToText(
                    data.createdAt
                  ),

                answer,

                answeredAt:
                  timestampToText(
                    data.answeredAt
                  ),

                answeredBy:
                  safeString(
                    data.answeredBy
                  ),
              }
            })
            .filter(
              (
                question
              ): question is AnonymousQuestion =>
                question !== null
            )

        setQuestions(nextQuestions)
        setLoading(false)
      },
      (snapshotError) => {
        console.error(
          "Failed to load anonymous questions:",
          snapshotError
        )

        setError(
          "Unable to load anonymous questions."
        )

        setLoading(false)
      }
    )

    return unsubscribe
  }, [sessionId])

  /*
   * =========================================================
   * ANSWER QUESTION
   * =========================================================
   */

  const handleAnswer = async (
    question: AnonymousQuestion
  ) => {
    const cleanAnswer = (
      answerText[question.id] || ""
    ).trim()

    if (!cleanAnswer) {
      setError(
        "Please enter an answer before submitting."
      )

      return
    }

    if (cleanAnswer.length > 2000) {
      setError(
        "Answer must be 2000 characters or less."
      )

      return
    }

    try {
      setAnsweringId(question.id)

      setError(null)

      const auth = getAuth()

      const currentUser = auth.currentUser

      if (!currentUser) {
        throw new Error(
          "You must be signed in to answer a question."
        )
      }

      await updateDoc(
        doc(
          db,
          "questions",
          question.id
        ),
        {
          answer: cleanAnswer,

          status: "answered",

          answeredAt:
            serverTimestamp(),

          answeredBy:
            currentUser.uid,
        }
      )

      setAnswerText(
        (current) => ({
          ...current,
          [question.id]: "",
        })
      )

      setExpandedId(null)
    } catch (answerError) {
      console.error(
        "Failed to answer question:",
        answerError
      )

      setError(
        "Unable to submit the answer. Please try again."
      )
    } finally {
      setAnsweringId(null)
    }
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <section className="surface overflow-hidden rounded-[2rem] p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
            <MessageCircleQuestion className="h-5 w-5" />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
              Anonymous Question Box
            </p>

            <h2 className="mt-1 text-xl font-black">
              Student questions
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-(--border-strong) bg-(--background-soft) p-8 text-center">
          <p className="text-sm text-(--foreground-muted)">
            Loading student questions...
          </p>
        </div>
      </section>
    )
  }

  /*
   * =========================================================
   * COUNTS
   * =========================================================
   */

  const unansweredCount =
    questions.filter(
      (question) =>
        question.status !== "answered"
    ).length

  const answeredCount =
    questions.filter(
      (question) =>
        question.status === "answered"
    ).length

  /*
   * =========================================================
   * MAIN
   * =========================================================
   */

  return (
    <section className="surface overflow-hidden rounded-[2rem] p-6 sm:p-7">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div className="flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
            <MessageCircleQuestion className="h-5 w-5" />
          </div>

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
              Anonymous Question Box
            </p>

            <h2 className="mt-1 text-xl font-black">
              Student questions
            </h2>

            <p className="mt-1 text-sm leading-6 text-(--foreground-muted)">
              Students can ask questions anonymously while you answer them here.
            </p>

          </div>

        </div>

        <div className="flex shrink-0 items-center gap-2">

          <span className="rounded-full border border-amber-400/10 bg-amber-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
            {unansweredCount} unanswered
          </span>

          <span className="rounded-full border border-emerald-400/10 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
            {answeredCount} answered
          </span>

        </div>

      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] px-4 py-3">

          <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />

          <p className="text-xs leading-5 text-rose-300">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            className="ml-auto text-rose-300/70 hover:text-rose-300"
          >
            <X className="h-4 w-4" />
          </button>

        </div>
      )}

      {/* =====================================================
          NO QUESTIONS
      ===================================================== */}

      {questions.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-12 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300">
            <MessageCircleQuestion className="h-6 w-6" />
          </div>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
            No questions yet
          </p>

          <h3 className="mt-2 text-lg font-black">
            Your students haven&apos;t asked anything
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--foreground-muted)">
            Anonymous student questions will appear here as soon as they are submitted.
          </p>

        </div>
      ) : (
        <div className="mt-6 space-y-3">

          {questions.map(
            (
              question,
              index
            ) => {

              const isExpanded =
                expandedId ===
                question.id

              const isAnswering =
                answeringId ===
                question.id

              const currentAnswer =
                answerText[
                  question.id
                ] || ""

              const answered =
                question.status ===
                  "answered" &&
                Boolean(
                  question.answer.trim()
                )

              return (
                <div
                  key={
                    question.id
                  }
                  className={[
                    "overflow-hidden rounded-3xl border transition-all",
                    answered
                      ? "border-emerald-400/10 bg-emerald-500/[0.025]"
                      : "border-violet-400/10 bg-violet-500/[0.025]",
                  ].join(" ")}
                >

                  {/* =================================================
                      QUESTION HEADER
                  ================================================= */}

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        isExpanded
                          ? null
                          : question.id
                      )
                    }
                    className="w-full px-5 py-4 text-left transition hover:bg-(--surface-hover)"
                  >

                    <div className="flex items-start gap-4">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--surface) text-(--foreground-muted)">
                        <UserRound className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-full border border-violet-400/10 bg-violet-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-violet-300">
                            Anonymous
                          </span>

                          {answered ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/10 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-300">

                              <Check className="h-3 w-3" />

                              Answered

                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/10 bg-amber-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-amber-300">

                              <Clock className="h-3 w-3" />

                              Needs answer

                            </span>
                          )}

                          <span className="text-[9px] text-(--foreground-subtle)">
                            #{index + 1}
                          </span>

                        </div>

                        <p className="mt-3 text-sm font-bold leading-6 text-(--foreground)">
                          {question.question}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">

                          {question.topic && (
                            <span className="rounded-lg bg-(--surface) px-2 py-1 text-[9px] font-semibold text-(--foreground-muted)">
                              Topic:{" "}
                              {question.topic}
                            </span>
                          )}

                          {question.createdAt && (
                            <span className="text-[9px] text-(--foreground-subtle)">
                              {question.createdAt}
                            </span>
                          )}

                        </div>

                      </div>

                      <div className="shrink-0 pt-1 text-(--foreground-muted)">

                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}

                      </div>

                    </div>

                  </button>

                  {/* =================================================
                      EXPANDED ANSWER AREA
                  ================================================= */}

                  {isExpanded && (
                    <div className="border-t border-(--border) px-5 py-5">

                      {/* =================================================
                          EXISTING ANSWER
                      ================================================= */}

                      {answered && (
                        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.045] p-4">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                              <Check className="h-4 w-4" />
                            </div>

                            <div>

                              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                                Faculty answer
                              </p>

                              {question.answeredAt && (
                                <p className="mt-0.5 text-[9px] text-(--foreground-subtle)">
                                  {question.answeredAt}
                                </p>
                              )}

                            </div>

                          </div>

                          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-(--foreground-secondary)">
                            {question.answer}
                          </p>

                        </div>
                      )}

                      {/* =================================================
                          ANSWER FORM
                      ================================================= */}

                      <div
                        className={
                          answered
                            ? "mt-5"
                            : ""
                        }
                      >

                        <label
                          htmlFor={`answer-${question.id}`}
                          className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-muted)"
                        >
                          {answered
                            ? "Update answer"
                            : "Your answer"}
                        </label>

                        <textarea
                          id={`answer-${question.id}`}
                          value={
                            currentAnswer
                          }
                          onChange={(
                            event
                          ) => {

                            setAnswerText(
                              (
                                current
                              ) => ({
                                ...current,

                                [question.id]:
                                  event.target.value,
                              })
                            )

                            if (error) {
                              setError(
                                null
                              )
                            }

                          }}
                          maxLength={2000}
                          rows={5}
                          placeholder="Type a clear explanation for the student..."
                          className="w-full resize-none rounded-2xl border border-(--border) bg-(--background-soft) px-4 py-3 text-sm leading-6 text-(--foreground) outline-none transition placeholder:text-(--foreground-subtle) focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10"
                        />

                        <div className="mt-2 flex items-center justify-between gap-3">

                          <span className="text-[9px] text-(--foreground-subtle)">
                            {currentAnswer.length}
                            /2000
                          </span>

                          <div className="flex items-center gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(
                                  null
                                )
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--background-soft) px-4 text-xs font-bold text-(--foreground-muted) transition hover:bg-(--surface-hover) hover:text-(--foreground)"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              disabled={
                                isAnswering ||
                                !currentAnswer.trim()
                              }
                              onClick={() =>
                                void handleAnswer(
                                  question
                                )
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-4 text-xs font-black text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {isAnswering ? (
                                <>
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5" />

                                  {answered
                                    ? "Update Answer"
                                    : "Answer Student"}
                                </>
                              )}

                            </button>

                          </div>

                        </div>

                      </div>

                    </div>
                  )}

                </div>
              )
            }
          )}

        </div>
      )}

    </section>
  )
}