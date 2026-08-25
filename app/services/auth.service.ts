import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth"

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase"
import type { Role, User } from "@/lib/types"

const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle(
  role: Role
): Promise<User> {
  const result = await signInWithPopup(
    auth,
    googleProvider
  )

  const firebaseUser = result.user

  const userRef = doc(db, "users", firebaseUser.uid)

  const existingUser = await getDoc(userRef)

  if (!existingUser.exists()) {
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? "",
      name: firebaseUser.displayName ?? "PulseBoard User",
      photoURL: firebaseUser.photoURL ?? "",
      role,
      createdAt: serverTimestamp(),
    })
  }

  const userSnapshot = await getDoc(userRef)

  return userSnapshot.data() as User
}

export async function logout(): Promise<void> {
  await signOut(auth)
}