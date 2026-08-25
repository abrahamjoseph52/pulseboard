"use client"

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Filter,
  GraduationCap,
  Plus,
  Radio,
  Search,
  Sparkles,
  Users,
  XCircle,
  Zap,
} from "lucide-react"

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  useRouter,
} from "next/navigation"

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

import type {
  Session,
} from "@/lib/types"

import Button from "@/app/components/ui/Button"
import Loading from "@/app/components/ui/Loading"
import ThemeToggle from "@/app/components/ThemeToggle"

type SessionsState = {
  sessions: Session[]
  loading: boolean
  error: string | null
}

type SessionFilter =
  | "all"
  | "active"
  | "ended"

type TimestampLike = {
  toDate?: () => Date
  toMillis?: () => number
}

function getInitialState(): SessionsState {
  if (!auth.currentUser) {
    return {
      sessions: [],
      loading: false,
      error:
        "You must be signed in to view sessions.",
    }
  }

  return {
    sessions: [],
    loading: true,
    error: null,
  }
}

function getTimestampDate(
  value: unknown
): Date | null {
  if (!value) {
    return null
  }

  if (
    value instanceof Date
  ) {
    return value
  }

  if (
    typeof value === "object"
  ) {
    const timestamp =
      value as TimestampLike

    if (
      typeof timestamp.toDate ===
      "function"
    ) {
      return timestamp.toDate()
    }

    if (
      typeof timestamp.toMillis ===
      "function"
    ) {
      return new Date(
        timestamp.toMillis()
      )
    }
  }

  if (
    typeof value === "number"
  ) {
    const date =
      new Date(value)

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date
  }

  if (
    typeof value === "string"
  ) {
    const date =
      new Date(value)

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date
  }

  return null
}

function formatSessionDate(
  value: unknown
): string {
  const date =
    getTimestampDate(
      value
    )

  if (!date) {
    return "Date unavailable"
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  )
}

function formatSessionTime(
  value: unknown
): string {
  const date =
    getTimestampDate(
      value
    )

  if (!date) {
    return ""
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  )
}

function getSessionCreatedAt(
  session: Session
): unknown {
  const record =
    session as unknown as Record<
      string,
      unknown
    >

  return record.createdAt
}

function getSessionSignals(
  session: Session
): number {
  const record =
    session as unknown as Record<
      string,
      unknown
    >

  const value =
    record.totalSignals

  return typeof value ===
    "number"
    ? value
    : 0
}

function getParticipantCount(
  session: Session
): number {
  return typeof session.participantCount ===
    "number"
    ? session.participantCount
    : 0
}

