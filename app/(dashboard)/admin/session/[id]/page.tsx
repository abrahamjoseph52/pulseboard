"use client"

import {
  ArrowLeft,
  Check,
  Copy,
  Radio,
  Sparkles,
  StopCircle,
  TrendingUp,
  Users,
  Wifi,
} from "lucide-react"

import {
  useEffect,
  useMemo,
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
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore"

import {
  onAuthStateChanged,
} from "firebase/auth"

import {
  auth,
  db,
} from "@/lib/firebase"

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type {
  SignalType,
} from "@/lib/types"

/* =========================================================
   TYPES
========================================================= */

type SignalCounts = {
  got_it: number
  slightly_lost: number
  confused: number
  interesting: number
}

type Session = {
  id: string
  adminId?: string
  title?: string
  courseCode?: string
  joinCode?: string
  status?: "active" | "ended"
  createdAt?: Timestamp | null
  startedAt?: Timestamp | null
  endedAt?: Timestamp | null
  aiSummary?: string | null
  participantCount?: number
  currentRound?: number
  roundStatus?: "waiting" | "active" | "ended"
  roundTopic?: string
}

type SignalDoc = {
  studentId: string
  signal: SignalType
  round: number
  timestamp?: Timestamp | null
}

type RoundSnapshot = {
  round: number
  got_it: number
  slightly_lost: number
  confused: number
  interesting: number
  total: number
  confusion: number
}

type RoomState =
  | "waiting"
  | "green"
  | "yellow"
  | "red"

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_COUNTS: SignalCounts = {
  got_it: 0,
  slightly_lost: 0,
  confused: 0,
  interesting: 0,
}

const SIGNAL_CONFIG: Record<
  SignalType,
  {
    label: string
    description: string
    color: string
    bg: string
  }
> = {
  got_it: {
    label: "Got it",
    description: "Students are following clearly",
    color: "#22c55e",
    bg: "bg-emerald-500/10",
  },

  slightly_lost: {
    label: "Slightly lost",
    description: "Some students need clarification",
    color: "#f59e0b",
    bg: "bg-amber-500/10",
  },

  confused: {
    label: "Confused",
    description: "Students need more explanation",
    color: "#ef4444",
    bg: "bg-rose-500/10",
  },

  interesting: {
    label: "Interesting",
    description: "Students are engaged",
    color: "#8b5cf6",
    bg: "bg-violet-500/10",
  },
}

/* =========================================================
   TYPE HELPERS
========================================================= */

function isSignalType(
  value: unknown,
): value is SignalType {
  return (
    value === "got_it" ||
    value === "slightly_lost" ||
    value === "confused" ||
    value === "interesting"
  )
}

function readString(
  value: unknown,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined
}

function readNumber(
  value: unknown,
): number | undefined {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : undefined
}

function readTimestamp(
  value: unknown,
): Timestamp | null | undefined {
  if (value === null) {
    return null
  }

  if (value instanceof Timestamp) {
    return value
  }

  return undefined
}

function timestampToMillis(
  timestamp?: Timestamp | null,
): number {
  return timestamp?.toMillis?.() ?? 0
}

/* =========================================================
   SESSION MAPPER
========================================================= */

function mapSessionData(
  id: string,
  rawData: Record<string, unknown>,
): Session {
  const status =
    rawData.status === "active" ||
    rawData.status === "ended"
      ? rawData.status
      : undefined

  const roundStatus =
    rawData.roundStatus === "waiting" ||
    rawData.roundStatus === "active" ||
    rawData.roundStatus === "ended"
      ? rawData.roundStatus
      : undefined

  const currentRound =
    readNumber(
      rawData.currentRound,
    )

  const participantCount =
    readNumber(
      rawData.participantCount,
    )

  return {
    id,

    adminId:
      readString(
        rawData.adminId,
      ),

    title:
      readString(
        rawData.title,
      ),

    courseCode:
      readString(
        rawData.courseCode,
      ),

    joinCode:
      readString(
        rawData.joinCode,
      ),

    status,

    createdAt:
      readTimestamp(
        rawData.createdAt,
      ),

    startedAt:
      readTimestamp(
        rawData.startedAt,
      ),

    endedAt:
      readTimestamp(
        rawData.endedAt,
      ),

    aiSummary:
      rawData.aiSummary === null
        ? null
        : readString(
              rawData.aiSummary,
            ) ?? null,

    participantCount,

    currentRound,

    roundStatus,

    roundTopic:
      readString(
        rawData.roundTopic,
      ),
  }
}

/* =========================================================
   ROOM STATE
========================================================= */

function getRoomState(
  counts: SignalCounts,
  total: number,
): RoomState {
  if (total <= 0) {
    return "waiting"
  }

  const confusion =
    (counts.confused +
      counts.slightly_lost) /
    total

  if (confusion > 0.5) {
    return "red"
  }

  if (confusion > 0.25) {
    return "yellow"
  }

  return "green"
}

/* =========================================================
   ROOM STATE CONFIG
========================================================= */

function getRoomStateConfig(
  state: RoomState,
) {
  switch (state) {
    case "green":
      return {
        label: "Room is following",
        dot: "bg-emerald-400",
        text: "text-emerald-300",
        bg: "bg-emerald-400/10",
        border: "border-emerald-400/15",
      }

    case "yellow":
      return {
        label: "Some confusion",
        dot: "bg-amber-400",
        text: "text-amber-300",
        bg: "bg-amber-400/10",
        border: "border-amber-400/15",
      }

    case "red":
      return {
        label: "Significant confusion",
        dot: "bg-rose-400",
        text: "text-rose-300",
        bg: "bg-rose-400/10",
        border: "border-rose-400/15",
      }

    default:
      return {
        label: "Waiting for students",
        dot: "bg-white/30",
        text: "text-(--foreground-muted)",
        bg: "bg-(--background-soft)",
        border: "border-(--border)",
      }
  }
}

/* =========================================================
   AGGREGATE CURRENT ROUND
========================================================= */

function aggregateCurrentRound(
  docs: SignalDoc[],
  currentRound: number,
) {
  const latestPerStudent =
    new Map<string, SignalType>()

  docs
    .filter(
      (item) =>
        item.round === currentRound,
    )
    .sort(
      (a, b) =>
        timestampToMillis(
          a.timestamp,
        ) -
        timestampToMillis(
          b.timestamp,
        ),
    )
    .forEach(
      (item) => {
        latestPerStudent.set(
          item.studentId,
          item.signal,
        )
      },
    )

  const counts: SignalCounts = {
    ...EMPTY_COUNTS,
  }

  latestPerStudent.forEach(
    (signal) => {
      counts[signal] += 1
    },
  )

  return {
    counts,
    uniqueStudents:
      latestPerStudent.size,
  }
}

/* =========================================================
   ROUND HISTORY
========================================================= */

function buildRoundSnapshots(
  docs: SignalDoc[],
): RoundSnapshot[] {
  const byRound =
    new Map<number, SignalDoc[]>()

  docs.forEach(
    (item) => {
      const round =
        item.round || 1

      if (!byRound.has(round)) {
        byRound.set(
          round,
          [],
        )
      }

      byRound
        .get(round)!
        .push(item)
    },
  )

  return Array.from(
    byRound.keys(),
  )
    .sort(
      (a, b) => a - b,
    )
    .map(
      (round) => {
        const roundDocs =
          byRound.get(
            round,
          ) ?? []

        const latestPerStudent =
          new Map<
            string,
            SignalType
          >()

        roundDocs
          .slice()
          .sort(
            (a, b) =>
              timestampToMillis(
                a.timestamp,
              ) -
              timestampToMillis(
                b.timestamp,
              ),
          )
          .forEach(
            (item) => {
              latestPerStudent.set(
                item.studentId,
                item.signal,
              )
            },
          )

        const counts: SignalCounts =
          {
            ...EMPTY_COUNTS,
          }

        latestPerStudent.forEach(
          (signal) => {
            counts[signal] += 1
          },
        )

        const total =
          latestPerStudent.size

        const confusion =
          total > 0
            ? Math.round(
                ((counts.confused +
                  counts.slightly_lost) /
                  total) *
                  100,
              )
            : 0

        return {
          round,
          ...counts,
          total,
          confusion,
        }
      },
    )
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminSessionPage() {
  const router =
    useRouter()

  const params =
    useParams()

  const sessionId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(
            params.id,
          )
        ? params.id[0]
        : ""

  /* =======================================================
     SESSION STATE
  ======================================================= */

  const [
    session,
    setSession,
  ] = useState<Session | null>(
    null,
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    authChecked,
    setAuthChecked,
  ] = useState(false)

  /* =======================================================
     SIGNAL STATE
  ======================================================= */

  const [
    signalDocs,
    setSignalDocs,
  ] = useState<SignalDoc[]>(
    [],
  )

  /* =======================================================
     UI STATE
  ======================================================= */

  const [
    copied,
    setCopied,
  ] = useState(false)

  const [
    ending,
    setEnding,
  ] = useState(false)

  const [
    summaryLoading,
    setSummaryLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState("")

  /* =======================================================
     REFS
  ======================================================= */

  const signalDocsRef =
    useRef<SignalDoc[]>([])

  const currentRoundRef =
    useRef(1)

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            router.replace(
              "/login",
            )

            return
          }

          setAuthChecked(true)
        },
      )

    return () =>
      unsubscribe()
  }, [router])

  /* =======================================================
     SESSION LISTENER

     IMPORTANT:
     No synchronous setState directly inside the effect.
     State changes happen only from the Firestore callback.
  ======================================================= */

  useEffect(() => {
    if (
      !authChecked ||
      !sessionId
    ) {
      return
    }

    const sessionRef =
      doc(
        db,
        "sessions",
        sessionId,
      )

    const unsubscribe =
      onSnapshot(
        sessionRef,
        (snapshot) => {
          if (
            !snapshot.exists()
          ) {
            setError(
              "This classroom session no longer exists.",
            )

            setLoading(false)

            return
          }

          const rawData =
            snapshot.data() as Record<
              string,
              unknown
            >

          const nextSession =
            mapSessionData(
              snapshot.id,
              rawData,
            )

          setSession(
            nextSession,
          )

          const firestoreRound =
            Number(
              nextSession.currentRound ??
                1,
            )

          currentRoundRef.current =
            firestoreRound > 0
              ? firestoreRound
              : 1

          setLoading(false)
        },
        (snapshotError) => {
          console.error(
            "Session listener error:",
            snapshotError,
          )

          setError(
            "Unable to load this classroom session.",
          )

          setLoading(false)
        },
      )

    return () =>
      unsubscribe()
  }, [
    authChecked,
    sessionId,
  ])

  /* =======================================================
     LIVE SIGNAL LISTENER

     Firestore is the external source.
     Signal docs are the only signal state we store.
     Counts are derived below with useMemo.
  ======================================================= */

  useEffect(() => {
    if (
      !authChecked ||
      !sessionId
    ) {
      return
    }

    const signalsQuery =
      query(
        collection(
          db,
          "signals",
        ),
        where(
          "sessionId",
          "==",
          sessionId,
        ),
      )

    const unsubscribe =
      onSnapshot(
        signalsQuery,
        (snapshot) => {
          const docs =
            snapshot.docs.flatMap(
              (item) => {
                const rawData =
                  item.data() as Record<
                    string,
                    unknown
                  >

                const signal =
                  rawData.signal

                if (
                  !isSignalType(
                    signal,
                  )
                ) {
                  return []
                }

                const studentId =
                  readString(
                    rawData.studentId,
                  )

                if (
                  !studentId
                ) {
                  return []
                }

                const roundValue =
                  readNumber(
                    rawData.round,
                  )

                return [
                  {
                    studentId,
                    signal,
                    round:
                      roundValue &&
                      roundValue > 0
                        ? roundValue
                        : 1,
                    timestamp:
                      readTimestamp(
                        rawData.timestamp,
                      ),
                  },
                ]
              },
            )

          signalDocsRef.current =
            docs

          setSignalDocs(
            docs,
          )

          /*
           * Keep the participant count synchronized
           * with Firestore.
           *
           * This is intentionally inside the Firestore
           * callback because it is reacting to an external
           * system update.
           */
          const round =
            currentRoundRef.current

          const {
            uniqueStudents,
          } =
            aggregateCurrentRound(
              docs,
              round,
            )

          updateDoc(
            doc(
              db,
              "sessions",
              sessionId,
            ),
            {
              participantCount:
                uniqueStudents,
            },
          ).catch(
            (updateError) => {
              console.warn(
                "Participant count sync skipped:",
                updateError,
              )
            },
          )
        },
        (snapshotError) => {
          console.error(
            "Signal listener error:",
            snapshotError,
          )

          setError(
            "Live classroom signals could not be loaded.",
          )
        },
      )

    return () =>
      unsubscribe()
  }, [
    authChecked,
    sessionId,
  ])

  /* =======================================================
     CURRENT ROUND
  ======================================================= */

  const currentRound =
    Number(
      session?.currentRound ??
        1,
    ) > 0
      ? Number(
          session?.currentRound ??
            1,
        )
      : 1

  /* =======================================================
     DERIVED LIVE DATA

     IMPORTANT:
     These values are NOT stored in state.
     They are calculated from existing React state.
     This removes the setState-in-effect error.
  ======================================================= */

  const {
    counts: signalCounts,
    uniqueStudents:
      participantCount,
  } = useMemo(
    () =>
      aggregateCurrentRound(
        signalDocs,
        currentRound,
      ),
    [
      signalDocs,
      currentRound,
    ],
  )

  const roundSnapshots =
    useMemo(
      () =>
        buildRoundSnapshots(
          signalDocs,
        ),
      [signalDocs],
    )

  const trendData =
    useMemo(
      () =>
        roundSnapshots.map(
          (snapshot) => ({
            round:
              snapshot.round,

            confusion:
              snapshot.confusion,
          }),
        ),
      [roundSnapshots],
    )

  /* =======================================================
     DERIVED SESSION VALUES
  ======================================================= */

  const roundStatus =
    session?.roundStatus ??
    (session?.status ===
    "active"
      ? "active"
      : "ended")

  const isEnded =
    session?.status ===
    "ended"

  const isRoundActive =
    !isEnded &&
    roundStatus ===
      "active"

  const roundTopic =
    session?.roundTopic ??
    ""

  const sessionTitle =
    session?.title ??
    "Live Classroom Session"

  const courseCode =
    session?.courseCode ??
    "CLASSROOM"

  const joinCode =
    session?.joinCode ??
    "------"

  const totalSignals =
    Object.values(
      signalCounts,
    ).reduce(
      (
        total,
        value,
      ) =>
        total + value,
      0,
    )

  const roomState =
    getRoomState(
      signalCounts,
      totalSignals,
    )

  const roomConfig =
    getRoomStateConfig(
      roomState,
    )

  const confusionPercentage =
    totalSignals > 0
      ? Math.round(
          ((signalCounts.confused +
            signalCounts.slightly_lost) /
            totalSignals) *
            100,
        )
      : 0

  /* =======================================================
     COPY JOIN CODE
  ======================================================= */

  const handleCopy =
    async () => {
      if (!joinCode) {
        return
      }

      try {
        await navigator.clipboard.writeText(
          joinCode,
        )

        setCopied(true)

        window.setTimeout(
          () => {
            setCopied(false)
          },
          1800,
        )
      } catch (copyError) {
        console.error(
          "Copy failed:",
          copyError,
        )
      }
    }

  /* =======================================================
     END SESSION
  ======================================================= */

  const handleEndSession =
    async () => {
      if (
        !session ||
        !sessionId ||
        ending ||
        isEnded
      ) {
        return
      }

      const shouldEnd =
        window.confirm(
          "End this classroom session? Students will no longer be able to submit new pulses.",
        )

      if (!shouldEnd) {
        return
      }

      setEnding(true)
      setSummaryLoading(true)
      setError("")

      try {
        const docs =
          signalDocsRef.current

        const snapshots =
          buildRoundSnapshots(
            docs,
          )

        const finalRound =
          currentRoundRef.current

        const finalRoundDocs =
          docs.filter(
            (item) =>
              item.round ===
              finalRound,
          )

        const latestPerStudent =
          new Map<
            string,
            SignalType
          >()

        finalRoundDocs
          .slice()
          .sort(
            (a, b) =>
              timestampToMillis(
                a.timestamp,
              ) -
              timestampToMillis(
                b.timestamp,
              ),
          )
          .forEach(
            (item) => {
              latestPerStudent.set(
                item.studentId,
                item.signal,
              )
            },
          )

        const finalCounts: SignalCounts =
          {
            ...EMPTY_COUNTS,
          }

        latestPerStudent.forEach(
          (signal) => {
            finalCounts[signal] += 1
          },
        )

        /* -------------------------------------------------
           SAVE FINAL ROUND SNAPSHOT
        ------------------------------------------------- */

        await addDoc(
          collection(
            db,
            "sessions",
            sessionId,
            "snapshots",
          ),
          {
            timestamp:
              serverTimestamp(),

            round:
              finalRound,

            ...finalCounts,

            total:
              latestPerStudent.size,
          },
        ).catch(
          (snapshotError) => {
            console.warn(
              "Final snapshot could not be saved:",
              snapshotError,
            )
          },
        )

        /* -------------------------------------------------
           END SESSION
        ------------------------------------------------- */

        await updateDoc(
          doc(
            db,
            "sessions",
            sessionId,
          ),
          {
            status:
              "ended",

            roundStatus:
              "ended",

            endedAt:
              serverTimestamp(),
          },
        )

        /* -------------------------------------------------
           AI SUMMARY PAYLOAD
        ------------------------------------------------- */

        const fallbackCounts =
          aggregateCurrentRound(
            docs,
            finalRound,
          ).counts

        const fallbackTotal =
          Object.values(
            fallbackCounts,
          ).reduce(
            (
              total,
              value,
            ) =>
              total + value,
            0,
          )

        const snapshotsForApi =
          snapshots.length > 0
            ? snapshots.map(
                (
                  snapshot,
                ) => ({
                  round:
                    snapshot.round,

                  got_it:
                    snapshot.got_it,

                  slightly_lost:
                    snapshot.slightly_lost,

                  confused:
                    snapshot.confused,

                  interesting:
                    snapshot.interesting,

                  total:
                    snapshot.total,
                }),
              )
            : [
                {
                  round:
                    finalRound,

                  got_it:
                    fallbackCounts.got_it,

                  slightly_lost:
                    fallbackCounts.slightly_lost,

                  confused:
                    fallbackCounts.confused,

                  interesting:
                    fallbackCounts.interesting,

                  total:
                    fallbackTotal,
                },
              ]

        /* -------------------------------------------------
           GENERATE AI SUMMARY
        ------------------------------------------------- */

        try {
          const response =
            await fetch(
              "/api/generate-summary",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  sessionId,

                  snapshots:
                    snapshotsForApi,

                  sessionTitle,

                  courseCode,
                }),
              },
            )

          if (
            !response.ok
          ) {
            console.error(
              "AI summary API returned:",
              response.status,
            )
          }
        } catch (summaryError) {
          console.error(
            "AI summary generation failed:",
            summaryError,
          )
        }
      } catch (endError) {
        console.error(
          "Failed to end session:",
          endError,
        )

        setError(
          endError instanceof
            Error
            ? endError.message
            : "Unable to end this session.",
        )
      } finally {
        setSummaryLoading(
          false,
        )

        setEnding(false)
      }
    }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading ||
    !authChecked
  ) {
    return (
      <main className="min-h-screen bg-(--background) text-(--foreground)">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="surface w-full max-w-sm rounded-[2rem] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <Wifi className="h-6 w-6 animate-pulse" />
            </div>

            <p className="mt-5 text-sm font-black">
              Loading classroom
            </p>

            <p className="mt-2 text-xs text-(--foreground-muted)">
              Connecting to the live faculty dashboard...
            </p>

            <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-(--background-soft)">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-violet-500" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    error &&
    !session
  ) {
    return (
      <main className="min-h-screen bg-(--background) text-(--foreground)">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="surface w-full max-w-md rounded-[2rem] p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-300">
              <Radio className="h-7 w-7" />
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
              Classroom unavailable
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Session could not be loaded
            </h1>

            <p className="mt-3 text-sm leading-6 text-(--foreground-muted)">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/dashboard",
                )
              }
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>
          </div>
        </div>
      </main>
    )
  }

  /* =======================================================
     SAFETY
  ======================================================= */

  if (!session) {
    return null
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-(--background) text-(--foreground)">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-(--border) bg-(--background)/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/dashboard",
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--foreground-muted) transition hover:border-violet-400/30 hover:text-(--foreground)"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
              <Wifi className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                Faculty Command Center
              </p>

              <p className="truncate text-[10px] text-(--foreground-muted)">
                {courseCode} ·{" "}
                {sessionTitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={[
                "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] sm:flex",
                isEnded
                  ? "border-(--border) bg-(--background-soft) text-(--foreground-muted)"
                  : "border-emerald-400/15 bg-emerald-400/10 text-emerald-300",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  isEnded
                    ? "bg-(--foreground-subtle)"
                    : "animate-pulse bg-emerald-400",
                ].join(" ")}
              />

              {isEnded
                ? "Ended"
                : "Live"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.10] p-6 shadow-(--shadow-lg) sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"
          />

          <div className="relative">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]",
                      isEnded
                        ? "border-(--border) bg-(--background-soft) text-(--foreground-muted)"
                        : "border-emerald-400/15 bg-emerald-400/10 text-emerald-300",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-1.5 w-1.5 rounded-full",
                        isEnded
                          ? "bg-(--foreground-subtle)"
                          : "animate-pulse bg-emerald-400",
                      ].join(" ")}
                    />

                    {isEnded
                      ? "Session complete"
                      : "Live classroom"}
                  </span>

                  <span className="rounded-full border border-violet-400/10 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                    {courseCode}
                  </span>

                  {!isEnded && (
                    <span className="rounded-full border border-indigo-400/10 bg-indigo-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-indigo-300">
                      Round{" "}
                      {currentRound}
                    </span>
                  )}
                </div>

                <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                  {sessionTitle}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                  Monitor the classroom pulse in real time while students respond anonymously.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
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
                    label={`Room ${joinCode}`}
                  />

                  <InfoChip
                    icon={
                      <TrendingUp className="h-3.5 w-3.5" />
                    }
                    label={
                      isRoundActive
                        ? "Pulse open"
                        : isEnded
                          ? "Closed"
                          : "Waiting"
                    }
                  />
                </div>
              </div>

              <div className="shrink-0">
                <div className="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
                  <div className="absolute inset-0 rounded-full border border-violet-400/10 bg-violet-500/5" />

                  <div className="absolute inset-6 rounded-full border border-violet-400/10" />

                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-linear-to-br from-violet-500 via-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                    <Radio className="h-10 w-10" />
                  </div>

                  <div className="absolute right-0 top-5 rounded-2xl border border-(--border) bg-(--surface)/90 px-3 py-2 shadow-(--shadow-md) backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "h-2 w-2 rounded-full",
                          isEnded
                            ? "bg-(--foreground-subtle)"
                            : "animate-pulse bg-emerald-400",
                        ].join(" ")}
                      />

                      <span className="text-[9px] font-black uppercase tracking-wider text-(--foreground-muted)">
                        {isEnded
                          ? "Completed"
                          : "Monitoring"}
                      </span>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-0 rounded-2xl border border-(--border) bg-(--surface)/90 px-3 py-2 shadow-(--shadow-md) backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-violet-300" />

                      <span className="text-[9px] font-black uppercase tracking-wider text-(--foreground-muted)">
                        Live insights
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            ERROR BANNER
        ===================================================== */}

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* =====================================================
            CURRENT TOPIC
        ===================================================== */}

        {!isEnded && (
          <section className="mt-5 rounded-[2rem] border border-violet-500/15 bg-linear-to-r from-violet-500/10 via-(--surface) to-indigo-500/5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Current teaching pulse
                </p>

                <h2 className="mt-1 text-lg font-black sm:text-xl">
                  {roundTopic ||
                    "Teaching pulse in progress"}
                </h2>

                <p className="mt-1 text-xs text-(--foreground-muted)">
                  Round{" "}
                  {currentRound}{" "}
                  ·{" "}
                  {roundStatus ===
                  "active"
                    ? "Students can respond now"
                    : "Waiting for faculty to start the pulse"}
                </p>
              </div>

              <div
                className={[
                  "inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider sm:self-auto",
                  isRoundActive
                    ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/15 bg-amber-400/10 text-amber-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    isRoundActive
                      ? "animate-pulse bg-emerald-400"
                      : "bg-amber-400",
                  ].join(" ")}
                />

                {isRoundActive
                  ? "Live"
                  : "Waiting"}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            STAT CARDS
        ===================================================== */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Students"
            value={String(
              participantCount,
            )}
            description="Unique students in this pulse"
            tone="blue"
          />

          <StatCard
            icon={
              <Radio className="h-5 w-5" />
            }
            label="Responses"
            value={String(
              totalSignals,
            )}
            description="Signals in current round"
            tone="violet"
          />

          <StatCard
            icon={
              <TrendingUp className="h-5 w-5" />
            }
            label="Confusion"
            value={`${confusionPercentage}%`}
            description="Lost + confused signals"
            tone="rose"
          />

          <StatCard
            icon={
              <Sparkles className="h-5 w-5" />
            }
            label="Current round"
            value={
              isEnded
                ? "Done"
                : String(
                    currentRound,
                  )
            }
            description={
              isEnded
                ? "Classroom completed"
                : roundTopic ||
                  "Live teaching pulse"
            }
            tone="emerald"
          />
        </div>

        {/* =====================================================
            MAIN GRID
        ===================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ===================================================
              LIVE DISTRIBUTION
          =================================================== */}

          <section className="surface overflow-hidden rounded-[2rem]">
            <div className="border-b border-(--border) bg-linear-to-r from-violet-500/[0.04] to-transparent p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                      <Radio className="h-4 w-4" />
                    </span>

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                      Classroom pulse
                    </p>
                  </div>

                  <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                    Live signal distribution
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-(--foreground-muted)">
                    Anonymous student responses update here automatically.
                  </p>
                </div>

                <div
                  className={[
                    "inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wider",
                    roomConfig.bg,
                    roomConfig.border,
                    roomConfig.text,
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-2 w-2 rounded-full",
                      roomConfig.dot,
                      roomState ===
                        "green"
                        ? "animate-pulse"
                        : "",
                    ].join(" ")}
                  />

                  {roomConfig.label}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="grid gap-3">
                {(
                  Object.keys(
                    SIGNAL_CONFIG,
                  ) as SignalType[]
                ).map(
                  (signal) => {
                    const config =
                      SIGNAL_CONFIG[
                        signal
                      ]

                    const count =
                      signalCounts[
                        signal
                      ]

                    const percentage =
                      totalSignals >
                      0
                        ? Math.round(
                            (count /
                              totalSignals) *
                              100,
                          )
                        : 0

                    return (
                      <SignalRow
                        key={
                          signal
                        }
                        label={
                          config.label
                        }
                        description={
                          config.description
                        }
                        count={
                          count
                        }
                        percentage={
                          percentage
                        }
                        color={
                          config.color
                        }
                        bg={
                          config.bg
                        }
                      />
                    )
                  },
                )}
              </div>

              {totalSignals ===
                0 && (
                <div className="mt-5 rounded-2xl border border-(--border) bg-(--background-soft) px-5 py-8 text-center">
                  <Radio className="mx-auto h-7 w-7 text-(--foreground-subtle)" />

                  <p className="mt-3 text-sm font-black">
                    Waiting for student responses
                  </p>

                  <p className="mt-1 text-xs text-(--foreground-muted)">
                    Signals will appear here as students respond.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ===================================================
              FACULTY CONTROL
          =================================================== */}

          <aside className="space-y-5">
            <section className="surface rounded-[2rem] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <Radio className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                    Faculty control
                  </p>

                  <h2 className="mt-1 text-base font-black">
                    Classroom room
                  </h2>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-violet-400/10 bg-violet-500/[0.04] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
                  Join code
                </p>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-3xl font-black tracking-[0.16em]">
                    {joinCode}
                  </span>

                  <button
                    type="button"
                    onClick={
                      handleCopy
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--foreground-muted) transition hover:border-violet-400/30 hover:text-violet-300"
                    aria-label="Copy join code"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-[10px] text-(--foreground-muted)">
                  Share this code with students.
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-(--border) bg-(--background-soft) p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
                  Current topic
                </p>

                <p className="mt-2 text-sm font-black">
                  {roundTopic ||
                    "No topic specified"}
                </p>

                <p className="mt-1 text-[10px] text-(--foreground-muted)">
                  Round{" "}
                  {currentRound}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[10px] text-(--foreground-subtle)">
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    roomConfig.dot,
                  ].join(" ")}
                />

                {roomConfig.label}
              </div>
            </section>

            {/* =================================================
                PRIVACY
            ================================================= */}

            <section className="relative overflow-hidden rounded-[2rem] border border-emerald-400/10 bg-emerald-400/[0.035] p-5">
              <div className="relative z-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <Users className="h-5 w-5" />
                </div>

                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
                  Privacy first
                </p>

                <h3 className="mt-2 text-base font-black">
                  Faculty sees classroom totals.
                </h3>

                <p className="mt-2 text-xs leading-5 text-(--foreground-muted)">
                  Individual student identities are not displayed in the live signal dashboard.
                </p>
              </div>
            </section>

            {/* =================================================
                END SESSION
            ================================================= */}

            {!isEnded && (
              <section className="rounded-[2rem] border border-rose-400/10 bg-rose-400/[0.035] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">
                  Session control
                </p>

                <h3 className="mt-2 text-base font-black">
                  Finish this classroom?
                </h3>

                <p className="mt-2 text-xs leading-5 text-(--foreground-muted)">
                  Ending the session closes new student responses and prepares the classroom data for the insight report.
                </p>

                <button
                  type="button"
                  onClick={
                    handleEndSession
                  }
                  disabled={
                    ending
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-black text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <StopCircle className="h-4 w-4" />

                  {ending
                    ? "Ending session..."
                    : "End session"}
                </button>
              </section>
            )}
          </aside>
        </div>

        {/* =====================================================
            ROUND TREND
        ===================================================== */}

        {trendData.length >
          1 && (
          <section className="surface mt-6 rounded-[2rem] p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                <TrendingUp className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
                  Teaching trend
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Confusion across rounds
                </h2>
              </div>
            </div>

            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    trendData
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 5,
                  }}
                >
                  <XAxis
                    dataKey="round"
                    tick={{
                      fill: "currentColor",
                      fontSize: 11,
                      opacity: 0.5,
                    }}
                    tickLine={
                      false
                    }
                    axisLine={
                      false
                    }
                    tickFormatter={(
                      value,
                    ) =>
                      `R${value}`
                    }
                  />

                  <YAxis
                    domain={[
                      0,
                      100,
                    ]}
                    tick={{
                      fill: "currentColor",
                      fontSize: 11,
                      opacity: 0.5,
                    }}
                    tickLine={
                      false
                    }
                    axisLine={
                      false
                    }
                    tickFormatter={(
                      value,
                    ) =>
                      `${value}%`
                    }
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "var(--surface)",
                      border:
                        "1px solid var(--border)",
                      borderRadius:
                        "14px",
                      color:
                        "var(--foreground)",
                      fontSize:
                        "12px",
                    }}
                    formatter={(
                      value,
                    ) => [
                      `${value}%`,
                      "Confusion",
                    ]}
                    labelFormatter={(
                      value,
                    ) =>
                      `Round ${value}`
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="confusion"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#ef4444",
                    }}
                    activeDot={{
                      r: 6,
                      fill: "#ef4444",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* =====================================================
            AI SUMMARY
        ===================================================== */}

        {isEnded && (
          <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-400/15 bg-linear-to-br from-violet-500/[0.08] via-(--surface) to-indigo-500/[0.05] p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                  AI classroom report
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Teaching insights
                </h2>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-(--border) bg-(--background-soft) p-5">
              {summaryLoading ? (
                <div className="flex items-center gap-3 text-sm text-(--foreground-muted)">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />

                  Generating classroom insights...
                </div>
              ) : session.aiSummary ? (
                <div className="space-y-4">
                  {session.aiSummary
                    .split(
                      "\n\n",
                    )
                    .filter(
                      (
                        paragraph,
                      ) =>
                        paragraph.trim()
                          .length >
                        0,
                    )
                    .map(
                      (
                        paragraph,
                        index,
                      ) => (
                        <p
                          key={
                            index
                          }
                          className="text-sm leading-7 text-(--foreground-secondary)"
                        >
                          {paragraph.trim()}
                        </p>
                      ),
                    )}
                </div>
              ) : (
                <div className="text-sm leading-6 text-(--foreground-muted)">
                  Classroom session ended successfully. The AI insight report is not available yet.
                </div>
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="mt-8 pb-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--foreground-subtle)">
            PulseBoard · Faculty Command Center
          </p>

          <p className="mt-2 text-[10px] text-(--foreground-subtle)">
            Live classroom signals · Anonymous student feedback · Real-time insights
          </p>
        </footer>
      </div>
    </main>
  )
}

/* =========================================================
   INFO CHIP
========================================================= */

function InfoChip({
  icon,
  label,
}: {
  icon: ReactNode
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--background-soft)/75 px-3 py-1.5 text-[10px] font-bold text-(--foreground-secondary)">
      <span className="text-violet-300">
        {icon}
      </span>

      {label}
    </span>
  )
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  description: string
  tone:
    | "blue"
    | "violet"
    | "rose"
    | "emerald"
}) {
  const tones = {
    blue: {
      icon: "bg-blue-500/10 text-blue-300",
    },

    violet: {
      icon: "bg-violet-500/10 text-violet-300",
    },

    rose: {
      icon: "bg-rose-500/10 text-rose-300",
    },

    emerald: {
      icon: "bg-emerald-500/10 text-emerald-300",
    },
  }

  return (
    <div className="surface surface-hover rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            tones[tone].icon,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <p className="mt-5 text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black tracking-tight">
        {value}
      </p>

      <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-(--foreground-muted)">
        {description}
      </p>
    </div>
  )
}

/* =========================================================
   SIGNAL ROW
========================================================= */

function SignalRow({
  label,
  description,
  count,
  percentage,
  color,
  bg,
}: {
  label: string
  description: string
  count: number
  percentage: number
  color: string
  bg: string
}) {
  return (
    <div className="rounded-2xl border border-(--border) bg-(--background-soft)/50 p-4">
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            bg,
          ].join(" ")}
          style={{
            color,
          }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black">
                {label}
              </p>

              <p className="mt-0.5 text-[10px] text-(--foreground-muted)">
                {description}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-lg font-black tabular-nums">
                {count}
              </p>

              {percentage >
                0 && (
                <p className="text-[9px] font-bold text-(--foreground-subtle)">
                  {percentage}%
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-(--background)">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                backgroundColor:
                  color,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}