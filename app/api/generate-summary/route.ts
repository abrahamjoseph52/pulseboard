import { GoogleGenerativeAI } from "@google/generative-ai"

type Snapshot = {
  round?: number
  topic?: string
  got_it: number
  slightly_lost: number
  confused: number
  interesting: number
  total: number
}

type RequestBody = {
  sessionId: string
  snapshots: Snapshot[]
  sessionTitle: string
  courseCode: string
}

function buildPrompt(
  courseCode: string,
  sessionTitle: string,
  snapshots: Snapshot[]
): string {
  const safeSnapshots =
    Array.isArray(snapshots)
      ? snapshots
      : []

  const roundCount =
    safeSnapshots.length

  let totalConfusionRate = 0

  let peakConfusionIndex = 0
  let peakConfusionRate = 0

  let peakInterestIndex = 0
  let peakInterestRate = 0

  const lines: string[] = []

  safeSnapshots.forEach(
    (
      snapshot,
      index
    ) => {
      const roundLabel =
        snapshot.round != null
          ? `Round ${snapshot.round}`
          : `Round ${index + 1}`

      const topic =
        snapshot.topic?.trim() ||
        "Untitled topic"

      const total =
        Number(
          snapshot.total
        ) || 0

      const gotIt =
        Number(
          snapshot.got_it
        ) || 0

      const slightlyLost =
        Number(
          snapshot.slightly_lost
        ) || 0

      const confused =
        Number(
          snapshot.confused
        ) || 0

      const interesting =
        Number(
          snapshot.interesting
        ) || 0

      const confusionRate =
        total > 0
          ? (confused +
              slightlyLost) /
            total
          : 0

      const interestRate =
        total > 0
          ? interesting /
            total
          : 0

      totalConfusionRate +=
        confusionRate

      if (
        confusionRate >
        peakConfusionRate
      ) {
        peakConfusionRate =
          confusionRate

        peakConfusionIndex =
          index
      }

      if (
        interestRate >
        peakInterestRate
      ) {
        peakInterestRate =
          interestRate

        peakInterestIndex =
          index
      }

      lines.push(
        `${roundLabel} — Topic: "${topic}": got_it=${gotIt}, slightly_lost=${slightlyLost}, confused=${confused}, interesting=${interesting}, total_students=${total}`
      )
    }
  )

  const averageConfusionRate =
    roundCount > 0
      ? Math.round(
          (totalConfusionRate /
            roundCount) *
            100
        )
      : 0

  const peakConfusionSnapshot =
    safeSnapshots[
      peakConfusionIndex
    ]

  const peakInterestSnapshot =
    safeSnapshots[
      peakInterestIndex
    ]

  const peakConfusionLabel =
    peakConfusionSnapshot
      ? `Round ${
          peakConfusionSnapshot.round ??
          peakConfusionIndex +
            1
        } — "${
          peakConfusionSnapshot.topic?.trim() ||
          "Untitled topic"
        }"`
      : "No round"

  const peakInterestLabel =
    peakInterestSnapshot
      ? `Round ${
          peakInterestSnapshot.round ??
          peakInterestIndex +
            1
        } — "${
          peakInterestSnapshot.topic?.trim() ||
          "Untitled topic"
        }"`
      : "No round"

  const totalStudents =
    safeSnapshots.length > 0
      ? Math.max(
          ...safeSnapshots.map(
            (
              snapshot
            ) =>
              Number(
                snapshot.total
              ) || 0
          )
        )
      : 0

  return `
You are an expert teaching assistant writing a post-session feedback report for a university professor.

Session details:

- Course: ${courseCode}
- Session: "${sessionTitle}"
- Total teaching pulses recorded: ${roundCount}
- Each pulse represents a deliberate teaching segment selected by the professor.
- Maximum students observed in one pulse: ${totalStudents}
- Average confusion rate: ${averageConfusionRate}%
- Peak confusion segment: ${peakConfusionLabel} (${Math.round(
    peakConfusionRate * 100
  )}% confused or slightly lost)
- Peak interest segment: ${peakInterestLabel} (${Math.round(
    peakInterestRate * 100
  )}% interesting)

Signal data per teaching pulse:

${lines.join("\n")}

IMPORTANT:

Write exactly 4 complete paragraphs separated by blank lines.

Do not use:
- bullet points
- numbered lists
- markdown
- headers
- asterisks

Paragraph 1 — Overall engagement:
Describe how engaged and focused the class was overall. Mention the number of students observed and how the response changed between teaching topics.

Paragraph 2 — Topic-level confusion:
Identify the teaching topic that produced the strongest confusion or "slightly lost" response. Explain what that likely means about pacing, difficulty, explanation quality, or prerequisites.

Paragraph 3 — Topic-level interest:
Identify the teaching topic that generated the strongest interest. Explain what that suggests about the material, example, explanation, or classroom momentum.

Paragraph 4 — Concrete recommendation:
Give one specific actionable recommendation for the next class. Name the exact topic that should be revisited, say how the professor should approach it, and explain why the PulseBoard data supports that recommendation.

Reference actual topic names, round numbers, and signal values from the supplied data.

Write warmly and professionally, like a thoughtful colleague reviewing the class.
`.trim()
}

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error
  }

  return "Unknown Gemini API error."
}

export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY

    if (!apiKey) {
      return Response.json(
        {
          error:
            "Gemini API key is missing. Add GEMINI_API_KEY to .env.local and restart the server.",
        },
        {
          status: 500,
        }
      )
    }

    let body: RequestBody

    try {
      body =
        (await request.json()) as RequestBody
    } catch {
      return Response.json(
        {
          error:
            "Invalid JSON request body.",
        },
        {
          status: 400,
        }
      )
    }

    const {
      sessionId,
      snapshots,
      sessionTitle,
      courseCode,
    } = body

    if (
      !sessionId?.trim()
    ) {
      return Response.json(
        {
          error:
            "Session ID is required.",
        },
        {
          status: 400,
        }
      )
    }

    if (
      !sessionTitle?.trim()
    ) {
      return Response.json(
        {
          error:
            "Session title is required.",
        },
        {
          status: 400,
        }
      )
    }

    if (
      !courseCode?.trim()
    ) {
      return Response.json(
        {
          error:
            "Course code is required.",
        },
        {
          status: 400,
        }
      )
    }

    if (
      !Array.isArray(
        snapshots
      )
    ) {
      return Response.json(
        {
          error:
            "Snapshots must be an array.",
        },
        {
          status: 400,
        }
      )
    }

    if (
      snapshots.length ===
      0
    ) {
      return Response.json({
        success: true,

        summary:
          "The session ended before a complete teaching pulse was recorded. Run at least one pulse to generate detailed teaching insights.",
      })
    }

    const prompt =
      buildPrompt(
        courseCode.trim(),
        sessionTitle.trim(),
        snapshots
      )

    const genAI =
      new GoogleGenerativeAI(
        apiKey
      )

    const model =
      genAI.getGenerativeModel(
        {
          model:
            "gemini-3.6-flash",
        }
      )

    const result =
      await model.generateContent(
        prompt
      )

    const summary =
      result.response
        .text()
        .trim()

    if (!summary) {
      throw new Error(
        "Gemini returned an empty summary."
      )
    }

    return Response.json({
      success: true,
      summary,
    })
  } catch (error) {
    const message =
      getErrorMessage(
        error
      )

    console.error(
      "generate-summary error:",
      error
    )

    return Response.json(
      {
        error:
          `Failed to generate AI summary: ${message}`,
      },
      {
        status: 500,
      }
    )
  }
}