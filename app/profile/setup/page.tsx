"use client"

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  UserRound,
  Users,
  X,
} from "lucide-react"

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
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

export default function ProfileSetupPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell flex min-h-screen items-center justify-center px-5">
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div
              aria-hidden="true"
              className="absolute h-40 w-40 rounded-full bg-violet-500/10 blur-3xl"
            />

            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10">
              <UserRound className="h-6 w-6 animate-pulse" />
            </div>

            <div>
              <p className="text-sm font-black">
                Preparing your profile...
              </p>

              <p className="mt-1 text-xs text-(--foreground-muted)">
                Loading your PulseBoard profile
              </p>
            </div>
          </div>
        </main>
      }
    >
      <ProfileSetupContent />
    </Suspense>
  )
}

function ProfileSetupContent() {
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

  const [
    form,
    setForm,
  ] = useState<FormState>(
    initialForm
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState("")

  const roleLabel =
    useMemo(
      () =>
        role ===
        "faculty"
          ? "Faculty"
          : "Student",
      [role]
    )

  /*
   * Load profile.
   */
  useEffect(() => {
    let mounted = true

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

          if (!mounted) {
            return
          }

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

          if (!mounted) {
            return
          }

          setError(
            "Unable to load your profile. Please try again."
          )
        } finally {
          if (mounted) {
            setLoading(false)
          }
        }
      }

    void loadProfile()

    return () => {
      mounted = false
    }
  }, [router])

  const updateField =
    (
      field: keyof FormState,
      value: string
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,
          [field]:
            value,
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
        role ===
          "student" &&
        (
          !form.registerNumber.trim() ||
          !form.year.trim()
        )
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
              currentUser.email ||
              "",

            name:
              form.name.trim(),

            photoURL:
              currentUser.photoURL ||
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
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div
            aria-hidden="true"
            className="absolute h-40 w-40 rounded-full bg-violet-500/10 blur-3xl"
          />

          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/10 text-violet-300">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>

          <p className="text-sm font-bold text-(--foreground-muted)">
            Loading profile...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <p className="font-black tracking-tight">
                Complete your profile
              </p>

              <p className="text-xs text-(--foreground-muted)">
                One step before entering PulseBoard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/login"
                )
              }
              aria-label="Back to login"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--foreground-muted) transition hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <div className="mx-auto max-w-3xl py-12">

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300">
              {role ===
              "faculty" ? (
                <GraduationCap className="h-3.5 w-3.5" />
              ) : (
                <Users className="h-3.5 w-3.5" />
              )}

              {roleLabel.toUpperCase()} PROFILE
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
              Tell us a little about you.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
              This information personalizes your PulseBoard
              experience. You can update it later from your profile.
            </p>
          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="surface rounded-[2rem] p-5 sm:p-8"
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
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                  <X className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-black text-rose-300">
                    Profile issue
                  </p>

                  <p className="mt-1 text-xs leading-5 text-rose-300/80">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4 border-t border-(--border) pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-(--foreground-muted)">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Your profile is saved securely.
              </div>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to{" "}
                    {
                      roleLabel
                    }

                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
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
  icon: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-(--foreground-secondary)">
        {icon}
        {label}
      </span>

      <input
        value={
          value
        }
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
        className="h-12 w-full rounded-xl border border-(--border) bg-(--background-soft) px-4 text-sm text-(--foreground) outline-none transition placeholder:text-(--foreground-subtle) focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
      />
    </label>
  )
}