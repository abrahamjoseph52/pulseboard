"use client"

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react"

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  useRouter,
  useSearchParams,
} from "next/navigation"

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"

import ThemeToggle from "@/app/components/ThemeToggle"

import {
  auth,
  db,
} from "@/lib/firebase"

type ProfileRole =
  | "faculty"
  | "student"

type FormState = {
  name: string
  institution: string
  department: string
  designation: string
  registerNumber: string
  year: string
  section: string
}

const initialForm: FormState = {
  name: "",
  institution: "",
  department: "",
  designation: "",
  registerNumber: "",
  year: "",
  section: "",
}

function getProfileCompletion(
  form: FormState,
  role: ProfileRole
) {
  const requiredFields =
    role === "faculty"
      ? [
          form.name,
          form.institution,
          form.department,
        ]
      : [
          form.name,
          form.institution,
          form.department,
          form.registerNumber,
          form.year,
        ]

  const completed =
    requiredFields.filter(
      (value) =>
        value.trim().length > 0
    ).length

  return Math.round(
    (completed /
      requiredFields.length) *
      100
  )
}

export default function ProfileSetupPage() {
  const router =
    useRouter()

  const searchParams =
    useSearchParams()

  const requestedRole =
    searchParams.get(
      "role"
    )

  const role: ProfileRole =
    requestedRole ===
    "student"
      ? "student"
      : "faculty"

  const [form, setForm] =
    useState<FormState>(
      initialForm
    )

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState("")

  const roleLabel =
    useMemo(
      () =>
        role === "faculty"
          ? "Faculty"
          : "Student",
      [role]
    )

  const roleDescription =
    role === "faculty"
      ? "Set up your teaching identity and classroom workspace."
      : "Set up your student identity and academic details."

  const roleIcon =
    role === "faculty"
      ? (
          <GraduationCap className="h-5 w-5" />
        )
      : (
          <Users className="h-5 w-5" />
        )

  const completion =
    useMemo(
      () =>
        getProfileCompletion(
          form,
          role
        ),
      [form, role]
    )

  useEffect(() => {
    const loadProfile =
      async () => {
        const currentUser =
          auth.currentUser

        if (!currentUser) {
          router.replace(
            "/login"
          )

          return
        }

        try {
          const snapshot =
            await getDoc(
              doc(
                db,
                "users",
                currentUser.uid
              )
            )

          const data =
            snapshot.exists()
              ? snapshot.data()
              : {}

          setForm({
            name:
              typeof data.name ===
              "string"
                ? data.name
                : currentUser.displayName ||
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

            designation:
              typeof data.designation ===
              "string"
                ? data.designation
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
        } catch (
          profileError
        ) {
          console.error(
            "Failed to load profile:",
            profileError
          )

          setError(
            "Unable to load your profile. Please try again."
          )
        } finally {
          setLoading(false)
        }
      }

    void loadProfile()
  }, [router])

  const updateField = (
    field: keyof FormState,
    value: string
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    )
  }

  const handleSubmit =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault()

      const currentUser =
        auth.currentUser

      if (!currentUser) {
        router.replace(
          "/login"
        )

        return
      }

      setError("")

      if (
        !form.name.trim() ||
        !form.institution.trim() ||
        !form.department.trim()
      ) {
        setError(
          "Please complete your name, institution, and department."
        )

        return
      }

      if (
        role === "student" &&
        (!form.registerNumber.trim() ||
          !form.year.trim())
      ) {
        setError(
          "Students must provide their register number and year."
        )

        return
      }

      try {
        setSaving(true)

        await setDoc(
          doc(
            db,
            "users",
            currentUser.uid
          ),
          {
            uid:
              currentUser.uid,

            email:
              currentUser.email ??
              "",

            name:
              form.name.trim(),

            photoURL:
              currentUser.photoURL ??
              "",

            role,

            institution:
              form.institution.trim(),

            department:
              form.department.trim(),

            designation:
              role ===
              "faculty"
                ? form.designation.trim()
                : "",

            registerNumber:
              role ===
              "student"
                ? form.registerNumber.trim()
                : "",

            year:
              role ===
              "student"
                ? form.year.trim()
                : "",

            section:
              role ===
              "student"
                ? form.section.trim()
                : "",

            profileCompleted:
              true,

            updatedAt:
              serverTimestamp(),

            createdAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        )

        router.replace(
          role ===
            "faculty"
            ? "/admin/dashboard"
            : "/student"
        )
      } catch (
        saveError
      ) {
        console.error(
          "Failed to save profile:",
          saveError
        )

        setError(
          "We couldn't save your profile. Please try again."
        )

        setSaving(false)
      }
    }

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-5">
        <div className="relative flex flex-col items-center gap-4">
          <div
            aria-hidden="true"
            className="absolute h-32 w-32 rounded-full bg-violet-500/10 blur-3xl"
          />

          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>

          <p className="text-sm font-bold text-(--foreground-muted)">
            Loading your profile...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                role ===
                  "faculty"
                  ? "/admin/dashboard"
                  : "/student"
              )
            }
            className="group inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) shadow-(--shadow-xs) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/login"
                )
              }
              aria-label="Close profile setup"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-(--border) bg-(--surface) text-(--foreground-muted) shadow-(--shadow-xs) transition hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                {roleIcon}

                {roleLabel} profile
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Tell us a little
                <span className="gradient-text">
                  {" "}
                  about you.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                {roleDescription} You can
                update these details later from
                your profile.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <ProfileBadge
                  icon={
                    <ShieldCheck className="h-3.5 w-3.5" />
                  }
                  text="Secure profile"
                />

                <ProfileBadge
                  icon={
                    <Sparkles className="h-3.5 w-3.5" />
                  }
                  text="Personalized workspace"
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-violet-400/10 bg-violet-500/5">
                <div className="absolute inset-4 rounded-full border border-violet-400/10" />

                <div className="absolute inset-10 rounded-full border border-indigo-400/10" />

                <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-linear-to-br from-violet-500 via-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  {role ===
                  "faculty" ? (
                    <GraduationCap className="h-10 w-10" />
                  ) : (
                    <Users className="h-10 w-10" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            MAIN GRID
        ===================================================== */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Form */}
          <section className="surface overflow-hidden rounded-[2rem]">
            <div className="border-b border-(--border) bg-linear-to-r from-violet-500/[0.04] to-transparent p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                    Personal details
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Build your PulseBoard identity
                  </h2>
                </div>
              </div>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="p-5 sm:p-7"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <ProfileInput
                  label="Full name"
                  value={
                    form.name
                  }
                  placeholder="Your full name"
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "name",
                      value
                    )
                  }
                  icon={
                    <UserRound className="h-4 w-4" />
                  }
                  required
                />

                <ProfileInput
                  label="Institution"
                  value={
                    form.institution
                  }
                  placeholder="College / University"
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "institution",
                      value
                    )
                  }
                  icon={
                    <Building2 className="h-4 w-4" />
                  }
                  required
                />

                <ProfileInput
                  label="Department"
                  value={
                    form.department
                  }
                  placeholder="Computer Science"
                  onChange={(
                    value
                  ) =>
                    updateField(
                      "department",
                      value
                    )
                  }
                  icon={
                    <Building2 className="h-4 w-4" />
                  }
                  required
                />

                {role ===
                "faculty" ? (
                  <ProfileInput
                    label="Designation"
                    value={
                      form.designation
                    }
                    placeholder="Professor / Lecturer / TA"
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "designation",
                        value
                      )
                    }
                    icon={
                      <GraduationCap className="h-4 w-4" />
                    }
                  />
                ) : (
                  <ProfileInput
                    label="Register number"
                    value={
                      form.registerNumber
                    }
                    placeholder="Your register number"
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "registerNumber",
                        value
                      )
                    }
                    icon={
                      <UserRound className="h-4 w-4" />
                    }
                    required
                  />
                )}

                {role ===
                  "student" && (
                  <>
                    <ProfileInput
                      label="Year"
                      value={
                        form.year
                      }
                      placeholder="e.g. 2nd Year"
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "year",
                          value
                        )
                      }
                      icon={
                        <GraduationCap className="h-4 w-4" />
                      }
                      required
                    />

                    <ProfileInput
                      label="Section"
                      value={
                        form.section
                      }
                      placeholder="e.g. A"
                      onChange={(
                        value
                      ) =>
                        updateField(
                          "section",
                          value
                        )
                      }
                      icon={
                        <Users className="h-4 w-4" />
                      }
                    />
                  </>
                )}
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] px-4 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
                    <X className="h-4 w-4 text-rose-300" />
                  </div>

                  <div>
                    <p className="text-xs font-black text-rose-300">
                      Profile could not be saved
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-rose-300/80">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8 border-t border-(--border) pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                      <p className="text-xs font-bold text-(--foreground-secondary)">
                        Profile completion
                      </p>

                      <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-black text-violet-300">
                        {completion}%
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-(--surface-hover) sm:w-64">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-violet-500 to-indigo-400 transition-[width] duration-500"
                        style={{
                          width:
                            `${completion}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-[10px] text-(--foreground-subtle)">
                      Your required details are almost ready.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-6 text-sm font-black text-white shadow-xl shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue to{" "}
                        {roleLabel}

                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="surface rounded-[2rem] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
                    Why this matters
                  </p>

                  <h2 className="mt-1 text-base font-black">
                    A better workspace
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <ProfileBenefit
                  icon={
                    <UserRound className="h-4 w-4" />
                  }
                  title="Personalized"
                  text="Your name and academic details appear in your workspace."
                />

                <ProfileBenefit
                  icon={
                    <Building2 className="h-4 w-4" />
                  }
                  title="Context-aware"
                  text="Keep institution and department information attached to your account."
                />

                <ProfileBenefit
                  icon={
                    <ShieldCheck className="h-4 w-4" />
                  }
                  title="Secure"
                  text="Your profile is stored in your PulseBoard Firebase account."
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
                  {role ===
                  "faculty" ? (
                    <GraduationCap className="h-5 w-5" />
                  ) : (
                    <Users className="h-5 w-5" />
                  )}
                </div>

                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                  Workspace type
                </p>

                <h3 className="mt-2 text-lg font-black">
                  {roleLabel}
                </h3>

                <p className="mt-2 text-xs leading-5 text-(--foreground-muted)">
                  {role ===
                  "faculty"
                    ? "Your profile will connect to classroom creation, live pulses, and teaching analytics."
                    : "Your profile will connect to classroom joining, live feedback, and your student workspace."}
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-6 flex flex-col gap-2 border-t border-(--border) pt-5 text-[10px] text-(--foreground-subtle) sm:flex-row sm:items-center sm:justify-between">
          <span>
            PulseBoard profile setup
          </span>

          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Your information is used to personalize your workspace.
          </span>
        </footer>
      </div>
    </main>
  )
}

function ProfileInput({
  label,
  value,
  placeholder,
  onChange,
  icon,
  required = false,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (
    value: string
  ) => void
  icon: ReactNode
  required?: boolean
}) {
  return (
    <label className="group block">
      <span className="mb-2 flex items-center gap-2 text-xs font-black text-(--foreground-secondary)">
        <span className="text-violet-300 transition-transform duration-200 group-focus-within:scale-110">
          {icon}
        </span>

        {label}

        {required && (
          <span className="text-rose-300">
            *
          </span>
        )}
      </span>

      <input
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
        className="h-12 w-full rounded-2xl border border-(--border) bg-(--background-soft) px-4 text-sm font-semibold text-(--foreground) outline-none transition-all placeholder:text-(--foreground-subtle) hover:border-(--border-strong) focus:border-violet-400/40 focus:bg-(--surface) focus:ring-4 focus:ring-violet-500/10"
      />
    </label>
  )
}

function ProfileBadge({
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

function ProfileBenefit({
  icon,
  title,
  text,
}: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <div>
        <p className="text-xs font-black">
          {title}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-(--foreground-muted)">
          {text}
        </p>
      </div>
    </div>
  )
}