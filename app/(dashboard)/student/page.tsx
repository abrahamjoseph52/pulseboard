"use client"

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LogOut,
  QrCode,
  ScanLine,
  Settings,
  Sparkles,
  Radio,
  Users,
  Zap,
} from "lucide-react"

import {
  useEffect,
  useState,
  type ReactNode,
} from "react"

import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth"

import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore"

import {
  useRouter,
} from "next/navigation"

import {
  auth,
  db,
} from "@/lib/firebase"

import ThemeToggle from "@/app/components/ThemeToggle"

type StudentProfile = {
  name: string
  email: string
  photoURL: string
  institution: string
  department: string
  registerNumber: string
  year: string
  section: string
}

type ActiveSession = {
  id: string
  title: string
  courseCode: string
  joinCode: string
  participantCount: number
}

const DEFAULT_PROFILE: StudentProfile = {
  name: "Student",
  email: "",
  photoURL: "",
  institution: "",
  department: "",
  registerNumber: "",
  year: "",
  section: "",
}

export default function StudentDashboardPage() {
  const router = useRouter()

  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseUser | null>(
      () => auth.currentUser
    )

  const [authLoading, setAuthLoading] =
    useState(
      () => !auth.currentUser
    )

  const [profile, setProfile] =
    useState<StudentProfile>(
      DEFAULT_PROFILE
    )

  const [activeSessions, setActiveSessions] =
    useState<ActiveSession[]>(
      []
    )

  const [sessionsLoading, setSessionsLoading] =
    useState(
      Boolean(auth.currentUser)
    )

  const [loggingOut, setLoggingOut] =
    useState(false)

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
   * PROFILE
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
                "Student",
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
                  "Student",

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

            institution:
              typeof data.institution ===
              "string"
                ? data.institution
                : "",

            department:
              typeof data.department ===
              "string"
                ? data.department
                : "",

            registerNumber:
              typeof data.registerNumber ===
              "string"
                ? data.registerNumber
                : "",

            year:
              typeof data.year ===
              "string"
                ? data.year
                : "",

            section:
              typeof data.section ===
              "string"
                ? data.section
                : "",
          })
        },
        (error) => {
          console.error(
            "Failed to load student profile:",
            error
          )
        }
      )

    return unsubscribe
  }, [firebaseUser])

  /*
   * =========================================================
   * ACTIVE SESSIONS
   * =========================================================
   */

  useEffect(() => {
    if (!firebaseUser) {
      return
    }

    const activeSessionsQuery =
      query(
        collection(
          db,
          "sessions"
        ),
        where(
          "status",
          "==",
          "active"
        ),
        limit(10)
      )

    const unsubscribe =
      onSnapshot(
        activeSessionsQuery,
        (snapshot) => {
          const nextSessions:
            ActiveSession[] =
            snapshot.docs.map(
              (
                sessionDocument
              ) => {
                const data =
                  sessionDocument.data()

                return {
                  id:
                    sessionDocument.id,

                  title:
                    typeof data.title ===
                    "string"
                      ? data.title
                      : "Live classroom",

                  courseCode:
                    typeof data.courseCode ===
                    "string"
                      ? data.courseCode
                      : "",

                  joinCode:
                    typeof data.joinCode ===
                    "string"
                      ? data.joinCode
                      : "",

                  participantCount:
                    typeof data.participantCount ===
                    "number"
                      ? data.participantCount
                      : 0,
                }
              }
            )

          setActiveSessions(
            nextSessions
          )

          setSessionsLoading(
            false
          )
        },
        (error) => {
          console.error(
            "Failed to load active sessions:",
            error
          )

          setActiveSessions(
            []
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
          "Student logout failed:",
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
            Preparing your workspace...
          </p>
        </div>
      </main>
    )
  }

  if (!firebaseUser) {
    return null
  }

  const firstName =
    profile.name
      .trim()
      .split(/\s+/)[0] ||
    "Student"

  const profileDetails = [
    profile.year,
    profile.section
      ? `Section ${profile.section}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ")

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
                Student workspace
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <ThemeToggle />

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profile/setup?role=student"
                )
              }
              aria-label="Edit profile"
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--foreground-muted) transition hover:border-(--border-strong) hover:text-(--foreground) sm:flex"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profile/setup?role=student"
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
            WELCOME
        ===================================================== */}

        <section className="relative mt-7 overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.08] p-6 shadow-(--shadow-lg) sm:p-8">

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl"
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">

            <div>

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Student workspace ready
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Ready to learn,{" "}
                <span className="gradient-text">
                  {firstName}.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                Join your faculty&apos;s live classroom,
                send one-tap feedback, and help your lecturer
                understand the room in real time.
              </p>

              {profileDetails && (
                <p className="mt-4 text-xs font-semibold text-(--foreground-subtle)">
                  {profileDetails}
                  {profile.department
                    ? ` · ${profile.department}`
                    : ""}
                </p>
              )}

            </div>

            <div className="hidden lg:flex">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-violet-400/10 bg-violet-500/5">

                <div className="absolute inset-4 rounded-full border border-violet-400/10" />

                <div className="absolute inset-9 rounded-full border border-violet-400/10" />

                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  <GraduationCap className="h-9 w-9" />
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* =====================================================
            JOIN AREA
        ===================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          <div className="surface rounded-[2rem] p-6 sm:p-8">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Join a live classroom
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Ready when your faculty is.
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-7 text-(--foreground-muted)">
                  Enter the classroom code or scan the QR.
                  Once inside, your feedback is one tap away.
                </p>
              </div>

              <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 sm:flex">
                <Radio className="h-5 w-5" />
              </div>

            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/student/join"
                  )
                }
                className="group flex min-h-32 flex-col justify-between rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 p-5 text-left text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-1"
              >

                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <ArrowRight className="h-5 w-5" />
                  </div>

                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </div>

                <div className="mt-5">
                  <p className="text-sm font-black">
                    Enter session code
                  </p>

                  <p className="mt-1 text-xs text-white/65">
                    Type the code shown by faculty.
                  </p>
                </div>

              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/student/scan"
                  )
                }
                className="group flex min-h-32 flex-col justify-between rounded-2xl border border-(--border) bg-(--background-soft) p-5 text-left transition hover:-translate-y-1 hover:border-violet-500/30 hover:bg-(--surface-hover)"
              >

                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <ScanLine className="h-5 w-5" />
                  </div>

                  <ArrowRight className="h-5 w-5 text-(--foreground-subtle) transition-transform group-hover:translate-x-1 group-hover:text-violet-300" />
                </div>

                <div className="mt-5">
                  <p className="text-sm font-black">
                    Scan QR code
                  </p>

                  <p className="mt-1 text-xs text-(--foreground-muted)">
                    Scan the classroom QR.
                  </p>
                </div>

              </button>

            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t border-(--border) pt-5 text-xs text-(--foreground-subtle)">

              <span className="inline-flex items-center gap-2">
                <QrCode className="h-4 w-4 text-violet-400" />
                QR join
              </span>

              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                One-tap feedback
              </span>

              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Live classroom pulse
              </span>

            </div>

          </div>

          <aside className="surface rounded-[2rem] p-5">

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
                    profile.email
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

              {profile.registerNumber && (
                <ProfileRow
                  label="Register no."
                  value={
                    profile.registerNumber
                  }
                />
              )}

            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profile/setup?role=student"
                )
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--background-soft) px-4 py-3 text-xs font-bold text-(--foreground-secondary) transition hover:bg-(--surface-hover)"
            >
              <Settings className="h-4 w-4" />
              Edit profile
            </button>

          </aside>

        </section>

        {/* =====================================================
            LIVE SESSIONS
        ===================================================== */}

        <section className="mt-6 surface rounded-[2rem] p-6 sm:p-7">

          <div className="flex items-end justify-between gap-4">

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                Classroom activity
              </p>

              <h2 className="mt-2 text-xl font-black">
                Live sessions
              </h2>

              <p className="mt-1 text-sm text-(--foreground-muted)">
                Active PulseBoard sessions you can join now.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </div>

          </div>

          <div className="mt-6">

            {sessionsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SessionSkeleton />
                <SessionSkeleton />
                <SessionSkeleton />
              </div>
            ) : activeSessions.length === 0 ? (
              <EmptyActiveSessions
                onJoin={() =>
                  router.push(
                    "/student/join"
                  )
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {activeSessions.map(
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
                          `/student/session/${session.id}`
                        )
                      }
                      className="group rounded-2xl border border-(--border) bg-(--background-soft) p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-(--surface-hover)"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                          <RadioIcon />
                        </div>

                        <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                          Live
                        </span>

                      </div>

                      <h3 className="mt-5 truncate text-sm font-black">
                        {
                          session.title
                        }
                      </h3>

                      <p className="mt-1 text-xs text-(--foreground-muted)">
                        {
                          session.courseCode
                        }
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">

                        <span className="text-xs text-(--foreground-subtle)">
                          {
                            session.participantCount
                          }{" "}
                          participants
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-black text-violet-300">
                          Join
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>

                      </div>

                    </button>
                  )
                )}

              </div>
            )}

          </div>

        </section>

        {/* =====================================================
            HOW IT WORKS
        ===================================================== */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">

          <GuideCard
            number="01"
            icon={
              <QrCode className="h-5 w-5" />
            }
            title="Join"
            description="Scan the QR or enter the session code."
          />

          <GuideCard
            number="02"
            icon={
              <Zap className="h-5 w-5" />
            }
            title="Respond"
            description="Choose the signal that matches your understanding."
          />

          <GuideCard
            number="03"
            icon={
              <Sparkles className="h-5 w-5" />
            }
            title="Help improve the lesson"
            description="Your feedback reaches faculty in real time."
          />

        </section>

        {/* =====================================================
            PRIVACY
        ===================================================== */}

        <section className="mt-6 rounded-2xl border border-(--border) bg-(--background-soft) p-4">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <Users className="h-4 w-4" />
            </div>

            <div>

              <p className="text-xs font-black">
                Classroom data & privacy
              </p>

              <p className="mt-1 text-[11px] leading-5 text-(--foreground-muted)">
                PulseBoard stores classroom participation
                data in Firebase and uses authenticated
                application workflows to access it.
              </p>

            </div>

          </div>

        </section>

      </div>
    </main>
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
    <div className="animate-pulse rounded-2xl border border-(--border) bg-(--background-soft) p-5">

      <div className="h-10 w-10 rounded-xl bg-(--surface-hover)" />

      <div className="mt-5 h-3 w-3/5 rounded bg-(--surface-hover)" />

      <div className="mt-2 h-2.5 w-2/5 rounded bg-(--surface-hover)" />

      <div className="mt-5 h-2.5 w-1/3 rounded bg-(--surface-hover)" />

    </div>
  )
}

function EmptyActiveSessions({
  onJoin,
}: {
  onJoin: () => void
}) {
  return (
    <div className="rounded-2xl border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-12 text-center">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
        <Clock3 className="h-6 w-6" />
      </div>

      <h3 className="mt-5 text-base font-black">
        No live sessions right now.
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--foreground-muted)">
        Active PulseBoard classrooms will appear here
        automatically.
      </p>

      <button
        type="button"
        onClick={
          onJoin
        }
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-5 py-3 text-xs font-black text-(--foreground-secondary)"
      >
        Join with code
        <ArrowRight className="h-4 w-4" />
      </button>

    </div>
  )
}

function GuideCard({
  number,
  icon,
  title,
  description,
}: {
  number: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="surface rounded-2xl p-5">

      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          {icon}
        </div>

        <span className="text-3xl font-black text-(--foreground)/5">
          {number}
        </span>

      </div>

      <h3 className="mt-5 text-sm font-black">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-(--foreground-muted)">
        {description}
      </p>

    </div>
  )
}

function RadioIcon() {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute h-3 w-3 animate-ping rounded-full bg-current opacity-20" />
      <span className="relative h-2 w-2 rounded-full bg-current" />
    </span>
  )
}