"use client"

import {
  useEffect,
  useState,
} from "react"

import {
  doc,
  onSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import type { Session } from "@/lib/types"

type UseSessionReturn = {
  session: Session | null
  loading: boolean
  error: string | null
}

export function useSession(
  sessionId: string | undefined
): UseSessionReturn {
  const hasSessionId =
    Boolean(sessionId)

  const [session, setSession] =
    useState<Session | null>(null)

  const [loading, setLoading] =
    useState<boolean>(
      hasSessionId
    )

  const [error, setError] =
    useState<string | null>(
      hasSessionId
        ? null
        : "Session ID is missing."
    )

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const sessionRef = doc(
      db,
      "sessions",
      sessionId
    )

    const unsubscribe =
      onSnapshot(
        sessionRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setSession(null)
            setError(
              "Session not found."
            )
            setLoading(false)
            return
          }

          const data =
            snapshot.data() as Omit<
              Session,
              "id"
            >

          const nextSession: Session = {
            id: snapshot.id,
            ...data,
          }

          setSession(
            nextSession
          )

          setError(null)
          setLoading(false)
        },
        (snapshotError) => {
          console.error(
            "Failed to load session:",
            snapshotError
          )

          setSession(null)
          setError(
            "Unable to load this session."
          )
          setLoading(false)
        }
      )

    return unsubscribe
  }, [sessionId])

  return {
    session,
    loading,
    error,
  }
}