"use client"

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  QrCode,
} from "lucide-react"

import { useState } from "react"

import { QRCodeSVG } from "qrcode.react"

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
    String(joinCode ?? "")
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
      } catch (error) {
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
        !(element instanceof
          SVGSVGElement)
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

  return (
    <section className="overflow-hidden rounded-[2rem] border border-violet-500/15 bg-linear-to-br from-violet-500/10 via-(--surface) to-indigo-500/5 shadow-(--shadow-sm)">
      <div className="p-5 sm:p-6 lg:p-7">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <QrCode className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                Instant join
              </p>

              <h2 className="mt-1 text-lg font-black sm:text-xl">
                Students can scan
              </h2>
            </div>
          </div>

          <span className="rounded-full border border-emerald-400/10 bg-emerald-400/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
            Live
          </span>
        </div>

        {/* Content */}
        <div className="mt-7 grid items-center gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7">

          {/* QR */}
          <div className="flex justify-center">
            <div className="rounded-[1.5rem] bg-white p-4 shadow-2xl shadow-black/25">
              <QRCodeSVG
                id={qrId}
                value={joinUrl}
                size={190}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#111827"
                title={`${title} QR code`}
              />
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0">
            <p className="text-sm leading-6 text-(--foreground-muted)">
              Project this QR code on the classroom screen.
              Students can scan it with their phone and go
              directly into this live PulseBoard session.
            </p>

            {/* Code */}
            <div className="mt-5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-(--foreground-subtle)">
                Session code
              </p>

              <div className="mt-2 inline-flex max-w-full rounded-2xl border border-(--border) bg-(--background-soft) px-4 py-2.5">
                <span className="font-mono text-xl font-black tracking-[0.18em] text-violet-300 sm:text-2xl">
                  {safeJoinCode ||
                    "------"}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <InfoBox
                label="Join"
                value="QR + Code"
              />

              <InfoBox
                label="Session"
                value={title}
              />
            </div>

            {/* Buttons */}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={
                  handleCopy
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-[11px] font-black text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-violet-500"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy link
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={
                  handleDownload
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 text-[11px] font-bold text-(--foreground-secondary) transition hover:bg-(--surface-hover) hover:text-(--foreground)"
              >
                <Download className="h-4 w-4" />
                Download
              </button>

              <a
                href={
                  joinUrl
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-4 text-[11px] font-bold text-(--foreground-secondary) transition hover:bg-(--surface-hover) hover:text-(--foreground)"
              >
                <ExternalLink className="h-4 w-4" />
                Preview
              </a>
            </div>

            <p className="mt-4 break-all text-[10px] leading-5 text-(--foreground-subtle)">
              {joinUrl}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-(--border) bg-(--background-soft) p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-(--foreground-subtle)">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-(--foreground-secondary)">
        {value ||
          "—"}
      </p>
    </div>
  )
}