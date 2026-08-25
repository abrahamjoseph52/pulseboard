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
}

export type SignalCounts =
  Record<SignalType, number>

export const EMPTY_SIGNAL_COUNTS: SignalCounts = {
  got_it: 0,
  slightly_lost: 0,
  confused: 0,
  interesting: 0,
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

  const signalRef =
    await addDoc(
      signalsCollection,
      {
        sessionId,
        studentId,
        signal: data.signal,
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
          ) => ({
            id:
              signalDocument.id,
            ...(
              signalDocument.data() as Omit<
                Signal,
                "id"
              >
            ),
          })
        )

      callback(signals)
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
        (item) => {
          if (
            Object.prototype.hasOwnProperty.call(
              counts,
              item.signal
            )
          ) {
            counts[item.signal] += 1
          }
        }
      )

      callback(counts)
    },
    onError
  )
}

export function getTotalSignalCount(
  counts: SignalCounts
): number {
  return Object.values(
    counts
  ).reduce(
    (total, count) =>
      total + count,
    0
  )
}

export function getUniqueStudentCount(
  signals: Signal[]
): number {
  return new Set(
    signals
      .map(
        (signal) =>
          signal.studentId
      )
      .filter(Boolean)
  ).size
}