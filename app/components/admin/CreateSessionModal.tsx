"use client"

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  QrCode,
  Sparkles,
  X,
} from "lucide-react"

import {
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type CreateSessionData = {
  title: string
  courseCode: string
  joinCode: string
}

type CreateSessionModalProps = {
  open: boolean
  onClose: () => void
  onCreate: (
    data: CreateSessionData
  ) => Promise<void> | void
}

export default function CreateSessionModal({
  open,
  onClose,
  onCreate,
}: CreateSessionModalProps) {
  const [title, setTitle] =
    useState("")

  const [courseCode, setCourseCode] =
    useState("")

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState("")

  /*
   * Escape key support.
   *
   * This effect only subscribes to a browser event.
   * It does not synchronously update React state.
   */
  useEffect(() => {
    if (!open) {
      return
    }

    const handleEscape =
      (event: KeyboardEvent) => {
        if (
          event.key === "Escape" &&
          !loading
        ) {
          onClose()
        }
      }

    window.addEventListener(
      "keydown",
      handleEscape
    )

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      )
    }
  }, [
    open,
    loading,
    onClose,
  ])

  if (!open) {
    return null
  }

  const handleTitleChange =
    (value: string) => {
      setTitle(value)

      if (error) {
        setError("")
      }
    }

  const handleCourseCodeChange =
    (value: string) => {
      setCourseCode(value)

      if (error) {
        setError("")
      }
    }

  const resetForm = () => {
    setTitle("")
    setCourseCode("")
    setError("")
    setLoading(false)
  }

  const handleClose = () => {
    if (loading) {
      return
    }

    resetForm()
    onClose()
  }

  const generateJoinCode =
    () => {
      const alphabet =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

      let code = ""

      for (
        let index = 0;
        index < 6;
        index += 1
      ) {
        code += alphabet.charAt(
          Math.floor(
            Math.random() *
              alphabet.length
          )
        )
      }

      return code
    }

  const handleSubmit =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault()

      if (loading) {
        return
      }

      setError("")

      const cleanTitle =
        title.trim()

      const cleanCourseCode =
        courseCode
          .trim()
          .toUpperCase()

      if (!cleanTitle) {
        setError(
          "Please enter the session title."
        )

        return
      }

      if (
        cleanTitle.length <
        3
      ) {
        setError(
          "Session title should be at least 3 characters."
        )

        return
      }

      if (!cleanCourseCode) {
        setError(
          "Please enter the course code."
        )

        return
      }

      if (
        cleanCourseCode.length <
        2
      ) {
        setError(
          "Please enter a valid course code."
        )

        return
      }

      try {
        setLoading(true)

        await onCreate({
          title:
            cleanTitle,

          courseCode:
            cleanCourseCode,

          joinCode:
            generateJoinCode(),
        })

        resetForm()
      } catch (
        createError
      ) {
        console.error(
          "Failed to create session:",
          createError
        )

        setError(
          createError instanceof
            Error
            ? createError.message
            : "Unable to create the session."
        )

        setLoading(false)
      }
    }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-session-title"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleClose()
        }
      }}
    >
      <div className="relative my-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-(--border-strong) bg-(--surface) shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        {/* Decorative glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-indigo-500/10 blur-3xl"
        />

        {/* Header */}
        <div className="relative z-10 border-b border-(--border) p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                <Plus className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/10 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                    <GraduationCap className="h-3 w-3" />
                    Faculty
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Ready
                  </span>
                </div>

                <h2
                  id="create-session-title"
                  className="mt-3 text-xl font-black tracking-tight sm:text-2xl"
                >
                  Create a live session
                </h2>

                <p className="mt-2 max-w-md text-xs leading-6 text-(--foreground-muted) sm:text-sm">
                  Start a classroom pulse, generate a unique join
                  code, and share the QR code with your students.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleClose
              }
              disabled={
                loading
              }
              aria-label="Close create session dialog"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--background-soft) text-(--foreground-muted) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground) disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={
            handleSubmit
          }
          className="relative z-10 p-5 sm:p-7"
        >
          <div className="grid gap-5">
            <Field
              label="Session title"
              hint="Give this classroom pulse a clear topic."
              placeholder="e.g. Linked Lists — Introduction"
              value={
                title
              }
              onChange={
                handleTitleChange
              }
              icon={
                <FileText className="h-4 w-4" />
              }
              disabled={
                loading
              }
              autoFocus
            />

            <Field
              label="Course code"
              hint="Use the course code students already know."
              placeholder="e.g. CS301"
              value={
                courseCode
              }
              onChange={
                handleCourseCodeChange
              }
              icon={
                <BookOpen className="h-4 w-4" />
              }
              disabled={
                loading
              }
              maxLength={
                20
              }
            />
          </div>

          {/* Join flow */}
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-violet-500/15 bg-linear-to-br from-violet-500/[0.08] to-indigo-500/[0.05] p-4 sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl"
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
                    Student join flow
                  </p>

                  <p className="mt-1 text-xs font-bold text-(--foreground-secondary)">
                    Everything is generated automatically.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MiniStep
                  number="01"
                  icon={
                    <Plus className="h-3.5 w-3.5" />
                  }
                  text="Create"
                />

                <MiniStep
                  number="02"
                  icon={
                    <ZapIcon />
                  }
                  text="Generate code"
                />

                <MiniStep
                  number="03"
                  icon={
                    <QrCode className="h-3.5 w-3.5" />
                  }
                  text="Show QR"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                <X className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-black text-rose-300">
                  Could not create the session
                </p>

                <p className="mt-1 text-[11px] leading-5 text-rose-300/80">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-(--border) pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                handleClose
              }
              disabled={
                loading
              }
              className="h-11 rounded-2xl border border-(--border) bg-(--background-soft) px-5 text-xs font-bold text-(--foreground-secondary) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground) disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading
              }
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating session...
                </>
              ) : (
                <>
                  Start session

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[9px] font-bold text-(--foreground-subtle)">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />

            A unique 6-character join code will be generated.
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  placeholder,
  value,
  onChange,
  icon,
  disabled,
  autoFocus = false,
  maxLength,
}: {
  label: string
  hint: string
  placeholder: string
  value: string
  onChange: (
    value: string
  ) => void
  icon: ReactNode
  disabled: boolean
  autoFocus?: boolean
  maxLength?: number
}) {
  return (
    <label className="group block">
      <span className="mb-2 flex items-center gap-2 text-xs font-black text-(--foreground-secondary)">
        <span className="text-violet-300 transition-transform duration-200 group-focus-within:scale-110">
          {icon}
        </span>

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
        disabled={
          disabled
        }
        autoFocus={
          autoFocus
        }
        maxLength={
          maxLength
        }
        className="h-13 w-full rounded-2xl border border-(--border) bg-(--background-soft) px-4 text-sm font-semibold text-(--foreground) outline-none transition-all placeholder:text-(--foreground-subtle) hover:border-(--border-strong) focus:border-violet-400/40 focus:bg-(--surface) focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <p className="mt-2 text-[10px] leading-4 text-(--foreground-subtle)">
        {hint}
      </p>
    </label>
  )
}

function MiniStep({
  number,
  icon,
  text,
}: {
  number: string
  icon: ReactNode
  text: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-(--border) bg-(--background-soft) p-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
        {icon}
      </span>

      <div className="min-w-0">
        <span className="block text-[8px] font-black tracking-wider text-(--foreground-subtle)">
          {number}
        </span>

        <p className="mt-0.5 truncate text-[10px] font-black text-(--foreground-secondary)">
          {text}
        </p>
      </div>
    </div>
  )
}

function ZapIcon() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute h-3 w-3 animate-ping rounded-full bg-violet-400/15" />

      <span className="relative flex h-1.5 w-1.5 rounded-full bg-violet-300" />
    </span>
  )
}