export default function SessionsPage() {
  const router =
    useRouter()

  const [
    state,
    setState,
  ] = useState<SessionsState>(
    getInitialState
  )

  const {
    sessions,
    loading,
    error,
  } = state

  const [
    search,
    setSearch,
  ] = useState("")

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<SessionFilter>(
      "all"
    )

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
          const updatedSessions: Session[] =
            snapshot.docs.map(
              (
                sessionDoc
              ) => ({
                id:
                  sessionDoc.id,

                ...(
                  sessionDoc.data() as Omit<
                    Session,
                    "id"
                  >
                ),
              })
            )

          setState({
            sessions:
              updatedSessions,
            loading:
              false,
            error:
              null,
          })
        },
        (
          snapshotError
        ) => {
          console.error(
            "Failed to load sessions:",
            snapshotError
          )

          setState({
            sessions: [],
            loading: false,
            error:
              "Unable to load your sessions.",
          })
        }
      )

    return unsubscribe
  }, [])

  const stats =
    useMemo(() => {
      const active =
        sessions.filter(
          (
            session
          ) =>
            session.status ===
            "active"
        )

      const ended =
        sessions.filter(
          (
            session
          ) =>
            session.status !==
            "active"
        )

      const participants =
        sessions.reduce(
          (
            total,
            session
          ) =>
            total +
            getParticipantCount(
              session
            ),
          0
        )

      const signals =
        sessions.reduce(
          (
            total,
            session
          ) =>
            total +
            getSessionSignals(
              session
            ),
          0
        )

      return {
        active:
          active.length,
        ended:
          ended.length,
        total:
          sessions.length,
        participants,
        signals,
      }
    }, [
      sessions,
    ])

  const filteredSessions =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase()

      return sessions.filter(
        (
          session
        ) => {
          if (
            activeFilter ===
              "active" &&
            session.status !==
              "active"
          ) {
            return false
          }

          if (
            activeFilter ===
              "ended" &&
            session.status ===
              "active"
          ) {
            return false
          }

          if (
            !normalizedSearch
          ) {
            return true
          }

          const haystack =
            [
              session.title,
              session.courseCode,
              session.joinCode,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLowerCase()

          return haystack.includes(
            normalizedSearch
          )
        }
      )
    }, [
      sessions,
      search,
      activeFilter,
    ])

  const hasFilters =
    search.trim() !== "" ||
    activeFilter !==
      "all"

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <Loading
          size="lg"
          label="Loading your sessions..."
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

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                <Activity className="h-3.5 w-3.5" />
                Classroom history
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Your sessions.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                Review every PulseBoard classroom you created,
                return to live sessions, and explore completed
                teaching activity from one place.
              </p>
            </div>

            <Button
              onClick={() =>
                router.push(
                  "/admin/dashboard"
                )
              }
              className="group h-12 shrink-0 rounded-2xl px-5 shadow-xl shadow-violet-500/20"
            >
              <Plus className="h-4 w-4" />
              Create Session
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </section>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-rose-500/15 bg-rose-500/[0.06]">
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                <XCircle className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-black text-rose-300">
                  Something went wrong
                </p>

                <p className="mt-1 text-xs leading-5 text-rose-300/80">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            STATS
        ===================================================== */}

        {!error && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SessionStat
              icon={
                <Radio className="h-5 w-5" />
              }
              label="Total sessions"
              value={
                stats.total
              }
              description="Classrooms created"
              tone="violet"
            />

            <SessionStat
              icon={
                <Activity className="h-5 w-5" />
              }
              label="Live now"
              value={
                stats.active
              }
              description="Currently active"
              tone="emerald"
            />

            <SessionStat
              icon={
                <Users className="h-5 w-5" />
              }
              label="Participants"
              value={
                stats.participants
              }
              description="Students reached"
              tone="blue"
            />

            <SessionStat
              icon={
                <Sparkles className="h-5 w-5" />
              }
              label="Signals"
              value={
                stats.signals
              }
              description="Feedback responses"
              tone="amber"
            />
          </section>
        )}

        {/* =====================================================
            FILTERS
        ===================================================== */}

        {!error &&
          sessions.length >
            0 && (
            <section className="surface mt-6 rounded-[2rem] p-5 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                      <Filter className="h-4 w-4" />
                    </span>

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                      Session library
                    </p>
                  </div>

                  <h2 className="mt-3 text-xl font-black tracking-tight">
                    Find a classroom
                  </h2>

                  <p className="mt-1 text-xs text-(--foreground-muted)">
                    Search by title, course, or join code.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 sm:w-80">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--foreground-subtle)" />

                    <input
                      type="search"
                      value={
                        search
                      }
                      onChange={(
                        event
                      ) =>
                        setSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search sessions..."
                      className="h-11 w-full rounded-2xl border border-(--border) bg-(--background-soft) pl-10 pr-4 text-xs font-semibold text-(--foreground) outline-none transition placeholder:text-(--foreground-subtle) hover:border-(--border-strong) focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10"
                    />
                  </div>

                  <div className="flex rounded-2xl border border-(--border) bg-(--background-soft) p-1">
                    <FilterButton
                      active={
                        activeFilter ===
                        "all"
                      }
                      onClick={() =>
                        setActiveFilter(
                          "all"
                        )
                      }
                    >
                      All
                    </FilterButton>

                    <FilterButton
                      active={
                        activeFilter ===
                        "active"
                      }
                      onClick={() =>
                        setActiveFilter(
                          "active"
                        )
                      }
                    >
                      Live
                    </FilterButton>

                    <FilterButton
                      active={
                        activeFilter ===
                        "ended"
                      }
                      onClick={() =>
                        setActiveFilter(
                          "ended"
                        )
                      }
                    >
                      Ended
                    </FilterButton>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-(--border) pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-(--foreground-subtle)">
                    Showing
                  </span>

                  <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[9px] font-black text-violet-300">
                    {
                      filteredSessions.length
                    }{" "}
                    results
                  </span>
                </div>

                {hasFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("")
                      setActiveFilter(
                        "all"
                      )
                    }}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-(--foreground-muted) transition hover:text-(--foreground)"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Clear filters
                  </button>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-(--foreground-subtle)">
                    Newest first
                  </span>
                )}
              </div>
            </section>
          )}

        {/* =====================================================
            EMPTY
        ===================================================== */}

        {!error &&
          sessions.length ===
            0 && (
            <section className="mt-6">
              <EmptySessions
                onCreate={() =>
                  router.push(
                    "/admin/dashboard"
                  )
                }
              />
            </section>
          )}

        {/* =====================================================
            NO SEARCH RESULTS
        ===================================================== */}

        {!error &&
          sessions.length >
            0 &&
          filteredSessions.length ===
            0 && (
            <section className="mt-6">
              <NoSearchResults
                onClear={() => {
                  setSearch("")
                  setActiveFilter(
                    "all"
                  )
                }}
              />
            </section>
          )}

        {/* =====================================================
            GRID
        ===================================================== */}

        {!error &&
          filteredSessions.length >
            0 && (
            <section className="mt-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                    {activeFilter ===
                    "active"
                      ? "Live classrooms"
                      : activeFilter ===
                          "ended"
                        ? "Completed classrooms"
                        : "All classrooms"}
                  </p>

                  <p className="mt-1 text-sm text-(--foreground-muted)">
                    {
                      filteredSessions.length
                    }{" "}
                    {filteredSessions.length ===
                    1
                      ? "session"
                      : "sessions"}{" "}
                    shown
                  </p>
                </div>

                <span className="hidden items-center gap-2 rounded-full border border-(--border) bg-(--surface) px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-(--foreground-subtle) sm:inline-flex">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Newest first
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSessions.map(
                  (
                    session,
                    index
                  ) => (
                    <PremiumSessionCard
                      key={
                        session.id
                      }
                      session={
                        session
                      }
                      index={
                        index
                      }
                      onClick={() =>
                        router.push(
                          `/admin/session/${session.id}`
                        )
                      }
                    />
                  )
                )}
              </div>
            </section>
          )}
      </div>
    </main>
  )
}

