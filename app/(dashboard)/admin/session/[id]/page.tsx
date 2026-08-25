"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Radio,
  Sparkles,
  Users,
  XCircle,
  Zap,
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

import { db } from "@/lib/firebase"

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

type LiveSignalStats = {
  counts: SignalCounts
  total: number
  uniqueStudents: number
}

const SIGNAL_META: Record<
  SignalType,
  {
    label: string
    icon: ReactNode
    tone: string
    iconTone: string
    bar: string
    glow: string
  }
> = {
  got_it: {
    label: "Got it",
    icon: (
      <Check className="h-5 w-5" />
    ),
    tone:
      "border-emerald-400/15 bg-emerald-500/[0.055]",
    iconTone:
      "bg-emerald-500/10 text-emerald-300",
    bar:
      "from-emerald-400 to-teal-400",
    glow:
      "bg-emerald-400/10",
  },

  slightly_lost: {
    label: "Slightly lost",
    icon: (
      <Lightbulb className="h-5 w-5" />
    ),
    tone:
      "border-amber-400/15 bg-amber-500/[0.055]",
    iconTone:
      "bg-amber-500/10 text-amber-300",
    bar:
      "from-amber-400 to-orange-400",
    glow:
      "bg-amber-400/10",
  },

  confused: {
    label: "Confused",
    icon: (
      <HelpCircle className="h-5 w-5" />
    ),
    tone:
      "border-rose-400/15 bg-rose-500/[0.055]",
    iconTone:
      "bg-rose-500/10 text-rose-300",
    bar:
      "from-rose-400 to-pink-400",
    glow:
      "bg-rose-400/10",
  },

  interesting: {
    label: "Interesting",
    icon: (
      <Sparkles className="h-5 w-5" />
    ),
    tone:
      "border-violet-400/15 bg-violet-500/[0.055]",
    iconTone:
      "bg-violet-500/10 text-violet-300",
    bar:
      "from-violet-400 to-indigo-400",
    glow:
      "bg-violet-400/10",
  },
}

function createEmptyCounts(): SignalCounts {
  return {
    ...EMPTY_SIGNAL_COUNTS,
  }
}

function createInitialLiveStats(): LiveSignalStats {
  return {
    counts: createEmptyCounts(),
    total: 0,
    uniqueStudents: 0,
  }
}

function toNumber(
  value: unknown
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    return Number.isFinite(parsed)
      ? parsed
      : 0
  }

  return 0
}

function toText(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return ""
  }

  if (typeof value === "string") {
    return value.trim()
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value)
  }

  if (typeof value === "object") {
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
      typeof record.content ===
      "string"
    ) {
      return record.content.trim()
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
  totalStudents: number
): Snapshot {
  return {
    round,
    topic: topic.trim(),
    got_it: counts.got_it,
    slightly_lost:
      counts.slightly_lost,
    confused: counts.confused,
    interesting:
      counts.interesting,
    total: totalStudents,
  }
}

