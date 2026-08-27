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

export type TimelineLevel =
  | "strong"
  | "stable"
  | "warning"
  | "critical"
  | "recovery";

export interface TimelineRound {
  round: number;

  timestamp: Date | null;

  totalResponses: number;

  confusedCount: number;

  partialCount: number;

  understoodCount: number;

  understandingPercentage: number;

  confusionPercentage: number;

  level: TimelineLevel;

  title: string;

  description: string;
}

/*
|--------------------------------------------------------------------------
| Normalize pulse signal
|--------------------------------------------------------------------------
|
| Supports several common formats so we don't have to modify
| your existing Live Pulse implementation.
|
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

  if (
    value.includes("confus") ||
    value.includes("unclear") ||
    value.includes("not understand") ||
    value === "red"
  ) {
    return "confused";
  }

  if (
    value.includes("partial") ||
    value.includes("somewhat") ||
    value.includes("maybe") ||
    value === "yellow"
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
| Get round number
|--------------------------------------------------------------------------
*/

function getRound(
  data: Record<string, unknown>
): number | null {
  const value =
    data.round ??
    data.roundNumber ??
    data.pulseRound;

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Get timestamp
|--------------------------------------------------------------------------
*/

function getTimestamp(
  data: Record<string, unknown>
): Date | null {
  const value =
    data.timestamp ??
    data.createdAt ??
    data.time;

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    ).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Build timeline
|--------------------------------------------------------------------------
*/

export function calculateSessionTimeline(
  documents: Record<string, unknown>[]
): TimelineRound[] {
  const roundMap: Record<
    number,
    {
      timestamp: Date | null;

      confused: number;

      partial: number;

      understood: number;
    }
  > = {};

  for (const data of documents) {
    const round = getRound(data);

    const signal = normalizeSignal(
      data.signal
    );

    if (round === null || !signal) {
      continue;
    }

    if (!roundMap[round]) {
      roundMap[round] = {
        timestamp:
          getTimestamp(data),

        confused: 0,

        partial: 0,

        understood: 0,
      };
    }

    const timestamp =
      getTimestamp(data);

    if (
      timestamp &&
      (!roundMap[round].timestamp ||
        timestamp <
          roundMap[round]
            .timestamp!)
    ) {
      roundMap[round].timestamp =
        timestamp;
    }

    roundMap[round][signal]++;
  }

  const rounds = Object.entries(
    roundMap
  ).map(
    ([roundNumber, values]) => {
      const round = Number(
        roundNumber
      );

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

      const understandingPercentage =
        totalResponses === 0
          ? 0
          : Math.round(
              (values.understood /
                totalResponses) *
                100
            );

      return {
        round,

        timestamp:
          values.timestamp,

        totalResponses,

        confusedCount:
          values.confused,

        partialCount:
          values.partial,

        understoodCount:
          values.understood,

        understandingPercentage,

        confusionPercentage,

        level:
          "stable" as TimelineLevel,

        title: "",

        description: "",
      };
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Sort chronologically
  |--------------------------------------------------------------------------
  */

  rounds.sort(
    (a, b) =>
      a.round - b.round
  );

  /*
  |--------------------------------------------------------------------------
  | Determine classroom story
  |--------------------------------------------------------------------------
  */

  let previousUnderstanding:
    | number
    | null = null;

  for (
    let index = 0;
    index < rounds.length;
    index++
  ) {
    const current =
      rounds[index];

    const previous =
      previousUnderstanding;

    /*
    |--------------------------------------------------------------------------
    | First round
    |--------------------------------------------------------------------------
    */

    if (index === 0) {
      if (
        current.understandingPercentage >=
        70
      ) {
        current.level = "strong";

        current.title =
          "Strong start";

        current.description =
          "Students began the session with a good level of understanding.";
      } else if (
        current.confusionPercentage >=
        50
      ) {
        current.level = "critical";

        current.title =
          "Early learning gap";

        current.description =
          "The class showed significant confusion at the beginning of the session.";
      } else {
        current.level = "stable";

        current.title =
          "Session started";

        current.description =
          "The class started with a mixed level of understanding.";
      }

      previousUnderstanding =
        current.understandingPercentage;

      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Critical confusion
    |--------------------------------------------------------------------------
    */

    if (
      current.confusionPercentage >=
      50
    ) {
      current.level =
        "critical";

      current.title =
        "Major learning dip";

      current.description =
        "A large portion of the class is showing confusion at this point.";

      previousUnderstanding =
        current.understandingPercentage;

      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Recovery
    |--------------------------------------------------------------------------
    */

    if (
      previous !== null &&
      current.understandingPercentage -
        previous >=
        15
    ) {
      current.level =
        "recovery";

      current.title =
        "Understanding recovered";

      current.description =
        "Student understanding improved significantly compared with the previous round.";

      previousUnderstanding =
        current.understandingPercentage;

      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Significant drop
    |--------------------------------------------------------------------------
    */

    if (
      previous !== null &&
      previous -
        current.understandingPercentage >=
        15
    ) {
      current.level =
        "warning";

      current.title =
        "Understanding dropped";

      current.description =
        "Student understanding decreased noticeably compared with the previous round.";

      previousUnderstanding =
        current.understandingPercentage;

      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Strong understanding
    |--------------------------------------------------------------------------
    */

    if (
      current.understandingPercentage >=
      70
    ) {
      current.level =
        "strong";

      current.title =
        "Strong understanding";

      current.description =
        "Most students are following the concept confidently.";
    } else if (
      current.confusionPercentage >=
      25
    ) {
      current.level =
        "warning";

      current.title =
        "Confusion increasing";

      current.description =
        "A noticeable group of students may need additional explanation.";
    } else {
      current.level =
        "stable";

      current.title =
        "Understanding stable";

      current.description =
        "The class is maintaining a relatively stable level of understanding.";
    }

    previousUnderstanding =
      current.understandingPercentage;
  }

  return rounds;
}

/*
|--------------------------------------------------------------------------
| Subscribe to timeline
|--------------------------------------------------------------------------
*/

export function subscribeToSessionTimeline(
  sessionId: string,
  callback: (
    timeline: TimelineRound[]
  ) => void,
  onError?: (
    error: Error
  ) => void
): () => void {
  if (!sessionId) {
    callback([]);

    return () => {};
  }

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

      const timeline =
        calculateSessionTimeline(
          documents
        );

      callback(timeline);
    },
    (error) => {
      console.error(
        "Session timeline error:",
        error
      );

      onError?.(error);
    }
  );
}

/*
|--------------------------------------------------------------------------
| Timeline summary
|--------------------------------------------------------------------------
*/

export function getTimelineSummary(
  timeline: TimelineRound[]
) {
  if (timeline.length === 0) {
    return {
      totalRounds: 0,

      highestUnderstanding: 0,

      lowestUnderstanding: 0,

      criticalMoments: 0,

      recoveryMoments: 0,

      finalUnderstanding: 0,
    };
  }

  const understandingValues =
    timeline.map(
      (round) =>
        round.understandingPercentage
    );

  return {
    totalRounds:
      timeline.length,

    highestUnderstanding:
      Math.max(
        ...understandingValues
      ),

    lowestUnderstanding:
      Math.min(
        ...understandingValues
      ),

    criticalMoments:
      timeline.filter(
        (round) =>
          round.level ===
          "critical"
      ).length,

    recoveryMoments:
      timeline.filter(
        (round) =>
          round.level ===
          "recovery"
      ).length,

    finalUnderstanding:
      timeline[
        timeline.length - 1
      ].understandingPercentage,
  };
}