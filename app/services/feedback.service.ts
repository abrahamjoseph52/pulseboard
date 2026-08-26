import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore"

import { db } from "@/lib/firebase"

import type {
  Signal,
  SignalType,
} from "@/lib/types"

const signalsCollection =
  collection(db, "signals")

export type SendSignalData = {
  sessionId: string
  studentId: string
  signal: SignalType

  /**
   * The topic number this response belongs to.
   *
   * Example:
   * Topic 1
   * Topic 2
   * Topic 3
   */
  round: number
}

export type SignalCounts = {
  got_it: number
  slightly_lost: number
  confused: number
  interesting: number
}

export const EMPTY_SIGNAL_COUNTS: SignalCounts = {
  got_it: 0,
  slightly_lost: 0,
  confused: 0,
  interesting: 0,
}

function isValidSignalType(
  signal: unknown
): signal is SignalType {
  return (
    typeof signal === "string" &&
    Object.prototype.hasOwnProperty.call(
      EMPTY_SIGNAL_COUNTS,
      signal
    )
  )
}

function normalizeRound(
  value: unknown
): number {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    if (
      Number.isInteger(parsed) &&
      parsed > 0
    ) {
      return parsed
    }
  }

  return 0
}

export async function sendSignal(
  data: SendSignalData
): Promise<string> {
  const sessionId =
    data.sessionId.trim()

  const studentId =
    data.studentId.trim()

  if (!sessionId) {
    throw new Error(
      "Session ID is required."
    )
  }

  if (!studentId) {
    throw new Error(
      "Student ID is required."
    )
  }

  if (
    !isValidSignalType(
      data.signal
    )
  ) {
    throw new Error(
      "Invalid signal type."
    )
  }

  if (
    !Number.isInteger(data.round) ||
    data.round <= 0
  ) {
    throw new Error(
      "A valid topic number is required."
    )
  }

  const signalRef =
    await addDoc(
      signalsCollection,
      {
        sessionId,
        studentId,
        signal: data.signal,

        /**
         * Stores which teaching topic
         * the student responded to.
         */
        round: data.round,

        timestamp:
          serverTimestamp(),
      }
    )

  return signalRef.id
}

export function subscribeToSessionSignals(
  sessionId: string,
  callback: (
    signals: Signal[]
  ) => void,
  onError?: (
    error: Error
  ) => void
) {
  const cleanSessionId =
    sessionId.trim()

  if (!cleanSessionId) {
    onError?.(
      new Error(
        "Session ID is required."
      )
    )

    return () => {}
  }

  const signalsQuery =
    query(
      signalsCollection,

      where(
        "sessionId",
        "==",
        cleanSessionId
      ),

      orderBy(
        "timestamp",
        "desc"
      )
    )

  return onSnapshot(
    signalsQuery,

    (snapshot) => {
      const signals: Signal[] =
        snapshot.docs.map(
          (
            signalDocument
          ) => {
            const data =
              signalDocument.data()

            return {
              id:
                signalDocument.id,

              sessionId:
                typeof data.sessionId ===
                "string"
                  ? data.sessionId
                  : cleanSessionId,

              studentId:
                typeof data.studentId ===
                "string"
                  ? data.studentId
                  : "",

              signal:
                isValidSignalType(
                  data.signal
                )
                  ? data.signal
                  : "got_it",

              /**
               * Old signals may not have
               * a topic number.
               */
              round:
                normalizeRound(
                  data.round
                ),

              timestamp:
                data.timestamp,
            }
          }
        )

      callback(
        signals
      )
    },

    (snapshotError) => {
      console.error(
        "Failed to subscribe to session signals:",
        snapshotError
      )

      onError?.(
        snapshotError
      )
    }
  )
}

export function subscribeToSignalCounts(
  sessionId: string,
  callback: (
    counts: SignalCounts
  ) => void,
  onError?: (
    error: Error
  ) => void
) {
  return subscribeToSessionSignals(
    sessionId,

    (signals) => {
      const counts: SignalCounts = {
        ...EMPTY_SIGNAL_COUNTS,
      }

      signals.forEach(
        (signal) => {
          if (
            Object.prototype.hasOwnProperty.call(
              counts,
              signal.signal
            )
          ) {
            counts[
              signal.signal
            ] += 1
          }
        }
      )

      callback(
        counts
      )
    },

    onError
  )
}

export function getTotalSignalCount(
  counts: SignalCounts
): number {
  return (
    counts.got_it +
    counts.slightly_lost +
    counts.confused +
    counts.interesting
  )
}

export function getUniqueStudentCount(
  signals: Signal[]
): number {
  return new Set(
    signals
      .map(
        (
          signal
        ) =>
          signal.studentId
      )
      .filter(Boolean)
  ).size
}

/**
 * Get all signals belonging to
 * one specific teaching topic.
 */
export function getSignalsForTopic(
  signals: Signal[],
  topicNumber: number
): Signal[] {
  if (
    !Number.isInteger(
      topicNumber
    ) ||
    topicNumber <= 0
  ) {
    return []
  }

  return signals.filter(
    (signal) =>
      signal.round ===
      topicNumber
  )
}

/**
 * Get signal counts for one topic.
 */
export function getSignalCountsForTopic(
  signals: Signal[],
  topicNumber: number
): SignalCounts {
  const counts: SignalCounts = {
    ...EMPTY_SIGNAL_COUNTS,
  }

  const topicSignals =
    getSignalsForTopic(
      signals,
      topicNumber
    )

  topicSignals.forEach(
    (signal) => {
      if (
        Object.prototype.hasOwnProperty.call(
          counts,
          signal.signal
        )
      ) {
        counts[
          signal.signal
        ] += 1
      }
    }
  )

  return counts
}

/**
 * Get unique students who responded
 * to one specific topic.
 */
export function getUniqueStudentCountForTopic(
  signals: Signal[],
  topicNumber: number
): number {
  return getUniqueStudentCount(
    getSignalsForTopic(
      signals,
      topicNumber
    )
  )
}