"use client";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type LearningLevel =
  | "strong"
  | "moderate"
  | "critical";

export interface LearningGap {
  topic: string;

  round: number;

  totalResponses: number;

  confusedCount: number;

  partialCount: number;

  understoodCount: number;

  confusionPercentage: number;

  partialPercentage: number;

  understandingPercentage: number;

  level: LearningLevel;
}

/*
|--------------------------------------------------------------------------
| Normalize existing PulseBoard signals
|--------------------------------------------------------------------------
|
| Existing signals:
|
| got_it
| slightly_lost
| confused
| interesting
|
| Intelligence model:
|
| got_it          -> understood
| slightly_lost   -> partial
| confused        -> confused
| interesting     -> understood
|
|--------------------------------------------------------------------------
*/

function normalizeSignal(
  signal: unknown
):
  | "confused"
  | "partial"
  | "understood"
  | null {
  if (typeof signal !== "string") {
    return null;
  }

  const value = signal
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ");

  /*
  |--------------------------------------------------------------------------
  | Confused
  |--------------------------------------------------------------------------
  */

  if (
    value === "confused" ||
    value.includes("confus") ||
    value.includes("unclear") ||
    value.includes("not understand") ||
    value === "red"
  ) {
    return "confused";
  }

  /*
  |--------------------------------------------------------------------------
  | Partial understanding
  |--------------------------------------------------------------------------
  */

  if (
    value === "slightly lost" ||
    value === "slightly_lost" ||
    value.includes("partial") ||
    value.includes("slightly lost") ||
    value.includes("somewhat") ||
    value.includes("maybe") ||
    value === "yellow"
  ) {
    return "partial";
  }

  /*
  |--------------------------------------------------------------------------
  | Strong / positive understanding
  |--------------------------------------------------------------------------
  */

  if (
    value === "got it" ||
    value === "got_it" ||
    value === "understood" ||
    value.includes("understand") ||
    value.includes("clear") ||
    value.includes("good") ||
    value === "green" ||
    value === "interesting"
  ) {
    return "understood";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Get round
|--------------------------------------------------------------------------
*/

function getRound(
  data: Record<string, unknown>
): number {
  const value =
    data.round ??
    data.roundNumber ??
    data.pulseRound;

  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (
      Number.isInteger(parsed) &&
      parsed > 0
    ) {
      return parsed;
    }
  }

  return 0;
}

/*
|--------------------------------------------------------------------------
| Get topic
|--------------------------------------------------------------------------
|
| Existing signals primarily contain "round".
|
| If a topic field exists, use it.
| Otherwise use "Topic X".
|
|--------------------------------------------------------------------------
*/

function getTopic(
  data: Record<string, unknown>
): string {
  const possibleTopics = [
    data.topic,
    data.topicName,
    data.title,
    data.subject,
    data.roundTopic,
  ];

  for (const topic of possibleTopics) {
    if (
      typeof topic === "string" &&
      topic.trim()
    ) {
      return topic.trim();
    }
  }

  const round = getRound(data);

  if (round > 0) {
    return `Topic ${round}`;
  }

  return "General";
}

/*
|--------------------------------------------------------------------------
| Calculate learning gaps
|--------------------------------------------------------------------------
*/

export function calculateLearningGaps(
  documents: Record<string, unknown>[]
): LearningGap[] {
  const topicMap: Record<
    string,
    {
      round: number;

      confused: number;

      partial: number;

      understood: number;
    }
  > = {};

  for (const data of documents) {
    const signal = normalizeSignal(
      data.signal
    );

    if (!signal) {
      continue;
    }

    const round = getRound(data);

    const topic = getTopic(data);

    const key =
      round > 0
        ? `round-${round}`
        : topic;

    if (!topicMap[key]) {
      topicMap[key] = {
        round,

        confused: 0,

        partial: 0,

        understood: 0,
      };
    }

    topicMap[key][signal]++;
  }

  const result: LearningGap[] =
    Object.entries(topicMap).map(
      ([key, values]) => {
        const totalResponses =
          values.confused +
          values.partial +
          values.understood;

        const confusionPercentage =
          totalResponses === 0
            ? 0
            : Math.round(
                (values.confused /
                  totalResponses) *
                  100
              );

        const partialPercentage =
          totalResponses === 0
            ? 0
            : Math.round(
                (values.partial /
                  totalResponses) *
                  100
              );

        const understandingPercentage =
          totalResponses === 0
            ? 0
            : Math.round(
                (values.understood /
                  totalResponses) *
                  100
              );

        let level: LearningLevel =
          "strong";

        if (
          confusionPercentage >= 50
        ) {
          level = "critical";
        } else if (
          confusionPercentage >= 25
        ) {
          level = "moderate";
        }

        return {
          topic:
            key.startsWith("round-")
              ? `Topic ${values.round}`
              : key,

          round: values.round,

          totalResponses,

          confusedCount:
            values.confused,

          partialCount:
            values.partial,

          understoodCount:
            values.understood,

          confusionPercentage,

          partialPercentage,

          understandingPercentage,

          level,
        };
      }
    );

  /*
  |--------------------------------------------------------------------------
  | Sort by round first
  |--------------------------------------------------------------------------
  */

  result.sort(
    (a, b) => {
      if (
        a.round > 0 &&
        b.round > 0
      ) {
        return a.round - b.round;
      }

      return (
        b.confusionPercentage -
        a.confusionPercentage
      );
    }
  );

  return result;
}

/*
|--------------------------------------------------------------------------
| Subscribe to learning gaps
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Firestore onSnapshot automatically fires whenever:
|
| - a signal is added
| - a signal changes
| - a signal is removed
|
| Therefore the UI updates in real time.
|
|--------------------------------------------------------------------------
*/

export function subscribeToLearningGaps(
  sessionId: string,
  callback: (
    gaps: LearningGap[]
  ) => void,
  onError?: (
    error: Error
  ) => void
): () => void {
  const cleanSessionId =
    sessionId.trim();

  if (!cleanSessionId) {
    callback([]);

    return () => {};
  }

  const signalsQuery = query(
    collection(db, "signals"),
    where(
      "sessionId",
      "==",
      cleanSessionId
    )
  );

  return onSnapshot(
    signalsQuery,
    (snapshot) => {
      const documents =
        snapshot.docs.map(
          (document) =>
            document.data() as Record<
              string,
              unknown
            >
        );

      const gaps =
        calculateLearningGaps(
          documents
        );

      callback(gaps);
    },
    (error) => {
      console.error(
        "Learning gap listener error:",
        error
      );

      onError?.(error);
    }
  );
}

/*
|--------------------------------------------------------------------------
| Overall classroom learning score
|--------------------------------------------------------------------------
*/

export function calculateOverallLearningScore(
  gaps: LearningGap[]
): number {
  if (gaps.length === 0) {
    return 0;
  }

  const totalResponses =
    gaps.reduce(
      (sum, gap) =>
        sum + gap.totalResponses,
      0
    );

  if (totalResponses === 0) {
    return 0;
  }

  const understood =
    gaps.reduce(
      (sum, gap) =>
        sum + gap.understoodCount,
      0
    );

  return Math.round(
    (understood /
      totalResponses) *
      100
  );
}