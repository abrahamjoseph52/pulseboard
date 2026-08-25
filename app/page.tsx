"use client"

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  Menu,
  Play,
  QrCode,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import ThemeToggle from "@/app/components/ThemeToggle"

export default function HomePage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const goToLogin = () => {
    setMobileMenuOpen(false)
    router.push("/login")
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="absolute -right-32 top-20 h-[24rem] w-[24rem] rounded-full bg-blue-500/10 blur-[110px]" />

        <div className="absolute bottom-0 left-1/2 h-[20rem] w-[30rem] -translate-x-1/2 rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      {/* Navigation */}
      <header className="relative z-50 border-b border-[var(--border)] bg-[var(--background)]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          {/* Brand */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20 transition duration-300 group-hover:scale-105">
              <Zap className="h-5 w-5" />
            </div>

            <div className="text-left">
              <p className="text-base font-black tracking-tight">
                PulseBoard
              </p>

              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground-muted)] sm:block">
                Classroom intelligence
              </p>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
            >
              How it works
            </a>

            <a
              href="#why-pulseboard"
              className="text-sm font-medium text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
            >
              Why PulseBoard
            </a>
          </nav>

          {/* Actions */}
          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />

            <button
              type="button"
              onClick={goToLogin}
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25 active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />

            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen((current) => !current)
              }
              aria-label="Toggle navigation"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--background)] px-5 py-5 md:hidden">
            <nav className="space-y-2">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--foreground-secondary)] hover:bg-[var(--surface)]"
              >
                Features
              </a>

              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--foreground-secondary)] hover:bg-[var(--surface)]"
              >
                How it works
              </a>

              <a
                href="#why-pulseboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--foreground-secondary)] hover:bg-[var(--surface)]"
              >
                Why PulseBoard
              </a>

              <button
                type="button"
                onClick={goToLogin}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-bold text-white"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative z-10 px-5 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            {/* Hero copy */}
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-2 text-xs font-bold text-violet-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
                </span>

                REAL-TIME CLASSROOM SIGNALS
              </div>

              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Understand your classroom{" "}
                <span className="gradient-text">
                  before the silence.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--foreground-muted)] sm:text-lg">
                PulseBoard gives faculty a live view of how students
                are following the lesson—without interrupting the
                class. Students signal, faculty respond, and AI turns
                the session into actionable insight.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="group inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 text-sm font-black text-white shadow-xl shadow-violet-500/20 transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/25 active:scale-[0.98]"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>

                <a
                  href="#how-it-works"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-7 text-sm font-bold text-[var(--foreground-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  See how it works
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[var(--foreground-subtle)]">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Real-time feedback
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  QR session joining
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  AI-powered insights
                </span>
              </div>
            </div>

            {/* Product preview */}
            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-violet-500/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                {/* Browser bar */}
                <div className="flex h-12 items-center gap-2 border-b border-[var(--border)] px-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />

                  <div className="ml-3 h-7 flex-1 rounded-lg bg-[var(--surface-hover)]" />
                </div>

                {/* Dashboard preview */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
                        Live session
                      </p>

                      <h2 className="mt-1 text-lg font-black">
                        Data Structures
                      </h2>

                      <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                        CS301 · Foundations
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        LIVE
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <PreviewMetric
                      label="Students"
                      value="42"
                    />

                    <PreviewMetric
                      label="Signals"
                      value="128"
                    />

                    <PreviewMetric
                      label="Pulse"
                      value="84%"
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold">
                          Classroom Pulse
                        </p>

                        <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
                          Last 20 minutes
                        </p>
                      </div>

                      <BarChart3 className="h-4 w-4 text-violet-400" />
                    </div>

                    <div className="mt-6 flex h-28 items-end gap-1.5">
                      {[24, 35, 31, 48, 43, 58, 52, 67, 62, 78, 71, 84].map(
                        (height, index) => (
                          <div
                            key={index}
                            className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600 to-indigo-400"
                            style={{ height: `${height}%` }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <PreviewSignal
                      icon="✓"
                      label="Got it"
                      value="68%"
                      tone="emerald"
                    />

                    <PreviewSignal
                      icon="?"
                      label="Confused"
                      value="8%"
                      tone="rose"
                    />
                  </div>
                </div>
              </div>

              {/* Floating QR card */}
              <div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-2xl sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <QrCode className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold">
                      Join instantly
                    </p>

                    <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
                      Scan with your phone
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating AI card */}
              <div className="absolute -right-5 -top-6 hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-2xl lg:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold">
                      AI Insight Ready
                    </p>

                    <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
                      Session analysis generated
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="relative z-10 border-y border-[var(--border)] bg-[var(--background-soft)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-[var(--border)] lg:grid-cols-4">
          <Metric
            value="1-tap"
            label="student feedback"
          />

          <Metric
            value="2 min"
            label="pulse cycle"
          />

          <Metric
            value="QR"
            label="instant session join"
          />

          <Metric
            value="AI"
            label="post-session insights"
          />
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 px-5 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-400">
              Built for real classrooms
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              More than feedback.
              <br />
              <span className="text-[var(--foreground-muted)]">
                Classroom intelligence.
              </span>
            </h2>

            <p className="mt-5 text-base leading-7 text-[var(--foreground-muted)]">
              Every part of PulseBoard is designed around one goal:
              helping faculty know what is happening in the room while
              there is still time to act.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Live signals"
              description="See classroom understanding change in real time instead of waiting for the next test."
            />

            <FeatureCard
              icon={<QrCode className="h-5 w-5" />}
              title="Instant QR join"
              description="Project one QR code and let the entire class join without typing long links."
            />

            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Session analytics"
              description="Track engagement, confusion, and momentum across every classroom pulse."
            />

            <FeatureCard
              icon={<Sparkles className="h-5 w-5" />}
              title="AI insights"
              description="Turn raw feedback into a thoughtful post-session teaching report."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative z-10 border-y border-[var(--border)] bg-[var(--background-soft)] px-5 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-400">
              Simple by design
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Three steps. One live classroom pulse.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            <StepCard
              number="01"
              icon={<GraduationCap className="h-6 w-6" />}
              title="Faculty starts a session"
              description="Create a session, choose the course, and instantly generate a shareable QR code and room code."
            />

            <StepCard
              number="02"
              icon={<QrCode className="h-6 w-6" />}
              title="Students join"
              description="Students scan the QR code or enter the short session code from their phones."
            />

            <StepCard
              number="03"
              icon={<Sparkles className="h-6 w-6" />}
              title="Pulse becomes insight"
              description="Feedback updates live throughout the lesson and becomes an AI-powered session report afterward."
            />
          </div>
        </div>
      </section>

      {/* Why PulseBoard */}
      <section
        id="why-pulseboard"
        className="relative z-10 px-5 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-violet-500/10 via-[var(--surface)] to-indigo-500/10 p-8 sm:p-12 lg:p-16">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  THE PULSEBOARD DIFFERENCE
                </div>

                <h2 className="mt-6 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
                  Make the classroom visible.
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--foreground-muted)]">
                  Traditional feedback tells you what students knew
                  yesterday. PulseBoard shows you what they understand
                  right now.
                </p>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="group inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--foreground)] px-6 text-sm font-black text-[var(--background)] transition hover:-translate-y-0.5"
                  >
                    Enter PulseBoard
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MiniHighlight
                  title="Fast"
                  value="1 tap"
                  description="Students never lose focus."
                />

                <MiniHighlight
                  title="Live"
                  value="Real-time"
                  description="Faculty sees the classroom immediately."
                />

                <MiniHighlight
                  title="Smart"
                  value="AI"
                  description="Raw signals become teaching insight."
                />

                <MiniHighlight
                  title="Simple"
                  value="QR"
                  description="One scan gets everyone into the room."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] px-5 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[var(--foreground-muted)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Zap className="h-4 w-4" />
            </div>

            <span className="font-bold text-[var(--foreground)]">
              PulseBoard
            </span>
          </div>

          <p>
            Real-time classroom intelligence for better teaching.
          </p>
        </div>
      </footer>
    </main>
  )
}

/* ─────────────────────────────────────────
   Components
───────────────────────────────────────── */

function PreviewMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background-soft)] p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-subtle)]">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>
    </div>
  )
}

