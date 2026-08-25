import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app"
import { Firestore, getFirestore } from "firebase-admin/firestore"

function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp()
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  )

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin environment variables. Check your .env.local file."
    )
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

export function getAdminDb(): Firestore {
  const adminApp = getFirebaseAdminApp()
  return getFirestore(adminApp)
}