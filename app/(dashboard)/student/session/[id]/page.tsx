"use client"

import {
  ArrowLeft,
  CheckCircle2,
  Radio,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"

import {
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react"

import {
  useParams,
  useRouter,
} from "next/navigation"

import FeedbackForm from "@/app/components/student/FeedbackForm"
import SessionStatus from "@/app/components/student/SessionStatus"
import Card from "@/app/components/ui/Card"
import Loading from "@/app/components/ui/Loading"
import ThemeToggle from "@/app/components/ThemeToggle"
import AnonymousQuestionBox from "@/app/components/student/AnonymousQuestionBox"

import { auth, db } from "@/lib/firebase"

import {
  useSession,
} from "@/app/hooks/useSession"

import {
  sendSignal,
} from "@/app/services/feedback.service"

import type {
  Signal,
  SignalType,
} from "@/lib/types"

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore"


export default function StudentSessionPage() {
  const params = useParams()
  const router = useRouter()

  const sessionId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id

  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useSession(
    typeof sessionId === "string"
      ? sessionId
      : undefined
  )


  /*
   * =========================================================
   * CURRENT ROUND
   * =========================================================
   */

  const currentRound =
    session?.currentRound ?? 0


  /*
   * =========================================================
   * FIRESTORE-BACKED STUDENT RESPONSE
   * =========================================================
   *
   * Firestore is the permanent source of truth.
   *
   * Student submits Topic 1
   *        ↓
   * Firestore stores signal
   *        ↓
   * Student leaves page
   *        ↓
   * Student returns
   *        ↓
   * Firestore listener finds signal
   *        ↓
   * Topic 1 remains locked
   *
   * Topic 2 remains available.
   */

  const [
    firestoreSignals,
    setFirestoreSignals,
  ] = useState<Signal[]>([])

  const [
    signalsLoading,
    setSignalsLoading,
  ] = useState(true)

  const [
    signalLoadError,
    setSignalLoadError,
  ] = useState("")


  /*
   * =========================================================
   * STUDENT AUTH STATE
   * =========================================================
   */

  const currentUser =
    auth.currentUser

  const validSessionId =
    typeof sessionId === "string" &&
    sessionId.trim().length > 0

  const feedbackUnavailable =
    !validSessionId ||
    !currentUser


  /*
   * =========================================================
   * FIRESTORE SIGNAL LISTENER
   * =========================================================
   *
   * IMPORTANT:
   *
   * We intentionally do NOT call setState directly in the
   * effect body.
   *
   * React's set-state-in-effect ESLint rule complains about
   * synchronous state updates inside the effect.
   *
   * All state updates below happen inside the Firestore
   * subscription callback, which is exactly what the rule
   * expects.
   */

  useEffect(() => {
    if (
      !validSessionId ||
      !currentUser
    ) {
      return
    }

    const signalsCollection =
      collection(
        db,
        "signals"
      )

    const studentSignalsQuery =
      query(
        signalsCollection,

        where(
          "sessionId",
          "==",
          sessionId.trim()
        ),

        where(
          "studentId",
          "==",
          currentUser.uid
        )
      )

    const unsubscribe =
      onSnapshot(
        studentSignalsQuery,

        (snapshot) => {
          const signals: Signal[] =
            snapshot.docs.map(
              (signalDocument) => {
                const data =
                  signalDocument.data()

                /*
                 * ---------------------------------------------
                 * NORMALIZE ROUND
                 * ---------------------------------------------
                 */

                const rawRound =
                  data.round

                let round = 0

                if (
                  typeof rawRound ===
                    "number" &&
                  Number.isInteger(
                    rawRound
                  )
                ) {
                  round =
                    rawRound
                } else if (
                  typeof rawRound ===
                    "string"
                ) {
                  const parsed =
                    Number(
                      rawRound
                    )

                  if (
                    Number.isInteger(
                      parsed
                    )
                  ) {
                    round =
                      parsed
                  }
                }

                /*
                 * ---------------------------------------------
                 * VALID SIGNAL TYPES
                 * ---------------------------------------------
                 */

                const rawSignal =
                  data.signal

                const validSignals: SignalType[] =
                  [
                    "got_it",
                    "slightly_lost",
                    "confused",
                    "interesting",
                  ]

                const signal =
                  validSignals.includes(
                    rawSignal as SignalType
                  )
                    ? (
                        rawSignal as SignalType
                      )
                    : "got_it"

                /*
                 * ---------------------------------------------
                 * RETURN SIGNAL
                 * ---------------------------------------------
                 */

                return {
                  id:
                    signalDocument.id,

                  sessionId:
                    typeof data.sessionId ===
                      "string"
                      ? data.sessionId
                      : sessionId,

                  studentId:
                    typeof data.studentId ===
                      "string"
                      ? data.studentId
                      : currentUser.uid,

                  signal,

                  round,

                  timestamp:
                    data.timestamp,
                }
              }
            )

          /*
           * Firestore is now the source of truth.
           */

          setFirestoreSignals(
            signals
          )

          setSignalsLoading(
            false
          )

          setSignalLoadError(
            ""
          )
        },

        (error) => {
          console.error(
            "Failed to load student feedback:",
            error
          )

          setSignalLoadError(
            "Unable to check your previous feedback."
          )

          setFirestoreSignals(
            []
          )

          setSignalsLoading(
            false
          )
        }
      )

    return () => {
      unsubscribe()
    }
  }, [
    sessionId,
    validSessionId,
    currentUser,
  ])


  /*
   * =========================================================
   * FIND RESPONSE FOR CURRENT ROUND
   * =========================================================
   */

  const existingSignalForCurrentRound =
    useMemo(() => {
      if (
        currentRound <= 0
      ) {
        return null
      }

      const existingSignal =
        firestoreSignals.find(
          (signal) =>
            signal.round ===
            currentRound
        )

      return (
        existingSignal?.signal ??
        null
      )
    }, [
      firestoreSignals,
      currentRound,
    ])


  /*
   * =========================================================
   * LOCAL UI STATE
   * =========================================================
   *
   * This provides immediate feedback after sending.
   *
   * Firestore remains the permanent source of truth.
   */

  const [
    selectedSignalState,
    setSelectedSignalState,
  ] =
    useState<{
      round: number
      signal: SignalType
    } | null>(null)


  /*
   * Prefer Firestore.
   *
   * If Firestore has the response:
   *     use Firestore.
   *
   * Otherwise:
   *     use local state while the write is processing.
   */

  const selectedSignal =
    existingSignalForCurrentRound ??
    (
      selectedSignalState?.round ===
      currentRound
        ? selectedSignalState.signal
        : null
    )


  /*
   * =========================================================
   * SEND STATE
   * =========================================================
   */

  const [
    sending,
    setSending,
  ] = useState(false)

  const [
    sendError,
    setSendError,
  ] = useState("")


  /*
   * =========================================================
   * SESSION STATE
   * =========================================================
   */

  const effectiveSessionActive =
    Boolean(
      session &&
        session.status ===
          "active"
    )

  const roundTopic =
    session?.roundTopic ||
    ""


  /*
   * =========================================================
   * SEND SIGNAL
   * =========================================================
   */

  const handleSendSignal =
    async (
      signal: SignalType
    ) => {
      if (
        !effectiveSessionActive ||
        session?.roundStatus !==
          "active" ||
        sending
      ) {
        return
      }

      /*
       * Prevent another response for the
       * same teaching topic.
       */

      if (
        existingSignalForCurrentRound
      ) {
        return
      }

      /*
       * Protect against double-click.
       */

      if (
        selectedSignal
      ) {
        return
      }

      const user =
        auth.currentUser

      if (!user) {
        setSendError(
          "Please sign in again before sending feedback."
        )

        return
      }

      if (!sessionId) {
        setSendError(
          "This session is missing its ID."
        )

        return
      }

      if (
        currentRound <= 0
      ) {
        setSendError(
          "The current teaching pulse has not started yet."
        )

        return
      }

      setSending(true)
      setSendError("")

      try {
        /*
         * =====================================================
         * SEND TO FIRESTORE
         * =====================================================
         */

        await sendSignal({
          sessionId:
            String(
              sessionId
            ),

          studentId:
            user.uid,

          signal,

          round:
            currentRound,
        })

        /*
         * Immediate UI lock.
         *
         * Firestore listener will subsequently confirm it.
         */

        setSelectedSignalState({
          round:
            currentRound,

          signal,
        })
      } catch (
        error
      ) {
        console.error(
          "Failed to send student signal:",
          error
        )

        setSendError(
          error instanceof Error
            ? error.message
            : "Unable to send your feedback. Please try again."
        )
      } finally {
        setSending(false)
      }
    }


  /*
   * =========================================================
   * NAVIGATION
   * =========================================================
   */

  const handleLeaveSession =
    () => {
      router.push(
        "/student"
      )
    }


  /*
   * =========================================================
   * DISPLAY VALUES
   * =========================================================
   */

  const participantCount =
    session?.participantCount ??
    0

  const sessionTitle =
    session?.title ||
    "Live Classroom Session"

  const courseCode =
    session?.courseCode ||
    "CLASSROOM"

  const joinCode =
    session?.joinCode ||
    "------"

  const statusText =
    effectiveSessionActive
      ? "Live"
      : "Complete"

  const sessionStatus =
    effectiveSessionActive
      ? "active"
      : "ended"


  /*
   * =========================================================
   * SESSION DESCRIPTION
   * =========================================================
   */

  const sessionDescription =
    useMemo(() => {
      if (
        sessionError
      ) {
        return sessionError
      }

      if (!session) {
        return "Loading your classroom session..."
      }

      if (
        session.status !==
        "active"
      ) {
        return "This classroom session has ended."
      }

      if (
        session.roundStatus !==
        "active"
      ) {
        return "Your classroom is ready. Wait for your lecturer to start the next teaching pulse."
      }

      if (
        roundTopic
      ) {
        return `Your lecturer is currently teaching “${roundTopic}”. Share how you are following the lesson.`
      }

      return "Share how you are following the lesson. Your response helps your lecturer understand the classroom in real time."
    }, [
      session,
      sessionError,
      roundTopic,
    ])


  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (sessionLoading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <Loading
          size="lg"
          label="Joining classroom..."
        />
      </main>
    )
  }


  /*
   * =========================================================
   * SESSION ERROR
   * =========================================================
   */

  if (
    sessionError ||
    !session
  ) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-5">
        <div className="surface relative w-full max-w-md overflow-hidden rounded-[2rem] p-8 text-center">

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl"
          />

          <div className="relative z-10">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-400/10 bg-rose-500/10 text-rose-300">
              <Radio className="h-7 w-7" />
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
              Classroom unavailable
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Session unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-(--foreground-muted)">
              {sessionDescription}
            </p>

            <button
              type="button"
              onClick={
                handleLeaveSession
              }
              className="group mt-7 inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to dashboard
            </button>

          </div>
        </div>
      </main>
    )
  }


  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <main className="app-shell min-h-screen">

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-center justify-between gap-3">

          <button
            type="button"
            onClick={
              handleLeaveSession
            }
            className="group inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) shadow-(--shadow-xs) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Leave session
          </button>

          <div className="flex items-center gap-2">

            <span
              className={[
                "hidden items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider sm:flex",
                effectiveSessionActive
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-(--background-soft) text-(--foreground-muted)",
              ].join(" ")}
            >

              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  effectiveSessionActive
                    ? "animate-pulse bg-emerald-400"
                    : "bg-(--foreground-subtle)",
                ].join(" ")}
              />

              {statusText}

            </span>

            <ThemeToggle />

          </div>

        </header>


        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.10] p-6 shadow-(--shadow-lg) sm:p-8">

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

            <div className="min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]",
                    effectiveSessionActive
                      ? "border-emerald-400/10 bg-emerald-400/10 text-emerald-300"
                      : "border-(--border) bg-(--background-soft) text-(--foreground-muted)",
                  ].join(" ")}
                >

                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      effectiveSessionActive
                        ? "animate-pulse bg-emerald-400"
                        : "bg-(--foreground-subtle)",
                    ].join(" ")}
                  />

                  {effectiveSessionActive
                    ? "Live classroom"
                    : "Session complete"}

                </span>

                <span className="rounded-full border border-violet-400/10 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                  {courseCode}
                </span>

                {currentRound > 0 && (
                  <span className="rounded-full border border-indigo-400/10 bg-indigo-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-indigo-300">
                    Round {currentRound}
                  </span>
                )}

              </div>


              <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                {sessionTitle}
              </h1>


              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                {sessionDescription}
              </p>


              <div className="mt-6 flex flex-wrap gap-2">

                <SessionChip
                  icon={
                    <Users className="h-3.5 w-3.5" />
                  }
                  label={`${participantCount} students`}
                />

                <SessionChip
                  icon={
                    <Radio className="h-3.5 w-3.5" />
                  }
                  label={`Room ${joinCode}`}
                />

                <SessionChip
                  icon={
                    <Zap className="h-3.5 w-3.5" />
                  }
                  label={
                    effectiveSessionActive
                      ? "Feedback open"
                      : "Feedback closed"
                  }
                />

              </div>

            </div>


            <div className="hidden lg:flex">

              <div className="relative flex h-48 w-48 items-center justify-center">

                <div className="absolute inset-0 rounded-full border border-violet-400/10 bg-violet-500/5" />

                <div className="absolute inset-6 rounded-full border border-violet-400/10" />

                <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-linear-to-br from-violet-500 via-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  <Radio className="h-10 w-10" />
                </div>

                <div className="absolute right-0 top-8 rounded-2xl border border-(--border) bg-(--surface)/90 px-3 py-2 shadow-(--shadow-md) backdrop-blur-xl">

                  <div className="flex items-center gap-2">

                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        effectiveSessionActive
                          ? "animate-pulse bg-emerald-400"
                          : "bg-(--foreground-subtle)",
                      ].join(" ")}
                    />

                    <span
                      className={[
                        "text-[9px] font-black uppercase tracking-wider",
                        effectiveSessionActive
                          ? "text-emerald-300"
                          : "text-(--foreground-muted)",
                      ].join(" ")}
                    >
                      {effectiveSessionActive
                        ? "Respond now"
                        : "Completed"}
                    </span>

                  </div>

                </div>


                <div className="absolute bottom-4 left-0 rounded-2xl border border-(--border) bg-(--surface)/90 px-3 py-2 shadow-(--shadow-md) backdrop-blur-xl">

                  <div className="flex items-center gap-2">

                    <Sparkles className="h-3.5 w-3.5 text-violet-300" />

                    <span className="text-[9px] font-black uppercase tracking-wider text-(--foreground-muted)">
                      One-tap pulse
                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            SESSION STATUS
        ===================================================== */}

        <div className="mt-5">

          <SessionStatus
            title={
              sessionTitle
            }
            courseCode={
              courseCode
            }
            status={
              sessionStatus
            }
            joinCode={
              joinCode
            }
            participantCount={
              participantCount
            }
          />

        </div>


        {/* =====================================================
            CURRENT TOPIC
        ===================================================== */}

        {effectiveSessionActive &&
          session.roundStatus ===
            "active" &&
          roundTopic && (

            <section className="mt-5 overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-r from-violet-500/10 via-(--surface) to-indigo-500/5 p-5 sm:p-6">

              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                    Current teaching topic
                  </p>

                  <h2 className="mt-1 truncate text-lg font-black sm:text-xl">
                    {roundTopic}
                  </h2>

                  <p className="mt-1 text-xs text-(--foreground-muted)">
                    Round {currentRound} is live. Submit your response below.
                  </p>

                </div>

                <div className="ml-auto hidden items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 sm:flex">

                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                  Live

                </div>

              </div>

            </section>

          )}


        {/* =====================================================
            ANONYMOUS QUESTION BOX
        ===================================================== */}

        {effectiveSessionActive &&
          session.roundStatus ===
            "active" &&
          roundTopic &&
          typeof sessionId ===
            "string" && (

            <div className="mt-6">

              <AnonymousQuestionBox
                sessionId={
                  sessionId
                }
                topic={
                  roundTopic
                }
                topicNumber={
                  currentRound
                }
              />

            </div>

          )}


        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">

          {/* ===================================================
              FEEDBACK
          =================================================== */}

          <section className="surface overflow-hidden rounded-[2rem]">

            <div className="border-b border-(--border) bg-linear-to-r from-violet-500/[0.04] to-transparent p-5 sm:p-7">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <div className="flex items-center gap-2">

                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                      <Sparkles className="h-4 w-4" />
                    </span>

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                      Classroom pulse
                    </p>

                  </div>

                  <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                    How are you following?
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-(--foreground-muted)">
                    Choose one response that best represents your
                    understanding right now.
                  </p>

                </div>

                <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 sm:flex">
                  <Radio className="h-5 w-5" />
                </div>

              </div>

            </div>


            <div className="p-5 sm:p-7">

              {effectiveSessionActive &&
              session.roundStatus ===
                "active" ? (

                <>

                  <FeedbackForm
                    key={
                      currentRound
                    }
                    onSend={
                      handleSendSignal
                    }
                    loading={
                      sending ||
                      signalsLoading
                    }
                    disabled={
                      !effectiveSessionActive ||
                      currentRound <= 0 ||
                      Boolean(
                        existingSignalForCurrentRound
                      )
                    }
                    selectedSignal={
                      selectedSignal
                    }
                  />


                  {sendError && (

                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] px-4 py-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                        <Radio className="h-4 w-4" />
                      </div>

                      <div>

                        <p className="text-xs font-black text-rose-300">
                          We couldn&apos;t send that pulse
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-rose-300/80">
                          {sendError}
                        </p>

                      </div>

                    </div>

                  )}


                  {signalLoadError && (

                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] px-4 py-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                        <Radio className="h-4 w-4" />
                      </div>

                      <div>

                        <p className="text-xs font-black text-amber-300">
                          Feedback status unavailable
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-amber-300/80">
                          {signalLoadError}
                        </p>

                      </div>

                    </div>

                  )}


                  {selectedSignal &&
                    !sending && (

                      <div className="relative mt-5 overflow-hidden rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045] p-4">

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl"
                        />

                        <div className="relative z-10 flex items-start gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>

                          <div>

                            <p className="text-sm font-black text-emerald-200">
                              Pulse received
                            </p>

                            <p className="mt-1 text-xs leading-5 text-(--foreground-muted)">
                              Your response is now visible to your
                              faculty in the live classroom dashboard.
                            </p>

                          </div>

                        </div>

                      </div>

                    )}

                </>

              ) : (

                <PulseComplete
                  selectedSignal={
                    selectedSignal
                  }
                  onBack={
                    handleLeaveSession
                  }
                  message={
                    session.status !==
                    "active"
                      ? "This classroom session has ended."
                      : "The lecturer has not started a teaching pulse yet."
                  }
                />

              )}

            </div>

          </section>


          {/* ===================================================
              SIDEBAR
          =================================================== */}

          <aside className="space-y-5">

            <Card
              padding="none"
              glow={
                effectiveSessionActive
              }
            >

              <div className="p-5">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                      <Radio className="h-5 w-5" />
                    </div>

                    <div>

                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                        Classroom state
                      </p>

                      <p className="mt-1 text-xs font-bold text-(--foreground-secondary)">
                        Live faculty control
                      </p>

                    </div>

                  </div>


                  <span
                    className={[
                      "rounded-full px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider",
                      effectiveSessionActive
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-(--background-soft) text-(--foreground-subtle)",
                    ].join(" ")}
                  >
                    {effectiveSessionActive
                      ? "Live"
                      : "Done"}
                  </span>

                </div>


                <div className="mt-5 rounded-2xl border border-(--border) bg-(--background-soft) p-4">

                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
                    Current topic
                  </p>

                  <p className="mt-2 text-sm font-black">
                    {roundTopic ||
                      "Waiting for topic"}
                  </p>

                  {currentRound >
                    0 && (
                    <p className="mt-1 text-[10px] text-(--foreground-muted)">
                      Round {currentRound}
                    </p>
                  )}

                </div>


                <div className="mt-3 flex items-center gap-2 text-[10px] text-(--foreground-subtle)">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  No countdown — your lecturer controls the pulse.
                </div>

              </div>

            </Card>


            <Card>

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
                    Quick guide
                  </p>

                  <h2 className="mt-1 text-base font-black">
                    How it works
                  </h2>

                </div>

              </div>


              <div className="mt-5 space-y-4">

                <Step
                  number="01"
                  title="Choose"
                  text="Pick the signal that honestly matches your understanding."
                />

                <Step
                  number="02"
                  title="Send"
                  text="Your response reaches the faculty dashboard instantly."
                />

                <Step
                  number="03"
                  title="Keep learning"
                  text="Stay focused and respond again when the next pulse begins."
                />

              </div>

            </Card>


            <div className="relative overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 via-violet-500/[0.04] to-indigo-500/5 p-5">

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl"
              />

              <div className="relative z-10">

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <Users className="h-5 w-5" />
                </div>

                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                  Your voice matters
                </p>

                <h3 className="mt-2 text-base font-black">
                  Help shape the lesson.
                </h3>

                <p className="mt-2 text-xs leading-5 text-(--foreground-muted)">
                  PulseBoard gives your lecturer a quick view of the
                  room without interrupting the class.
                </p>

                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-(--foreground-subtle)">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Quick feedback
                </div>

                <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-(--foreground-subtle)">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Live classroom response
                </div>

              </div>

            </div>

          </aside>

        </div>


        {/* =====================================================
            BOTTOM SESSION INFO
        ===================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">

          <MiniSessionCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Students"
            value={String(
              participantCount
            )}
            tone="blue"
          />

          <MiniSessionCard
            icon={
              <Radio className="h-5 w-5" />
            }
            label="Join code"
            value={
              joinCode
            }
            tone="violet"
          />

          <MiniSessionCard
            icon={
              <Zap className="h-5 w-5" />
            }
            label="Feedback"
            value={
              effectiveSessionActive
                ? session.roundStatus ===
                    "active"
                  ? "Open"
                  : "Waiting"
                : "Closed"
            }
            tone="emerald"
          />

        </section>

      </div>

    </main>
  )
}


/*
 * =========================================================
 * SESSION CHIP
 * =========================================================
 */

function SessionChip({
  icon,
  label,
}: {
  icon: ReactNode
  label: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-(--border) bg-(--background-soft)/75 px-3 py-1.5 text-[10px] font-bold text-(--foreground-secondary)">

      <span className="shrink-0 text-violet-300">
        {icon}
      </span>

      <span className="truncate">
        {label}
      </span>

    </span>
  )
}


/*
 * =========================================================
 * PULSE COMPLETE
 * =========================================================
 */

function PulseComplete({
  selectedSignal,
  onBack,
  message,
}: {
  selectedSignal:
    | SignalType
    | null

  onBack: () => void

  message: string
}) {
  return (
    <div className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden px-4 py-8 text-center">

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/5 blur-3xl"
      />

      <div className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] bg-linear-to-br from-emerald-500/15 to-violet-500/10 text-emerald-300">

        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse rounded-[2rem] bg-emerald-400/5"
        />

        <CheckCircle2 className="relative h-9 w-9" />

      </div>


      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
        Classroom update
      </p>


      <h2 className="mt-2 text-2xl font-black">
        {selectedSignal
          ? "Pulse received"
          : "Waiting for the next pulse"}
      </h2>


      <p className="mt-3 max-w-md text-sm leading-7 text-(--foreground-muted)">
        {message}
      </p>


      {selectedSignal && (

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300">

          <CheckCircle2 className="h-4 w-4" />

          Your latest signal was recorded.

        </div>

      )}


      <button
        type="button"
        onClick={onBack}
        className="group mt-7 inline-flex h-11 items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-5 text-xs font-black text-(--foreground-secondary) transition-all hover:-translate-y-0.5 hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
      >

        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />

        Return to dashboard

      </button>

    </div>
  )
}


/*
 * =========================================================
 * STEP
 * =========================================================
 */

function Step({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div className="flex gap-3">

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-[10px] font-black text-violet-300">
        {number}
      </span>

      <div className="min-w-0">

        <p className="text-sm font-black">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-(--foreground-muted)">
          {text}
        </p>

      </div>

    </div>
  )
}


/*
 * =========================================================
 * MINI SESSION CARD
 * =========================================================
 */

function MiniSessionCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  tone:
    | "blue"
    | "violet"
    | "emerald"
}) {
  const toneClasses = {
    blue:
      "bg-blue-500/10 text-blue-300",

    violet:
      "bg-violet-500/10 text-violet-300",

    emerald:
      "bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className="surface surface-hover rounded-3xl p-5">

      <div className="flex items-center gap-3">

        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            toneClasses[tone],
          ].join(" ")}
        >
          {icon}
        </div>

        <div>

          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
            {label}
          </p>

          <p className="mt-1 text-base font-black">
            {value}
          </p>

        </div>

      </div>

    </div>
  )
}