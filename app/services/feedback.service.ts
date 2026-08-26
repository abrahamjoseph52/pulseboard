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

  /*
   * The teaching pulse that this response belongs to.
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

/*
 * =========================================================
 * SEND SIGNAL
 * =========================================================
 */

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
    !data.signal ||
    !Object.prototype.hasOwnProperty.call(
      EMPTY_SIGNAL_COUNTS,
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
      "A valid teaching round is required."
    )
  }

  const signalRef =
    await addDoc(
      signalsCollection,
      {
        sessionId,
        studentId,
        signal: data.signal,

        /*
         * Every response belongs to
         * one exact teaching pulse.
         */
        round: data.round,

        timestamp:
          serverTimestamp(),
      }
    )

  return signalRef.id
}

/*
 * =========================================================
 * SUBSCRIBE TO SESSION SIGNALS
 * =========================================================
 */

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
    const error =
      new Error(
        "Session ID is required."
      )

    onError?.(error)

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
                data.signal as SignalType,

              /*
               * Backward compatibility:
               * old signals may not have round.
               */
              round:
                typeof data.round ===
                "number"
                  ? data.round
                  : 0,

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

/*
 * =========================================================
 * SUBSCRIBE TO SIGNAL COUNTS
 * =========================================================
 */

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
        (
          signal
        ) => {
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

/*
 * =========================================================
 * TOTAL SIGNAL COUNT
 * =========================================================
 */

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

/*
 * =========================================================
 * UNIQUE STUDENT COUNT
 * =========================================================
 */

export function getUniqueStudentCount(
  signals: Signal[]
): number {
  return new Set(
    signals
      .map(
        (
          signal
        ) =>
          signal.studentId.trim()
      )
      .filter(Boolean)
  ).size
}

/*
 * =========================================================
 * FILTER SIGNALS BY ROUND
 * =========================================================
 *
 * Small reusable helper for pages/services that
 * need only one teaching pulse.
 */

export function getSignalsForRound(
  signals: Signal[],
  round: number
): Signal[] {
  if (
    !Number.isInteger(round) ||
    round <= 0
  ) {
    return []
  }

  return signals.filter(
    (
      signal
    ) =>
      signal.round ===
      round
  )
}

/*
 * =========================================================
 * GET ROUND COUNTS
 * =========================================================
 */

export function getSignalCountsForRound(
  signals: Signal[],
  round: number
): SignalCounts {
  const counts: SignalCounts = {
    ...EMPTY_SIGNAL_COUNTS,
  }

  const roundSignals =
    getSignalsForRound(
      signals,
      round
    )

  roundSignals.forEach(
    (
      signal
    ) => {
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

/*
 * =========================================================
 * GET UNIQUE STUDENTS FOR ROUND
 * =========================================================
 */

export function getUniqueStudentCountForRound(
  signals: Signal[],
  round: number
): number {
  const roundSignals =
    getSignalsForRound(
      signals,
      round
    )

  return getUniqueStudentCount(
    roundSignals
  )
}