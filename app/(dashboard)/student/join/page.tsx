"use client"

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileDigit,
  Loader2,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"

import {
  useMemo,
  useState,
  type ReactNode,
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
          .toUpperCase()
          .replace(
            /[^A-Z0-9]/g,
            ""
          )
          .slice(0, 8),
      [searchParams]
    )

  const [
    joinCode,
    setJoinCode,
  ] =
    useState(
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

  const handleCodeChange =
    (
      value: string
    ) => {
      const cleanCode =
        value
          .toUpperCase()
          .replace(
            /[^A-Z0-9]/g,
            ""
          )
          .slice(0, 8)

      setJoinCode(
        cleanCode
      )

      if (error) {
        setError("")
      }
    }

  const handleJoin =
    async (
      event?: React.FormEvent<HTMLFormElement>
    ) => {
      event?.preventDefault()

      if (loading) {
        return
      }

      setError("")

      const code =
        joinCode
          .trim()
          .toUpperCase()

      if (!code) {
        setError(
          "Enter the session code shown by your faculty."
        )

        return
      }

      if (
        code.length < 4
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
      const encoded =
        encodeURIComponent(
          joinCode
            .trim()
            .toUpperCase()
        )

      router.push(
        `/student/scan?code=${encoded}`
      )
    }

  const isCodeReady =
    joinCode.trim().length >=
    4

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/student"
              )
            }
            className="group inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) shadow-(--shadow-xs) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Student dashboard
          </button>

          <ThemeToggle />
        </header>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-400/10 bg-linear-to-br from-violet-600/[0.14] via-(--surface) to-indigo-600/[0.10] p-6 shadow-(--shadow-lg) sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/12 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-indigo-500/10 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Join a classroom
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Enter the
                <span className="gradient-text">
                  {" "}
                  live session.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                Enter the short code displayed by your faculty,
                or scan the classroom QR code and join in seconds.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <JoinBadge
                  icon={
                    <QrCode className="h-3.5 w-3.5" />
                  }
                  text="QR join"
                />

                <JoinBadge
                  icon={
                    <Zap className="h-3.5 w-3.5" />
                  }
                  text="Fast entry"
                />

                <JoinBadge
                  icon={
                    <ShieldCheck className="h-3.5 w-3.5" />
                  }
                  text="Live classroom"
                />
              </div>
            </div>

            <div className="hidden lg:flex">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-violet-400/10 bg-violet-500/5">
                <div className="absolute inset-4 rounded-full border border-violet-400/10" />

                <div className="absolute inset-9 rounded-full border border-indigo-400/10" />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  <QrCode className="h-9 w-9" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            MAIN
        ===================================================== */}

        <div className="mx-auto mt-6 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* JOIN CARD */}
          <section className="surface overflow-hidden rounded-[2rem]">
            <div className="border-b border-(--border) bg-linear-to-r from-violet-500/[0.04] to-transparent p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <FileDigit className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                    Manual join
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Enter your session code
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <form
                onSubmit={
                  handleJoin
                }
              >
                <label
                  htmlFor="session-code"
                  className="block"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-(--foreground-secondary)">
                      Session code
                    </span>

                    <span className="text-[9px] font-bold text-(--foreground-subtle)">
                      {joinCode.length}/8
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="session-code"
                      value={
                        joinCode
                      }
                      onChange={(
                        event
                      ) =>
                        handleCodeChange(
                          event.target.value
                        )
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            "Enter" &&
                          isCodeReady
                        ) {
                          void handleJoin()
                        }
                      }}
                      placeholder="A7K9Q2"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={
                        false
                      }
                      maxLength={
                        8
                      }
                      disabled={
                        loading
                      }
                      className="h-20 w-full rounded-3xl border border-(--border) bg-(--background-soft) px-5 text-center font-mono text-3xl font-black tracking-[0.22em] text-(--foreground) outline-none transition-all placeholder:text-(--foreground-subtle) hover:border-(--border-strong) focus:border-violet-400/40 focus:bg-(--surface) focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-4xl"
                    />

                    <div
                      className={[
                        "pointer-events-none absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl transition-all",
                        isCodeReady
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-(--surface) text-(--foreground-subtle)",
                      ].join(" ")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>

                  <p className="mt-3 text-center text-[10px] leading-5 text-(--foreground-subtle)">
                    Use the 4–8 character code shown on your
                    faculty&apos;s classroom screen.
                  </p>
                </label>

                {error && (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
                      <ArrowLeft className="h-4 w-4 rotate-180 text-rose-300" />
                    </div>

                    <div>
                      <p className="text-xs font-black text-rose-300">
                        Could not join
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-rose-300/80">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="group mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60"
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

                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-(--foreground-subtle)">
                  or
                </span>

                <div className="h-px flex-1 bg-(--border)" />
              </div>

              {/* QR */}
              <button
                type="button"
                onClick={
                  openScanner
                }
                disabled={
                  loading
                }
                className="group flex w-full items-center gap-4 rounded-2xl border border-(--border) bg-(--background-soft) p-4 text-left transition-all hover:-translate-y-0.5 hover:border-violet-400/25 hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <span className="absolute inset-0 rounded-2xl bg-violet-400/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                  <ScanLine className="relative z-10 h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black">
                      Scan classroom QR
                    </p>

                    <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-300">
                      Faster
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] leading-5 text-(--foreground-muted)">
                    Use your phone camera to scan the QR shown by
                    your faculty.
                  </p>
                </div>

                <ArrowRight className="h-5 w-5 shrink-0 text-(--foreground-subtle) transition-all group-hover:translate-x-1 group-hover:text-violet-300" />
              </button>
            </div>
          </section>

          {/* SIDEBAR */}
          <aside className="space-y-4">
            <div className="surface rounded-[2rem] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <Clock3 className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                    What happens next
                  </p>

                  <h2 className="mt-1 text-base font-black">
                    Three simple steps
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Step
                  number="01"
                  title="Enter or scan"
                  text="Use the code or scan your faculty's QR."
                />

                <Step
                  number="02"
                  title="Join"
                  text="PulseBoard opens the active classroom."
                />

                <Step
                  number="03"
                  title="Send your pulse"
                  text="Share how you are following the lesson."
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 via-violet-500/[0.04] to-indigo-500/5 p-5">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl"
              />

              <div className="relative z-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <Sparkles className="h-5 w-5" />
                </div>

                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
                  PulseBoard
                </p>

                <h3 className="mt-2 text-lg font-black">
                  Your feedback matters.
                </h3>

                <p className="mt-2 text-xs leading-6 text-(--foreground-muted)">
                  Once you join, your classroom signals stay quick,
                  simple, and focused on learning.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              <InfoCard
                icon={
                  <QrCode className="h-4 w-4" />
                }
                title="QR"
                text="Quick join"
              />

              <InfoCard
                icon={
                  <CheckCircle2 className="h-4 w-4" />
                }
                title="Live"
                text="Real-time"
              />

              <InfoCard
                icon={
                  <Zap className="h-4 w-4" />
                }
                title="Pulse"
                text="One tap"
              />
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="mx-auto mt-6 flex max-w-5xl flex-col gap-2 border-t border-(--border) pt-5 text-[9px] text-(--foreground-subtle) sm:flex-row sm:items-center sm:justify-between">
          <span>
            PulseBoard student join
          </span>

          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Classroom access is tied to an active session.
          </span>
        </footer>
      </div>
    </main>
  )
}

function JoinBadge({
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

function Step({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-[9px] font-black text-violet-300">
        {number}
      </span>

      <div>
        <p className="text-xs font-black">
          {title}
        </p>

        <p className="mt-1 text-[10px] leading-5 text-(--foreground-muted)">
          {text}
        </p>
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-(--border) bg-(--surface) p-4 transition hover:border-(--border-strong)">
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