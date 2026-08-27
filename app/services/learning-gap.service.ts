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
| Supported signal values
|--------------------------------------------------------------------------
|
| Your existing PulseBoard may use slightly different strings.
| We normalize them here so the analysis remains isolated from
| your existing Live Pulse implementation.
|
*/

function normalizeSignal(
  signal: unknown
): "confused" | "partial" | "understood" | null {
  if (typeof signal !== "string") {
    return null;
  }

  const value = signal
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ");

  if (
    value.includes("confus") ||
    value.includes("not understand") ||
    value.includes("unclear") ||
    value === "red"
  ) {
    return "confused";
  }

  if (
    value.includes("partial") ||
    value.includes("somewhat") ||
    value.includes("maybe") ||
    value.includes("yellow")
  ) {
    return "partial";
  }

  if (
    value.includes("understood") ||
    value.includes("understand") ||
    value.includes("clear") ||
    value.includes("good") ||
    value === "green"
  ) {
    return "understood";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Topic extraction
|--------------------------------------------------------------------------
|
| The existing signals collection may or may not contain a topic.
|
| We first look for common topic field names.
|
*/

function getTopic(
  data: Record<string, unknown>
): string {
  const possibleTopics = [
    data.topic,
    data.topicName,
    data.title,
    data.subject,
  ];

  for (const topic of possibleTopics) {
    if (
      typeof topic === "string" &&
      topic.trim()
    ) {
      return topic.trim();
    }
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

    const topic = getTopic(data);

    if (!topicMap[topic]) {
      topicMap[topic] = {
        confused: 0,
        partial: 0,
        understood: 0,
      };
    }

    topicMap[topic][signal]++;
  }

  const result: LearningGap[] = Object.entries(
    topicMap
  ).map(([topic, values]) => {
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

    if (confusionPercentage >= 50) {
      level = "critical";
    } else if (confusionPercentage >= 25) {
      level = "moderate";
    }

    return {
      topic,

      totalResponses,

      confusedCount: values.confused,

      partialCount: values.partial,

      understoodCount:
        values.understood,

      confusionPercentage,

      partialPercentage,

      understandingPercentage,

      level,
    };
  });

  /*
  |--------------------------------------------------------------------------
  | Most problematic topics first
  |--------------------------------------------------------------------------
  */

  result.sort(
    (a, b) =>
      b.confusionPercentage -
      a.confusionPercentage
  );

  return result;
}

/*
|--------------------------------------------------------------------------
| Subscribe to learning gaps
|--------------------------------------------------------------------------
*/

export function subscribeToLearningGaps(
  sessionId: string,
  callback: (
    gaps: LearningGap[]
  ) => void,
  onError?: (error: Error) => void
): () => void {
  if (!sessionId) {
    callback([]);

    return () => {};
  }

  /*
  |--------------------------------------------------------------------------
  | IMPORTANT
  |--------------------------------------------------------------------------
  |
  | Only one Firestore where condition is used.
  | This avoids requiring a composite index.
  |
  */

  const signalsQuery = query(
    collection(db, "signals"),
    where(
      "sessionId",
      "==",
      sessionId
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