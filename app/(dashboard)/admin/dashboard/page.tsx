"use client"

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  GraduationCap,
  Plus,
  Radio,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"

import {
  useEffect,
  useState,
} from "react"

import {
  useRouter,
} from "next/navigation"

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore"

import {
  auth,
  db,
} from "@/lib/firebase"

import type {
  Session,
} from "@/lib/types"

import CreateSessionModal, {
  type CreateSessionData,
} from "@/app/components/admin/CreateSessionModal"

import ThemeToggle from "@/app/components/ThemeToggle"

type FacultyProfile = {
  name: string
  photoURL: string
  department: string
  institution: string
  designation: string
}

type DashboardStats = {
  activeSessions: number
  totalSessions: number
  totalParticipants: number
}

type LiveDateTime = {
  time: string
  date: string
}

function getLiveDateTime(): LiveDateTime {
  const now = new Date()

  return {
    time: now.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }
    ),

    date: now.toLocaleDateString(
      "en-IN",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ),
  }
}

export default function AdminDashboardPage() {
  const router =
    useRouter()

  const [
    profile,
    setProfile,
  ] = useState<FacultyProfile>({
    name: "Faculty",
    photoURL: "",
    department: "",
    institution: "",
    designation: "",
  })

  const [
    sessions,
    setSessions,
  ] = useState<Session[]>([])

  const [
    loadingSessions,
    setLoadingSessions,
  ] = useState(() =>
    Boolean(
      auth.currentUser
    )
  )

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false)

  const [
    dateTime,
    setDateTime,
  ] = useState<LiveDateTime>(
    getLiveDateTime
  )

  /*
   * Live date + time
   */
  useEffect(() => {
    const updateDateTime =
      () => {
        setDateTime(
          getLiveDateTime()
        )
      }

    updateDateTime()

    const interval =
      window.setInterval(
        updateDateTime,
        1000
      )

    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [])

  /*
   * Faculty profile + sessions
   */
  useEffect(() => {
    const currentUser =
      auth.currentUser

    if (!currentUser) {
      return
    }

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      )

    const userUnsubscribe =
      onSnapshot(
        userRef,
        (snapshot) => {
          if (
            !snapshot.exists()
          ) {
            return
          }

          const data =
            snapshot.data()

          setProfile({
            name:
              data.name ||
              currentUser.displayName ||
              "Faculty",

            photoURL:
              data.photoURL ||
              currentUser.photoURL ||
              "",

            department:
              data.department ||
              "",

            institution:
              data.institution ||
              "",

            designation:
              data.designation ||
              "Faculty",
          })
        },
        (error) => {
          console.error(
            "Failed to load faculty profile:",
            error
          )
        }
      )

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

    const sessionsUnsubscribe =
      onSnapshot(
        sessionsQuery,
        (snapshot) => {
          const nextSessions:
            Session[] =
            snapshot.docs.map(
              (
                sessionDocument
              ) => ({
                id:
                  sessionDocument.id,

                ...(
                  sessionDocument.data() as Omit<
                    Session,
                    "id"
                  >
                ),
              })
            )

          setSessions(
            nextSessions
          )

          setLoadingSessions(
            false
          )
        },
        (error) => {
          console.error(
            "Failed to load faculty sessions:",
            error
          )

          setLoadingSessions(
            false
          )
        }
      )

    return () => {
      userUnsubscribe()
      sessionsUnsubscribe()
    }
  }, [])

  const stats:
    DashboardStats = {
    activeSessions:
      sessions.filter(
        (
          session
        ) =>
          session.status ===
          "active"
      ).length,

    totalSessions:
      sessions.length,

    totalParticipants:
      sessions.reduce(
        (
          total,
          session
        ) =>
          total +
          (
            session.participantCount ||
            0
          ),
        0
      ),
  }

  const recentSessions =
    sessions.slice(
      0,
      4
    )

  const handleCreateSession =
    async (
      data: CreateSessionData
    ) => {
      const currentUser =
        auth.currentUser

      if (!currentUser) {
        throw new Error(
          "You must be signed in to create a session."
        )
      }

      const sessionDocument =
        await addDoc(
          collection(
            db,
            "sessions"
          ),
          {
            adminId:
              currentUser.uid,

            title:
              data.title,

            courseCode:
              data.courseCode,

            joinCode:
              data.joinCode,

            status:
              "active",

            createdAt:
              serverTimestamp(),

            endedAt:
              null,

            aiSummary:
              null,

            participantCount:
              0,

            totalSignals:
              0,

            roundStatus:
              "waiting",

            currentRound:
              0,

            roundDurationSeconds:
              120,

            roundTopic:
              "",

            roundStartedAt:
              null,

            roundEndedAt:
              null,
          }
        )

      setCreateModalOpen(
        false
      )

      router.push(
        `/admin/session/${sessionDocument.id}`
      )
    }

  const firstName =
    profile.name
      .trim()
      .split(/\s+/)[0] ||
    "Professor"

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto max-w-375 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
              <Zap className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight">
                PulseBoard
              </p>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-(--foreground-muted)">
                Faculty workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {/* =================================================
                DATE + TIME
            ================================================= */}

            <div className="hidden items-center gap-3 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2.5 shadow-(--shadow-xs) sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Clock3 className="h-4 w-4" />
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold text-(--foreground-muted)">
                  {dateTime.date}
                </p>

                <p className="mt-0.5 font-mono text-xs font-black text-(--foreground)">
                  {dateTime.time}
                </p>
              </div>
            </div>

            <ThemeToggle />

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profile/setup?role=faculty"
                )
              }
              className="hidden items-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-xs font-bold text-(--foreground-secondary) transition hover:border-(--border-strong) hover:text-(--foreground) sm:inline-flex"
            >
              <Settings className="h-4 w-4" />
              Profile
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/analytics"
                )
              }
              aria-label="Analytics"
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--foreground-muted) transition hover:border-(--border-strong) hover:text-(--foreground) sm:flex"
            >
              <BarChart3 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profile/setup?role=faculty"
                )
              }
              aria-label="Open profile"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-(--border) bg-(--surface)"
            >
              {profile.photoURL ? (
                <img
                  src={
                    profile.photoURL
                  }
                  alt={
                    profile.name
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-black text-violet-300">
                  {profile.name
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* =====================================================
            MOBILE DATE + TIME
        ===================================================== */}

        <div className="mt-3 flex sm:hidden">
          <div className="flex w-full items-center justify-between rounded-2xl border border-(--border) bg-(--surface) px-4 py-3 shadow-(--shadow-xs)">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Clock3 className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
                  Local date
                </p>

                <p className="mt-0.5 text-xs font-bold text-(--foreground-secondary)">
                  {dateTime.date}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
                Local time
              </p>

              <p className="mt-0.5 font-mono text-xs font-black text-(--foreground)">
                {dateTime.time}
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="mt-7 overflow-hidden rounded-4xl border border-(--border) bg-linear-to-br from-violet-600/12 via-(--surface) to-indigo-600/8 p-6 shadow-(--shadow-md) sm:p-8 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Faculty workspace ready
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                Good morning,{" "}
                <span className="gradient-text">
                  {firstName}.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                See what is happening across your classroom sessions,
                start a live pulse, and turn student feedback into
                useful teaching insight.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    setCreateModalOpen(
                      true
                    )
                  }
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />

                  Start New Session

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/admin/sessions"
                    )
                  }
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-6 text-sm font-bold text-(--foreground-secondary) transition hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
                >
                  <CalendarDays className="h-4 w-4" />
                  View all sessions
                </button>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-violet-400/10 bg-violet-500/5">
                <div className="absolute inset-4 rounded-full border border-violet-400/10" />

                <div className="absolute inset-10 rounded-full border border-violet-400/10" />

                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  <Radio className="h-10 w-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            STATS
        ===================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={
              <Radio className="h-5 w-5" />
            }
            label="Active sessions"
            value={
              stats.activeSessions
            }
            description="Currently live"
            accent="violet"
          />

          <StatCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Total sessions"
            value={
              stats.totalSessions
            }
            description="Across your workspace"
            accent="blue"
          />

          <StatCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Participants"
            value={
              stats.totalParticipants
            }
            description="Students reached"
            accent="emerald"
          />
        </section>

        {/* =====================================================
            MAIN
        ===================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_330px]">
          <section className="surface rounded-3xl p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
                  Classroom activity
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Recent sessions
                </h2>

                <p className="mt-1 text-sm text-(--foreground-muted)">
                  Your latest classroom activity.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/admin/sessions"
                  )
                }
                className="hidden items-center gap-1 text-xs font-bold text-violet-400 sm:flex"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6">
              {loadingSessions ? (
                <div className="grid gap-3">
                  <SessionSkeleton />
                  <SessionSkeleton />
                  <SessionSkeleton />
                </div>
              ) : recentSessions.length ===
                0 ? (
                <EmptySessions
                  onCreate={() =>
                    setCreateModalOpen(
                      true
                    )
                  }
                />
              ) : (
                <div className="grid gap-3">
                  {recentSessions.map(
                    (
                      session
                    ) => (
                      <button
                        type="button"
                        key={
                          session.id
                        }
                        onClick={() =>
                          router.push(
                            `/admin/session/${session.id}`
                          )
                        }
                        className="group flex flex-col gap-4 rounded-2xl border border-(--border) bg-(--background-soft) p-4 text-left transition hover:border-(--border-strong) hover:bg-(--surface-hover) sm:flex-row sm:items-center"
                      >
                        <div
                          className={[
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                            session.status ===
                            "active"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-violet-400/10 text-violet-300",
                          ].join(" ")}
                        >
                          {session.status ===
                          "active" ? (
                            <Radio className="h-5 w-5" />
                          ) : (
                            <GraduationCap className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-black">
                              {
                                session.title
                              }
                            </h3>

                            <span
                              className={[
                                "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                                session.status ===
                                "active"
                                  ? "bg-emerald-400/10 text-emerald-300"
                                  : "bg-slate-500/10 text-(--foreground-muted)",
                              ].join(" ")}
                            >
                              {session.status ===
                              "active"
                                ? "Live"
                                : "Ended"}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--foreground-muted)">
                            <span>
                              {
                                session.courseCode
                              }
                            </span>

                            <span>
                              Code:{" "}
                              {
                                session.joinCode
                              }
                            </span>

                            <span>
                              {
                                session.participantCount ||
                                0
                              }{" "}
                              participants
                            </span>
                          </div>
                        </div>

                        <div className="hidden items-center gap-2 text-xs font-bold text-(--foreground-muted) transition group-hover:text-violet-300 sm:flex">
                          Open
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="surface rounded-3xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-500/10">
                  {profile.photoURL ? (
                    <img
                      src={
                        profile.photoURL
                      }
                      alt={
                        profile.name
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="h-5 w-5 text-violet-300" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {profile.name}
                  </p>

                  <p className="truncate text-xs text-(--foreground-muted)">
                    {profile.designation ||
                      "Faculty"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {profile.department && (
                  <ProfileRow
                    label="Department"
                    value={
                      profile.department
                    }
                  />
                )}

                {profile.institution && (
                  <ProfileRow
                    label="Institution"
                    value={
                      profile.institution
                    }
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/profile/setup?role=faculty"
                  )
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--background-soft) px-4 py-3 text-xs font-bold text-(--foreground-secondary) transition hover:bg-(--surface-hover) hover:text-(--foreground)"
              >
                <Settings className="h-4 w-4" />
                Edit profile
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-violet-500/15 bg-linear-to-br from-violet-500/10 to-indigo-500/5 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <h3 className="mt-5 text-base font-black">
                Turn feedback into insight.
              </h3>

              <p className="mt-2 text-sm leading-6 text-(--foreground-muted)">
                End a session and explore classroom response data
                and AI teaching summaries.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/admin/analytics"
                  )
                }
                className="mt-5 inline-flex items-center gap-2 text-xs font-black text-violet-300"
              >
                Explore analytics
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      </div>

      <CreateSessionModal
        open={
          createModalOpen
        }
        onClose={() =>
          setCreateModalOpen(
            false
          )
        }
        onCreate={
          handleCreateSession
        }
      />
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
  description,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  description: string
  accent:
    | "violet"
    | "blue"
    | "emerald"
}) {
  const accentClasses = {
    violet:
      "bg-violet-500/10 text-violet-300",

    blue:
      "bg-blue-500/10 text-blue-300",

    emerald:
      "bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className="surface surface-hover rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-(--foreground-muted)">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight">
            {value}
          </p>

          <p className="mt-1 text-xs text-(--foreground-subtle)">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accentClasses[
              accent
            ],
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function ProfileRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-(--background-soft) px-3 py-2.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-(--foreground-subtle)">
        {label}
      </span>

      <span className="truncate text-xs font-semibold text-(--foreground-secondary)">
        {value}
      </span>
    </div>
  )
}

function SessionSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-2xl border border-(--border) bg-(--background-soft) p-4">
      <div className="h-11 w-11 rounded-xl bg-(--surface-hover)" />

      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/5 rounded bg-(--surface-hover)" />

        <div className="h-2.5 w-3/5 rounded bg-(--surface-hover)" />
      </div>
    </div>
  )
}

function EmptySessions({
  onCreate,
}: {
  onCreate: () => void
}) {
  return (
    <div className="rounded-2xl border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
        <Radio className="h-6 w-6" />
      </div>

      <h3 className="mt-5 text-base font-black">
        Your classroom is ready.
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-(--foreground-muted)">
        Start your first live session and let students join using
        a code or QR scan.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5"
      >
        <Plus className="h-4 w-4" />
        Create your first session
      </button>
    </div>
  )
}