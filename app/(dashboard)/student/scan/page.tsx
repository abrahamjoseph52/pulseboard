"use client"

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  useRouter,
} from "next/navigation"

import jsQR from "jsqr"

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

export default function StudentScanPage() {
  const router =
    useRouter()

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    )

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    )

  const streamRef =
    useRef<MediaStream | null>(
      null
    )

  const animationFrameRef =
    useRef<number | null>(
      null
    )

  const [
    starting,
    setStarting,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState("")

  const [
    processing,
    setProcessing,
  ] = useState(false)

  const stopCamera =
    useCallback(() => {
      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        )

        animationFrameRef.current =
          null
      }

      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (
              track
            ) => {
              track.stop()
            }
          )

        streamRef.current =
          null
      }

      if (
        videoRef.current
      ) {
        videoRef.current.srcObject =
          null
      }
    }, [])

  const joinByCode =
    useCallback(
      async (
        code: string
      ) => {
        const cleanCode =
          code
            .trim()
            .toUpperCase()

        if (
          !cleanCode
        ) {
          setError(
            "No valid session code was found."
          )

          setProcessing(
            false
          )

          return
        }

        const sessionQuery =
          query(
            collection(
              db,
              "sessions"
            ),
            where(
              "joinCode",
              "==",
              cleanCode
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
            "That session is no longer active or could not be found."
          )

          setProcessing(
            false
          )

          return
        }

        const session =
          snapshot.docs[0]

        stopCamera()

        router.push(
          `/student/session/${session.id}`
        )
      },
      [
        router,
        stopCamera,
      ]
    )

  const handleScannedValue =
    useCallback(
      async (
        value: string
      ) => {
        if (
          processing
        ) {
          return
        }

        setProcessing(
          true
        )

        setError("")

        try {
          const trimmedValue =
            value.trim()

          /*
           * QR can contain a complete PulseBoard URL.
           */
          try {
            const scannedUrl =
              new URL(
                trimmedValue
              )

            const scannedCode =
              scannedUrl.searchParams
                .get("code")
                ?.trim()
                .toUpperCase()

            if (
              scannedCode
            ) {
              await joinByCode(
                scannedCode
              )

              return
            }
          } catch {
            /*
             * Not a URL.
             * Continue and treat it as a possible join code.
             */
          }

          const possibleCode =
            trimmedValue
              .toUpperCase()
              .replace(
                /[^A-Z0-9]/g,
                ""
              )

          if (
            /^[A-Z0-9]{4,8}$/.test(
              possibleCode
            )
          ) {
            await joinByCode(
              possibleCode
            )

            return
          }

          setError(
            "This QR code is not a valid PulseBoard classroom code."
          )

          setProcessing(
            false
          )
        } catch (
          scanError
        ) {
          console.error(
            "Failed to process QR code:",
            scanError
          )

          setError(
            "Unable to process this QR code. Please try again."
          )

          setProcessing(
            false
          )
        }
      },
      [
        joinByCode,
        processing,
      ]
    )

  /*
   * Camera lifecycle.
   */
  useEffect(() => {
    let mounted =
      true

    const startCamera =
      async () => {
        try {
          setError("")

          if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices
              .getUserMedia
          ) {
            throw new Error(
              "Camera access is not supported in this browser."
            )
          }

          const stream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: {
                  facingMode: {
                    ideal:
                      "environment",
                  },
                },
                audio: false,
              }
            )

          if (
            !mounted
          ) {
            stream
              .getTracks()
              .forEach(
                (
                  track
                ) =>
                  track.stop()
              )

            return
          }

          streamRef.current =
            stream

          if (
            videoRef.current
          ) {
            videoRef.current.srcObject =
              stream

            await videoRef.current.play()
          }

          setStarting(
            false
          )
        } catch (
          cameraError
        ) {
          console.error(
            "Camera start error:",
            cameraError
          )

          setError(
            "Camera access was blocked. Allow camera permission or enter the session code instead."
          )

          setStarting(
            false
          )
        }
      }

    void startCamera()

    return () => {
      mounted = false
      stopCamera()
    }
  }, [
    stopCamera,
  ])

  /*
   * QR scanning loop.
   */
  useEffect(() => {
    if (
      starting ||
      processing
    ) {
      return
    }

    const scan =
      () => {
        if (
          processing
        ) {
          return
        }

        const video =
          videoRef.current

        const canvas =
          canvasRef.current

        if (
          !video ||
          !canvas ||
          video.readyState <
            HTMLMediaElement.HAVE_ENOUGH_DATA
        ) {
          animationFrameRef.current =
            requestAnimationFrame(
              scan
            )

          return
        }

        const width =
          video.videoWidth

        const height =
          video.videoHeight

        if (
          !width ||
          !height
        ) {
          animationFrameRef.current =
            requestAnimationFrame(
              scan
            )

          return
        }

        canvas.width =
          width

        canvas.height =
          height

        const context =
          canvas.getContext(
            "2d",
            {
              willReadFrequently:
                true,
            }
          )

        if (
          !context
        ) {
          return
        }

        context.drawImage(
          video,
          0,
          0,
          width,
          height
        )

        const imageData =
          context.getImageData(
            0,
            0,
            width,
            height
          )

        const code =
          jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            {
              inversionAttempts:
                "attemptBoth",
            }
          )

        if (
          code?.data
        ) {
          void handleScannedValue(
            code.data
          )

          return
        }

        animationFrameRef.current =
          requestAnimationFrame(
            scan
          )
      }

    animationFrameRef.current =
      requestAnimationFrame(
        scan
      )

    return () => {
      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        )

        animationFrameRef.current =
          null
      }
    }
  }, [
    starting,
    processing,
    handleScannedValue,
  ])

  const handleManualJoin =
    async (
      code: string
    ) => {
      const cleanCode =
        code
          .trim()
          .toUpperCase()
          .replace(
            /[^A-Z0-9]/g,
            ""
          )

      if (
        !cleanCode
      ) {
        setError(
          "No session code was provided."
        )

        return
      }

      if (
        cleanCode.length <
        4
      ) {
        setError(
          "Please enter a valid session code."
        )

        return
      }

      setProcessing(
        true
      )

      setError("")

      try {
        await joinByCode(
          cleanCode
        )
      } catch (
        joinError
      ) {
        console.error(
          "Manual join failed:",
          joinError
        )

        setError(
          "Unable to join this session."
        )

        setProcessing(
          false
        )
      }
    }

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
                "/student/join"
              )
            }
            className="group inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--foreground-secondary) shadow-(--shadow-xs) transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) hover:text-(--foreground)"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to join
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
            className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-indigo-500/10 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
                <QrCode className="h-3.5 w-3.5" />
                QR scanner
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Scan your
                <span className="gradient-text">
                  {" "}
                  classroom code.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-(--foreground-muted) sm:text-base">
                Point your camera at the QR code displayed by your
                faculty. PulseBoard will detect the classroom and take
                you directly into the live session.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <ScanBadge
                  icon={
                    <Camera className="h-3.5 w-3.5" />
                  }
                  text="Camera ready"
                />

                <ScanBadge
                  icon={
                    <Zap className="h-3.5 w-3.5" />
                  }
                  text="Fast join"
                />

                <ScanBadge
                  icon={
                    <ShieldCheck className="h-3.5 w-3.5" />
                  }
                  text="Secure lookup"
                />
              </div>
            </div>

            <div className="hidden lg:flex">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-violet-400/10 bg-violet-500/5">
                <div className="absolute inset-4 rounded-full border border-violet-400/10" />

                <div className="absolute inset-9 rounded-full border border-indigo-400/10" />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-2xl shadow-violet-500/30">
                  <ScanLine className="h-9 w-9" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SCANNER + INFO
        ===================================================== */}

        <div className="mx-auto mt-6 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Scanner */}
          <section className="surface overflow-hidden rounded-[2rem] p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Live camera
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Position the QR inside the frame
                </h2>
              </div>

              <div
                className={[
                  "hidden items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider sm:flex",
                  starting
                    ? "bg-amber-400/10 text-amber-300"
                    : processing
                      ? "bg-violet-500/10 text-violet-300"
                      : "bg-emerald-400/10 text-emerald-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    starting
                      ? "animate-pulse bg-amber-400"
                      : processing
                        ? "animate-pulse bg-violet-400"
                        : "animate-pulse bg-emerald-400",
                  ].join(" ")}
                />

                {starting
                  ? "Starting"
                  : processing
                    ? "Processing"
                    : "Scanning"}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-black shadow-[0_25px_70px_rgba(0,0,0,0.3)]">
              <video
                ref={
                  videoRef
                }
                className="aspect-square w-full object-cover"
                playsInline
                muted
                autoPlay
              />

              <canvas
                ref={
                  canvasRef
                }
                className="hidden"
              />

              {/* Dark overlay */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/15 via-transparent to-black/35" />

              {/* Scanner frame */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-64 w-64 max-w-[72%] rounded-[2rem] border border-violet-300/30 shadow-[0_0_60px_rgba(139,92,246,0.18)] sm:h-72 sm:w-72">
                  {/* Corners */}
                  <div className="absolute -left-1 -top-1 h-12 w-12 rounded-tl-3xl border-l-4 border-t-4 border-violet-300" />

                  <div className="absolute -right-1 -top-1 h-12 w-12 rounded-tr-3xl border-r-4 border-t-4 border-violet-300" />

                  <div className="absolute -bottom-1 -left-1 h-12 w-12 rounded-bl-3xl border-b-4 border-l-4 border-violet-300" />

                  <div className="absolute -bottom-1 -right-1 h-12 w-12 rounded-br-3xl border-b-4 border-r-4 border-violet-300" />

                  {/* Scan line */}
                  {!starting &&
                    !processing && (
                      <div className="absolute left-5 right-5 top-1/2 h-0.5 animate-pulse bg-linear-to-r from-transparent via-violet-300 to-transparent shadow-[0_0_15px_rgba(196,181,253,0.8)]" />
                    )}

                  {/* Center hint */}
                  {!starting &&
                    !processing && (
                      <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm">
                        <QrCode className="h-4 w-4 text-white/70" />
                      </div>
                    )}
                </div>
              </div>

              {/* Camera loading */}
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-white">
                        Starting camera...
                      </p>

                      <p className="mt-1 text-[10px] text-white/55">
                        Allow camera access to scan the classroom QR.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing */}
              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-white">
                        Joining classroom...
                      </p>

                      <p className="mt-1 text-[10px] text-white/55">
                        Checking the scanned session.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[9px] font-bold text-white/75 backdrop-blur-md">
                  <ScanLine className="h-3.5 w-3.5" />
                  Hold the QR inside the frame
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </div>

                <div>
                  <p className="text-xs font-black text-rose-300">
                    Scanner issue
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-rose-300/80">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Scanner status */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ScannerInfo
                icon={
                  <Camera className="h-4 w-4" />
                }
                title="Camera"
                text={
                  starting
                    ? "Starting..."
                    : "Active"
                }
                tone="violet"
              />

              <ScannerInfo
                icon={
                  <QrCode className="h-4 w-4" />
                }
                title="Detection"
                text={
                  processing
                    ? "Checking"
                    : "Ready"
                }
                tone="emerald"
              />

              <ScannerInfo
                icon={
                  <ShieldCheck className="h-4 w-4" />
                }
                title="Lookup"
                text="Session only"
                tone="blue"
              />
            </div>

            {/* Manual fallback */}
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/join"
                )
              }
              disabled={
                processing
              }
              className="group mt-5 flex w-full items-center justify-between gap-4 rounded-2xl border border-(--border) bg-(--background-soft) px-4 py-4 text-left transition-all hover:border-(--border-strong) hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </div>

                <div>
                  <p className="text-xs font-black">
                    Enter the session code instead
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-(--foreground-muted)">
                    Camera not working? Join manually in seconds.
                  </p>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-(--foreground-subtle) transition-transform group-hover:translate-x-1 group-hover:text-violet-300" />
            </button>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="surface rounded-[2rem] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <Smartphone className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-400">
                    Quick guide
                  </p>

                  <h2 className="mt-1 text-base font-black">
                    How to scan
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Step
                  number="01"
                  title="Allow camera"
                  text="Give PulseBoard permission to access your camera."
                />

                <Step
                  number="02"
                  title="Point at QR"
                  text="Place the classroom QR inside the highlighted frame."
                />

                <Step
                  number="03"
                  title="Join"
                  text="PulseBoard finds the active classroom automatically."
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
                  Fast classroom access.
                </h3>

                <p className="mt-2 text-xs leading-6 text-(--foreground-muted)">
                  Scan once, join the active room, and keep your
                  attention on the lesson.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-400/10 bg-emerald-400/[0.045] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-black">
                    QR privacy
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-(--foreground-muted)">
                    The scanned QR is used only to locate an active
                    PulseBoard classroom session.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="mx-auto mt-6 flex max-w-5xl flex-col gap-2 border-t border-(--border) pt-5 text-[9px] text-(--foreground-subtle) sm:flex-row sm:items-center sm:justify-between">
          <span>
            PulseBoard student QR scanner
          </span>

          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Camera stops automatically after joining.
          </span>
        </footer>
      </div>
    </main>
  )
}

function ScanBadge({
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

function ScannerInfo({
  icon,
  title,
  text,
  tone,
}: {
  icon: ReactNode
  title: string
  text: string
  tone:
    | "violet"
    | "emerald"
    | "blue"
}) {
  const toneClasses = {
    violet:
      "bg-violet-500/10 text-violet-300",
    emerald:
      "bg-emerald-400/10 text-emerald-300",
    blue:
      "bg-blue-500/10 text-blue-300",
  }

  return (
    <div className="rounded-2xl border border-(--border) bg-(--background-soft) p-3">
      <div
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl",
          toneClasses[tone],
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-(--foreground-subtle)">
        {title}
      </p>

      <p className="mt-1 text-xs font-black text-(--foreground-secondary)">
        {text}
      </p>
    </div>
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