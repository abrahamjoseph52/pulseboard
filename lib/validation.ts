import { VALIDATION } from "./constants"

/* =========================
   COMMON
========================= */

export type ValidationResult = {
  isValid: boolean
  error?: string
}

/* =========================
   SESSION VALIDATION
========================= */

export function validateSessionTitle(
  title: string
): ValidationResult {
  const value = title.trim()

  if (!value) {
    return {
      isValid: false,
      error: "Session title is required.",
    }
  }

  if (value.length < VALIDATION.sessionTitleMinLength) {
    return {
      isValid: false,
      error: `Session title must be at least ${VALIDATION.sessionTitleMinLength} characters.`,
    }
  }

  if (value.length > VALIDATION.sessionTitleMaxLength) {
    return {
      isValid: false,
      error: `Session title cannot exceed ${VALIDATION.sessionTitleMaxLength} characters.`,
    }
  }

  return { isValid: true }
}

export function validateCourseCode(
  courseCode: string
): ValidationResult {
  const value = courseCode.trim()

  if (!value) {
    return {
      isValid: false,
      error: "Course code is required.",
    }
  }

  if (value.length < VALIDATION.courseCodeMinLength) {
    return {
      isValid: false,
      error: `Course code must be at least ${VALIDATION.courseCodeMinLength} characters.`,
    }
  }

  if (value.length > VALIDATION.courseCodeMaxLength) {
    return {
      isValid: false,
      error: `Course code cannot exceed ${VALIDATION.courseCodeMaxLength} characters.`,
    }
  }

  return { isValid: true }
}

/* =========================
   JOIN CODE VALIDATION
========================= */

export function validateJoinCode(
  joinCode: string
): ValidationResult {
  const value = joinCode.trim().toUpperCase()

  if (!value) {
    return {
      isValid: false,
      error: "Please enter a session code.",
    }
  }

  if (value.length !== VALIDATION.joinCodeLength) {
    return {
      isValid: false,
      error: `Session code must contain exactly ${VALIDATION.joinCodeLength} characters.`,
    }
  }

  return { isValid: true }
}

/* =========================
   FEEDBACK VALIDATION
========================= */

export function validateFeedbackText(
  feedback: string
): ValidationResult {
  const value = feedback.trim()

  if (value.length > VALIDATION.feedbackMaxLength) {
    return {
      isValid: false,
      error: `Feedback cannot exceed ${VALIDATION.feedbackMaxLength} characters.`,
    }
  }

  return { isValid: true }
}

/* =========================
   EMAIL VALIDATION
========================= */

export function validateEmail(
  email: string
): ValidationResult {
  const value = email.trim()

  if (!value) {
    return {
      isValid: false,
      error: "Email is required.",
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(value)) {
    return {
      isValid: false,
      error: "Please enter a valid email address.",
    }
  }

  return { isValid: true }
}
