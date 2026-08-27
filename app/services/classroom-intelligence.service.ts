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

export interface IntelligenceQuestion {
  id: string;
  text: string;
  status: string;
  createdAt: Date | null;
}

export interface IntelligenceTopic {
  topic: string;
  confusionPercentage: number;
  understandingPercentage: number;
  confusedCount: number;
  partialCount: number;
  understoodCount: number;
  totalResponses: number;
  level: "strong" | "moderate" | "critical";
}

export interface IntelligenceTimeline {
  round: number;
  understandingPercentage: number;
  confusionPercentage: number;
  level:
    | "strong"
    | "stable"
    | "warning"
    | "critical"
    | "recovery";
  title: string;
  description: string;
  timestamp: Date | null;
}

export interface ClassroomIntelligence {
  totalPulseResponses: number;

  understoodCount: number;

  partialCount: number;

  confusedCount: number;

  understandingPercentage: number;

  confusionPercentage: number;

  partialPercentage: number;

  totalQuestions: number;

  answeredQuestions: number;

  unansweredQuestions: number;

  topics: IntelligenceTopic[];

  criticalTopics: IntelligenceTopic[];

  moderateTopics: IntelligenceTopic[];

  strongTopics: IntelligenceTopic[];

  timeline: IntelligenceTimeline[];

  criticalMoments: IntelligenceTimeline[];

  recoveryMoments: IntelligenceTimeline[];

  biggestLearningGap: IntelligenceTopic | null;

  currentStatus:
    | "excellent"
    | "healthy"
    | "attention"
    | "critical";

  facultyAction: string;

  classroomSummary: string;
}

/*
|--------------------------------------------------------------------------
| Signal normalization
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
| Topic extraction
|--------------------------------------------------------------------------
*/

