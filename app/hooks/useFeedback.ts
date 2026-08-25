"use client"

import {
  useCallback,
  useState,
} from "react"

import type {
  SignalType,
} from "@/lib/types"

import {
  sendSignal,
} from "@/app/services/feedback.service"

type UseFeedbackOptions = {
  sessionId: string
  studentId: string
  currentRound: number
}

type UseFeedbackReturn = {
  selectedSignal:
    | SignalType
    | null

  loading: boolean

  error: string

  sendFeedback: (
    signal: SignalType
  ) => Promise<void>

  clearError: () => void
}

export function useFeedback({
  sessionId,
  studentId,
  currentRound,
}: UseFeedbackOptions): UseFeedbackReturn {
  const [
    selectedSignal,
    setSelectedSignal,
  ] =
    useState<SignalType | null>(
      null
    )

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState("")

  const sendFeedback =
    useCallback(
      async (
        signal: SignalType
      ) => {
        if (loading) {
          return
        }

        if (!sessionId) {
          setError(
            "Session ID is required."
          )
          return
        }

        if (!studentId) {
          setError(
            "Student ID is required."
          )
          return
        }

        if (
          !Number.isInteger(
            currentRound
          ) ||
          currentRound <= 0
        ) {
          setError(
            "The current teaching pulse has not started yet."
          )
          return
        }

        setLoading(true)
        setError("")

        try {
          await sendSignal({
            sessionId,
            studentId,
            signal,
            round: currentRound,
          })

          setSelectedSignal(
            signal
          )
        } catch (
          sendError
        ) {
          console.error(
            "Failed to send feedback:",
            sendError
          )

          setError(
            sendError instanceof Error
              ? sendError.message
              : "Unable to send your feedback. Please try again."
          )
        } finally {
          setLoading(false)
        }
      },
      [
        sessionId,
        studentId,
        currentRound,
        loading,
      ]
    )

  const clearError =
    useCallback(() => {
      setError("")
    }, [])

  return {
    selectedSignal,
    loading,
    error,
    sendFeedback,
    clearError,
  }
}