function SessionStat({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  description: string
  tone:
    | "violet"
    | "emerald"
    | "blue"
    | "amber"
}) {
  const tones = {
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

    blue: {
      icon:
        "bg-blue-500/10 text-blue-300",
      glow:
        "bg-blue-500/10",
    },

    amber: {
      icon:
        "bg-amber-500/10 text-amber-300",
      glow:
        "bg-amber-500/10",
    },
  }

  const current =
    tones[tone]

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

          <p className="mt-1 text-[10px] leading-5 text-(--foreground-subtle)">
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

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-[10px] font-black transition-all duration-200",
        active
          ? "bg-violet-500/15 text-violet-300 shadow-sm ring-1 ring-violet-400/10"
          : "text-(--foreground-muted) hover:bg-(--surface-hover) hover:text-(--foreground-secondary)",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function PremiumSessionCard({
  session,
  index,
  onClick,
}: {
  session: Session
  index: number
  onClick: () => void
}) {
  const isActive =
    session.status ===
    "active"

  const participantCount =
    getParticipantCount(
      session
    )

  const totalSignals =
    getSessionSignals(
      session
    )

  const createdAt =
    getSessionCreatedAt(
      session
    )

  const date =
    formatSessionDate(
      createdAt
    )

  const time =
    formatSessionTime(
      createdAt
    )

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-[2rem] border border-(--border) bg-(--surface) p-5 text-left shadow-(--shadow-sm)",
        "transition-all duration-200",
        "hover:-translate-y-1 hover:border-(--border-strong) hover:bg-(--surface-hover) hover:shadow-(--shadow-md)",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-(--background)",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          isActive
            ? "bg-emerald-400/10"
            : "bg-violet-500/10",
        ].join(" ")}
      />

      <span
        aria-hidden="true"
        className={[
          "absolute bottom-0 left-0 top-0 w-0.5",
          isActive
            ? "bg-linear-to-b from-emerald-400 to-teal-400"
            : "bg-linear-to-b from-violet-500 to-indigo-400",
        ].join(" ")}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              isActive
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-violet-500/10 text-violet-300",
            ].join(" ")}
          >
            {isActive ? (
              <div className="relative">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/15" />

                <Radio className="relative h-5 w-5" />
              </div>
            ) : (
              <GraduationCap className="h-5 w-5" />
            )}
          </div>

          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider",
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
              ? "Live"
              : "Ended"}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
            {String(
              index + 1
            ).padStart(
              2,
              "0"
            )}
          </span>

          <span className="h-1 w-1 rounded-full bg-(--foreground-subtle)" />

          <span className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
            {session.courseCode ||
              "Classroom"}
          </span>
        </div>

        <h2 className="mt-2 line-clamp-2 text-lg font-black leading-6">
          {session.title}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-(--background-soft) px-2.5 py-1.5 text-[9px] font-bold text-(--foreground-muted)">
            <CalendarDays className="h-3 w-3" />
            {date}
          </span>

          {time && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-(--background-soft) px-2.5 py-1.5 text-[9px] font-bold text-(--foreground-muted)">
              <Clock3 className="h-3 w-3" />
              {time}
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <CardMetric
            icon={
              <Users className="h-3.5 w-3.5" />
            }
            value={
              participantCount
            }
            label="Students"
          />

          <CardMetric
            icon={
              <Radio className="h-3.5 w-3.5" />
            }
            value={
              totalSignals
            }
            label="Signals"
          />

          <CardMetric
            icon={
              <Zap className="h-3.5 w-3.5" />
            }
            value={
              session.joinCode ||
              "—"
            }
            label="Code"
            monospace
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-(--border) pt-4">
          <span className="text-[9px] font-black uppercase tracking-wider text-(--foreground-subtle)">
            Open classroom
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-black text-violet-300 transition-colors group-hover:text-violet-200">
            Open
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  )
}