function getTopic(
  data: Record<string, unknown>
): string {
  const possibleTopics = [
    data.topic,
    data.topicName,
    data.subject,
    data.title,
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
| Date extraction
|--------------------------------------------------------------------------
*/

function getDate(
  value: unknown
): Date | null {
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
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Round extraction
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
| Analyse signals
|--------------------------------------------------------------------------
*/

function analyseSignals(
  documents: Record<string, unknown>[]
) {
  let understoodCount = 0;

  let partialCount = 0;

  let confusedCount = 0;

  const topicMap: Record<
    string,
    {
      understood: number;
      partial: number;
      confused: number;
    }
  > = {};

  const roundMap: Record<
    number,
    {
      understood: number;
      partial: number;
      confused: number;
      timestamp: Date | null;
    }
  > = {};

  for (const data of documents) {
    const signal = normalizeSignal(
      data.signal
    );

    if (!signal) {
      continue;
    }

    if (signal === "understood") {
      understoodCount++;
    }

    if (signal === "partial") {
      partialCount++;
    }

    if (signal === "confused") {
      confusedCount++;
    }

    const topic = getTopic(data);

    if (!topicMap[topic]) {
      topicMap[topic] = {
        understood: 0,
        partial: 0,
        confused: 0,
      };
    }

    topicMap[topic][signal]++;

    const round = getRound(data);

    if (round !== null) {
      if (!roundMap[round]) {
        roundMap[round] = {
          understood: 0,
          partial: 0,
          confused: 0,
          timestamp: null,
        };
      }

      roundMap[round][signal]++;

      const timestamp = getDate(
        data.timestamp ??
          data.createdAt ??
          data.time
      );

      if (
        timestamp &&
        (!roundMap[round].timestamp ||
          timestamp <
            roundMap[round].timestamp!)
      ) {
        roundMap[round].timestamp =
          timestamp;
      }
    }
  }

  const totalResponses =
    understoodCount +
    partialCount +
    confusedCount;

  const understandingPercentage =
    totalResponses === 0
      ? 0
      : Math.round(
          (understoodCount /
            totalResponses) *
            100
        );

  const confusionPercentage =
    totalResponses === 0
      ? 0
      : Math.round(
          (confusedCount /
            totalResponses) *
            100
        );

  const partialPercentage =
    totalResponses === 0
      ? 0
      : Math.round(
          (partialCount /
            totalResponses) *
            100
        );

  const topics: IntelligenceTopic[] =
    Object.entries(topicMap).map(
      ([topic, values]) => {
        const total =
          values.understood +
          values.partial +
          values.confused;

        const confusion =
          total === 0
            ? 0
            : Math.round(
                (values.confused /
                  total) *
                  100
              );

        const understanding =
          total === 0
            ? 0
            : Math.round(
                (values.understood /
                  total) *
                  100
              );

        let level:
          | "strong"
          | "moderate"
          | "critical" =
          "strong";

        if (confusion >= 50) {
          level = "critical";
        } else if (confusion >= 25) {
          level = "moderate";
        }

        return {
          topic,

          confusionPercentage:
            confusion,

          understandingPercentage:
            understanding,

          confusedCount:
            values.confused,

          partialCount:
            values.partial,

          understoodCount:
            values.understood,

          totalResponses: total,

          level,
        };
      }
    );

  topics.sort(
    (a, b) =>
      b.confusionPercentage -
      a.confusionPercentage
  );

  /*
  |--------------------------------------------------------------------------
  | Timeline
  |--------------------------------------------------------------------------
  */

  const timeline: IntelligenceTimeline[] =
    Object.entries(roundMap)
      .map(
        ([roundValue, values]) => {
          const round = Number(
            roundValue
          );

          const total =
            values.understood +
            values.partial +
            values.confused;

          const understanding =
            total === 0
              ? 0
              : Math.round(
                  (values.understood /
                    total) *
                    100
                );

          const confusion =
            total === 0
              ? 0
              : Math.round(
                  (values.confused /
                    total) *
                    100
                );

          return {
            round,

            understandingPercentage:
              understanding,

            confusionPercentage:
              confusion,

            level: "stable" as const,

            title: "Understanding stable",

            description:
              "The class maintained a relatively stable level of understanding.",

            timestamp:
              values.timestamp,
          };
        }
      )
      .sort(
        (a, b) =>
          a.round - b.round
      );

  /*
  |--------------------------------------------------------------------------
  | Timeline interpretation
  |--------------------------------------------------------------------------
  */

  let previousUnderstanding:
    | number
    | null = null;

  for (
    let index = 0;
    index < timeline.length;
    index++
  ) {
    const current =
      timeline[index];

    if (index === 0) {
      if (
        current.understandingPercentage >=
        70
      ) {
        current.level = "strong";

        current.title =
          "Strong start";

        current.description =
          "Students began the session with good understanding.";
      } else if (
        current.confusionPercentage >=
        50
      ) {
        current.level = "critical";

        current.title =
          "Early learning gap";

        current.description =
          "Significant confusion was detected early in the session.";
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

    if (
      current.confusionPercentage >=
      50
    ) {
      current.level = "critical";

      current.title =
        "Major learning dip";

      current.description =
        "A large portion of students are showing confusion.";
    } else if (
      previousUnderstanding !== null &&
      current.understandingPercentage -
        previousUnderstanding >=
        15
    ) {
      current.level = "recovery";

      current.title =
        "Understanding recovered";

      current.description =
        "Student understanding improved significantly.";
    } else if (
      previousUnderstanding !== null &&
      previousUnderstanding -
        current.understandingPercentage >=
        15
    ) {
      current.level = "warning";

      current.title =
        "Understanding dropped";

      current.description =
        "Student understanding decreased noticeably.";
    } else if (
      current.understandingPercentage >=
      70
    ) {
      current.level = "strong";

      current.title =
        "Strong understanding";

      current.description =
        "Most students are following the concept confidently.";
    } else if (
      current.confusionPercentage >=
      25
    ) {
      current.level = "warning";

      current.title =
        "Confusion increasing";

      current.description =
        "A noticeable group of students may need additional explanation.";
    } else {
      current.level = "stable";

      current.title =
        "Understanding stable";

      current.description =
        "The classroom is maintaining a stable learning pattern.";
    }

    previousUnderstanding =
      current.understandingPercentage;
  }

  return {
    totalPulseResponses:
      totalResponses,

    understoodCount,

    partialCount,

    confusedCount,

    understandingPercentage,

    confusionPercentage,

    partialPercentage,

    topics,

    timeline,
  };
}

/*
|--------------------------------------------------------------------------
| Question helpers
|--------------------------------------------------------------------------
*/

function getQuestionStatus(
  data: Record<string, unknown>
): string {
  const possibleValues = [
    data.status,
    data.answerStatus,
    data.state,
  ];

  for (const value of possibleValues) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value
        .trim()
        .toLowerCase();
    }
  }

  return "pending";
}

/*
|--------------------------------------------------------------------------
| Main subscription
|--------------------------------------------------------------------------
*/

export function subscribeToClassroomIntelligence(
  sessionId: string,
  callback: (
    intelligence: ClassroomIntelligence
  ) => void,
  onError?: (
    error: Error
  ) => void
): () => void {
  if (!sessionId) {
    callback(
      createEmptyIntelligence()
    );

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

  const questionsQuery = query(
    collection(db, "questions"),
    where(
      "sessionId",
      "==",
      sessionId
    )
  );

  let signalDocuments:
    Record<string, unknown>[] = [];

  let questionDocuments:
    {
      id: string;
      data: Record<string, unknown>;
    }[] = [];

  let signalsLoaded = false;

  let questionsLoaded = false;

  function publish() {
    if (
      !signalsLoaded ||
      !questionsLoaded
    ) {
      return;
    }

    const signalAnalysis =
      analyseSignals(
        signalDocuments
      );

    const questions: IntelligenceQuestion[] =
      questionDocuments.map(
        (item) => ({
          id: item.id,

          text:
            typeof item.data.text ===
            "string"
              ? item.data.text
              : typeof item.data.question ===
                "string"
              ? item.data.question
              : "",

          status:
            getQuestionStatus(
              item.data
            ),

          createdAt: getDate(
            item.data.createdAt ??
              item.data.timestamp
          ),
        })
      );

    const answeredQuestions =
      questions.filter(
        (question) =>
          question.status ===
            "answered" ||
          question.status ===
            "resolved" ||
          question.status ===
            "replied"
      ).length;

    const unansweredQuestions =
      Math.max(
        0,
        questions.length -
          answeredQuestions
      );

    const criticalTopics =
      signalAnalysis.topics.filter(
        (topic) =>
          topic.level ===
          "critical"
      );

    const moderateTopics =
      signalAnalysis.topics.filter(
        (topic) =>
          topic.level ===
          "moderate"
      );

    const strongTopics =
      signalAnalysis.topics.filter(
        (topic) =>
          topic.level ===
          "strong"
      );

    const criticalMoments =
      signalAnalysis.timeline.filter(
        (item) =>
          item.level ===
          "critical"
      );

    const recoveryMoments =
      signalAnalysis.timeline.filter(
        (item) =>
          item.level ===
          "recovery"
      );

    const biggestLearningGap =
      signalAnalysis.topics.length >
      0
        ? signalAnalysis.topics[0]
        : null;

    let currentStatus:
      | "excellent"
      | "healthy"
      | "attention"
      | "critical" =
      "healthy";

    if (
      signalAnalysis.confusionPercentage >=
      50
    ) {
      currentStatus = "critical";
    } else if (
      signalAnalysis.confusionPercentage >=
      30
    ) {
      currentStatus = "attention";
    } else if (
      signalAnalysis.understandingPercentage >=
      75
    ) {
      currentStatus = "excellent";
    }

    let facultyAction =
      "Continue with the current teaching approach and keep monitoring the class.";

    if (
      biggestLearningGap &&
      biggestLearningGap.level ===
        "critical"
    ) {
      facultyAction =
        `Revisit ${biggestLearningGap.topic} before moving forward. A high level of confusion was detected.`;
    } else if (
      unansweredQuestions > 0
    ) {
      facultyAction =
        `Address the ${unansweredQuestions} unanswered anonymous question${unansweredQuestions === 1 ? "" : "s"} from this session.`;
    } else if (
      criticalMoments.length > 0 &&
      recoveryMoments.length === 0
    ) {
      facultyAction =
        "Review the point where understanding dropped and consider a short recap or example.";
    } else if (
      recoveryMoments.length > 0
    ) {
      facultyAction =
        "The class recovered after a learning dip. Reinforce the concept that helped students recover.";
    }

    let classroomSummary =
      "The classroom is showing a mixed learning pattern.";

    if (
      currentStatus ===
      "excellent"
    ) {
      classroomSummary =
        "The class is demonstrating strong overall understanding.";
    } else if (
      currentStatus ===
      "critical"
    ) {
      classroomSummary =
        "The class is showing significant confusion and may need immediate reinforcement.";
    } else if (
      currentStatus ===
      "attention"
    ) {
      classroomSummary =
        "The class is showing learning gaps that deserve attention.";
    }

    callback({
      totalPulseResponses:
        signalAnalysis.totalPulseResponses,

      understoodCount:
        signalAnalysis.understoodCount,

      partialCount:
        signalAnalysis.partialCount,

      confusedCount:
        signalAnalysis.confusedCount,

      understandingPercentage:
        signalAnalysis.understandingPercentage,

      confusionPercentage:
        signalAnalysis.confusionPercentage,

      partialPercentage:
        signalAnalysis.partialPercentage,

      totalQuestions:
        questions.length,

      answeredQuestions,

      unansweredQuestions,

      topics:
        signalAnalysis.topics,

      criticalTopics,

      moderateTopics,

      strongTopics,

      timeline:
        signalAnalysis.timeline,

      criticalMoments,

      recoveryMoments,

      biggestLearningGap,

      currentStatus,

      facultyAction,

      classroomSummary,
    });
  }

  const unsubscribeSignals =
    onSnapshot(
      signalsQuery,
      (snapshot) => {
        signalDocuments =
          snapshot.docs.map(
            (doc) =>
              doc.data() as Record<
                string,
                unknown
              >
          );

        signalsLoaded = true;

        publish();
      },
      (error) => {
        console.error(
          "Classroom intelligence signals error:",
          error
        );

        onError?.(error);
      }
    );

  const unsubscribeQuestions =
    onSnapshot(
      questionsQuery,
      (snapshot) => {
        questionDocuments =
          snapshot.docs.map(
            (doc) => ({
              id: doc.id,
              data:
                doc.data() as Record<
                  string,
                  unknown
                >,
            })
          );

        questionsLoaded = true;

        publish();
      },
      (error) => {
        /*
        |--------------------------------------------------------------------------
        | If questions collection doesn't exist yet,
        | don't destroy the intelligence dashboard.
        |--------------------------------------------------------------------------
        */

        console.error(
          "Classroom intelligence questions error:",
          error
        );

        questionsLoaded = true;

        publish();
      }
    );

  return () => {
    unsubscribeSignals();

    unsubscribeQuestions();
  };
}

/*
|--------------------------------------------------------------------------
| Empty state
|--------------------------------------------------------------------------
*/

function createEmptyIntelligence(): ClassroomIntelligence {
  return {
    totalPulseResponses: 0,

    understoodCount: 0,

    partialCount: 0,

    confusedCount: 0,

    understandingPercentage: 0,

    confusionPercentage: 0,

    partialPercentage: 0,

    totalQuestions: 0,

    answeredQuestions: 0,

    unansweredQuestions: 0,

    topics: [],

    criticalTopics: [],

    moderateTopics: [],

    strongTopics: [],

    timeline: [],

    criticalMoments: [],

    recoveryMoments: [],

    biggestLearningGap: null,

    currentStatus: "healthy",

    facultyAction:
      "Start collecting Live Pulse responses to generate classroom intelligence.",

    classroomSummary:
      "There is not enough classroom data yet.",
  };
}