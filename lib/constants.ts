/* =========================
   APPLICATION
========================= */

export const APP_NAME = "Pulse"

export const APP_DESCRIPTION =
  "Real-time classroom feedback and AI-powered learning insights"

/* =========================
   ROUTES
========================= */

export const ROUTES = {
  home: "/",
  login: "/login",

  adminDashboard: "/admin/dashboard",
  adminSessions: "/admin/sessions",
  adminAnalytics: "/admin/analytics",

  studentHome: "/student",
  studentJoin: "/student/join",
} as const

/* =========================
   SESSION
========================= */

export const SESSION_STATUS = {
  ACTIVE: "active",
  ENDED: "ended",
} as const

export const JOIN_CODE_LENGTH = 6

export const JOIN_CODE_CHARACTERS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/* =========================
   FEEDBACK PULSE
========================= */

export const PULSE_INTERVAL_SECONDS = 120

export const SIGNAL_TYPES = {
  GOT_IT: "got_it",
  SLIGHTLY_LOST: "slightly_lost",
  CONFUSED: "confused",
  INTERESTING: "interesting",
} as const

export const SIGNAL_LABELS = {
  got_it: "Got it",
  slightly_lost: "Slightly lost",
  confused: "Confused",
  interesting: "Interesting",
} as const

export const SIGNAL_DESCRIPTIONS = {
  got_it: "I understand the topic",
  slightly_lost: "I understand most of it but need some clarification",
  confused: "I need more explanation",
  interesting: "This topic is especially interesting",
} as const

/* =========================
   VALIDATION
========================= */

export const VALIDATION = {
  sessionTitleMinLength: 3,
  sessionTitleMaxLength: 100,

  courseCodeMinLength: 2,
  courseCodeMaxLength: 20,

  joinCodeLength: JOIN_CODE_LENGTH,

  feedbackMaxLength: 500,
} as const

/* =========================
   UI
========================= */

export const UI = {
  toastDuration: 4000,
  animationDuration: 200,
} as const