function CardMetric({
  icon,
  value,
  label,
  monospace = false,
}: {
  icon: ReactNode
  value: string | number
  label: string
  monospace?: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl border border-(--border) bg-(--background-soft) px-2.5 py-2.5">
      <div className="flex items-center gap-1.5 text-(--foreground-subtle)">
        {icon}

        <span className="truncate text-[8px] font-black uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p
        className={[
          "mt-1 truncate text-xs font-black text-(--foreground-secondary)",
          monospace
            ? "font-mono tracking-wider"
            : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  )
}

function EmptySessions({
  onCreate,
}: {
  onCreate: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="relative z-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10">
          <Radio className="h-7 w-7" />
        </div>

        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
          Ready when you are
        </p>

        <h2 className="mt-2 text-xl font-black">
          No sessions yet.
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--foreground-muted)">
          Create your first PulseBoard classroom and start
          collecting real-time student feedback.
        </p>

        <button
          type="button"
          onClick={onCreate}
          className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25"
        >
          <Plus className="h-4 w-4" />
          Create your first session
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  )
}

function NoSearchResults({
  onClear,
}: {
  onClear: () => void
}) {
  return (
    <div className="surface relative overflow-hidden rounded-[2rem] px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/8 blur-3xl"
      />

      <div className="relative z-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <Search className="h-6 w-6" />
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
          No matches
        </p>

        <h2 className="mt-2 text-xl font-black">
          No sessions match your search.
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--foreground-muted)">
          Try another session title, course code, or join code,
          or clear your current filters.
        </p>

        <button
          type="button"
          onClick={onClear}
          className="group mt-6 inline-flex items-center gap-2 rounded-xl border border-(--border) bg-(--background-soft) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
        >
          <XCircle className="h-4 w-4" />
          Clear filters
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}