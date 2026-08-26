"use client"

import {
  ArrowLeft,
  Check,
  HelpCircle,
  Lightbulb,
  LogOut,
  Radio,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  useParams,
  useRouter,
} from "next/navigation"

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"

import {
  signOut,
} from "firebase/auth"

import {
  auth,
  db,
} from "@/lib/firebase"

import type {
  Session,
  Signal,
  SignalType,
} from "@/lib/types"

import {
  EMPTY_SIGNAL_COUNTS,
  getTotalSignalCount,
  getUniqueStudentCount,
  subscribeToSessionSignals,
  type SignalCounts,
} from "@/app/services/feedback.service"

import {
  generateSummary,
  type Snapshot,
} from "@/app/services/summary.service"

import Button from "@/app/components/ui/Button"
import Loading from "@/app/components/ui/Loading"
import ThemeToggle from "@/app/components/ThemeToggle"
import SessionQRCode from "@/app/components/admin/SessionQRCode"

type RoundStatus =
  | "waiting"
  | "active"
  | "completed"

type FirestoreSessionData =
  Omit<Session, "id"> & {
    totalSignals?: unknown
    aiSummary?: unknown

    roundStatus?: unknown
    currentRound?: unknown
    roundTopic?: unknown
    roundStartedAt?: unknown
    roundEndedAt?: unknown
  }

type SessionView = {
  id: string
  title: string
  courseCode: string
  joinCode: string
  status: Session["status"]

  participantCount: number
  totalSignals: number

  aiSummary: unknown

  roundStatus: RoundStatus
  currentRound: number
  roundTopic: string

  roundStartedAt: unknown
  roundEndedAt: unknown

  raw: FirestoreSessionData
}

type LiveSignal =
  Signal & {
    round?: number
  }

type LiveStats = {
  counts: SignalCounts
  total: number
  uniqueStudents: number
}

function createEmptyCounts(): SignalCounts {
  return {
    ...EMPTY_SIGNAL_COUNTS,
  }
}

function toNumber(
  value: unknown
): number {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return value
  }

  if (
    typeof value ===
      "string"
  ) {
    const parsed =
      Number(value)

    return Number.isFinite(
      parsed
    )
      ? parsed
      : 0
  }

  return 0
}

function toText(
  value: unknown
): string {
  if (
    typeof value ===
    "string"
  ) {
    return value.trim()
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const record =
      value as Record<
        string,
        unknown
      >

    if (
      typeof record.text ===
      "string"
    ) {
      return record.text.trim()
    }

    if (
      typeof record.summary ===
      "string"
    ) {
      return record.summary.trim()
    }

    if (
      typeof record.overview ===
      "string"
    ) {
      return record.overview.trim()
    }

    try {
      return JSON.stringify(
        value,
        null,
        2
      )
    } catch {
      return ""
    }
  }

  return ""
}

function createSnapshot(
  round: number,
  topic: string,
  counts: SignalCounts,
  total: number
): Snapshot {
  return {
    round,
    topic:
      topic.trim(),
    got_it:
      counts.got_it,
    slightly_lost:
      counts.slightly_lost,
    confused:
      counts.confused,
    interesting:
      counts.interesting,
    total,
  }
}

