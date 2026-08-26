import type {
  SignalType,
} from "@/lib/types"

export type SignalCounts =
  Record<SignalType, number>

export type Snapshot = {
  round: number
  topic: string
  got_it: number
  slightly_lost: number
  confused: number
  interesting: number
  total: number
}

export type GenerateSummaryInput = {
  sessionId: string
  sessionTitle: string
  courseCode: string
  snapshots: Snapshot[]
}

export async function generateSummary(
  data: GenerateSummaryInput
): Promise<string> {
  if (
    !data.sessionId.trim()
  ) {
    throw new Error(
      "Session ID is required."
    )
  }

  if (
    !data.sessionTitle.trim()
  ) {
    throw new Error(
      "Session title is required."
    )
  }

  if (
    !data.courseCode.trim()
  ) {
    throw new Error(
      "Course code is required."
    )
  }

  if (
    !Array.isArray(
      data.snapshots
    )
  ) {
    throw new Error(
      "Session snapshots are required."
    )
  }

  const response =
    await fetch(
      "/api/generate-summary",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          sessionId:
            data.sessionId,

          snapshots:
            data.snapshots,

          sessionTitle:
            data.sessionTitle,

          courseCode:
            data.courseCode,
        }),
      }
    )

  const result =
    (await response.json()) as {
      summary?: unknown
      error?: unknown
    }

  if (!response.ok) {
    const message =
      typeof result.error ===
      "string"
        ? result.error
        : "Failed to generate AI summary."

    throw new Error(
      message
    )
  }

  if (
    typeof result.summary !==
    "string"
  ) {
    throw new Error(
      "The AI summary response was invalid."
    )
  }

  return result.summary
}