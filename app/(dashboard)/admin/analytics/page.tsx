"use client"

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Flame,
  Layers3,
  Lightbulb,
  Radio,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { useRouter } from "next/navigation"

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore"

import {
  auth,
  db,
} from "@/lib/firebase"

import ThemeToggle from "@/app/components/ThemeToggle"
import Card from "@/app/components/ui/Card"
import Loading from "@/app/components/ui/Loading"

import type {
  Session,
  SignalType,
} from "@/lib/types"

type Snapshot = {
  id: string
  round: number
  topic: string
  got_it: number
  slightly_lost: number
  confused: number
  interesting: number
  total: number
  createdAt?: unknown
}

type SessionAnalytics = {
  session: Session
  snapshots: Snapshot[]
}

type AggregateSignals = {
  got_it: number
  slightly_lost: number
  confused: number
  interesting: number
}

type AnalyticsTotals = {
  totalSessions: number
  totalSignals: number
  averageParticipants: number
  understandingRate: number
  confusionRate: number
  interestRate: number
  activeSessions: number
}

const EMPTY_SIGNALS: AggregateSignals = {
  got_it: 0,
  slightly_lost: 0,
  confused: 0,
  interesting: 0,
}

export default function AnalyticsPage() {
  const router = useRouter()

  const [
    sessions,
    setSessions,
  ] = useState<SessionAnalytics[]>([])

  const [
    loading,
    setLoading,
  ] = useState(
    Boolean(auth.currentUser)
  )

  const [
    error,
    setError,
  ] = useState<string | null>(
    auth.currentUser
      ? null
      : "You must be signed in to view analytics."
  )

  const [
    selectedSessionId,
    setSelectedSessionId,
  ] = useState("all")

  /*
   * Faculty sessions.
   */
  useEffect(() => {
    const currentUser =
      auth.currentUser

    if (!currentUser) {
      return
    }

    const sessionsQuery =
      query(
        collection(
          db,
          "sessions"
        ),
        where(
          "adminId",
          "==",
          currentUser.uid
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      )

    const unsubscribe =
      onSnapshot(
        sessionsQuery,
        (snapshot) => {
          const nextSessions:
            SessionAnalytics[] =
            snapshot.docs.map(
              (
                sessionDocument
              ) => ({
                session: {
                  id:
                    sessionDocument.id,

                  ...(
                    sessionDocument.data() as Omit<
                      Session,
                      "id"
                    >
                  ),
                },

                snapshots: [],
              })
            )

          setSessions(
            nextSessions
          )

          setLoading(
            false
          )

          setError(
            null
          )
        },
        (snapshotError) => {
          console.error(
            "Failed to load analytics sessions:",
            snapshotError
          )

          setError(
            "Unable to load your classroom analytics."
          )

          setLoading(
            false
          )
        }
      )

    return unsubscribe
  }, [])

  /*
   * Individual session snapshots.
   */
  useEffect(() => {
    if (
      sessions.length ===
      0
    ) {
      return
    }

    const unsubscribers =
      sessions.map(
        (
          item
        ) => {
          const snapshotsQuery =
            query(
              collection(
                db,
                "sessions",
                item.session.id,
                "snapshots"
              ),
              orderBy(
                "round",
                "asc"
              )
            )

          return onSnapshot(
            snapshotsQuery,
            (snapshot) => {
              const snapshots:
                Snapshot[] =
                snapshot.docs.map(
                  (
                    snapshotDocument
                  ) => {
                    const data =
                      snapshotDocument.data()

                    return {
                      id:
                        snapshotDocument.id,

                      round:
                        toNumber(
                          data.round
                        ),

                      topic:
                        typeof data.topic ===
                        "string"
                          ? data.topic
                          : "Untitled topic",

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

                      createdAt:
                        data.createdAt,
                    }
                  }
                )

              setSessions(
                (
                  current
                ) =>
                  current.map(
                    (
                      currentSession
                    ) =>
                      currentSession
                        .session
                        .id ===
                      item
                        .session
                        .id
                        ? {
                            ...currentSession,
                            snapshots,
                          }
                        : currentSession
                  )
              )
            },
            (snapshotError) => {
              console.error(
                `Failed to load snapshots for session ${item.session.id}:`,
                snapshotError
              )
            }
          )
        }
      )

    return () => {
      unsubscribers.forEach(
        (
          unsubscribe
        ) =>
          unsubscribe()
      )
    }
  }, [
    sessions.length,
  ])

  const selectedSession =
    useMemo(
      () => {
        if (
          selectedSessionId ===
          "all"
        ) {
          return null
        }

        return (
          sessions.find(
            (
              item
            ) =>
              item.session.id ===
              selectedSessionId
          ) ?? null
        )
      },
      [
        selectedSessionId,
        sessions,
      ]
    )

  const visibleSessions =
    useMemo(
      () => {
        if (
          selectedSessionId ===
          "all"
        ) {
          return sessions
        }

        return selectedSession
          ? [selectedSession]
          : []
      },
      [
        selectedSession,
        selectedSessionId,
        sessions,
      ]
    )

  const signalTotals =
    useMemo<AggregateSignals>(
      () => {
        const result:
          AggregateSignals = {
          ...EMPTY_SIGNALS,
        }

        visibleSessions.forEach(
          (
            item
          ) => {
            item.snapshots.forEach(
              (
                snapshot
              ) => {
                result.got_it +=
                  snapshot.got_it

                result.slightly_lost +=
                  snapshot.slightly_lost

                result.confused +=
                  snapshot.confused

                result.interesting +=
                  snapshot.interesting
              }
            )
          }
        )

        return result
      },
      [
        visibleSessions,
      ]
    )

  const totals =
    useMemo<AnalyticsTotals>(
      () => {
        let totalParticipants = 0

        let participantSessionCount =
          0

        let activeSessions = 0

        visibleSessions.forEach(
          (
            item
          ) => {
            if (
              item.session.status ===
              "active"
            ) {
              activeSessions +=
                1
            }

            const participants =
              toNumber(
                item.session
                  .participantCount
              )

            if (
              participants >
              0
            ) {
              totalParticipants +=
                participants

              participantSessionCount +=
                1
            }
          }
        )

        const totalSignals =
          getSignalTotal(
            signalTotals
          )

        const averageParticipants =
          participantSessionCount >
          0
            ? Math.round(
                totalParticipants /
                  participantSessionCount
              )
            : 0

        const understandingRate =
          totalSignals >
          0
            ? Math.round(
                (signalTotals.got_it /
                  totalSignals) *
                  100
              )
            : 0

        const confusionRate =
          totalSignals >
          0
            ? Math.round(
                ((signalTotals.slightly_lost +
                  signalTotals.confused) /
                  totalSignals) *
                  100
              )
            : 0

        const interestRate =
          totalSignals >
          0
            ? Math.round(
                (signalTotals.interesting /
                  totalSignals) *
                  100
              )
            : 0

        return {
          totalSessions:
            visibleSessions.length,

          totalSignals,

          averageParticipants,

          understandingRate,

          confusionRate,

          interestRate,

          activeSessions,
        }
      },
      [
        visibleSessions,
        signalTotals,
      ]
    )

  const trendData =
    useMemo(
      () => {
        if (
          selectedSession
        ) {
          return selectedSession.snapshots
        }

        const combined:
          Snapshot[] = []

        visibleSessions.forEach(
          (
            item
          ) => {
            item.snapshots.forEach(
              (
                snapshot
              ) => {
                combined.push(
                  snapshot
                )
              }
            )
          }
        )

        return combined.sort(
          (
            a,
            b
          ) =>
            a.round -
            b.round
        )
      },
      [
        selectedSession,
        visibleSessions,
      ]
    )

  const peakConfusion =
    useMemo(
      () => {
        if (
          trendData.length ===
          0
        ) {
          return null
        }

        return trendData.reduce(
          (
            peak,
            snapshot
          ) => {
            const total =
              getSnapshotSignalTotal(
                snapshot
              )

            const peakTotal =
              getSnapshotSignalTotal(
                peak
              )

            const currentRate =
              total > 0
                ? ((snapshot.confused +
                    snapshot.slightly_lost) /
                    total) *
                  100
                : 0

            const peakRate =
              peakTotal > 0
                ? ((peak.confused +
                    peak.slightly_lost) /
                    peakTotal) *
                  100
                : 0

            return currentRate >
              peakRate
              ? snapshot
              : peak
          }
        )
      },
      [
        trendData,
      ]
    )

  const peakInterest =
    useMemo(
      () => {
        if (
          trendData.length ===
          0
        ) {
          return null
        }

        return trendData.reduce(
          (
            peak,
            snapshot
          ) => {
            const total =
              getSnapshotSignalTotal(
                snapshot
              )

            const peakTotal =
              getSnapshotSignalTotal(
                peak
              )

            const currentRate =
              total > 0
                ? (snapshot.interesting /
                    total) *
                  100
                : 0

            const peakRate =
              peakTotal > 0
                ? (peak.interesting /
                    peakTotal) *
                  100
                : 0

            return currentRate >
              peakRate
              ? snapshot
              : peak
          }
        )
      },
      [
        trendData,
      ]
    )

  const selectedAiSummary =
    selectedSession
      ? toText(
          selectedSession.session
            .aiSummary
        )
      : ""

  const insightTone =
    totals.confusionRate >=
    45
      ? "attention"
      : totals.understandingRate >=
          70
        ? "positive"
        : "balanced"

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <Loading
          size="lg"
          label="Loading classroom analytics..."
        />
      </main>
    )
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
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
            className="group inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Dashboard
          </button>

          <ThemeToggle />
        </header>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.10] p-6 shadow-(--shadow-lg) sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                <Brain className="h-3.5 w-3.5" />
                Teaching intelligence
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Understand your
                <span className="gradient-text">
                  {" "}
                  classroom.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                Turn live student feedback into a clear picture of
                understanding, confusion, engagement, and teaching
                opportunities.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <AnalyticsBadge
                  icon={
                    <Radio className="h-3.5 w-3.5" />
                  }
                  text={`${totals.totalSignals} signals`}
                />

                <AnalyticsBadge
                  icon={
                    <Users className="h-3.5 w-3.5" />
                  }
                  text={`${totals.averageParticipants} avg. students`}
                />

                <AnalyticsBadge
                  icon={
                    <Target className="h-3.5 w-3.5" />
                  }
                  text={`${totals.understandingRate}% understanding`}
                />
              </div>
            </div>

            <div className="hidden lg:flex">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-violet-400/10 bg-violet-500/5">
                <div className="absolute inset-4 rounded-full border border-violet-400/10" />

                <div className="absolute inset-9 rounded-full border border-indigo-400/10" />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  <BarChart3 className="h-9 w-9" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] px-4 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
              <TrendingDown className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-black text-rose-300">
                Analytics unavailable
              </p>

              <p className="mt-1 text-xs leading-5 text-rose-300/80">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            SESSION SCOPE
        ===================================================== */}

        <section className="surface mt-6 rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <Layers3 className="h-4 w-4" />
                </span>

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Analysis scope
                </p>
              </div>

              <h2 className="mt-3 text-xl font-black tracking-tight">
                Choose a classroom
              </h2>

              <p className="mt-1 text-xs leading-5 text-(--foreground-muted)">
                View analytics across every session or focus on one
                classroom.
              </p>
            </div>

            <div className="relative">
              <select
                value={
                  selectedSessionId
                }
                onChange={(
                  event
                ) =>
                  setSelectedSessionId(
                    event.target
                      .value
                  )
                }
                className="h-12 w-full appearance-none rounded-2xl border border-(--border) bg-(--background-soft) px-4 pr-11 text-xs font-bold text-(--foreground-secondary) outline-none transition hover:border-(--border-strong) focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10 sm:min-w-80"
              >
                <option value="all">
                  All classroom sessions
                </option>

                {sessions.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.session.id
                      }
                      value={
                        item.session.id
                      }
                    >
                      {item.session.title}
                    </option>
                  )
                )}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--foreground-subtle)" />
            </div>
          </div>
        </section>

        {/* =====================================================
            KPI STATS
        ===================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsStat
            icon={
              <Layers3 className="h-5 w-5" />
            }
            label="Sessions"
            value={
              totals.totalSessions
            }
            description={
              totals.activeSessions >
              0
                ? `${totals.activeSessions} currently live`
                : "No sessions currently live"
            }
            tone="violet"
          />

          <AnalyticsStat
            icon={
              <Radio className="h-5 w-5" />
            }
            label="Signals"
            value={
              totals.totalSignals
            }
            description="Student responses recorded"
            tone="blue"
          />

          <AnalyticsStat
            icon={
              <Users className="h-5 w-5" />
            }
            label="Avg. participants"
            value={
              totals.averageParticipants
            }
            description="Average students reached"
            tone="emerald"
          />

          <AnalyticsStat
            icon={
              <Target className="h-5 w-5" />
            }
            label="Understanding"
            value={`${totals.understandingRate}%`}
            description={
              totals.totalSignals >
              0
                ? `${totals.confusionRate}% confusion`
                : "Waiting for pulse data"
            }
            tone="amber"
          />
        </section>

        {/* =====================================================
            HEALTH BANNER
        ===================================================== */}

        <section
          className={[
            "mt-6 overflow-hidden rounded-[2rem] border p-5 sm:p-6",
            insightTone ===
              "attention"
              ? "border-rose-400/10 bg-rose-500/[0.055]"
              : insightTone ===
                  "positive"
                ? "border-emerald-400/10 bg-emerald-400/[0.05]"
                : "border-violet-400/10 bg-violet-500/[0.05]",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                insightTone ===
                  "attention"
                  ? "bg-rose-500/10 text-rose-300"
                  : insightTone ===
                      "positive"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-violet-500/10 text-violet-300",
              ].join(" ")}
            >
              {insightTone ===
              "attention" ? (
                <TrendingDown className="h-5 w-5" />
              ) : insightTone ===
                "positive" ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-(--foreground-subtle)">
                Classroom pulse health
              </p>

              <p className="mt-1 text-sm font-black">
                {insightTone ===
                "attention"
                  ? "Your classroom needs closer attention."
                  : insightTone ===
                      "positive"
                    ? "Your classroom is showing strong understanding."
                    : "Your classroom response is mixed."}
              </p>

              <p className="mt-1 text-xs leading-5 text-(--foreground-muted)">
                {buildInterpretation(
                  totals
                )}
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            SIGNAL DISTRIBUTION
        ===================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                  Signal distribution
                </p>

                <h2 className="mt-2 text-xl font-black">
                  What the classroom is saying
                </h2>

                <p className="mt-1 text-sm leading-6 text-(--foreground-muted)">
                  Aggregated across your recorded teaching topics.
                </p>
              </div>

              <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 sm:flex">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <SignalBar
                signal="got_it"
                value={
                  signalTotals.got_it
                }
                total={
                  totals.totalSignals
                }
              />

              <SignalBar
                signal="slightly_lost"
                value={
                  signalTotals.slightly_lost
                }
                total={
                  totals.totalSignals
                }
              />

              <SignalBar
                signal="confused"
                value={
                  signalTotals.confused
                }
                total={
                  totals.totalSignals
                }
              />

              <SignalBar
                signal="interesting"
                value={
                  signalTotals.interesting
                }
                total={
                  totals.totalSignals
                }
              />
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-(--border) pt-5 text-[10px]">
              <Legend
                label="Got it"
                className="bg-emerald-400"
              />

              <Legend
                label="Slightly lost"
                className="bg-amber-400"
              />

              <Legend
                label="Confused"
                className="bg-rose-400"
              />

              <Legend
                label="Interesting"
                className="bg-violet-400"
              />
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
              Quick read
            </p>

            <h2 className="mt-2 text-xl font-black">
              Teaching signals
            </h2>

            <div className="mt-6 space-y-3">
              <InsightRow
                icon={
                  <Target className="h-4 w-4" />
                }
                title="Understanding"
                value={`${totals.understandingRate}%`}
                description="students signaled they understood"
                tone="emerald"
              />

              <InsightRow
                icon={
                  <TrendingDown className="h-4 w-4" />
                }
                title="Confusion"
                value={`${totals.confusionRate}%`}
                description="lost + confused responses"
                tone="rose"
              />

              <InsightRow
                icon={
                  <Flame className="h-4 w-4" />
                }
                title="Interest"
                value={`${totals.interestRate}%`}
                description="students marked a topic interesting"
                tone="violet"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-(--border) bg-(--background-soft) p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-(--foreground-subtle)">
                Interpretation
              </p>

              <p className="mt-2 text-sm leading-6 text-(--foreground-muted)">
                {buildInterpretation(
                  totals
                )}
              </p>
            </div>
          </Card>
        </section>

        {/* =====================================================
            TOPIC TREND
        ===================================================== */}

        <section className="mt-6">
          <Card>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                    Topic-by-topic trend
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    How students responded to each topic
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-(--foreground-muted)">
                    Every bar represents one faculty-controlled teaching
                    pulse.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-(--border) bg-(--background-soft) px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-(--foreground-subtle)">
                  <Radio className="h-3.5 w-3.5 text-violet-300" />
                  {trendData.length} pulses
                </span>
              </div>

              {trendData.length ===
              0 ? (
                <EmptyAnalytics />
              ) : (
                <div className="space-y-4">
                  {trendData.map(
                    (
                      snapshot
                    ) => (
                      <TopicRow
                        key={
                          snapshot.id
                        }
                        snapshot={
                          snapshot
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* =====================================================
            PEAK TOPICS
        ===================================================== */}

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <PeakCard
            title="Peak confusion topic"
            icon={
              <TrendingDown className="h-5 w-5" />
            }
            snapshot={
              peakConfusion
            }
            kind="confusion"
          />

          <PeakCard
            title="Peak interest topic"
            icon={
              <TrendingUp className="h-5 w-5" />
            }
            snapshot={
              peakInterest
            }
            kind="interest"
          />
        </section>

        {/* =====================================================
            AI REPORT
        ===================================================== */}

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 via-(--surface) to-indigo-500/5 p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl"
          />

          <div className="relative z-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                    AI teaching report
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {selectedSession
                      ? selectedSession.session.title
                      : "Select a session"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-(--foreground-muted)">
                    Turn recorded teaching pulses into practical
                    classroom insights and next-step ideas.
                  </p>
                </div>
              </div>

              {selectedSession && (
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-violet-300">
                  <Brain className="h-3.5 w-3.5" />
                  Session selected
                </span>
              )}
            </div>

            <div className="mt-7">
              {!selectedSession ? (
                <div className="rounded-[2rem] border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <Brain className="h-6 w-6" />
                  </div>

                  <p className="mt-5 text-sm font-black">
                    Select one session to read its report.
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-(--foreground-muted)">
                    Choose a classroom above to view its saved AI teaching
                    analysis.
                  </p>
                </div>
              ) : selectedAiSummary ? (
                <div className="max-h-[520px] overflow-auto rounded-[2rem] border border-(--border) bg-(--background-soft) p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-2 border-b border-(--border) pb-4">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                      Report available
                    </p>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-7 text-(--foreground-secondary)">
                    {
                      selectedAiSummary
                    }
                  </p>
                </div>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <p className="mt-5 text-sm font-black">
                    AI report not available yet
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-(--foreground-muted)">
                    Finish a session after recording at least one teaching
                    pulse. PulseBoard will generate the teaching report
                    afterwards.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
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

  if (
    typeof value === "string"
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
    value === null ||
    value === undefined
  ) {
    return ""
  }

  if (
    typeof value === "string"
  ) {
    return value.trim()
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value)
  }

  if (
    typeof value === "object"
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

function getSignalTotal(
  signals: AggregateSignals
): number {
  return (
    signals.got_it +
    signals.slightly_lost +
    signals.confused +
    signals.interesting
  )
}

function getSnapshotSignalTotal(
  snapshot: Snapshot
): number {
  return (
    snapshot.got_it +
    snapshot.slightly_lost +
    snapshot.confused +
    snapshot.interesting
  )
}

function getSignalMeta(
  signal: SignalType
) {
  const map: Record<
    SignalType,
    {
      label: string
      description: string
      icon: ReactNode
      tone: string
      bar: string
    }
  > = {
    got_it: {
      label: "Got it",
      description:
        "Students understood",
      icon: (
        <Check className="h-5 w-5" />
      ),
      tone:
        "bg-emerald-500/10 text-emerald-300",
      bar:
        "from-emerald-500 to-teal-400",
    },

    slightly_lost: {
      label: "Slightly lost",
      description:
        "Students needed clarity",
      icon: (
        <Lightbulb className="h-5 w-5" />
      ),
      tone:
        "bg-amber-500/10 text-amber-300",
      bar:
        "from-amber-500 to-orange-400",
    },

    confused: {
      label: "Confused",
      description:
        "Students needed explanation",
      icon: (
        <Radio className="h-5 w-5" />
      ),
      tone:
        "bg-rose-500/10 text-rose-300",
      bar:
        "from-rose-500 to-pink-400",
    },

    interesting: {
      label: "Interesting",
      description:
        "Students found it engaging",
      icon: (
        <Sparkles className="h-5 w-5" />
      ),
      tone:
        "bg-violet-500/10 text-violet-300",
      bar:
        "from-violet-500 to-indigo-400",
    },
  }

  return map[signal]
}

function AnalyticsBadge({
  icon,
  text,
}: {
  icon: ReactNode
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--background-soft)/70 px-3 py-1.5 text-[10px] font-bold text-(--foreground-secondary)">
      <span className="text-violet-300">
        {icon}
      </span>

      {text}
    </span>
  )
}

function AnalyticsStat({
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
    | "violet"
    | "blue"
    | "emerald"
    | "amber"
}) {
  const toneClasses = {
    violet:
      "bg-violet-500/10 text-violet-300",

    blue:
      "bg-blue-500/10 text-blue-300",

    emerald:
      "bg-emerald-500/10 text-emerald-300",

    amber:
      "bg-amber-500/10 text-amber-300",
  }

  return (
    <div className="group surface relative overflow-hidden rounded-[2rem] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-(--border-strong) hover:shadow-(--shadow-md)">
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          toneClasses[tone]
            .replace(
              "text-",
              "bg-"
            )
            .split(" ")
            .find(
              (
                item
              ) =>
                item.startsWith(
                  "bg-"
                )
            ) ??
            "bg-violet-500/10",
        ].join(" ")}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-muted)">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight">
            {value}
          </p>

          <p className="mt-1 text-[10px] leading-5 text-(--foreground-subtle)">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            toneClasses[tone],
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function SignalBar({
  signal,
  value,
  total,
}: {
  signal: SignalType
  value: number
  total: number
}) {
  const meta =
    getSignalMeta(signal)

  const percentage =
    total > 0
      ? Math.round(
          (value / total) *
            100
        )
      : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              meta.tone,
            ].join(" ")}
          >
            {meta.icon}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black">
              {meta.label}
            </p>

            <p className="truncate text-xs text-(--foreground-muted)">
              {meta.description}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-black">
            {percentage}%
          </p>

          <p className="text-[10px] text-(--foreground-subtle)">
            {value} signals
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-(--surface-hover)">
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
  )
}

function InsightRow({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: ReactNode
  title: string
  value: string
  description: string
  tone:
    | "emerald"
    | "rose"
    | "violet"
}) {
  const toneClasses = {
    emerald:
      "bg-emerald-500/10 text-emerald-300",

    rose:
      "bg-rose-500/10 text-rose-300",

    violet:
      "bg-violet-500/10 text-violet-300",
  }

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-(--border) bg-(--background-soft) p-4 transition-all hover:border-(--border-strong) hover:bg-(--surface-hover)">
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          toneClasses[tone],
          "transition-transform duration-200 group-hover:scale-105",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold">
            {title}
          </p>

          <p className="text-sm font-black">
            {value}
          </p>
        </div>

        <p className="mt-1 text-[10px] leading-4 text-(--foreground-muted)">
          {description}
        </p>
      </div>
    </div>
  )
}

function TopicRow({
  snapshot,
}: {
  snapshot: Snapshot
}) {
  const total =
    getSnapshotSignalTotal(
      snapshot
    )

  const got =
    total > 0
      ? Math.round(
          (snapshot.got_it /
            total) *
            100
        )
      : 0

  const lost =
    total > 0
      ? Math.round(
          (snapshot.slightly_lost /
            total) *
            100
        )
      : 0

  const confused =
    total > 0
      ? Math.round(
          (snapshot.confused /
            total) *
            100
        )
      : 0

  const interesting =
    total > 0
      ? Math.round(
          (snapshot.interesting /
            total) *
            100
        )
      : 0

  return (
    <div className="group rounded-[2rem] border border-(--border) bg-(--background-soft) p-5 transition-all hover:border-(--border-strong) hover:bg-(--surface-hover)">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-400/10 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-violet-300">
              Pulse {snapshot.round}
            </span>

            <span className="rounded-full bg-(--surface) px-2.5 py-1 text-[9px] font-bold text-(--foreground-subtle)">
              {total} responses
            </span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-base font-black leading-6 sm:text-lg">
            {snapshot.topic ||
              "Untitled topic"}
          </h3>
        </div>

        <div className="w-full max-w-xl">
          <div className="flex h-3 overflow-hidden rounded-full bg-(--surface-hover)">
            {got > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{
                  width:
                    `${got}%`,
                }}
                title={`Got it ${got}%`}
              />
            )}

            {lost > 0 && (
              <div
                className="bg-amber-500 transition-all duration-500"
                style={{
                  width:
                    `${lost}%`,
                }}
                title={`Slightly lost ${lost}%`}
              />
            )}

            {confused > 0 && (
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{
                  width:
                    `${confused}%`,
                }}
                title={`Confused ${confused}%`}
              />
            )}

            {interesting > 0 && (
              <div
                className="bg-violet-500 transition-all duration-500"
                style={{
                  width:
                    `${interesting}%`,
                }}
                title={`Interesting ${interesting}%`}
              />
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] sm:grid-cols-4">
            <span className="text-(--foreground-muted)">
              Got it{" "}
              <strong className="text-emerald-300">
                {got}%
              </strong>
            </span>

            <span className="text-(--foreground-muted)">
              Lost{" "}
              <strong className="text-amber-300">
                {lost}%
              </strong>
            </span>

            <span className="text-(--foreground-muted)">
              Confused{" "}
              <strong className="text-rose-300">
                {confused}%
              </strong>
            </span>

            <span className="text-(--foreground-muted)">
              Interesting{" "}
              <strong className="text-violet-300">
                {interesting}%
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PeakCard({
  title,
  icon,
  snapshot,
  kind,
}: {
  title: string
  icon: ReactNode
  snapshot: Snapshot | null
  kind:
    | "confusion"
    | "interest"
}) {
  if (!snapshot) {
    return (
      <div className="surface relative overflow-hidden rounded-[2rem] p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-(--background-soft) text-(--foreground-subtle)">
          {icon}
        </div>

        <h2 className="mt-5 text-lg font-black">
          {title}
        </h2>

        <p className="mt-2 max-w-sm text-sm leading-6 text-(--foreground-muted)">
          No teaching pulse data has been recorded yet.
        </p>
      </div>
    )
  }

  const total =
    getSnapshotSignalTotal(
      snapshot
    )

  const percentage =
    total > 0
      ? Math.round(
          ((kind === "confusion"
            ? snapshot.confused +
              snapshot.slightly_lost
            : snapshot.interesting) /
            total) *
            100
        )
      : 0

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[2rem] border p-6",
        kind === "confusion"
          ? "border-rose-400/10 bg-rose-500/[0.045]"
          : "border-violet-400/10 bg-violet-500/[0.045]",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl",
          kind === "confusion"
            ? "bg-rose-500/10"
            : "bg-violet-500/10",
        ].join(" ")}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className={[
                "text-[9px] font-black uppercase tracking-[0.18em]",
                kind === "confusion"
                  ? "text-rose-300"
                  : "text-violet-300",
              ].join(" ")}
            >
              {title}
            </p>

            <h2 className="mt-2 line-clamp-2 text-xl font-black">
              {snapshot.topic ||
                "Untitled topic"}
            </h2>

            <p className="mt-2 text-xs text-(--foreground-muted)">
              Pulse {snapshot.round}
            </p>
          </div>

          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              kind === "confusion"
                ? "bg-rose-500/10 text-rose-300"
                : "bg-violet-500/10 text-violet-300",
            ].join(" ")}
          >
            {icon}
          </div>
        </div>

        <div className="mt-7">
          <p
            className={[
              "text-4xl font-black tracking-tight",
              kind === "confusion"
                ? "text-rose-200"
                : "text-violet-200",
            ].join(" ")}
          >
            {percentage}%
          </p>

          <p className="mt-1 text-xs text-(--foreground-subtle)">
            of responses in this topic
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-(--surface-hover)">
            <div
              className={[
                "h-full rounded-full",
                kind === "confusion"
                  ? "bg-linear-to-r from-rose-500 to-orange-400"
                  : "bg-linear-to-r from-violet-500 to-indigo-400",
              ].join(" ")}
              style={{
                width:
                  `${percentage}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Legend({
  label,
  className,
}: {
  label: string
  className: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={[
          "h-2 w-2 rounded-full",
          className,
        ].join(" ")}
      />

      <span className="text-(--foreground-muted)">
        {label}
      </span>
    </span>
  )
}

function EmptyAnalytics() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="relative z-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <BarChart3 className="h-6 w-6" />
        </div>

        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
          No data yet
        </p>

        <h3 className="mt-2 text-base font-black">
          No teaching pulses yet
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--foreground-muted)">
          Start a classroom pulse with a teaching topic and complete it
          to see topic-level analytics here.
        </p>
      </div>
    </div>
  )
}

function buildInterpretation(
  totals: AnalyticsTotals
): string {
  if (
    totals.totalSignals ===
    0
  ) {
    return "There is not enough classroom feedback yet to generate an interpretation. Start a teaching pulse and collect some student responses."
  }

  if (
    totals.confusionRate >=
    45
  ) {
    return "A large portion of classroom responses indicate confusion or uncertainty. Identify the topic with the highest confusion and revisit it using a concrete example."
  }

  if (
    totals.understandingRate >=
      70 &&
    totals.interestRate >=
      15
  ) {
    return "The classroom is showing a healthy combination of understanding and curiosity. Build on the topics that generated interest while preserving the teaching patterns that produced strong understanding."
  }

  if (
    totals.understandingRate >=
    70
  ) {
    return "Most students are signaling clear understanding. Keep the overall approach while using topic-level confusion data to decide where short clarification checks are needed."
  }

  if (
    totals.interestRate >=
    20
  ) {
    return "Student curiosity is relatively strong. Use the topics generating the most interest as bridges into difficult material and examples."
  }

  return "The classroom response is mixed. Compare topic-level results to identify exactly where understanding dropped and revisit those concepts before moving forward."
}