export default function AdminSessionPage() {
  const params =
    useParams()

  const router =
    useRouter()

  const sessionId =
    typeof params.id ===
    "string"
      ? params.id
      : ""

  const [
    session,
    setSession,
  ] =
    useState<SessionView | null>(
      null
    )

  const [
    loading,
    setLoading,
  ] = useState(
    Boolean(sessionId)
  )

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      sessionId
        ? null
        : "Session ID is missing."
    )

  const [
    topic,
    setTopic,
  ] = useState("")

  const [
    starting,
    setStarting,
  ] = useState(false)

  const [
    endingPulse,
    setEndingPulse,
  ] = useState(false)

  const [
    endingSession,
    setEndingSession,
  ] = useState(false)

  const [
    liveStats,
    setLiveStats,
  ] =
    useState<LiveStats>({
      counts:
        createEmptyCounts(),
      total: 0,
      uniqueStudents: 0,
    })

  const [
    snapshots,
    setSnapshots,
  ] = useState<
    Snapshot[]
  >([])

  const sessionRef =
    useRef<SessionView | null>(
      null
    )

  const snapshotsRef =
    useRef<Snapshot[]>(
      []
    )

  const roundCountsRef =
    useRef<SignalCounts>(
      createEmptyCounts()
    )

  /*
   * =========================================================
   * AUTH GUARD
   * =========================================================
   */

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace(
        "/login"
      )
    }
  }, [router])

  /*
   * =========================================================
   * SESSION SNAPSHOT
   * =========================================================
   */

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const sessionRefFirestore =
      doc(
        db,
        "sessions",
        sessionId
      )

    const unsubscribe =
      onSnapshot(
        sessionRefFirestore,
        (snapshot) => {
          if (
            !snapshot.exists()
          ) {
            setSession(null)

            setError(
              "This classroom session could not be found."
            )

            setLoading(false)

            return
          }

          const raw =
            snapshot.data() as FirestoreSessionData

          const nextSession:
            SessionView = {
            id:
              snapshot.id,

            title:
              typeof raw.title ===
              "string"
                ? raw.title
                : "PulseBoard Session",

            courseCode:
              typeof raw.courseCode ===
              "string"
                ? raw.courseCode
                : "",

            joinCode:
              typeof raw.joinCode ===
              "string"
                ? raw.joinCode
                : "",

            status:
              raw.status,

            participantCount:
              toNumber(
                raw.participantCount
              ),

            totalSignals:
              toNumber(
                raw.totalSignals
              ),

            aiSummary:
              raw.aiSummary,

            roundStatus:
              raw.roundStatus ===
              "active"
                ? "active"
                : raw.roundStatus ===
                    "completed"
                  ? "completed"
                  : "waiting",

            currentRound:
              toNumber(
                raw.currentRound
              ),

            roundTopic:
              typeof raw.roundTopic ===
              "string"
                ? raw.roundTopic
                : "",

            roundStartedAt:
              raw.roundStartedAt,

            roundEndedAt:
              raw.roundEndedAt,

            raw,
          }

          sessionRef.current =
            nextSession

          setSession(
            nextSession
          )

          setLoading(false)

          setError(null)

          /*
           * Keep the local round counter fresh.
           */
          if (
            nextSession.roundStatus ===
            "active"
          ) {
            roundCountsRef.current =
              createEmptyCounts()

            setLiveStats(
              (
                previous
              ) => ({
                ...previous,
                counts:
                  createEmptyCounts(),
                total: 0,
              })
            )
          } else {
            roundCountsRef.current =
              createEmptyCounts()

            setLiveStats(
              (
                previous
              ) => ({
                ...previous,
                counts:
                  createEmptyCounts(),
                total: 0,
              })
            )

            if (
              nextSession.roundStatus ===
              "waiting"
            ) {
              setTopic("")
            }
          }
        },
        (snapshotError) => {
          console.error(
            "Failed to load session:",
            snapshotError
          )

          setError(
            "Unable to load this classroom session."
          )

          setLoading(false)
        }
      )

    return unsubscribe
  }, [sessionId])

  /*
   * =========================================================
   * LOAD SAVED SNAPSHOTS
   * =========================================================
   */

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const loadSnapshots =
      async () => {
        try {
          const snapshotCollection =
            collection(
              db,
              "sessions",
              sessionId,
              "snapshots"
            )

          const snapshot =
            await getDocs(
              snapshotCollection
            )

          const loaded =
            snapshot.docs
              .map(
                (
                  snapshotDoc
                ) => {
                  const data =
                    snapshotDoc.data()

                  return {
                    round:
                      toNumber(
                        data.round
                      ),

                    topic:
                      typeof data.topic ===
                      "string"
                        ? data.topic
                        : "",

                    got_it:
                      toNumber(
                        data.got_it
                      ),

                    slightly_lost:
                      toNumber(
                        data.slightly_lost
                      ),

                    confused:
                      toNumber(
                        data.confused
                      ),

                    interesting:
                      toNumber(
                        data.interesting
                      ),

                    total:
                      toNumber(
                        data.total
                      ),
                  } satisfies Snapshot
                }
              )
              .filter(
                (
                  item
                ) =>
                  item.round >
                  0
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  a.round -
                  b.round
              )

          snapshotsRef.current =
            loaded

          setSnapshots(
            loaded
          )
        } catch (
          snapshotError
        ) {
          console.error(
            "Failed to load snapshots:",
            snapshotError
          )
        }
      }

    void loadSnapshots()
  }, [sessionId])

  /*
   * =========================================================
   * LIVE SIGNAL SUBSCRIPTION
   * =========================================================
   */

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const unsubscribe =
      subscribeToSessionSignals(
        sessionId,
        (
          signals: Signal[]
        ) => {
          const currentSession =
            sessionRef.current

          const currentRound =
            currentSession?.currentRound ??
            0

          const isPulseActive =
            currentSession?.roundStatus ===
            "active"

          const liveSignals =
            signals as LiveSignal[]

          /*
           * Current-round responses only.
           *
           * If old signals do not have a round field,
           * they are not included in the current pulse.
           */
          const currentRoundSignals =
            isPulseActive &&
            currentRound >
              0
              ? liveSignals.filter(
                  (
                    signal
                  ) =>
                    Number(
                      signal.round
                    ) ===
                    currentRound
                )
              : []

          const counts =
            createEmptyCounts()

          currentRoundSignals.forEach(
            (
              signal
            ) => {
              if (
                Object.prototype.hasOwnProperty.call(
                  counts,
                  signal.signal
                )
              ) {
                counts[
                  signal.signal
                ] += 1
              }
            }
          )

          const total =
            getTotalSignalCount(
              counts
            )

          const uniqueStudents =
            getUniqueStudentCount(
              currentRoundSignals
            )

          roundCountsRef.current =
            counts

          setLiveStats({
            counts,
            total,
            uniqueStudents,
          })

          /*
           * Keep session-level totals updated too.
           */
          const allCounts =
            createEmptyCounts()

          liveSignals.forEach(
            (
              signal
            ) => {
              if (
                Object.prototype.hasOwnProperty.call(
                  allCounts,
                  signal.signal
                )
              ) {
                allCounts[
                  signal.signal
                ] += 1
              }
            }
          )

          const allTotal =
            getTotalSignalCount(
              allCounts
            )

          void updateDoc(
            doc(
              db,
              "sessions",
              sessionId
            ),
            {
              participantCount:
                getUniqueStudentCount(
                  liveSignals
                ),

              totalSignals:
                allTotal,
            }
          ).catch(
            (
              updateError
            ) => {
              console.error(
                "Failed to update session totals:",
                updateError
              )
            }
          )
        },
        (
          signalError
        ) => {
          console.error(
            "Live signal subscription failed:",
            signalError
          )

          setError(
            "Unable to receive live classroom feedback."
          )
        }
      )

    return unsubscribe
  }, [sessionId])

  /*
   * =========================================================
   * START PULSE
   * =========================================================
   */

  const handleStartPulse =
    useCallback(
      async () => {
        const currentSession =
          sessionRef.current

        const cleanTopic =
          topic.trim()

        if (
          !currentSession ||
          starting
        ) {
          return
        }

        if (
          currentSession.status !==
          "active"
        ) {
          return
        }

        if (
          currentSession.roundStatus ===
          "active"
        ) {
          return
        }

        if (!cleanTopic) {
          setError(
            "Enter the teaching topic before starting the pulse."
          )

          return
        }

        if (
          cleanTopic.length >
          120
        ) {
          setError(
            "Topic must be 120 characters or less."
          )

          return
        }

        try {
          setStarting(
            true
          )

          setError(null)

          const nextRound =
            currentSession.currentRound +
            1

          roundCountsRef.current =
            createEmptyCounts()

          setLiveStats(
            (
              previous
            ) => ({
              ...previous,
              counts:
                createEmptyCounts(),
              total: 0,
            })
          )

          await updateDoc(
            doc(
              db,
              "sessions",
              currentSession.id
            ),
            {
              roundStatus:
                "active",

              currentRound:
                nextRound,

              roundTopic:
                cleanTopic,

              roundStartedAt:
                serverTimestamp(),

              roundEndedAt:
                null,
            }
          )

          setTopic("")
        } catch (
          startError
        ) {
          console.error(
            "Failed to start pulse:",
            startError
          )

          setError(
            "Unable to start the pulse."
          )
        } finally {
          setStarting(
            false
          )
        }
      },
      [
        topic,
        starting,
      ]
    )

  /*
   * =========================================================
   * SAVE CURRENT ROUND
   * =========================================================
   */

  const saveCurrentRound =
    useCallback(
      async () => {
        const currentSession =
          sessionRef.current

        if (
          !currentSession ||
          currentSession.currentRound <=
            0 ||
          !currentSession.roundTopic.trim()
        ) {
          return null
        }

        const alreadySaved =
          snapshotsRef.current.some(
            (
              item
            ) =>
              item.round ===
              currentSession.currentRound
          )

        if (
          alreadySaved
        ) {
          return (
            snapshotsRef.current.find(
              (
                item
              ) =>
                item.round ===
                currentSession.currentRound
            ) ??
            null
          )
        }

        const snapshot =
          createSnapshot(
            currentSession.currentRound,
            currentSession.roundTopic,
            roundCountsRef.current,
            liveStats.uniqueStudents
          )

        await addDoc(
          collection(
            db,
            "sessions",
            currentSession.id,
            "snapshots"
          ),
          {
            ...snapshot,
            createdAt:
              serverTimestamp(),
          }
        )

        const nextSnapshots =
          [
            ...snapshotsRef.current,
            snapshot,
          ]

        snapshotsRef.current =
          nextSnapshots

        setSnapshots(
          nextSnapshots
        )

        return snapshot
      },
      [
        liveStats.uniqueStudents,
      ]
    )

  /*
   * =========================================================
   * END PULSE
   * =========================================================
   */

  const handleEndPulse =
    useCallback(
      async () => {
        const currentSession =
          sessionRef.current

        if (
          !currentSession ||
          endingPulse ||
          currentSession.roundStatus !==
            "active"
        ) {
          return
        }

        try {
          setEndingPulse(
            true
          )

          setError(null)

          await saveCurrentRound()

          await updateDoc(
            doc(
              db,
              "sessions",
              currentSession.id
            ),
            {
              roundStatus:
                "completed",

              roundEndedAt:
                serverTimestamp(),
            }
          )
        } catch (
          finishError
        ) {
          console.error(
            "Failed to end pulse:",
            finishError
          )

          setError(
            "Unable to finish the current pulse."
          )
        } finally {
          setEndingPulse(
            false
          )
        }
      },
      [
        endingPulse,
        saveCurrentRound,
      ]
    )

  /*
   * =========================================================
   * END SESSION
   * =========================================================
   */

  const handleEndSession =
    useCallback(
      async () => {
        const currentSession =
          sessionRef.current

        if (
          !currentSession ||
          endingSession
        ) {
          return
        }

        const confirmed =
          window.confirm(
            "End this classroom session?"
          )

        if (!confirmed) {
          return
        }

        try {
          setEndingSession(
            true
          )

          setError(null)

          if (
            currentSession.roundStatus ===
            "active"
          ) {
            await saveCurrentRound()

            await updateDoc(
              doc(
                db,
                "sessions",
                currentSession.id
              ),
              {
                roundStatus:
                  "completed",

                roundEndedAt:
                  serverTimestamp(),
              }
            )
          }

          let aiSummary =
            ""

          if (
            snapshotsRef.current.length >
            0
          ) {
            try {
              aiSummary =
                await generateSummary({
                  sessionId:
                    currentSession.id,

                  sessionTitle:
                    currentSession.title,

                  courseCode:
                    currentSession.courseCode,

                  snapshots:
                    snapshotsRef.current,
                })
            } catch (
              summaryError
            ) {
              console.error(
                "AI summary generation failed:",
                summaryError
              )
            }
          }

          await updateDoc(
            doc(
              db,
              "sessions",
              currentSession.id
            ),
            {
              status:
                "ended",

              endedAt:
                serverTimestamp(),

              ...(aiSummary
                ? {
                    aiSummary,
                  }
                : {}),
            }
          )
        } catch (
          endError
        ) {
          console.error(
            "Failed to end session:",
            endError
          )

          setError(
            "Unable to end the classroom session."
          )
        } finally {
          setEndingSession(
            false
          )
        }
      },
      [
        endingSession,
        saveCurrentRound,
      ]
    )

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  const handleLogout =
    async () => {
      try {
        await signOut(
          auth
        )

        router.replace(
          "/login"
        )

        router.refresh()
      } catch (
        logoutError
      ) {
        console.error(
          "Logout failed:",
          logoutError
        )

        setError(
          "Unable to sign out. Please try again."
        )
      }
    }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <Loading
          size="lg"
          label="Loading classroom..."
        />
      </main>
    )
  }

  /*
   * =========================================================
   * SESSION NOT FOUND
   * =========================================================
   */

  if (!session) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-5">

        <div className="surface w-full max-w-md rounded-[2rem] p-8 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-300">
            <XCircle className="h-7 w-7" />
          </div>

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-rose-300">
            Classroom unavailable
          </p>

          <h1 className="mt-2 text-2xl font-black">
            Session unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-(--foreground-muted)">
            {error ||
              "This classroom session could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/dashboard"
              )
            }
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 text-xs font-black text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

        </div>

      </main>
    )
  }

  /*
   * =========================================================
   * DERIVED STATE
   * =========================================================
   */

  const isActive =
    session.status ===
    "active"

  const pulseActive =
    isActive &&
    session.roundStatus ===
      "active"

  const currentRound =
    session.currentRound

  const pulseTotal =
    liveStats.total

  const confusionRate =
    pulseTotal > 0
      ? Math.round(
          (
            (
              liveStats.counts
                .confused +
              liveStats.counts
                .slightly_lost
            ) /
            pulseTotal
          ) *
            100
        )
      : 0

  const aiSummary =
    toText(
      session.aiSummary
    )

  return (
    <main className="app-shell min-h-screen">

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-center justify-between gap-3">

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/dashboard"
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) transition hover:bg-(--surface-hover)"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>

          <div className="flex items-center gap-2">

            {isActive && (
              <span className="hidden items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Classroom live
              </span>
            )}

            <ThemeToggle />

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="hidden items-center gap-2 rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 py-2 text-xs font-bold text-rose-300 sm:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>

          </div>
        </header>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.08] p-6 shadow-(--shadow-lg) sm:p-8">

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            <div className="min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]",
                    isActive
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-(--background-soft) text-(--foreground-muted)",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      isActive
                        ? "animate-pulse bg-emerald-400"
                        : "bg-(--foreground-subtle)",
                    ].join(" ")}
                  />

                  {isActive
                    ? "Live session"
                    : "Session ended"}
                </span>

                <span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                  {
                    session.courseCode ||
                    "COURSE"
                  }
                </span>

                {currentRound >
                  0 && (
                  <span className="rounded-full bg-indigo-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-indigo-300">
                    Round {currentRound}
                  </span>
                )}

              </div>

              <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                {
                  session.title
                }
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                {pulseActive
                  ? `Students are currently responding to “${session.roundTopic}”.`
                  : isActive
                    ? "Your classroom is ready. Start the next teaching pulse manually."
                    : "This classroom session has ended. Your collected feedback is preserved."}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">

                <InfoChip
                  icon={
                    <Users className="h-3.5 w-3.5" />
                  }
                  label={`${liveStats.uniqueStudents} students`}
                />

                <InfoChip
                  icon={
                    <Radio className="h-3.5 w-3.5" />
                  }
                  label={`${pulseTotal} current-round signals`}
                />

                {pulseActive &&
                  session.roundTopic && (
                  <InfoChip
                    icon={
                      <Sparkles className="h-3.5 w-3.5" />
                    }
                    label={
                      session.roundTopic
                    }
                  />
                )}

              </div>

            </div>

            {isActive && (
              <button
                type="button"
                onClick={
                  handleEndSession
                }
                disabled={
                  endingSession
                }
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 text-xs font-black text-rose-300 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                {endingSession
                  ? "Ending..."
                  : "End Session"}
              </button>
            )}

          </div>

        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] px-4 py-3 text-xs leading-5 text-rose-300">
            {error}
          </div>
        )}

        {/* =====================================================
            CONTROL CENTER
        ===================================================== */}

        {isActive && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">

            <div className="rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 via-(--surface) to-indigo-500/5 p-5 sm:p-6">

              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                Classroom access
              </p>

              <h2 className="mt-2 text-xl font-black">
                Let students join
              </h2>

              <SessionQRCode
                joinCode={
                  session.joinCode
                }
                sessionId={
                  session.id
                }
                title={
                  session.title
                }
              />

              <div className="mt-4 grid grid-cols-2 gap-2">

                <MiniInfo
                  label="Join code"
                  value={
                    session.joinCode ||
                    "—"
                  }
                />

                <MiniInfo
                  label="Students"
                  value={String(
                    liveStats.uniqueStudents
                  )}
                />

              </div>

            </div>

            <div className="rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 via-(--surface) to-indigo-500/5 p-6 sm:p-7">

              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                Teaching pulse
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {pulseActive
                  ? session.roundTopic
                  : currentRound ===
                      0
                    ? "Start your first topic"
                    : "Ready for the next topic"}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-(--foreground-muted)">
                {pulseActive
                  ? "Students can respond to this topic now. The dashboard updates from live Firebase signals."
                  : "Nothing starts automatically. You decide when the classroom pulse opens."}
              </p>

              {!pulseActive ? (
                <div className="mt-7">

                  <label
                    htmlFor="pulse-topic"
                    className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-(--foreground-muted)"
                  >
                    Teaching topic
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">

                    <input
                      id="pulse-topic"
                      value={
                        topic
                      }
                      onChange={(
                        event
                      ) => {
                        setTopic(
                          event.target.value
                        )

                        if (
                          error
                        ) {
                          setError(
                            null
                          )
                        }
                      }}
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            "Enter" &&
                          topic.trim()
                        ) {
                          void handleStartPulse()
                        }
                      }}
                      maxLength={
                        120
                      }
                      placeholder="Example: Database normalization"
                      className="h-12 flex-1 rounded-xl border border-(--border) bg-(--background-soft) px-4 text-sm font-semibold outline-none focus:border-violet-400/40"
                    />

                    <button
                      type="button"
                      onClick={
                        handleStartPulse
                      }
                      disabled={
                        starting ||
                        !topic.trim()
                      }
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Radio className="h-4 w-4" />
                      {starting
                        ? "Starting..."
                        : "Start Pulse"}
                    </button>

                  </div>

                </div>
              ) : (
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">

                  <div className="flex flex-1 items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045] p-4">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                      <Radio className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                        Live now
                      </p>

                      <p className="mt-1 text-sm font-black">
                        Waiting for student responses
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleEndPulse
                    }
                    disabled={
                      endingPulse
                    }
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 text-xs font-black text-amber-300 disabled:opacity-60"
                  >
                    {endingPulse
                      ? "Saving..."
                      : "End Pulse"}
                  </button>

                </div>
              )}

            </div>

          </section>
        )}

        {/* =====================================================
            LIVE METRICS
        ===================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Students"
            value={
              liveStats.uniqueStudents
            }
            description="Unique students in current round"
          />

          <MetricCard
            icon={
              <Radio className="h-5 w-5" />
            }
            label="Current round"
            value={
              currentRound
            }
            description={
              pulseActive
                ? "Feedback is open"
                : "Waiting for faculty"
            }
          />

          <MetricCard
            icon={
              <Sparkles className="h-5 w-5" />
            }
            label="Signals"
            value={
              pulseTotal
            }
            description="Current teaching pulse"
          />

          <MetricCard
            icon={
              <XCircle className="h-5 w-5" />
            }
            label="Confusion"
            value={`${confusionRate}%`}
            description="Lost + confused"
          />

        </section>

        {/* =====================================================
            LIVE FEEDBACK
        ===================================================== */}

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">

          <div className="surface rounded-[2rem] p-6 sm:p-7">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Classroom pulse
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {pulseActive
                    ? session.roundTopic
                    : "Waiting for the next topic"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-(--foreground-muted)">
                  {pulseActive
                    ? "These numbers update from live Firestore signals."
                    : "Start a pulse to collect responses."}
                </p>

              </div>

              <div className="rounded-2xl bg-violet-500/5 px-4 py-3 text-center">

                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                  Responses
                </p>

                <p className="mt-1 text-2xl font-black">
                  {
                    pulseTotal
                  }
                </p>

              </div>

            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">

              <LiveSignalCard
                type="got_it"
                label="Got it"
                count={
                  liveStats.counts
                    .got_it
                }
                total={
                  pulseTotal
                }
                icon={
                  <Check className="h-5 w-5" />
                }
                tone="emerald"
              />

              <LiveSignalCard
                type="slightly_lost"
                label="Slightly lost"
                count={
                  liveStats.counts
                    .slightly_lost
                }
                total={
                  pulseTotal
                }
                icon={
                  <Lightbulb className="h-5 w-5" />
                }
                tone="amber"
              />

              <LiveSignalCard
                type="confused"
                label="Confused"
                count={
                  liveStats.counts
                    .confused
                }
                total={
                  pulseTotal
                }
                icon={
                  <HelpCircle className="h-5 w-5" />
                }
                tone="rose"
              />

              <LiveSignalCard
                type="interesting"
                label="Interesting"
                count={
                  liveStats.counts
                    .interesting
                }
                total={
                  pulseTotal
                }
                icon={
                  <Sparkles className="h-5 w-5" />
                }
                tone="violet"
              />

            </div>

            <div className="mt-5 rounded-2xl border border-(--border) bg-(--background-soft) p-5">

              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-muted)">
                Current classroom state
              </p>

              <p className="mt-2 text-3xl font-black">
                {
                  confusionRate
                }%
              </p>

              <p className="mt-2 text-xs leading-5 text-(--foreground-muted)">
                Combined Slightly lost and Confused
                responses for the current round.
              </p>

            </div>

          </div>

          <aside className="space-y-5">

            <div className="rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 to-indigo-500/5 p-6">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
                AI classroom insight
              </p>

              <h2 className="mt-2 text-xl font-black">
                Session intelligence
              </h2>

              {aiSummary ? (
                <div className="mt-5 max-h-80 overflow-auto rounded-2xl border border-(--border) bg-(--background-soft) p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-(--foreground-secondary)">
                    {
                      aiSummary
                    }
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-(--border-strong) bg-(--background-soft) p-4">

                  <p className="text-sm font-black">
                    AI report is waiting
                  </p>

                  <p className="mt-2 text-xs leading-5 text-(--foreground-muted)">
                    End the session after your classroom
                    rounds are complete to generate the
                    teaching-focused summary.
                  </p>

                </div>
              )}

            </div>

            <div className="surface rounded-[2rem] p-5">

              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
                Session details
              </p>

              <div className="mt-4 grid gap-2">

                <MiniInfo
                  label="Course"
                  value={
                    session.courseCode
                  }
                />

                <MiniInfo
                  label="Join code"
                  value={
                    session.joinCode
                  }
                />

                <MiniInfo
                  label="Topics recorded"
                  value={String(
                    snapshots.length
                  )}
                />

              </div>

            </div>

          </aside>

        </section>

      </div>
    </main>
  )
}

