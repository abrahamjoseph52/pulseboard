"use client"

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LogOut,
  QrCode,
  Radio,
  ScanLine,
  Settings,
  Sparkles,
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

import { useRouter } from "next/navigation"

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

type LiveDateTime = {
  date: string
  time: string
}

const initialProfile: StudentProfile = {
  name: "Student",
  email: "",
  photoURL: "",
  institution: "",
  department: "",
  registerNumber: "",
  year: "",
  section: "",
}

function getLiveDateTime(): LiveDateTime {
  const now = new Date()

  return {
    date: now.toLocaleDateString(
      "en-IN",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ),

    time: now.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }
    ),
  }
}

function getInitialSessionLoading() {
  return Boolean(
    auth.currentUser
  )
}

export default function StudentDashboardPage() {
  const router = useRouter()

  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseUser | null>(
      () => auth.currentUser
    )

  const [profile, setProfile] =
    useState<StudentProfile>(
      initialProfile
    )

  const [activeSessions, setActiveSessions] =
    useState<ActiveSession[]>(
      []
    )

  const [authLoading, setAuthLoading] =
    useState(
      () => !auth.currentUser
    )

  const [sessionsLoading, setSessionsLoading] =
    useState(
      getInitialSessionLoading
    )

  const [loggingOut, setLoggingOut] =
    useState(false)

  const [dateTime, setDateTime] =
    useState<LiveDateTime>(
      getLiveDateTime
    )

  /* =========================================================
     LIVE CLOCK
  ========================================================= */

  useEffect(() => {
    const updateDateTime = () => {
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

  /* =========================================================
     AUTHENTICATION
  ========================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setFirebaseUser(
            currentUser
          )

          setAuthLoading(
            false
          )
        }
      )

    return unsubscribe
  }, [])

  /* =========================================================
     STUDENT PROFILE
  ========================================================= */

  useEffect(() => {
    if (!firebaseUser) {
      return
    }

    const userRef =
      doc(
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
              ...initialProfile,

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

  /* =========================================================
     ACTIVE CLASSROOMS
  ========================================================= */

  useEffect(() => {
    if (!firebaseUser) {
      return
    }

    const activeSessionQuery =
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
        limit(6)
      )

    const unsubscribe =
      onSnapshot(
        activeSessionQuery,
        (snapshot) => {
          const nextSessions: ActiveSession[] =
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

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    async () => {
      if (loggingOut) {
        return
      }

      try {
        setLoggingOut(
          true
        )

        await signOut(auth)

        router.replace(
          "/login"
        )
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

  /* =========================================================
     LOADING
  ========================================================= */

  if (authLoading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-5">
        <div className="relative flex flex-col items-center gap-4">
          <div className="absolute h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10">
            <Zap className="h-7 w-7 animate-pulse" />
          </div>

          <p className="relative text-sm font-bold text-(--foreground-muted)">
            Preparing your student workspace...
          </p>
        </div>
      </main>
    )
  }

  /* =========================================================
     NOT AUTHENTICATED
  ========================================================= */

  if (!firebaseUser) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-5">
        <div className="surface relative w-full max-w-md overflow-hidden rounded-[2rem] p-8 text-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300">
              <Users className="h-7 w-7" />
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
              Student workspace
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight">
              Sign in to continue
            </h1>

            <p className="mt-3 text-sm leading-6 text-(--foreground-muted)">
              Your PulseBoard student workspace requires
              authentication before you can join a classroom.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/login"
                )
              }
              className="group mt-7 inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-6 text-sm font-black text-white shadow-xl shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-500/25"
            >
              Go to login

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </main>
    )
  }

  /* =========================================================
     DISPLAY HELPERS
  ========================================================= */

  const firstName =
    profile.name
      .trim()
      .split(/\s+/)[0] ||
    "Student"

  const profileDetail = [
    profile.year,
    profile.section
      ? `Section ${profile.section}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ")

  const profileComplete =
    Boolean(
      profile.name &&
        profile.institution &&
        profile.department &&
        profile.registerNumber &&
        profile.year &&
        profile.section
    )

  /* =========================================================
     MAIN DASHBOARD
  ========================================================= */

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto max-w-375 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 via-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/20">
              <Zap className="h-5 w-5" />

              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-(--background) bg-emerald-400" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight">
                PulseBoard
              </p>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-(--foreground-muted)">
                Student workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clock */}
            <div className="hidden items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-3.5 py-2.5 shadow-(--shadow-xs) sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Clock3 className="h-4 w-4" />
              </div>

              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-(--foreground-subtle)">
                  Local time
                </p>

                <p className="font-mono text-[11px] font-black text-(--foreground)">
                  {dateTime.time}
                </p>
              </div>
            </div>

            <ThemeToggle />

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profile/setup?role=student"
                )
              }
              aria-label="Edit profile"
              className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-(--border) bg-(--surface) text-(--foreground-muted) shadow-(--shadow-xs) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground) sm:flex"
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
              className="group flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-(--border) bg-(--surface) shadow-(--shadow-xs) transition-all hover:border-(--border-strong) hover:shadow-(--shadow-sm)"
            >
              {profile.photoURL ? (
                <img
                  src={
                    profile.photoURL
                  }
                  alt={
                    profile.name
                  }
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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

        {/* Mobile clock */}
        <div className="mt-3 flex sm:hidden">
          <div className="flex w-full items-center justify-between rounded-2xl border border-(--border) bg-(--surface) px-4 py-3 shadow-(--shadow-xs)">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Clock3 className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-(--foreground-subtle)">
                  {dateTime.date}
                </p>

                <p className="font-mono text-xs font-black">
                  {dateTime.time}
                </p>
              </div>
            </div>

            <span className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Online
            </span>
          </div>
        </div>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative mt-7 overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.10] p-6 shadow-(--shadow-lg) sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Student workspace ready
              </div>

              <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl xl:text-6xl">
                Ready to learn,{" "}
                <span className="gradient-text">
                  {firstName}.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                Join your faculty&apos;s live classroom, send a
                quick signal, and help your teacher understand how
                the room is following the lesson.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {profileDetail && (
                  <span className="rounded-full border border-(--border) bg-(--background-soft)/70 px-3 py-1.5 text-[10px] font-bold text-(--foreground-secondary)">
                    {profileDetail}
                    {profile.department
                      ? ` · ${profile.department}`
                      : ""}
                  </span>
                )}

                <span className="rounded-full border border-violet-400/10 bg-violet-500/5 px-3 py-1.5 text-[10px] font-bold text-violet-300">
                  Live classroom feedback
                </span>
              </div>

              {!profileComplete && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/profile/setup?role=student"
                    )
                  }
                  className="group mt-6 inline-flex items-center gap-2 rounded-2xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-left transition hover:border-amber-400/25 hover:bg-amber-400/10"
                >
                  <Settings className="h-4 w-4 text-amber-300" />

                  <span>
                    <span className="block text-xs font-black text-amber-200">
                      Complete your student profile
                    </span>

                    <span className="mt-0.5 block text-[10px] text-(--foreground-muted)">
                      Add your academic details for a complete workspace.
                    </span>
                  </span>

                  <ArrowRight className="h-4 w-4 text-amber-300 transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>

            {/* Visual */}
            <div className="hidden lg:block">
              <div className="relative flex h-56 w-56 items-center justify-center">
                <div className="absolute inset-0 animate-pulse-glow rounded-full border border-violet-400/10 bg-violet-500/5" />

                <div className="absolute inset-7 rounded-full border border-violet-400/10" />

                <div className="absolute inset-14 rounded-full border border-indigo-400/10" />

                <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] bg-linear-to-br from-violet-500 via-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  <GraduationCap className="h-12 w-12" />
                </div>

                <div className="absolute right-0 top-12 rounded-2xl border border-(--border) bg-(--surface)/90 px-3 py-2 shadow-(--shadow-md) backdrop-blur-lg">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
                      Classroom ready
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-10 left-0 rounded-2xl border border-(--border) bg-(--surface)/90 px-3 py-2 shadow-(--shadow-md) backdrop-blur-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-300" />

                    <span className="text-[9px] font-black uppercase tracking-wider text-(--foreground-muted)">
                      One-tap feedback
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            JOIN CLASSROOM
        ===================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="surface overflow-hidden rounded-[2rem] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <ScanLine className="h-4 w-4" />
                  </span>

                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                    Join a classroom
                  </p>
                </div>

                <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                  Ready when your faculty is.
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-7 text-(--foreground-muted)">
                  Use the method that works best for you. Enter the
                  short classroom code or scan the QR shown by your faculty.
                </p>
              </div>

              <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 sm:flex">
                <RadioIcon />
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {/* Code */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/student/join"
                  )
                }
                className="group relative min-h-34 overflow-hidden rounded-3xl bg-linear-to-br from-violet-600 via-violet-600 to-indigo-600 p-5 text-left text-white shadow-xl shadow-violet-500/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/25"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-125"
                />

                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <ArrowRight className="h-5 w-5" />
                  </div>

                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>

                <div className="relative z-10 mt-6">
                  <p className="text-sm font-black">
                    Enter session code
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/65">
                    Type the code shown on your classroom screen.
                  </p>
                </div>
              </button>

              {/* QR */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/student/scan"
                  )
                }
                className="group relative min-h-34 overflow-hidden rounded-3xl border border-(--border) bg-(--background-soft) p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-violet-400/25 hover:bg-(--surface-hover) hover:shadow-(--shadow-md)"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl opacity-0 transition-opacity group-hover:opacity-100"
                />

                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <ScanLine className="h-5 w-5" />
                  </div>

                  <ArrowRight className="h-5 w-5 text-(--foreground-subtle) transition-transform group-hover:translate-x-1 group-hover:text-violet-300" />
                </div>

                <div className="relative z-10 mt-6">
                  <p className="text-sm font-black">
                    Scan QR code
                  </p>

                  <p className="mt-1 text-xs leading-5 text-(--foreground-muted)">
                    Point your camera at the classroom screen.
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-(--border) pt-5 text-[10px] font-bold text-(--foreground-subtle)">
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

          {/* =====================================================
              PROFILE
          ===================================================== */}

          <aside className="surface overflow-hidden rounded-[2rem] p-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-violet-500/20 to-indigo-500/10">
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

                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-(--surface) bg-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">
                  {profile.name}
                </p>

                <p className="truncate text-xs text-(--foreground-muted)">
                  {profile.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/profile/setup?role=student"
                  )
                }
                aria-label="Edit profile"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--background-soft) text-(--foreground-muted) transition hover:border-(--border-strong) hover:text-(--foreground)"
              >
                <Settings className="h-4 w-4" />
              </button>
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

              {profile.year && (
                <ProfileRow
                  label="Year"
                  value={
                    profile.year
                  }
                />
              )}

              {profile.section && (
                <ProfileRow
                  label="Section"
                  value={
                    profile.section
                  }
                />
              )}

              {!profile.institution &&
                !profile.department &&
                !profile.registerNumber &&
                !profile.year &&
                !profile.section && (
                  <div className="rounded-2xl border border-dashed border-(--border-strong) bg-(--background-soft) px-4 py-4">
                    <p className="text-xs font-bold text-(--foreground-secondary)">
                      Your profile is not complete yet.
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-(--foreground-muted)">
                      Add your academic information to personalize your
                      PulseBoard workspace.
                    </p>
                  </div>
                )}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profile/setup?role=student"
                )
              }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-(--border) bg-(--background-soft) px-4 py-3 text-xs font-bold text-(--foreground-secondary) transition-all hover:border-violet-400/20 hover:bg-(--surface-hover) hover:text-(--foreground)"
            >
              <Settings className="h-4 w-4" />
              Manage profile
            </button>

            <button
              type="button"
              onClick={
                handleLogout
              }
              disabled={loggingOut}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />

              {loggingOut
                ? "Signing out..."
                : "Sign out"}
            </button>
          </aside>
        </section>

        {/* =====================================================
            LIVE SESSIONS
        ===================================================== */}

        <section className="surface mt-6 overflow-hidden rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <Radio className="h-4 w-4" />
                </span>

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Classroom activity
                </p>
              </div>

              <h2 className="mt-3 text-2xl font-black tracking-tight">
                Live sessions
              </h2>

              <p className="mt-1 text-sm text-(--foreground-muted)">
                Active PulseBoard classrooms ready to join.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live classrooms
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
              <EmptyActiveSessions />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeSessions.map(
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
                          `/student/session/${session.id}`
                        )
                      }
                      className="group relative overflow-hidden rounded-3xl border border-(--border) bg-(--background-soft) p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-violet-400/25 hover:bg-(--surface-hover) hover:shadow-(--shadow-md)"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />

                      <div className="relative z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                            <span className="absolute inset-2 animate-ping rounded-full bg-emerald-400/10" />

                            <RadioIcon />
                          </div>

                          <span className="rounded-full border border-emerald-400/10 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                            Live
                          </span>
                        </div>

                        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
                          {session.courseCode ||
                            "Live classroom"}
                        </p>

                        <h3 className="mt-1 truncate text-base font-black">
                          {
                            session.title
                          }
                        </h3>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <span className="text-xs text-(--foreground-subtle)">
                            <span className="font-black text-(--foreground-secondary)">
                              {
                                session.participantCount
                              }
                            </span>{" "}
                            participants
                          </span>

                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-violet-300">
                            Join

                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>

                        <div className="mt-4 h-1 overflow-hidden rounded-full bg-(--surface-hover)">
                          <div className="h-full w-1/2 rounded-full bg-linear-to-r from-emerald-400 to-teal-400 transition-all duration-500 group-hover:w-3/4" />
                        </div>
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
            icon={
              <QrCode className="h-5 w-5" />
            }
            number="01"
            title="Join the room"
            description="Scan your faculty's QR code or enter the short classroom code."
          />

          <GuideCard
            icon={
              <Zap className="h-5 w-5" />
            }
            number="02"
            title="Send your pulse"
            description="Use one simple signal to tell your faculty how the lesson feels."
          />

          <GuideCard
            icon={
              <Sparkles className="h-5 w-5" />
            }
            number="03"
            title="Shape the lesson"
            description="Your feedback helps the faculty adapt the class in real time."
          />
        </section>

        {/* =====================================================
            FOOTER ACTION
        ===================================================== */}

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-r from-violet-500/10 via-violet-500/[0.04] to-indigo-500/10 p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-black">
                  Your classroom pulse matters.
                </p>

                <p className="mt-1 max-w-2xl text-xs leading-6 text-(--foreground-muted)">
                  Keep your feedback honest and quick. PulseBoard is designed
                  to help you stay focused on learning.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/join"
                )
              }
              className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-5 text-xs font-black text-(--foreground-secondary) transition-all hover:-translate-y-0.5 hover:border-violet-400/20 hover:bg-(--surface-hover) hover:text-(--foreground)"
            >
              Join a session

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

/* =========================================================
   HELPERS
========================================================= */

function RadioIcon() {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute h-3 w-3 animate-ping rounded-full bg-current opacity-20" />

      <span className="relative h-2 w-2 rounded-full bg-current" />
    </span>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-(--border) bg-(--background-soft) px-3.5 py-3">
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
    <div className="animate-pulse rounded-3xl border border-(--border) bg-(--background-soft) p-5">
      <div className="flex items-start justify-between">
        <div className="h-11 w-11 rounded-2xl bg-(--surface-hover)" />

        <div className="h-6 w-12 rounded-full bg-(--surface-hover)" />
      </div>

      <div className="mt-5 h-2.5 w-2/5 rounded-full bg-(--surface-hover)" />

      <div className="mt-2 h-3.5 w-3/5 rounded-full bg-(--surface-hover)" />

      <div className="mt-6 h-2.5 w-2/5 rounded-full bg-(--surface-hover)" />

      <div className="mt-4 h-1 rounded-full bg-(--surface-hover)" />
    </div>
  )
}

function EmptyActiveSessions() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-(--border-strong) bg-(--background-soft) px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="relative z-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10">
          <Clock3 className="h-7 w-7" />
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
          Waiting for class
        </p>

        <h3 className="mt-2 text-lg font-black">
          No live sessions right now.
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--foreground-muted)">
          Active PulseBoard classrooms will appear here as soon as
          your faculty starts one.
        </p>
      </div>
    </div>
  )
}

function GuideCard({
  icon,
  number,
  title,
  description,
}: {
  icon: ReactNode
  number: string
  title: string
  description: string
}) {
  return (
    <div className="surface group relative overflow-hidden rounded-[2rem] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-(--border-strong) hover:shadow-(--shadow-md)">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/8 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          {icon}
        </div>

        <span className="text-3xl font-black text-(--foreground)/5 transition-transform duration-300 group-hover:scale-110">
          {number}
        </span>
      </div>

      <h3 className="relative z-10 mt-5 text-sm font-black">
        {title}
      </h3>

      <p className="relative z-10 mt-2 text-sm leading-6 text-(--foreground-muted)">
        {description}
      </p>
    </div>
  )
}