"use client"

import { useEffect, useState } from "react"

import type { Signal, SignalType } from "@/lib/types"

import {
  sendSignal,
  subscribeToSessionSignals,
} from "@/app/services/feedback.service"

type SignalCounts = Record<SignalType, number>

type UseFeedbackReturn = {
  signals: Signal[]
  counts: SignalCounts
  loading: boolean
  error: string | null
  sendFeedback: (
    studentId: string,
    signal: SignalType
  ) => Promise<void>
}

const emptyCounts: SignalCounts = {
  got_it: 0,
  slightly_lost: 0,
  confused: 0,
  interesting: 0,
}

export function useFeedback(
  sessionId: string | undefined
): UseFeedbackReturn {
  const [signals, setSignals] = useState<Signal[]>([])
  const [counts, setCounts] =
    useState<SignalCounts>(emptyCounts)
  const [loading, setLoading] = useState(Boolean(sessionId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const unsubscribe = subscribeToSessionSignals(
      sessionId,
      (updatedSignals) => {
        const updatedCounts: SignalCounts = {
          got_it: 0,
          slightly_lost: 0,
          confused: 0,
          interesting: 0,
        }

        updatedSignals.forEach((item) => {
          updatedCounts[item.signal] += 1
        })

        setSignals(updatedSignals)
        setCounts(updatedCounts)
        setError(null)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [sessionId])

  const sendFeedback = async (
    studentId: string,
    signal: SignalType
  ) => {
    if (!sessionId) {
      throw new Error("Session ID is missing.")
    }

    try {
      setError(null)

      await sendSignal({
        sessionId,
        studentId,
        signal,
      })
    } catch (sendError) {
      console.error(
        "Failed to send feedback:",
        sendError
      )

      const message =
        sendError instanceof Error
          ? sendError.message
          : "Unable to send feedback."

      setError(message)

      throw sendError
    }
  }

  return {
    signals,
    counts,
    loading,
    error,
    sendFeedback,
  }
}