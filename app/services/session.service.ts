import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import type { Session } from "@/lib/types"

const sessionsCollection =
  collection(db, "sessions")

export type CreateSessionData = {
  adminId: string
  title: string
  courseCode: string
  joinCode: string
}

export async function createSession(
  data: CreateSessionData
): Promise<string> {
  const adminId =
    data.adminId.trim()

  const title =
    data.title.trim()

  const courseCode =
    data.courseCode
      .trim()
      .toUpperCase()

  const joinCode =
    data.joinCode
      .trim()
      .toUpperCase()

  if (!adminId) {
    throw new Error(
      "Faculty ID is required."
    )
  }

  if (!title) {
    throw new Error(
      "Session title is required."
    )
  }

  if (!courseCode) {
    throw new Error(
      "Course code is required."
    )
  }

  if (!joinCode) {
    throw new Error(
      "Join code is required."
    )
  }

  const existingQuery =
    query(
      sessionsCollection,
      where(
        "joinCode",
        "==",
        joinCode
      ),
      where(
        "status",
        "==",
        "active"
      ),
      limit(1)
    )

  const existingSnapshot =
    await getDocs(
      existingQuery
    )

  if (
    !existingSnapshot.empty
  ) {
    throw new Error(
      "That session code is already in use. Please generate a new code."
    )
  }

  const sessionRef =
    await addDoc(
      sessionsCollection,
      {
        adminId,
        title,
        courseCode,
        joinCode,

        status: "active",

        createdAt:
          serverTimestamp(),

        endedAt: null,

        aiSummary: null,

        participantCount: 0,

        totalSignals: 0,

        /*
         * Faculty-controlled pulse system
         */
        roundStatus: "waiting",

        currentRound: 0,

        roundDurationSeconds: 120,

        roundStartedAt: null,

        roundEndedAt: null,
      }
    )

  return sessionRef.id
}

export async function getSessionById(
  sessionId: string
): Promise<Session | null> {
  const cleanSessionId =
    sessionId.trim()

  if (!cleanSessionId) {
    return null
  }

  const sessionRef =
    doc(
      db,
      "sessions",
      cleanSessionId
    )

  const snapshot =
    await getDoc(
      sessionRef
    )

  if (!snapshot.exists()) {
    return null
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<
      Session,
      "id"
    >),
  }
}

export async function getSessionByJoinCode(
  joinCode: string
): Promise<Session | null> {
  const cleanJoinCode =
    joinCode
      .trim()
      .toUpperCase()

  if (!cleanJoinCode) {
    return null
  }

  const sessionsQuery =
    query(
      sessionsCollection,
      where(
        "joinCode",
        "==",
        cleanJoinCode
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
      sessionsQuery
    )

  if (snapshot.empty) {
    return null
  }

  const sessionDocument =
    snapshot.docs[0]

  return {
    id:
      sessionDocument.id,
    ...(
      sessionDocument.data() as Omit<
        Session,
        "id"
      >
    ),
  }
}

export async function endSession(
  sessionId: string
): Promise<void> {
  const cleanSessionId =
    sessionId.trim()

  if (!cleanSessionId) {
    throw new Error(
      "Session ID is required."
    )
  }

  const sessionRef =
    doc(
      db,
      "sessions",
      cleanSessionId
    )

  await updateDoc(
    sessionRef,
    {
      status: "ended",
      endedAt:
        serverTimestamp(),
    }
  )
}