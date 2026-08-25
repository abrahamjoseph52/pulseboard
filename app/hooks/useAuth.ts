"use client"

import { useEffect, useState } from "react"

import {
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth"

import {
  doc,
  getDoc,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase"
import type { User } from "@/lib/types"

type UseAuthReturn = {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setFirebaseUser(currentUser)

        if (!currentUser) {
          setUser(null)
          setLoading(false)
          return
        }

        try {
          const userRef = doc(db, "users", currentUser.uid)
          const snapshot = await getDoc(userRef)

          if (snapshot.exists()) {
            setUser(snapshot.data() as User)
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error(
            "Failed to load PulseBoard user:",
            error
          )
          setUser(null)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => unsubscribe()
  }, [])

  return {
    user,
    firebaseUser,
    loading,
  }
}