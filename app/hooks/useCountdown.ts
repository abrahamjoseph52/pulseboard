"use client"

import { useEffect, useState } from "react"

type UseCountdownReturn = {
  timeLeft: number
  isFinished: boolean
  reset: () => void
}

export function useCountdown(
  initialSeconds: number,
  running = true,
  onComplete?: () => void
): UseCountdownReturn {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)

  useEffect(() => {
    if (!running || timeLeft <= 0) return

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          onComplete?.()

          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [running, timeLeft, onComplete])

  const reset = () => {
    setTimeLeft(initialSeconds)
  }

  return {
    timeLeft,
    isFinished: timeLeft === 0,
    reset,
  }
}