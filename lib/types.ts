import type { Timestamp } from "firebase/firestore"

export type Role =
  | "admin"
  | "student"

export type SessionStatus =
  | "active"
  | "ended"

export type SignalType =
  | "got_it"
  | "slightly_lost"
  | "confused"
  | "interesting"

export type User = {
  uid: string
  email: string
  name: string
  photoURL: string
  role: Role
  createdAt: Timestamp
}

export type Session = {
  id: string
  adminId: string

  title: string
  courseCode: string
  joinCode: string

  status: SessionStatus

  createdAt: Timestamp
  endedAt: Timestamp | null

  participantCount: number
  totalSignals: number

  aiSummary: AISummary | null

  /*
   * Live teaching pulse state
   */
  currentRound?: number
  roundStatus?:
    | "waiting"
    | "active"
    | "completed"

  roundTopic?: string
  roundStartedAt?: Timestamp | null
  roundEndedAt?: Timestamp | null
}

export type Signal = {
  id: string

  sessionId: string
  studentId: string

  signal: SignalType

  /*
   * NEW:
   * Every response belongs to a specific teaching pulse.
   */
  round: number

  timestamp: Timestamp
}

export type SignalCounts = {
  got_it: number
  slightly_lost: number
  confused: number
  interesting: number
}

export type Snapshot = {
  round: number
  topic: string

  got_it: number
  slightly_lost: number
  confused: number
  interesting: number

  total: number
}

export type AISummary = {
  overview: string
  keyInsights: string[]
  recommendations: string[]
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}