import { JOIN_CODE_CHARACTERS, JOIN_CODE_LENGTH } from "./constants"

/* =========================
   JOIN CODE
========================= */

export function generateJoinCode(
  length: number = JOIN_CODE_LENGTH
): string {
  let code = ""

  for (let index = 0; index < length; index++) {
    const randomIndex = Math.floor(
      Math.random() * JOIN_CODE_CHARACTERS.length
    )

    code += JOIN_CODE_CHARACTERS[randomIndex]
  }

  return code
}

/* =========================
   STRING UTILITIES
========================= */

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

export function truncateText(
  text: string,
  maxLength: number
): string {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trimEnd()}...`
}

/* =========================
   NUMBER UTILITIES
========================= */

export function calculatePercentage(
  value: number,
  total: number
): number {
  if (total <= 0) {
    return 0
  }

  return Math.round((value / total) * 100)
}

export function calculateUnderstandingScore(
  gotIt: number,
  slightlyLost: number,
  confused: number,
  total: number
): number {
  if (total <= 0) {
    return 0
  }

  const weightedScore =
    gotIt * 100 +
    slightlyLost * 60 +
    confused * 20

  return Math.round(weightedScore / total)
}

/* =========================
   TIME UTILITIES
========================= */

export function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)

  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

/* =========================
   DATE UTILITIES
========================= */

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date)
}