function PreviewSignal({
  icon,
  label,
  value,
  tone,
}: {
  icon: string
  label: string
  value: string
  tone: "emerald" | "rose"
}) {
  const styles =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-300"
      : "bg-rose-500/10 text-rose-300"

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background-soft)] p-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold ${styles}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-semibold text-[var(--foreground-muted)]">
          {label}
        </p>

        <p className="mt-0.5 text-sm font-black">
          {value}
        </p>
      </div>
    </div>
  )
}

function Metric({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="px-5 py-7 text-center sm:px-8">
      <p className="text-2xl font-black tracking-tight sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-[var(--foreground-muted)] sm:text-sm">
        {label}
      </p>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="surface surface-hover group rounded-2xl p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 transition duration-200 group-hover:bg-violet-500/15 group-hover:text-violet-200">
        {icon}
      </div>

      <h3 className="mt-5 text-base font-black">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
        {description}
      </p>
    </div>
  )
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          {icon}
        </div>

        <span className="text-4xl font-black text-[var(--foreground)]/5">
          {number}
        </span>
      </div>

      <h3 className="mt-6 text-xl font-black">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-[var(--foreground-muted)]">
        {description}
      </p>
    </div>
  )
}

function MiniHighlight({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
        {title}
      </p>

      <p className="mt-2 text-xl font-black text-violet-300">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[var(--foreground-muted)]">
        {description}
      </p>
    </div>
  )
}