"use client"

import {
  ArrowRight,
  Check,
  GraduationCap,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react"

import {
  useEffect,
  useState,
  type ReactNode,
} from "react"

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth"

import {
  doc,
  getDoc,
} from "firebase/firestore"

import {
  useRouter,
} from "next/navigation"

import ThemeToggle from "@/app/components/ThemeToggle"

import {
  auth,
  db,
} from "@/lib/firebase"

type Role =
  | "faculty"
  | "student"

type FirebaseAuthError = {
  code?: string
}

export default function LoginPage() {
  const router =
    useRouter()

  const [
    selectedRole,
    setSelectedRole,
  ] = useState<Role | null>(
    null
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    signingIn,
    setSigningIn,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState("")

  /*
   * Restore existing authentication.
   */
  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          currentUser
        ) => {
          if (!currentUser) {
            setLoading(false)
            return
          }

          try {
            const profileSnapshot =
              await getDoc(
                doc(
                  db,
                  "users",
                  currentUser.uid
                )
              )

            if (
              !profileSnapshot.exists()
            ) {
              /*
               * User is authenticated but has not
               * completed their PulseBoard profile yet.
               *
               * Keep them on login so they can choose
               * Faculty or Student.
               */
              setLoading(false)
              return
            }

            const data =
              profileSnapshot.data()

            const role =
              data.role ===
                "faculty" ||
              data.role ===
                "admin"
                ? "faculty"
                : data.role ===
                    "student"
                  ? "student"
                  : null

            if (!role) {
              setLoading(false)
              return
            }

            const profileCompleted =
              data.profileCompleted ===
              true

            if (
              !profileCompleted
            ) {
              router.replace(
                `/profile/setup?role=${role}`
              )

              return
            }

            router.replace(
              role ===
                "faculty"
                ? "/admin/dashboard"
                : "/student"
            )
          } catch (
            authError
          ) {
            console.error(
              "Failed to restore session:",
              authError
            )

            setError(
              "We could not restore your account. Please sign in again."
            )

            setLoading(false)
          }
        }
      )

    return unsubscribe
  }, [router])

  /*
   * Google sign-in.
   */
  const handleGoogleSignIn =
    async () => {
      if (signingIn) {
        return
      }

      if (!selectedRole) {
        setError(
          "Please choose Faculty or Student before continuing."
        )

        return
      }

      setSigningIn(true)
      setError("")

      try {
        const provider =
          new GoogleAuthProvider()

        provider.setCustomParameters(
          {
            prompt:
              "select_account",
          }
        )

        const result =
          await signInWithPopup(
            auth,
            provider
          )

        const firebaseUser =
          result.user

        if (!firebaseUser) {
          throw new Error(
            "Google authentication returned no user."
          )
        }

        const profileSnapshot =
          await getDoc(
            doc(
              db,
              "users",
              firebaseUser.uid
            )
          )

        /*
         * New user:
         * Use the role selected on the login page.
         */
        if (
          !profileSnapshot.exists()
        ) {
          router.push(
            `/profile/setup?role=${selectedRole}&newUser=true`
          )

          return
        }

        const data =
          profileSnapshot.data()

        const existingRole:
          Role | null =
          data.role ===
              "faculty" ||
            data.role ===
              "admin"
            ? "faculty"
            : data.role ===
                "student"
              ? "student"
              : null

        /*
         * Existing account without a valid role.
         *
         * Use the user's selected role.
         */
        if (
          !existingRole
        ) {
          router.push(
            `/profile/setup?role=${selectedRole}&newUser=true`
          )

          return
        }

        /*
         * Existing account:
         * Always respect the role already stored
         * in Firestore.
         */
        if (
          data.profileCompleted !==
          true
        ) {
          router.push(
            `/profile/setup?role=${existingRole}`
          )

          return
        }

        router.push(
          existingRole ===
            "faculty"
            ? "/admin/dashboard"
            : "/student"
        )
      } catch (
        signInError: unknown
      ) {
        const firebaseError =
          signInError as FirebaseAuthError

        switch (
          firebaseError.code
        ) {
          case "auth/popup-closed-by-user":
            return

          case "auth/popup-blocked":
            setError(
              "Your browser blocked the Google sign-in window. Please allow pop-ups and try again."
            )
            break

          case "auth/unauthorized-domain":
            setError(
              "This domain is not authorized in Firebase Authentication."
            )
            break

          case "auth/operation-not-allowed":
            setError(
              "Google Sign-In is not enabled in Firebase Authentication."
            )
            break

          default:
            setError(
              "Google sign-in failed. Please try again."
            )
        }
      } finally {
        setSigningIn(false)
      }
    }

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-5">
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div
            aria-hidden="true"
            className="absolute h-40 w-40 rounded-full bg-violet-500/10 blur-3xl"
          />

          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10">
            <Zap className="h-7 w-7 animate-pulse" />
          </div>

          <div>
            <p className="text-sm font-black">
              Preparing your workspace...
            </p>

            <p className="mt-1 text-[10px] text-(--foreground-subtle)">
              Checking your PulseBoard account
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.08fr_0.92fr]">

        {/* =====================================================
            BRAND PANEL
        ===================================================== */}

        <section className="relative hidden overflow-hidden border-r border-(--border) lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-10 xl:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 top-16 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-[130px]"
          />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-violet-500/20">
              <Zap className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black tracking-tight">
                PulseBoard
              </p>

              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-(--foreground-muted)">
                Classroom intelligence
              </p>
            </div>
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome to PulseBoard
            </div>

            <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-[-0.05em] xl:text-6xl">
              See the room.
              <br />

              <span className="gradient-text">
                Understand the class.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-(--foreground-muted)">
              PulseBoard gives faculty a real-time view of how
              students are following the lesson, while keeping the
              student experience quick and simple.
            </p>

            <div className="mt-9 grid gap-3 xl:grid-cols-3">
              <LoginBenefit
                icon={
                  <Zap className="h-4 w-4" />
                }
                title="Live pulse"
                description="See classroom understanding in real time."
              />

              <LoginBenefit
                icon={
                  <Users className="h-4 w-4" />
                }
                title="One tap"
                description="Students respond without interrupting learning."
              />

              <LoginBenefit
                icon={
                  <ShieldCheck className="h-4 w-4" />
                }
                title="Focused"
                description="Designed around classroom feedback."
              />
            </div>
          </div>

          <p className="relative z-10 text-[10px] text-(--foreground-subtle)">
            Real-time learning intelligence for modern classrooms.
          </p>
        </section>

        {/* =====================================================
            LOGIN PANEL
        ===================================================== */}

        <section className="relative flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-10 xl:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-500/5 blur-3xl"
          />

          <header className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                <Zap className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-black">
                  PulseBoard
                </p>

                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-(--foreground-muted)">
                  Classroom intelligence
                </p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />

              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                aria-label="Go back"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-(--border) bg-(--surface) text-(--foreground-muted) shadow-(--shadow-sm) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 items-center py-10 sm:py-14">
            <div className="w-full">

              {/* Heading */}
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure sign in
                </div>

                <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Get started.
                </h2>

                <p className="mt-3 text-sm leading-7 text-(--foreground-muted)">
                  First choose how you use PulseBoard, then continue
                  with your Google account.
                </p>
              </div>

              {/* =================================================
                  ROLE SELECTOR
              ================================================= */}

              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-(--foreground-subtle)">
                  I am a
                </p>

                <div className="grid gap-3 sm:grid-cols-2">

                  {/* Faculty */}
                  <RoleSelector
                    selected={
                      selectedRole ===
                      "faculty"
                    }
                    title="Faculty"
                    description="Create sessions & view classroom insights."
                    icon={
                      <GraduationCap className="h-5 w-5" />
                    }
                    onClick={() => {
                      setSelectedRole(
                        "faculty"
                      )
                      setError("")
                    }}
                  />

                  {/* Student */}
                  <RoleSelector
                    selected={
                      selectedRole ===
                      "student"
                    }
                    title="Student"
                    description="Join sessions & send live feedback."
                    icon={
                      <Users className="h-5 w-5" />
                    }
                    onClick={() => {
                      setSelectedRole(
                        "student"
                      )
                      setError("")
                    }}
                  />

                </div>
              </div>

              {/* Selected role */}
              {selectedRole && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-400/10 bg-violet-500/5 px-3 py-2.5">
                  <Check className="h-4 w-4 text-violet-300" />

                  <p className="text-[10px] font-bold text-violet-200">
                    Continuing as{" "}
                    <span className="font-black">
                      {selectedRole ===
                      "faculty"
                        ? "Faculty"
                        : "Student"}
                    </span>
                  </p>
                </div>
              )}

              {/* =================================================
                  GOOGLE BUTTON
              ================================================= */}

              <button
                type="button"
                onClick={
                  handleGoogleSignIn
                }
                disabled={
                  signingIn ||
                  !selectedRole
                }
                className="group relative mt-5 flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-(--border-strong) bg-(--surface) px-5 text-sm font-black text-(--foreground) shadow-(--shadow-sm) transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-(--surface-hover) hover:shadow-(--shadow-md) disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                {signingIn ? (
                  <Loader2 className="relative z-10 h-5 w-5 animate-spin text-violet-400" />
                ) : (
                  <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                    <GoogleIcon />
                  </span>
                )}

                <span className="relative z-10">
                  {signingIn
                    ? "Signing you in..."
                    : selectedRole
                      ? "Continue with Google"
                      : "Choose your role first"}
                </span>

                {!signingIn && (
                  <ArrowRight className="relative z-10 ml-auto h-4 w-4 text-(--foreground-muted) transition-transform duration-200 group-hover:translate-x-1 group-hover:text-violet-300" />
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                    <X className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-black text-rose-300">
                      Sign-in issue
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-rose-300/80">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-(--border)" />

                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-(--foreground-subtle)">
                  One account
                </span>

                <div className="h-px flex-1 bg-(--border)" />
              </div>

              {/* Trust */}
              <div className="rounded-2xl border border-(--border) bg-(--background-soft) p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-black">
                      Simple and secure
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-(--foreground-muted)">
                      New users complete their profile after the first
                      Google sign-in. Existing users continue with the
                      role already saved to their account.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-7 text-center text-[10px] leading-5 text-(--foreground-subtle)">
                Choose Faculty or Student before signing in.
              </p>
            </div>
          </div>

          <footer className="relative z-10 py-2 text-center text-[9px] text-(--foreground-subtle)">
            PulseBoard · Real-time classroom intelligence
          </footer>
        </section>
      </div>
    </main>
  )
}

function RoleSelector({
  selected,
  title,
  description,
  icon,
  onClick,
}: {
  selected: boolean
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200",
        selected
          ? "border-violet-400/40 bg-violet-500/10 shadow-lg shadow-violet-500/10"
          : "border-(--border) bg-(--surface) hover:-translate-y-0.5 hover:border-(--border-strong) hover:bg-(--surface-hover)",
      ].join(" ")}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-white"
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      )}

      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
          selected
            ? "bg-violet-500/15 text-violet-200"
            : "bg-violet-500/10 text-violet-300",
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm font-black">
        {title}
      </p>

      <p className="mt-1 pr-4 text-[10px] leading-5 text-(--foreground-muted)">
        {description}
      </p>
    </button>
  )
}

function LoginBenefit({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-(--border) bg-(--surface)/40 p-3 backdrop-blur-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <div>
        <p className="text-xs font-black">
          {title}
        </p>

        <p className="mt-1 text-[10px] leading-4 text-(--foreground-muted)">
          {description}
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />

      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />

      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />

      <path
        fill="#EA4335"
        d="M9 3.583c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.583 9 3.583z"
      />
    </svg>
  )
}