export default function AdminSessionPage() {
  const params = useParams()
  const router = useRouter()

  const sessionId =
    typeof params.id === "string"
      ? params.id
      : ""

  const [
    session,
    setSession,
  ] = useState<SessionView | null>(
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
  ] = useState<string | null>(
    sessionId
      ? null
      : "Session ID is missing."
  )

  const [
    ending,
    setEnding,
  ] = useState(false)

  const [
    startingPulse,
    setStartingPulse,
  ] = useState(false)

  const [
    endingPulse,
    setEndingPulse,
  ] = useState(false)

  const [
    topic,
    setTopic,
  ] = useState("")

  const [
    liveStats,
    setLiveStats,
  ] = useState<LiveSignalStats>(
    createInitialLiveStats
  )

  const [
    roundCounts,
    setRoundCounts,
  ] = useState<SignalCounts>(
    createEmptyCounts
  )

  const [
    roundSnapshots,
    setRoundSnapshots,
  ] = useState<Snapshot[]>([])

  const sessionRef =
    useRef<SessionView | null>(
      null
    )

  const liveStatsRef =
    useRef<LiveSignalStats>(
      createInitialLiveStats()
    )

  const roundCountsRef =
    useRef<SignalCounts>(
      createEmptyCounts()
    )

  const roundSnapshotsRef =
    useRef<Snapshot[]>([])

  const finishingPulseRef =
    useRef(false)

  const loadedSnapshotsRef =
    useRef(false)

  /*
   * Keep current session available to
   * Firestore listeners without causing
   * subscription recreation.
   */
  useEffect(() => {
    sessionRef.current =
      session
  }, [session])

  /*
   * =========================================================
   * LOAD SESSION
   * =========================================================
   */

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const firestoreSessionRef =
      doc(
        db,
        "sessions",
        sessionId
      )

    const unsubscribe =
      onSnapshot(
        firestoreSessionRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setSession(null)
            setError(
              "This session could not be found."
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

          setSession(
            nextSession
          )

          setError(null)
          setLoading(false)
        },
        (snapshotError) => {
          console.error(
            "Failed to load session:",
            snapshotError
          )

          setError(
            "Unable to load this session."
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
    if (
      !sessionId ||
      loadedSnapshotsRef.current
    ) {
      return
    }

    loadedSnapshotsRef.current =
      true

    const loadSnapshots =
      async () => {
        try {
          const snapshotRef =
            collection(
              db,
              "sessions",
              sessionId,
              "snapshots"
            )

          const snapshot =
            await getDocs(
              snapshotRef
            )

          const snapshots =
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
                  item.round > 0
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  a.round -
                  b.round
              )

          roundSnapshotsRef.current =
            snapshots

          setRoundSnapshots(
            snapshots
          )
        } catch (
          snapshotError
        ) {
          console.error(
            "Failed to load round snapshots:",
            snapshotError
          )
        }
      }

    void loadSnapshots()
  }, [sessionId])

  /*
   * =========================================================
   * LIVE FIRESTORE SIGNALS
   * =========================================================
   *
   * Every Firestore update recalculates:
   *
   * 1. all-session totals
   * 2. current-round totals
   *
   * No "new signal ID" tracking.
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

          /*
           * -----------------------------------------
           * ALL SESSION SIGNALS
           * -----------------------------------------
           */

          const allCounts =
            createEmptyCounts()

          signals.forEach(
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

          const totalSignals =
            getTotalSignalCount(
              allCounts
            )

          const totalStudents =
            getUniqueStudentCount(
              signals
            )

          /*
           * -----------------------------------------
           * CURRENT ROUND SIGNALS
           * -----------------------------------------
           */

          const currentRound =
            currentSession
              ?.currentRound ??
            0

          const currentRoundSignals =
            currentSession?.roundStatus ===
              "active" &&
            currentRound > 0
              ? signals.filter(
                  (
                    signal
                  ) =>
                    signal.round ===
                    currentRound
                )
              : []

          const currentRoundCounts =
            createEmptyCounts()

          currentRoundSignals.forEach(
            (
              signal
            ) => {
              if (
                Object.prototype.hasOwnProperty.call(
                  currentRoundCounts,
                  signal.signal
                )
              ) {
                currentRoundCounts[
                  signal.signal
                ] += 1
              }
            }
          )

          const currentRoundStudents =
            getUniqueStudentCount(
              currentRoundSignals
            )

          /*
           * -----------------------------------------
           * UPDATE UI STATE
           * -----------------------------------------
           */

          const nextStats:
            LiveSignalStats =
            {
              counts:
                allCounts,

              total:
                totalSignals,

              uniqueStudents:
                totalStudents,
            }

          liveStatsRef.current =
            nextStats

          setLiveStats(
            nextStats
          )

          if (
            currentSession?.roundStatus ===
            "active"
          ) {
            roundCountsRef.current =
              currentRoundCounts

            setRoundCounts(
              currentRoundCounts
            )
          } else {
            const emptyCounts =
              createEmptyCounts()

            roundCountsRef.current =
              emptyCounts

            setRoundCounts(
              emptyCounts
            )
          }

          /*
           * -----------------------------------------
           * KEEP SESSION AGGREGATES IN FIRESTORE
           * -----------------------------------------
           *
           * participantCount = unique students
           * across entire session.
           */

          if (
            currentSession
          ) {
            void updateDoc(
              doc(
                db,
                "sessions",
                sessionId
              ),
              {
                participantCount:
                  totalStudents,

                totalSignals:
                  totalSignals,
              }
            ).catch(
              (
                updateError
              ) => {
                console.error(
                  "Failed to update session aggregates:",
                  updateError
                )
              }
            )
          }

          /*
           * Logging during development.
           * Useful for confirming live data.
           */
          console.debug(
            "PulseBoard live signals:",
            {
              allSignals:
                totalSignals,

              allStudents:
                totalStudents,

              currentRound,

              currentRoundSignals:
                currentRoundSignals.length,

              currentRoundStudents,

              currentRoundCounts,
            }
          )
        },
        (
          signalError
        ) => {
          console.error(
            "Signal subscription failed:",
            signalError
          )

          setError(
            "Unable to receive live classroom signals."
          )
        }
      )

    return unsubscribe
  }, [sessionId])

  /*
   * =========================================================
   * SAVE CURRENT ROUND SNAPSHOT
   * =========================================================
   */

  const persistRoundSnapshot =
    useCallback(
      async (
        force = false
      ): Promise<Snapshot | null> => {
        const currentSession =
          sessionRef.current

        if (
          !sessionId ||
          !currentSession
        ) {
          return null
        }

        if (
          currentSession.currentRound <=
          0
        ) {
          return null
        }

        const currentTopic =
          currentSession.roundTopic.trim()

        if (!currentTopic) {
          return null
        }

        const counts =
          roundCountsRef.current

        const total =
          getTotalSignalCount(
            counts
          )

        if (
          !force &&
          total === 0
        ) {
          return null
        }

        const alreadySaved =
          roundSnapshotsRef.current.some(
            (
              snapshot
            ) =>
              snapshot.round ===
              currentSession.currentRound
          )

        if (
          alreadySaved
        ) {
          return (
            roundSnapshotsRef.current.find(
              (
                snapshot
              ) =>
                snapshot.round ===
                currentSession.currentRound
            ) ?? null
          )
        }

        /*
         * Use current-round students first.
         * Fall back to session-level students.
         */
        const currentRoundStudents =
          getUniqueStudentCountFromRound(
            currentSession.currentRound,
            currentSession
          )

        const totalStudents =
          currentRoundStudents ??
          Math.max(
            liveStatsRef.current
              .uniqueStudents,
            currentSession
              .participantCount
          )

        const snapshot =
          createSnapshot(
            currentSession.currentRound,
            currentTopic,
            counts,
            totalStudents
          )

        await addDoc(
          collection(
            db,
            "sessions",
            sessionId,
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
            ...roundSnapshotsRef.current,
            snapshot,
          ]

        roundSnapshotsRef.current =
          nextSnapshots

        setRoundSnapshots(
          nextSnapshots
        )

        return snapshot
      },
      [sessionId]
    )

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
          startingPulse ||
          currentSession.status !==
            "active" ||
          currentSession.roundStatus ===
            "active"
        ) {
          return
        }

        if (!cleanTopic) {
          setError(
            "Enter a teaching topic before starting the pulse."
          )

          return
        }

        if (
          cleanTopic.length > 120
        ) {
          setError(
            "Topic must be 120 characters or less."
          )

          return
        }

        try {
          setStartingPulse(
            true
          )

          setError(null)

          /*
           * Fresh counter for the next round.
           */

          const emptyCounts =
            createEmptyCounts()

          roundCountsRef.current =
            emptyCounts

          setRoundCounts(
            emptyCounts
          )

          const nextRound =
            currentSession.currentRound +
            1

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

          /*
           * Topic is now stored in Firestore,
           * so it remains visible after refresh.
           */

          setTopic("")
        } catch (
          startError
        ) {
          console.error(
            "Failed to start pulse:",
            startError
          )

          setError(
            "Unable to start the pulse. Please try again."
          )
        } finally {
          setStartingPulse(
            false
          )
        }
      },
      [
        topic,
        startingPulse,
      ]
    )

  /*
   * =========================================================
   * FINISH PULSE
   * =========================================================
   *
   * Manual only.
   */

  const handleFinishPulse =
    useCallback(
      async () => {
        const currentSession =
          sessionRef.current

        if (
          !currentSession ||
          endingPulse ||
          finishingPulseRef.current ||
          currentSession.status !==
            "active" ||
          currentSession.roundStatus !==
            "active"
        ) {
          return
        }

        finishingPulseRef.current =
          true

        try {
          setEndingPulse(
            true
          )

          setError(null)

          await persistRoundSnapshot(
            true
          )

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

          /*
           * Clear current-round UI only.
           * Topic stays in Firestore/history.
           */

          const emptyCounts =
            createEmptyCounts()

          roundCountsRef.current =
            emptyCounts

          setRoundCounts(
            emptyCounts
          )
        } catch (
          finishError
        ) {
          console.error(
            "Failed to finish pulse:",
            finishError
          )

          setError(
            "Unable to complete this pulse. Please try again."
          )
        } finally {
          finishingPulseRef.current =
            false

          setEndingPulse(
            false
          )
        }
      },
      [
        endingPulse,
        persistRoundSnapshot,
      ]
    )

  /*
   * =========================================================
   * END ENTIRE SESSION
   * =========================================================
   */

  const handleEndSession =
    useCallback(
      async () => {
        const currentSession =
          sessionRef.current

        if (
          !currentSession ||
          ending
        ) {
          return
        }

        const confirmed =
          window.confirm(
            "End this classroom session? The current pulse will be saved and the AI teaching report will be generated."
          )

        if (!confirmed) {
          return
        }

        try {
          setEnding(true)
          setError(null)

          if (
            currentSession.roundStatus ===
            "active"
          ) {
            await persistRoundSnapshot(
              true
            )

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

          const snapshots =
            [
              ...roundSnapshotsRef.current,
            ]

          let aiSummary = ""

          if (
            snapshots.length > 0
          ) {
            try {
              aiSummary =
                await generateSummary(
                  {
                    sessionId:
                      currentSession.id,

                    sessionTitle:
                      currentSession.title,

                    courseCode:
                      currentSession.courseCode,

                    snapshots,
                  }
                )
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
            "Unable to end the session. Please try again."
          )
        } finally {
          setEnding(false)
        }
      },
      [
        ending,
        persistRoundSnapshot,
      ]
    )

  /*
   * =========================================================
   * DERIVED STATE
   * =========================================================
   */

  const isActive =
    session?.status ===
    "active"

  const isPulseActive =
    Boolean(
      isActive &&
        session?.roundStatus ===
          "active"
    )

  const participantCount =
    liveStats.uniqueStudents

  const totalSignals =
    liveStats.total

  const currentPulseTotal =
    getTotalSignalCount(
      roundCounts
    )

  const confusionRate =
    currentPulseTotal >
    0
      ? Math.round(
          ((roundCounts.confused +
            roundCounts.slightly_lost) /
            currentPulseTotal) *
            100
        )
      : 0

  const aiSummaryText =
    toText(
      session?.aiSummary
    )

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
   * MISSING SESSION
   * =========================================================
   */

  if (!session) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-5">
        <div className="surface relative w-full max-w-md overflow-hidden rounded-[2rem] p-8 text-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-400/10 bg-rose-500/10 text-rose-300">
              <XCircle className="h-7 w-7" />
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
              Classroom unavailable
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Session unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-(--foreground-muted)">
              {error ||
                "We could not find this classroom session."}
            </p>

            <div className="mt-7">
              <Button
                onClick={() =>
                  router.push(
                    "/admin/dashboard"
                  )
                }
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const currentSession =
    session

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* TOP BAR */}
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/dashboard"
              )
            }
            className="group inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />

            Dashboard
          </button>

          <div className="flex items-center gap-2">
            {isActive && (
              <span className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Classroom live
              </span>
            )}

            <ThemeToggle />
          </div>
        </header>

        {/* HERO */}
        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.10] p-6 shadow-(--shadow-lg) sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-indigo-500/8 blur-3xl"
          />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]",
                    isActive
                      ? "border-emerald-400/10 bg-emerald-400/10 text-emerald-300"
                      : "border-(--border) bg-(--background-soft) text-(--foreground-muted)",
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

                <span className="rounded-full border border-violet-400/10 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                  {currentSession.courseCode ||
                    "COURSE"}
                </span>

                {isPulseActive && (
                  <span className="rounded-full border border-indigo-400/10 bg-indigo-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-indigo-300">
                    Round{" "}
                    {
                      currentSession.currentRound
                    }
                  </span>
                )}
              </div>

              <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                {currentSession.title}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                {isActive
                  ? isPulseActive
                    ? `Students are responding to “${currentSession.roundTopic}”.`
                    : currentSession.currentRound ===
                        0
                      ? "Your classroom is ready. Enter the first teaching topic and manually start the pulse when you are ready."
                      : "The previous pulse is complete. Enter the next teaching topic and manually start another pulse."
                  : "This classroom session has ended. Your collected feedback and AI teaching analysis are preserved."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <InfoChip
                  icon={
                    <Users className="h-3.5 w-3.5" />
                  }
                  label={`${participantCount} students`}
                />

                <InfoChip
                  icon={
                    <Radio className="h-3.5 w-3.5" />
                  }
                  label={`${totalSignals} signals`}
                />

                {isPulseActive && (
                  <InfoChip
                    icon={
                      <Zap className="h-3.5 w-3.5" />
                    }
                    label={
                      currentSession.roundTopic
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
                disabled={ending}
                className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 text-xs font-black text-rose-300 transition-all hover:-translate-y-0.5 hover:bg-rose-500/15 hover:shadow-lg hover:shadow-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />

                {ending
                  ? "Ending..."
                  : "End Session"}
              </button>
            )}
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] px-4 py-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />

            <p className="text-xs leading-5 text-rose-300">
              {error}
            </p>
          </div>
        )}

        {/* =====================================================
            CONTROL CENTER
        ===================================================== */}

        {isActive && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[500px_minmax(0,1fr)]">

            {/* QR ACCESS */}

            <div className="min-w-0">
              <SessionQRCode
                joinCode={
                  currentSession.joinCode
                }
                sessionId={
                  currentSession.id
                }
                title={
                  currentSession.title
                }
              />

              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniInfo
                  label="Join code"
                  value={
                    currentSession.joinCode ||
                    "—"
                  }
                />

                <MiniInfo
                  label="Students"
                  value={String(
                    participantCount
                  )}
                />
              </div>
            </div>

            {/* ROUND CONTROL */}

            <div className="relative min-w-0 overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 via-(--surface) to-indigo-500/5 p-6 sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl"
              />

              <div className="relative z-10">

                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                      Teaching pulse
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                      {isPulseActive
                        ? currentSession.roundTopic
                        : currentSession.currentRound ===
                            0
                          ? "Start your first topic"
                          : "Ready for the next topic"}
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-(--foreground-muted)">
                      {isPulseActive
                        ? "Students can respond to the current teaching topic right now."
                        : "Each pulse is manually started by you. Nothing begins automatically."}
                    </p>
                  </div>

                  {isPulseActive ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">

                      <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-2.5">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
                            Live now
                          </p>

                          <p className="max-w-52 truncate text-sm font-black text-(--foreground)">
                            {
                              currentSession.roundTopic
                            }
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleFinishPulse
                        }
                        disabled={
                          endingPulse
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 text-xs font-black text-amber-300 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" />

                        {endingPulse
                          ? "Saving..."
                          : "End Pulse"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        startingPulse ||
                        !topic.trim()
                      }
                      onClick={
                        handleStartPulse
                      }
                      className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Radio className="h-4 w-4" />

                      {startingPulse
                        ? "Starting..."
                        : currentSession.currentRound ===
                            0
                          ? "Start Pulse"
                          : "Start Next Pulse"}

                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </div>

                {!isPulseActive && (
                  <div className="mt-7">
                    <label
                      htmlFor="pulse-topic"
                      className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-(--foreground-muted)"
                    >
                      Teaching topic
                    </label>

                    <div className="relative">
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
                            !event.shiftKey
                          ) {
                            event.preventDefault()

                            if (
                              topic.trim()
                            ) {
                              void handleStartPulse()
                            }
                          }
                        }}
                        maxLength={120}
                        placeholder="Example: Database normalization"
                        className="h-13 w-full rounded-2xl border border-(--border) bg-(--background-soft) px-4 pr-20 text-sm font-semibold text-(--foreground) outline-none transition placeholder:text-(--foreground-subtle) focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10"
                      />

                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-(--surface) px-2 py-1 text-[9px] font-bold text-(--foreground-subtle)">
                        {topic.length}
                        /120
                      </span>
                    </div>

                    <div className="mt-3 flex items-start gap-2">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />

                      <p className="text-[10px] leading-5 text-(--foreground-subtle)">
                        Enter the exact concept you are teaching.
                        The pulse starts only when you press Start Pulse.
                      </p>
                    </div>
                  </div>
                )}

                {isPulseActive && (
                  <div className="mt-6 rounded-2xl border border-violet-400/10 bg-violet-500/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                        <Lightbulb className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                          Current teaching topic
                        </p>

                        <p className="mt-1 truncate text-sm font-black">
                          {
                            currentSession.roundTopic
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <RoundStatusCard
                    active={
                      currentSession.roundStatus ===
                      "waiting"
                    }
                    label="Waiting"
                    value={
                      currentSession.roundStatus ===
                      "waiting"
                        ? "Ready"
                        : "Idle"
                    }
                  />

                  <RoundStatusCard
                    active={
                      currentSession.roundStatus ===
                      "active"
                    }
                    label="Active"
                    value={
                      currentSession.roundStatus ===
                      "active"
                        ? `Round ${currentSession.currentRound}`
                        : "Idle"
                    }
                  />

                  <RoundStatusCard
                    active={
                      currentSession.roundStatus ===
                      "completed"
                    }
                    label="Completed"
                    value={
                      currentSession.roundStatus ===
                      "completed"
                        ? "Saved"
                        : "Waiting"
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            METRICS
        ===================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Students"
            value={
              participantCount
            }
            description="Unique students who responded"
            tone="blue"
          />

          <MetricCard
            icon={
              <Radio className="h-5 w-5" />
            }
            label="Total signals"
            value={
              totalSignals
            }
            description="Responses across this session"
            tone="violet"
          />

          <MetricCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Current pulse"
            value={
              currentSession.currentRound
            }
            description={
              isPulseActive
                ? "Live and collecting responses"
                : "Waiting for faculty"
            }
            tone="emerald"
          />

          <MetricCard
            icon={
              <Sparkles className="h-5 w-5" />
            }
            label="AI insight"
            value={
              aiSummaryText
                ? "Ready"
                : "Pending"
            }
            description={
              aiSummaryText
                ? "Teaching report available"
                : "Generated after session"
            }
            tone="amber"
          />
        </section>

        {/* =====================================================
            LIVE PULSE + AI
        ===================================================== */}

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">

          {/* LIVE */}
          <div className="surface overflow-hidden rounded-[2rem] p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <Radio className="h-4 w-4" />
                  </span>

                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                    Classroom pulse
                  </p>
                </div>

                <h2 className="mt-3 text-2xl font-black tracking-tight">
                  {isPulseActive
                    ? currentSession.roundTopic
                    : "Waiting for the next topic"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-(--foreground-muted)">
                  {isPulseActive
                    ? "Live responses from the current teaching topic."
                    : "The next topic will appear here when you manually start another pulse."}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-400/10 bg-violet-500/5 px-4 py-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                  Responses
                </p>

                <p className="mt-1 text-2xl font-black">
                  {
                    currentPulseTotal
                  }
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <LiveSignalCard
                signal="got_it"
                count={
                  roundCounts.got_it
                }
                total={
                  currentPulseTotal
                }
              />

              <LiveSignalCard
                signal="slightly_lost"
                count={
                  roundCounts.slightly_lost
                }
                total={
                  currentPulseTotal
                }
              />

              <LiveSignalCard
                signal="confused"
                count={
                  roundCounts.confused
                }
                total={
                  currentPulseTotal
                }
              />

              <LiveSignalCard
                signal="interesting"
                count={
                  roundCounts.interesting
                }
                total={
                  currentPulseTotal
                }
              />
            </div>

            <div className="relative mt-5 overflow-hidden rounded-2xl border border-(--border) bg-(--background-soft) p-5">
              <div
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl",
                  confusionRate >=
                    50
                    ? "bg-rose-400/10"
                    : confusionRate >=
                        25
                      ? "bg-amber-400/10"
                      : "bg-emerald-400/10",
                ].join(" ")}
              />

              <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-muted)">
                    Current confusion rate
                  </p>

                  <p className="mt-2 text-4xl font-black">
                    {
                      confusionRate
                    }
                    %
                  </p>
                </div>

                <div
                  className={[
                    "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider",
                    confusionRate >=
                      50
                      ? "bg-rose-500/10 text-rose-300"
                      : confusionRate >=
                          25
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-emerald-500/10 text-emerald-300",
                  ].join(" ")}
                >
                  {confusionRate >=
                    50
                    ? "High attention"
                    : confusionRate >=
                        25
                      ? "Watch closely"
                      : "Looking good"}
                </div>
              </div>

              <p className="relative z-10 mt-3 max-w-xl text-xs leading-5 text-(--foreground-muted)">
                Combines Slightly lost and Confused responses from
                the current teaching topic.
              </p>
            </div>

            {!isPulseActive &&
              isActive && (
                <div className="mt-5 rounded-[2rem] border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300">
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                    Next teaching segment
                  </p>

                  <h3 className="mt-2 text-lg font-black">
                    Ready for the next topic
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--foreground-muted)">
                    Enter the next concept above and manually start
                    a new PulseBoard pulse.
                  </p>
                </div>
              )}
          </div>

          {/* AI */}
          <aside className="relative overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 via-(--surface) to-indigo-500/5 p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl"
            />

            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                AI classroom insight
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Session intelligence
              </h2>

              <p className="mt-2 text-sm leading-6 text-(--foreground-muted)">
                Your teaching report turns real classroom feedback
                into practical next steps.
              </p>

              {aiSummaryText ? (
                <div className="mt-6 max-h-[420px] overflow-auto rounded-2xl border border-(--border) bg-(--background-soft) p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-(--foreground-secondary)">
                    {
                      aiSummaryText
                    }
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-(--border-strong) bg-(--background-soft) p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <p className="mt-4 text-sm font-black">
                    AI report is waiting
                  </p>

                  <p className="mt-2 text-sm leading-6 text-(--foreground-muted)">
                    End the classroom session after your teaching
                    pulses are complete. PulseBoard will then generate
                    a teaching-focused report.
                  </p>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <MiniInfo
                  label="Topics recorded"
                  value={String(
                    roundSnapshots.length
                  )}
                />

                <MiniInfo
                  label="Signals"
                  value={String(
                    totalSignals
                  )}
                />
              </div>
            </div>
          </aside>
        </section>

        {/* SESSION DETAILS */}
        <section className="surface mt-6 overflow-hidden rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Radio className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                Session details
              </p>

              <h2 className="mt-1 text-xl font-black">
                Classroom information
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailBox
              label="Course"
              value={
                currentSession.courseCode
              }
            />

            <DetailBox
              label="Join code"
              value={
                currentSession.joinCode
              }
            />

            <DetailBox
              label="Current topic"
              value={
                currentSession.roundTopic ||
                "Waiting"
              }
            />

            <DetailBox
              label="Current round"
              value={String(
                currentSession.currentRound
              )}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 *
 * We intentionally return null here until we wire a dedicated
 * round query helper. persistRoundSnapshot already has the
 * correct fallback to session-level students.
 */

function getUniqueStudentCountFromRound(
  _round: number,
  _session: SessionView
): number | null {
  return null
}

function InfoChip({
  icon,
  label,
}: {
  icon: ReactNode
  label: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-(--border) bg-(--background-soft)/70 px-3 py-1.5 text-[10px] font-bold text-(--foreground-secondary)">
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
    <div className="rounded-2xl border border-(--border) bg-(--background-soft) px-3.5 py-3">
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-(--foreground-secondary)">
        {value || "—"}
      </p>
    </div>
  )
}

function RoundStatusCard({
  active,
  label,
  value,
}: {
  active: boolean
  label: string
  value: string
}) {
  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 transition-all",
        active
          ? "border-violet-400/15 bg-violet-500/10"
          : "border-(--border) bg-(--background-soft)",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-wider text-(--foreground-subtle)">
          {label}
        </p>

        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            active
              ? "bg-violet-400"
              : "bg-(--foreground-subtle)",
          ].join(" ")}
        />
      </div>

      <p className="mt-1 text-xs font-black">
        {value}
      </p>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string | number
  description: string
  tone:
    | "blue"
    | "violet"
    | "emerald"
    | "amber"
}) {
  const toneClasses = {
    blue: {
      icon:
        "bg-blue-500/10 text-blue-300",
      glow:
        "bg-blue-500/10",
    },

    violet: {
      icon:
        "bg-violet-500/10 text-violet-300",
      glow:
        "bg-violet-500/10",
    },

    emerald: {
      icon:
        "bg-emerald-500/10 text-emerald-300",
      glow:
        "bg-emerald-500/10",
    },

    amber: {
      icon:
        "bg-amber-500/10 text-amber-300",
      glow:
        "bg-amber-500/10",
    },
  }

  const current =
    toneClasses[tone]

  return (
    <div className="group surface relative overflow-hidden rounded-[2rem] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-(--border-strong) hover:shadow-(--shadow-md)">
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          current.glow,
        ].join(" ")}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-muted)">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight">
            {value}
          </p>

          <p className="mt-1.5 text-[10px] leading-5 text-(--foreground-subtle)">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            current.icon,
            "transition-transform duration-200 group-hover:scale-110",
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function LiveSignalCard({
  signal,
  count,
  total,
}: {
  signal: SignalType
  count: number
  total: number
}) {
  const meta =
    SIGNAL_META[signal]

  const percentage =
    total > 0
      ? Math.round(
          (count / total) *
            100
        )
      : 0

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-3xl border p-4 transition-all duration-200 hover:-translate-y-0.5",
        meta.tone,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          meta.glow,
        ].join(" ")}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                meta.iconTone,
              ].join(" ")}
            >
              {meta.icon}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                {meta.label}
              </p>

              <p className="mt-1 text-[10px] text-(--foreground-muted)">
                {percentage}% of pulse
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
              meta.bar,
            ].join(" ")}
            style={{
              width:
                `${percentage}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

function DetailBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-(--border) bg-(--background-soft) p-4 transition hover:border-(--border-strong)">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-bold text-(--foreground-secondary)">
        {value || "—"}
      </p>
    </div>
  )
}