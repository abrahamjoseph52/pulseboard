import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore"

import { db } from "@/lib/firebase"

import type {
  Signal,
  SignalType,
} from "@/lib/types"

/*
|--------------------------------------------------------------------------
| Firestore collection
|--------------------------------------------------------------------------
*/

const signalsCollection =
  collection(db, "signals")

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type SendSignalData = {
  sessionId: string
  studentId: string
  signal: SignalType

  /**
   * The topic number this response belongs to.
   *
   * Example:
   *
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

/*
|--------------------------------------------------------------------------
| Validation helpers
|--------------------------------------------------------------------------
*/

/**
 * Check whether a value is a valid SignalType.
 */
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

/**
 * Normalize a topic/round value.
 *
 * Supports both:
 *
 * number
 * string
 *
 * This keeps compatibility with older Firestore documents.
 */
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

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value)

    if (
      Number.isInteger(parsed) &&
      parsed > 0
    ) {
      return parsed
    }
  }

  return 0
}

/*
|--------------------------------------------------------------------------
| Deterministic signal document ID
|--------------------------------------------------------------------------
*/

/**
 * Creates a unique Firestore document ID for:
 *
 * session + student + topic
 *
 * Example:
 *
 * session123_student456_topic1
 *
 * This allows us to enforce:
 *
 * One student
 *      +
 * One session
 *      +
 * One topic
 *      =
 * One feedback response
 *
 * This is intentionally NOT based on the signal type.
 *
 * Therefore a student cannot submit:
 *
 * Topic 1 → got_it
 * Topic 1 → confused
 *
 * as two separate responses.
 */
function getSignalDocumentId(
  sessionId: string,
  studentId: string,
  round: number
): string {
  return [
    sessionId,
    studentId,
    `topic-${round}`,
  ].join("_")
}

/*
|--------------------------------------------------------------------------
| SEND SIGNAL
|--------------------------------------------------------------------------
*/

/**
 * Send one student pulse.
 *
 * IMPORTANT:
 *
 * A student can submit only ONE pulse
 * for each topic in a session.
 *
 * The protection happens in Firestore,
 * not only in React state.
 *
 * Therefore leaving/re-entering the page
 * or refreshing the browser cannot create
 * another response for the same topic.
 */
export async function sendSignal(
  data: SendSignalData
): Promise<string> {
  /*
   * Clean incoming values.
   */
  const sessionId =
    data.sessionId.trim()

  const studentId =
    data.studentId.trim()

  /*
   * Validate session ID.
   */
  if (!sessionId) {
    throw new Error(
      "Session ID is required."
    )
  }

  /*
   * Validate student ID.
   */
  if (!studentId) {
    throw new Error(
      "Student ID is required."
    )
  }

  /*
   * Validate signal type.
   */
  if (
    !isValidSignalType(
      data.signal
    )
  ) {
    throw new Error(
      "Invalid signal type."
    )
  }

  /*
   * Validate topic number.
   */
  if (
    !Number.isInteger(
      data.round
    ) ||
    data.round <= 0
  ) {
    throw new Error(
      "A valid topic number is required."
    )
  }

  /*
   * ----------------------------------------------------------
   * DETERMINISTIC DOCUMENT ID
   * ----------------------------------------------------------
   *
   * Same:
   *
   * session + student + topic
   *
   * always produces the same document ID.
   */
  const signalDocumentId =
    getSignalDocumentId(
      sessionId,
      studentId,
      data.round
    )

  const signalRef =
    doc(
      db,
      "signals",
      signalDocumentId
    )

  /*
   * ----------------------------------------------------------
   * FIRESTORE TRANSACTION
   * ----------------------------------------------------------
   *
   * We check whether the response already exists.
   *
   * If it exists:
   *      reject the second response.
   *
   * If it doesn't exist:
   *      create the first response.
   *
   * This is much stronger than relying on React state.
   */
  await runTransaction(
    db,
    async (transaction) => {
      /*
       * Read the existing signal first.
       */
      const existingSignal =
        await transaction.get(
          signalRef
        )

      /*
       * ------------------------------------------------------
       * DUPLICATE CHECK
       * ------------------------------------------------------
       */

      if (
        existingSignal.exists()
      ) {
        throw new Error(
          "You have already submitted your feedback for this topic."
        )
      }

      /*
       * ------------------------------------------------------
       * FIRST RESPONSE
       * ------------------------------------------------------
       *
       * IMPORTANT:
       *
       * Firestore Web SDK Transaction
       * supports set(), not create().
       *
       * This fixes:
       *
       * Property 'create' does not exist
       * on type 'Transaction'
       */
      transaction.set(
        signalRef,
        {
          sessionId,

          studentId,

          signal:
            data.signal,

          /*
           * The teaching topic
           * this response belongs to.
           */
          round:
            data.round,

          /*
           * Keep the existing timestamp
           * behavior.
           */
          timestamp:
            serverTimestamp(),
        }
      )
    }
  )

  /*
   * Return the created document ID.
   */
  return signalDocumentId
}

