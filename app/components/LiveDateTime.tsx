"use client"

import { CalendarDays, Clock3 } from "lucide-react"
import { useEffect, useState } from "react"

export default function LiveDateTime() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const updateTime = () => {
      setNow(new Date())
    }

    updateTime()

    const interval = window.setInterval(
      updateTime,
      1000
    )

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  if (!now) {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-(--border) bg-(--surface) px-3 py-2 sm:flex">
        <Clock3 className="h-4 w-4 text-violet-300" />

        <div className="leading-tight">
          <p className="text-[11px] font-black">
            --:--:--
          </p>

          <p className="text-[9px] font-medium text-(--foreground-muted)">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  const time = now.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }
  )

  const date = now.toLocaleDateString(
    "en-IN",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  )

  return (
    <div
      className="hidden items-center gap-3 rounded-xl border border-(--border) bg-(--surface) px-3 py-2 sm:flex"
      aria-label={`Current date ${date}, current time ${time}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
        <Clock3 className="h-4 w-4" />
      </div>

      <div className="leading-tight">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-black">
            {time}
          </p>

          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        </div>

        <div className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-(--foreground-muted)">
          <CalendarDays className="h-3 w-3" />
          {date}
        </div>
      </div>
    </div>
  )
}