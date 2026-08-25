"use client"

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  QrCode,
  ScanLine,
  Zap,
} from "lucide-react"

import {
  Suspense,
  useMemo,
  useState,
} from "react"

import {
  useRouter,
  useSearchParams,
} from "next/navigation"

import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore"

import {
  db,
} from "@/lib/firebase"

import ThemeToggle from "@/app/components/ThemeToggle"

export default function StudentJoinPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell flex min-h-screen items-center justify-center px-5">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <Zap className="h-6 w-6 animate-pulse" />
            </div>

            <div>
              <p className="text-sm font-black">
                Preparing join screen...
              </p>

              <p className="mt-1 text-xs text-(--foreground-muted)">
                Loading your classroom join options
              </p>
            </div>
          </div>
        </main>
      }
    >
      <StudentJoinContent />
    </Suspense>
  )
}

function StudentJoinContent() {
  const router =
    useRouter()

  const searchParams =
    useSearchParams()

  const initialCode =
    useMemo(
      () =>
        (
          searchParams.get(
            "code"
          ) || ""
        )
          .toUpperCase(),
      [searchParams]
    )

  const [
    joinCode,
    setJoinCode,
  ] = useState(
    initialCode
  )

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState("")

  const handleJoin =
    async (
      event?: React.FormEvent<HTMLFormElement>
    ) => {
      event?.preventDefault()

      setError("")

      const code =
        joinCode
          .trim()
          .toUpperCase()

      if (!code) {
        setError(
          "Enter a session code or scan the classroom QR code."
        )
        return
      }

      if (
        code.length <
        4
      ) {
        setError(
          "Please enter a valid session code."
        )
        return
      }

      try {
        setLoading(true)

        const sessionQuery =
          query(
            collection(
              db,
              "sessions"
            ),
            where(
              "joinCode",
              "==",
              code
            ),
            where(
              "status",
              "==",
              "active"
            ),
            limit(1)
          )

        const snapshot =
          await getDocs(
            sessionQuery
          )

        if (
          snapshot.empty
        ) {
          setError(
            "We couldn't find an active session with that code."
          )

          setLoading(false)
          return
        }

        const session =
          snapshot.docs[0]

        router.push(
          `/student/session/${session.id}`
        )
      } catch (
        joinError
      ) {
        console.error(
          "Failed to join session:",
          joinError
        )

        setError(
          "Unable to join the session. Please try again."
        )

        setLoading(false)
      }
    }

  const openScanner =
    () => {
      router.push(
        `/student/scan?code=${encodeURIComponent(
          joinCode
            .trim()
            .toUpperCase()
        )}`
      )
    }

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto min-h-screen max-w-5xl px-5 py-6 sm:px-8 lg:px-10">

        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/student"
              )
            }
            className="group inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Student dashboard
          </button>

          <ThemeToggle />
        </header>

        {/* Hero */}
        <div className="mx-auto max-w-2xl pt-12 text-center sm:pt-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-violet-500/20">
            <Zap className="h-7 w-7" />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-violet-400">
            Join a classroom
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Enter the live session.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
            Enter the short code shown by your faculty or scan
            the PulseBoard QR code from the classroom screen.
          </p>
        </div>

        {/* Join card */}
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="surface rounded-[2rem] p-6 sm:p-8">
            <form
              onSubmit={
                handleJoin
              }
            >
              <label className="block">
                <span className="mb-3 block text-sm font-black text-(--foreground-secondary)">
                  Session code
                </span>

                <input
                  value={
                    joinCode
                  }
                  onChange={(
                    event
                  ) =>
                    setJoinCode(
                      event.target.value
                        .toUpperCase()
                        .replace(
                          /[^A-Z0-9]/g,
                          ""
                        )
                        .slice(
                          0,
                          8
                        )
                    )
                  }
                  placeholder="e.g. A7K9Q2"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="h-16 w-full rounded-2xl border border-(--border) bg-(--background-soft) px-5 text-center font-mono text-2xl font-black tracking-[0.2em] text-(--foreground) outline-none transition placeholder:text-(--foreground-subtle) focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                />
              </label>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                  <p className="text-center text-sm font-medium leading-6 text-rose-300">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading
                }
                className="group mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Finding session...
                  </>
                ) : (
                  <>
                    Join session

                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-(--border)" />

              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-(--foreground-subtle)">
                or
              </span>

              <div className="h-px flex-1 bg-(--border)" />
            </div>

            {/* QR option */}
            <button
              type="button"
              onClick={
                openScanner
              }
              className="group flex w-full items-center gap-4 rounded-2xl border border-(--border) bg-(--background-soft) p-5 text-left transition hover:border-violet-500/30 hover:bg-(--surface-hover)"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 transition group-hover:bg-violet-500/15">
                <ScanLine className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">
                  Scan classroom QR
                </p>

                <p className="mt-1 text-xs leading-5 text-(--foreground-muted)">
                  Use your phone camera to scan the code displayed
                  by your faculty.
                </p>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0 text-(--foreground-subtle) transition group-hover:translate-x-1 group-hover:text-violet-300" />
            </button>
          </div>

          {/* Trust/info */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoCard
              icon={
                <QrCode className="h-4 w-4" />
              }
              title="Quick join"
              text="Scan and go"
            />

            <InfoCard
              icon={
                <CheckCircle2 className="h-4 w-4" />
              }
              title="Live"
              text="Real-time classroom"
            />

            <InfoCard
              icon={
                <Zap className="h-4 w-4" />
              }
              title="Simple"
              text="One-tap feedback"
            />
          </div>
        </div>
      </div>
    </main>
  )
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-(--border) bg-(--surface) p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <p className="mt-3 text-xs font-black">
        {title}
      </p>

      <p className="mt-1 text-[10px] text-(--foreground-muted)">
        {text}
      </p>
    </div>
  )
}