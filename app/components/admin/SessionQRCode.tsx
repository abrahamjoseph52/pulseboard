"use client"

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Maximize2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react"

import {
  useState,
  type ReactNode,
} from "react"

import {
  QRCodeSVG,
} from "qrcode.react"

export type SessionQRCodeProps = {
  joinCode: string
  sessionId: string
  title: string
}

export default function SessionQRCode({
  joinCode,
  sessionId,
  title,
}: SessionQRCodeProps) {
  const [copied, setCopied] =
    useState(false)

  const safeJoinCode =
    String(
      joinCode ?? ""
    )
      .trim()
      .toUpperCase()

  const encodedCode =
    encodeURIComponent(
      safeJoinCode
    )

  const getJoinUrl = () => {
    if (
      typeof window ===
      "undefined"
    ) {
      return `/student/join?code=${encodedCode}`
    }

    return `${window.location.origin}/student/join?code=${encodedCode}`
  }

  const joinUrl =
    getJoinUrl()

  const qrId =
    `pulseboard-qr-${sessionId}`

  const handleCopy =
    async () => {
      try {
        await navigator.clipboard.writeText(
          joinUrl
        )

        setCopied(true)

        window.setTimeout(
          () => {
            setCopied(false)
          },
          1800
        )
      } catch (
        error
      ) {
        console.error(
          "Failed to copy session link:",
          error
        )
      }
    }

  const handleDownload =
    () => {
      const element =
        document.getElementById(
          qrId
        )

      if (!element) {
        console.error(
          "PulseBoard QR element was not found."
        )

        return
      }

      if (
        !(
          element instanceof
          SVGSVGElement
        )
      ) {
        console.error(
          "PulseBoard QR element is not an SVG."
        )

        return
      }

      const serializer =
        new XMLSerializer()

      const svgString =
        serializer.serializeToString(
          element
        )

      const blob =
        new Blob(
          [svgString],
          {
            type:
              "image/svg+xml;charset=utf-8",
          }
        )

      const url =
        URL.createObjectURL(
          blob
        )

      const link =
        document.createElement(
          "a"
        )

      link.href = url

      link.download =
        `pulseboard-${safeJoinCode || "session"}.svg`

      document.body.appendChild(
        link
      )

      link.click()

      document.body.removeChild(
        link
      )

      URL.revokeObjectURL(
        url
      )
    }

  const handleFullscreen =
    () => {
      const element =
        document.getElementById(
          qrId
        )

      if (!element) {
        return
      }

      const container =
        element.parentElement

      if (
        !container ||
        typeof container.requestFullscreen !==
          "function"
      ) {
        return
      }

      void container.requestFullscreen()
    }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/[0.12] via-(--surface) to-indigo-500/[0.07] shadow-(--shadow-md)">
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"
      />

      <div className="relative z-10 p-5 sm:p-7 lg:p-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
              <QrCode className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/10 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                  <QrCode className="h-3 w-3" />
                  Instant join
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>

              <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
                Let your class join instantly
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-(--foreground-muted)">
                Show this QR code on the classroom projector.
                Students can scan it and jump directly into your
                live PulseBoard session.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-2xl border border-(--border) bg-(--background-soft) px-3 py-2 sm:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />

            <span className="text-[9px] font-black uppercase tracking-wider text-(--foreground-subtle)">
              Classroom ready
            </span>
          </div>
        </div>

        {/* =====================================================
            MAIN
        ===================================================== */}

        <div className="mt-8 grid gap-7 xl:grid-cols-[320px_minmax(0,1fr)]">
          {/* QR DISPLAY */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-8 rounded-[3rem] bg-violet-500/10 blur-3xl"
              />

              <div
                id={`qr-container-${sessionId}`}
                className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white p-5 shadow-[0_25px_70px_rgba(0,0,0,0.3)] sm:p-6"
              >
                <QRCodeSVG
                  id={qrId}
                  value={
                    joinUrl
                  }
                  size={220}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#111827"
                  title={`${title} QR code`}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={
                  handleFullscreen
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 text-[10px] font-black text-(--foreground-secondary) transition-all hover:border-violet-400/20 hover:bg-(--surface-hover) hover:text-(--foreground)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Project QR
              </button>

              <button
                type="button"
                onClick={
                  handleDownload
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 text-[10px] font-black text-(--foreground-secondary) transition-all hover:border-violet-400/20 hover:bg-(--surface-hover) hover:text-(--foreground)"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>

            <p className="mt-3 text-center text-[9px] font-bold text-(--foreground-subtle)">
              High-contrast QR for easy classroom scanning
            </p>
          </div>

          {/* DETAILS */}
          <div className="min-w-0">
            <div className="rounded-[2rem] border border-(--border) bg-(--background-soft) p-5 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                Session access
              </p>

              <h3 className="mt-2 line-clamp-2 text-xl font-black">
                {title ||
                  "Live classroom session"}
              </h3>

              {/* Join code */}
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-(--foreground-subtle)">
                    Session code
                  </p>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[9px] font-black text-violet-300">
                    <RadioDot />
                    Active
                  </span>
                </div>

                <div className="mt-3 rounded-2xl border border-violet-400/10 bg-linear-to-br from-violet-500/10 to-indigo-500/5 p-4 sm:p-5">
                  <p className="font-mono text-3xl font-black tracking-[0.2em] text-violet-200 sm:text-4xl">
                    {safeJoinCode ||
                      "------"}
                  </p>

                  <p className="mt-2 text-[10px] font-medium text-(--foreground-muted)">
                    Students can enter this code manually if they
                    cannot scan the QR.
                  </p>
                </div>
              </div>

              {/* Quick info */}
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <InfoBox
                  icon={
                    <QrCode className="h-3.5 w-3.5" />
                  }
                  label="Join"
                  value="QR + Code"
                />

                <InfoBox
                  icon={
                    <Smartphone className="h-3.5 w-3.5" />
                  }
                  label="Device"
                  value="Phone"
                />

                <InfoBox
                  icon={
                    <Users className="h-3.5 w-3.5" />
                  }
                  label="Access"
                  value="Live"
                />
              </div>

              {/* Actions */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={
                    handleCopy
                  }
                  className={[
                    "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-xs font-black transition-all",
                    copied
                      ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/10"
                      : "bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25",
                  ].join(" ")}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Link copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy join link
                    </>
                  )}
                </button>

                <a
                  href={
                    joinUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-5 text-xs font-black text-(--foreground-secondary) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview join page
                </a>
              </div>
            </div>

            {/* Classroom instruction */}
            <div className="mt-4 rounded-[2rem] border border-(--border) bg-(--surface) p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <Smartphone className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-black">
                    Quick instruction for students
                  </p>

                  <p className="mt-2 text-xs leading-6 text-(--foreground-muted)">
                    Ask students to open their phone camera, scan the
                    QR code, and follow the PulseBoard join screen.
                    They can also use the 6-character code below the QR.
                  </p>
                </div>
              </div>
            </div>

            {/* URL */}
            <div className="mt-4 rounded-2xl border border-dashed border-(--border-strong) bg-(--background-soft) p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
                Join link
              </p>

              <p className="mt-2 break-all text-[10px] leading-5 text-(--foreground-muted)">
                {joinUrl}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-(--border) bg-(--surface) p-3">
      <div className="flex items-center gap-1.5 text-violet-300">
        {icon}

        <p className="truncate text-[8px] font-black uppercase tracking-[0.15em] text-(--foreground-subtle)">
          {label}
        </p>
      </div>

      <p className="mt-1.5 truncate text-xs font-black text-(--foreground-secondary)">
        {value}
      </p>
    </div>
  )
}

function RadioDot() {
  return (
    <span className="relative flex h-2 w-2 items-center justify-center">
      <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400/30" />
      <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
    </span>
  )
}