function InfoChip({
  icon,
  label,
}: {
  icon: ReactNode
  label: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-(--border) bg-(--background-soft) px-3 py-1.5 text-[9px] font-bold text-(--foreground-secondary)">

      <span className="text-violet-300">
        {icon}
      </span>

      <span className="truncate">
        {label}
      </span>

    </span>
  )
}

function MiniInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-(--border) bg-(--background-soft) px-3 py-2.5">

      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-(--foreground-secondary)">
        {value || "—"}
      </p>

    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  description,
}: {
  icon: ReactNode
  label: string
  value: string | number
  description: string
}) {
  return (
    <div className="surface rounded-[2rem] p-5">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-muted)">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black">
            {value}
          </p>

          <p className="mt-1 text-[10px] leading-5 text-(--foreground-subtle)">
            {description}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          {icon}
        </div>

      </div>

    </div>
  )
}

function LiveSignalCard({
  type,
  label,
  count,
  total,
  icon,
  tone,
}: {
  type: SignalType
  label: string
  count: number
  total: number
  icon: ReactNode
  tone:
    | "emerald"
    | "amber"
    | "rose"
    | "violet"
}) {
  const percentage =
    total > 0
      ? Math.round(
          (
            count /
            total
          ) *
            100
        )
      : 0

  const toneClasses = {
    emerald: {
      box:
        "border-emerald-400/15 bg-emerald-500/[0.045]",
      icon:
        "bg-emerald-500/10 text-emerald-300",
      bar:
        "from-emerald-400 to-teal-400",
    },

    amber: {
      box:
        "border-amber-400/15 bg-amber-500/[0.045]",
      icon:
        "bg-amber-500/10 text-amber-300",
      bar:
        "from-amber-400 to-orange-400",
    },

    rose: {
      box:
        "border-rose-400/15 bg-rose-500/[0.045]",
      icon:
        "bg-rose-500/10 text-rose-300",
      bar:
        "from-rose-400 to-pink-400",
    },

    violet: {
      box:
        "border-violet-400/15 bg-violet-500/[0.045]",
      icon:
        "bg-violet-500/10 text-violet-300",
      bar:
        "from-violet-400 to-indigo-400",
    },
  }

  return (
    <div
      className={[
        "rounded-3xl border p-4",
        toneClasses[
          tone
        ].box,
      ].join(" ")}
      data-signal-type={
        type
      }
    >

      <div className="flex items-center justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
              toneClasses[
                tone
              ].icon,
            ].join(" ")}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black">
              {label}
            </p>

            <p className="mt-1 text-[10px] text-(--foreground-muted)">
              {percentage}% of round
            </p>
          </div>

        </div>

        <p className="text-3xl font-black">
          {count}
        </p>

      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-(--surface-hover)">

        <div
          className={[
            "h-full rounded-full bg-linear-to-r transition-[width] duration-500",
            toneClasses[
              tone
            ].bar,
          ].join(" ")}
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>

    </div>
  )
}