/*
|--------------------------------------------------------------------------
| REALTIME SESSION SIGNALS
|--------------------------------------------------------------------------
*/

/**
 * Subscribe to all pulse responses
 * belonging to one classroom session.
 *
 * Existing realtime functionality is preserved.
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
  /*
   * Clean session ID.
   */
  const cleanSessionId =
    sessionId.trim()

  /*
   * Validate session ID.
   */
  if (!cleanSessionId) {
    onError?.(
      new Error(
        "Session ID is required."
      )
    )

    return () => {}
  }

  /*
   * Query all signals for this session.
   *
   * Existing realtime ordering is preserved.
   */
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

  /*
   * Realtime Firestore listener.
   */
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
              /*
               * Firestore document ID.
               */
              id:
                signalDocument.id,

              /*
               * Session ID.
               */
              sessionId:
                typeof data.sessionId ===
                "string"
                  ? data.sessionId
                  : cleanSessionId,

              /*
               * Student ID.
               */
              studentId:
                typeof data.studentId ===
                "string"
                  ? data.studentId
                  : "",

              /*
               * Signal type.
               *
               * Preserve the existing
               * fallback behavior.
               */
              signal:
                isValidSignalType(
                  data.signal
                )
                  ? data.signal
                  : "got_it",

              /*
               * Topic/round number.
               *
               * Older documents without
               * a round remain supported.
               */
              round:
                normalizeRound(
                  data.round
                ),

              /*
               * Existing Firestore timestamp.
               */
              timestamp:
                data.timestamp,
            }
          }
        )

      /*
       * Send realtime signals
       * to the existing UI.
       */
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
|--------------------------------------------------------------------------
| REALTIME SIGNAL COUNTS
|--------------------------------------------------------------------------
*/

/**
 * Subscribe to signal counts
 * for the complete classroom session.
 *
 * Existing functionality preserved.
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
      /*
       * Start with zero counts.
       */
      const counts: SignalCounts = {
        ...EMPTY_SIGNAL_COUNTS,
      }

      /*
       * Count each signal.
       */
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

      /*
       * Send updated counts.
       */
      callback(
        counts
      )
    },

    onError
  )
}

/*
|--------------------------------------------------------------------------
| TOTAL SIGNAL COUNT
|--------------------------------------------------------------------------
*/

/**
 * Calculate total number
 * of pulse responses.
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
|--------------------------------------------------------------------------
| UNIQUE STUDENT COUNT
|--------------------------------------------------------------------------
*/

/**
 * Get the number of unique students
 * who submitted a response.
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
          signal.studentId
      )
      .filter(Boolean)
  ).size
}

/*
|--------------------------------------------------------------------------
| TOPIC / ROUND HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Get all signals belonging to
 * one specific teaching topic.
 */
export function getSignalsForTopic(
  signals: Signal[],
  topicNumber: number
): Signal[] {
  /*
   * Validate topic number.
   */
  if (
    !Number.isInteger(
      topicNumber
    ) ||
    topicNumber <= 0
  ) {
    return []
  }

  /*
   * Return only responses
   * belonging to this topic.
   */
  return signals.filter(
    (
      signal
    ) =>
      signal.round ===
      topicNumber
  )
}

/**
 * Get signal counts for
 * one specific topic.
 */
export function getSignalCountsForTopic(
  signals: Signal[],
  topicNumber: number
): SignalCounts {
  /*
   * Start with zero counts.
   */
  const counts: SignalCounts = {
    ...EMPTY_SIGNAL_COUNTS,
  }

  /*
   * Get signals for the topic.
   */
  const topicSignals =
    getSignalsForTopic(
      signals,
      topicNumber
    )

  /*
   * Count topic responses.
   */
  topicSignals.forEach(
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

/**
 * Get unique students who responded
 * to one specific teaching topic.
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