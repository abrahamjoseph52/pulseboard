"use client"

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  LogOut,
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
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth"

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

import { useRouter } from "next/navigation"

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
import LiveDateTime from "@/app/components/LiveDateTime"
type FacultyProfile = {
  name: string
  email: string
  photoURL: string
  department: string
  institution: string
  designation: string
}

const DEFAULT_PROFILE: FacultyProfile = {
  name: "Faculty",
  email: "",
  photoURL: "",
  department: "",
  institution: "",
  designation: "Faculty",
}

export default function AdminDashboardPage() {
  const router = useRouter()

  const [
    firebaseUser,
    setFirebaseUser,
  ] = useState<FirebaseUser | null>(
    () => auth.currentUser
  )

  const [
    authLoading,
    setAuthLoading,
  ] = useState(
    () => !auth.currentUser
  )

  const [
    profile,
    setProfile,
  ] = useState<FacultyProfile>(
    DEFAULT_PROFILE
  )

  const [
    sessions,
    setSessions,
  ] = useState<Session[]>([])

  const [
    sessionsLoading,
    setSessionsLoading,
  ] = useState(
    Boolean(auth.currentUser)
  )

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false)

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false)

  /*
   * =========================================================
   * AUTH
   * =========================================================
   */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setFirebaseUser(
            currentUser
          )

          setAuthLoading(false)

          if (!currentUser) {
            router.replace(
              "/login"
            )
          }
        }
      )

    return unsubscribe
  }, [router])

  /*
   * =========================================================
   * FACULTY PROFILE
   * =========================================================
   */

  useEffect(() => {
    if (!firebaseUser) {
      return
    }

    const userRef = doc(
      db,
      "users",
      firebaseUser.uid
    )

    const unsubscribe =
      onSnapshot(
        userRef,
        (snapshot) => {
          const data =
            snapshot.data()

          if (!data) {
            setProfile({
              ...DEFAULT_PROFILE,
              name:
                firebaseUser.displayName ||
                "Faculty",
              email:
                firebaseUser.email ||
                "",
              photoURL:
                firebaseUser.photoURL ||
                "",
            })

            return
          }

          setProfile({
            name:
              typeof data.name ===
              "string"
                ? data.name
                : firebaseUser.displayName ||
                  "Faculty",

            email:
              typeof data.email ===
              "string"
                ? data.email
                : firebaseUser.email ||
                  "",

            photoURL:
              typeof data.photoURL ===
              "string"
                ? data.photoURL
                : firebaseUser.photoURL ||
                  "",

            department:
              typeof data.department ===
              "string"
                ? data.department
                : "",

            institution:
              typeof data.institution ===
              "string"
                ? data.institution
                : "",

            designation:
              typeof data.designation ===
              "string"
                ? data.designation
                : "Faculty",
          })
        },
        (error) => {
          console.error(
            "Failed to load faculty profile:",
            error
          )
        }
      )

    return unsubscribe
  }, [firebaseUser])

  /*
   * =========================================================
   * FACULTY SESSIONS
   * =========================================================
   */

  useEffect(() => {
    if (!firebaseUser) {
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
          firebaseUser.uid
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

          setSessionsLoading(
            false
          )
        },
        (error) => {
          console.error(
            "Failed to load sessions:",
            error
          )

          setSessionsLoading(
            false
          )
        }
      )

    return unsubscribe
  }, [firebaseUser])

  /*
   * =========================================================
   * CREATE SESSION
   * =========================================================
   */

  const handleCreateSession =
    async (
      data: CreateSessionData
    ) => {
      const currentUser =
        auth.currentUser

      if (!currentUser) {
        router.replace(
          "/login"
        )

        throw new Error(
          "You must be signed in."
        )
      }

      const sessionRef =
        await addDoc(
          collection(
            db,
            "sessions"
          ),
          {
            adminId:
              currentUser.uid,

            title:
              data.title.trim(),

            courseCode:
              data.courseCode.trim(),

            joinCode:
              data.joinCode
                .trim()
                .toUpperCase(),

            status:
              "active",

            participantCount:
              0,

            totalSignals:
              0,

            aiSummary:
              null,

            createdAt:
              serverTimestamp(),

            endedAt:
              null,

            /*
             * PulseBoard round state
             */
            roundStatus:
              "waiting",

            currentRound:
              0,

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
        `/admin/session/${sessionRef.id}`
      )
    }

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  const handleLogout =
    async () => {
      if (loggingOut) {
        return
      }

      try {
        setLoggingOut(
          true
        )

        await signOut(
          auth
        )

        router.replace(
          "/login"
        )

        router.refresh()
      } catch (error) {
        console.error(
          "Faculty logout failed:",
          error
        )

        setLoggingOut(
          false
        )
      }
    }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (authLoading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
            <Zap className="h-6 w-6 animate-pulse" />
          </div>

          <p className="text-sm font-medium text-(--foreground-muted)">
            Preparing faculty workspace...
          </p>
        </div>
      </main>
    )
  }

  if (!firebaseUser) {
    return null
  }

  /*
   * =========================================================
   * DERIVED DATA
   * =========================================================
   */

  const firstName =
    profile.name
      .trim()
      .split(/\s+/)[0] ||
    "Professor"

  const activeSessions =
    sessions.filter(
      (
        session
      ) =>
        session.status ===
        "active"
    )

  const totalParticipants =
    sessions.reduce(
      (
        total,
        session
      ) =>
        total +
        (session.participantCount ||
          0),
      0
    )

  const recentSessions =
    sessions.slice(
      0,
      5
    )

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-center justify-between gap-3">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
              <Zap className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black">
                PulseBoard
              </p>

              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-(--foreground-muted)">
                Faculty workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <LiveDateTime />

            <ThemeToggle />

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/analytics"
                )
              }
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--foreground-muted) transition hover:border-(--border-strong) hover:text-(--foreground) sm:flex"
              aria-label="Open analytics"
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
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-(--border) bg-(--surface)"
              aria-label="Open profile"
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

            <button
              type="button"
              onClick={
                handleLogout
              }
              disabled={
                loggingOut
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 text-xs font-bold text-rose-300 transition hover:border-rose-500/30 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />

              <span className="hidden sm:inline">
                {loggingOut
                  ? "Signing out..."
                  : "Sign out"}
              </span>
            </button>

          </div>
        </header>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.08] p-6 shadow-(--shadow-lg) sm:p-8 lg:p-10">

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">

            <div>

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Faculty workspace ready
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Welcome back,{" "}
                <span className="gradient-text">
                  {firstName}.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                Run live classroom sessions, see student
                understanding in real time, and turn feedback
                into practical teaching insight.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() =>
                    setCreateModalOpen(
                      true
                    )
                  }
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-6 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Plus className="h-4 w-4" />
                  Start New Session
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/admin/analytics"
                    )
                  }
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-6 text-xs font-bold text-(--foreground-secondary) transition hover:border-(--border-strong) hover:bg-(--surface-hover)"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Analytics
                </button>

              </div>
            </div>

            <div className="hidden lg:flex">
              <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-violet-400/10 bg-violet-500/5">

                <div className="absolute inset-4 rounded-full border border-violet-400/10" />

                <div className="absolute inset-10 rounded-full border border-violet-400/10" />

                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  <Radio className="h-10 w-10" />
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* =====================================================
            STATS
        ===================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">

          <StatCard
            icon={
              <Radio className="h-5 w-5" />
            }
            label="Active sessions"
            value={
              activeSessions.length
            }
            description="Currently live"
            tone="violet"
          />

          <StatCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Total sessions"
            value={
              sessions.length
            }
            description="Created in your workspace"
            tone="blue"
          />

          <StatCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Participants"
            value={
              totalParticipants
            }
            description="Student participation"
            tone="emerald"
          />

        </section>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">

          <section className="surface rounded-[2rem] p-6">

            <div className="flex items-end justify-between gap-4">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Classroom activity
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Recent sessions
                </h2>

                <p className="mt-1 text-sm text-(--foreground-muted)">
                  Monitor and reopen your classrooms.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/admin/sessions"
                  )
                }
                className="hidden items-center gap-1 text-xs font-black text-violet-300 sm:flex"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </button>

            </div>

            <div className="mt-6">

              {sessionsLoading ? (
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
                        key={
                          session.id
                        }
                        type="button"
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
                              : "bg-violet-500/10 text-violet-300",
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
                                  : "bg-(--surface-hover) text-(--foreground-muted)",
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
                              students
                            </span>
                          </div>

                        </div>

                        <ArrowRight className="hidden h-4 w-4 text-(--foreground-subtle) transition-transform group-hover:translate-x-1 group-hover:text-violet-300 sm:block" />

                      </button>
                    )
                  )}

                </div>
              )}

            </div>

          </section>

          <aside className="space-y-5">

            <div className="surface rounded-[2rem] p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-violet-500/10">
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
                    {
                      profile.name
                    }
                  </p>

                  <p className="truncate text-xs text-(--foreground-muted)">
                    {
                      profile.designation ||
                      "Faculty"
                    }
                  </p>

                </div>

              </div>

              <div className="mt-5 grid gap-2">

                {profile.institution && (
                  <ProfileRow
                    label="Institution"
                    value={
                      profile.institution
                    }
                  />
                )}

                {profile.department && (
                  <ProfileRow
                    label="Department"
                    value={
                      profile.department
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
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--background-soft) px-4 py-3 text-xs font-bold text-(--foreground-secondary) transition hover:bg-(--surface-hover)"
              >
                <Settings className="h-4 w-4" />
                Edit profile
              </button>

            </div>

            <div className="overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 to-indigo-500/5 p-5">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
                Built for real classrooms
              </p>

              <h3 className="mt-2 text-lg font-black">
                Low-friction teaching intelligence.
              </h3>

              <p className="mt-2 text-sm leading-6 text-(--foreground-muted)">
                Faculty start a pulse in seconds. Students
                respond by one tap. The dashboard turns those
                responses into live classroom insight.
              </p>

              <div className="mt-5 space-y-2 text-xs font-semibold text-(--foreground-secondary)">

                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  No special classroom hardware
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  QR or code-based student joining
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  Real-time classroom feedback
                </div>

              </div>

            </div>

            <div className="rounded-2xl border border-(--border) bg-(--background-soft) p-4">

              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
                Privacy
              </p>

              <p className="mt-2 text-xs leading-5 text-(--foreground-muted)">
                Classroom feedback is stored in Firebase and
                is intended to be accessible only through
                authenticated PulseBoard workflows and your
                Firestore security rules.
              </p>

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
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  description: string
  tone:
    | "violet"
    | "blue"
    | "emerald"
}) {
  const toneClasses = {
    violet:
      "bg-violet-500/10 text-violet-300",
    blue:
      "bg-blue-500/10 text-blue-300",
    emerald:
      "bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className="surface surface-hover rounded-[2rem] p-5">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-muted)">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black">
            {value}
          </p>

          <p className="mt-1 text-xs text-(--foreground-subtle)">
            {description}
          </p>

        </div>

        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-2xl",
            toneClasses[tone],
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

      <span className="text-[9px] font-black uppercase tracking-wider text-(--foreground-subtle)">
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
        Start your first live session and invite students
        with a QR code or session code.
      </p>

      <button
        type="button"
        onClick={
          onCreate
        }
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white"
      >
        <Plus className="h-4 w-4" />
        Create session
      </button>

    </div>
  )
}