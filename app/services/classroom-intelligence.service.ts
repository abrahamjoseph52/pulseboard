"use client";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Timestamp,
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
  round: number;
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
| Helpers
|--------------------------------------------------------------------------
*/

type RawDocument = Record<string, unknown>;

type SignalKind =
  | "understood"
  | "partial"
  | "confused";

interface SessionRoundInfo {
  topic: string;
  timestamp: Date | null;
}

interface TopicCounter {
  round: number;
  topic: string;
  understood: number;
  partial: number;
  confused: number;
}

interface RoundCounter {
  round: number;
  understood: number;
  partial: number;
  confused: number;
  timestamp: Date | null;
}

function getDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    const date = (
      value as {
        toDate: () => Date;
      }
    ).toDate();

    return date instanceof Date &&
      !Number.isNaN(date.getTime())
      ? date
      : null;
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

function normalizeRound(value: unknown): number | null {
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

  return null;
}

/*
|--------------------------------------------------------------------------
| Signal normalization
|--------------------------------------------------------------------------
|
| Your existing feedback.service uses:
|
| got_it
| slightly_lost
| confused
| interesting
|
| We intentionally treat "interesting" as neutral here.
| It is NOT counted as understanding.
|
*/

function normalizeSignal(
  value: unknown
): SignalKind | null {
  if (typeof value !== "string") {
    return null;
  }

  const signal = value
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ");

  if (
    signal === "confused" ||
    signal.includes("confus") ||
    signal.includes("unclear") ||
    signal.includes("not understand") ||
    signal === "red"
  ) {
    return "confused";
  }

  if (
    signal === "slightly lost" ||
    signal.includes("slightly lost") ||
    signal.includes("partial") ||
    signal.includes("somewhat") ||
    signal.includes("maybe") ||
    signal === "yellow"
  ) {
    return "partial";
  }

  if (
    signal === "got it" ||
    signal === "understood" ||
    signal.includes("understand") ||
    signal.includes("clear") ||
    signal === "green"
  ) {
    return "understood";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Question helpers
|--------------------------------------------------------------------------
*/

function getQuestionText(
  data: RawDocument
): string {
  const values = [
    data.text,
    data.question,
    data.questionText,
    data.content,
  ];

  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function getQuestionStatus(
  data: RawDocument
): string {
  const values = [
    data.status,
    data.answerStatus,
    data.state,
  ];

  for (const value of values) {
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

function isAnsweredQuestion(
  question: IntelligenceQuestion
): boolean {
  return [
    "answered",
    "resolved",
    "replied",
    "closed",
  ].includes(question.status);
}

/*
|--------------------------------------------------------------------------
| Session round/topic extraction
|--------------------------------------------------------------------------
|
| Existing Session type contains:
|
| currentRound
| roundTopic
|
| For historical rounds we also support:
|
| rounds: [...]
|
*/

function getSessionRoundTopic(
  sessionData: RawDocument,
  round: number
): string {
  const rounds = sessionData.rounds;

  if (Array.isArray(rounds)) {
    for (const item of rounds) {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        continue;
      }

      const roundData =
        item as RawDocument;

      const itemRound =
        normalizeRound(
          roundData.round ??
            roundData.roundNumber
        );

      if (itemRound !== round) {
        continue;
      }

      const topicValues = [
        roundData.topic,
        roundData.topicName,
        roundData.title,
      ];

      for (const value of topicValues) {
        if (
          typeof value === "string" &&
          value.trim()
        ) {
          return value.trim();
        }
      }
    }
  }

  const currentRound =
    normalizeRound(
      sessionData.currentRound
    );

  if (
    currentRound === round &&
    typeof sessionData.roundTopic ===
      "string" &&
    sessionData.roundTopic.trim()
  ) {
    return sessionData.roundTopic.trim();
  }

  return `Round ${round}`;
}

/*
|--------------------------------------------------------------------------
| Percentage helper
|--------------------------------------------------------------------------
*/

function percentage(
  value: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round(
    (value / total) * 100
  );
}

/*
|--------------------------------------------------------------------------
| Analyse signals
|--------------------------------------------------------------------------
*/

function analyseSignals(
  documents: RawDocument[],
  sessionData: RawDocument
) {
  let understoodCount = 0;
  let partialCount = 0;
  let confusedCount = 0;

  const topicMap =
    new Map<number, TopicCounter>();

  const roundMap =
    new Map<number, RoundCounter>();

  for (const data of documents) {
    const signal =
      normalizeSignal(data.signal);

    if (!signal) {
      continue;
    }

    const round =
      normalizeRound(data.round);

    if (signal === "understood") {
      understoodCount++;
    }

    if (signal === "partial") {
      partialCount++;
    }

    if (signal === "confused") {
      confusedCount++;
    }

    /*
    |--------------------------------------------------------------------------
    | If old signal has no round, keep it in overall totals
    |--------------------------------------------------------------------------
    */

    if (round === null) {
      continue;
    }

    const topic =
      getSessionRoundTopic(
        sessionData,
        round
      );

    if (!topicMap.has(round)) {
      topicMap.set(round, {
        round,
        topic,
        understood: 0,
        partial: 0,
        confused: 0,
      });
    }

    const topicCounter =
      topicMap.get(round)!;

    topicCounter[signal]++;

    if (!roundMap.has(round)) {
      roundMap.set(round, {
        round,
        understood: 0,
        partial: 0,
        confused: 0,
        timestamp: null,
      });
    }

    const roundCounter =
      roundMap.get(round)!;

    roundCounter[signal]++;

    const timestamp = getDate(
      data.timestamp ??
        data.createdAt ??
        data.time
    );

    if (
      timestamp &&
      (
        !roundCounter.timestamp ||
        timestamp <
          roundCounter.timestamp
      )
    ) {
      roundCounter.timestamp =
        timestamp;
    }
  }

  const totalResponses =
    understoodCount +
    partialCount +
    confusedCount;

  const understandingPercentage =
    percentage(
      understoodCount,
      totalResponses
    );

  const confusionPercentage =
    percentage(
      confusedCount,
      totalResponses
    );

  const partialPercentage =
    percentage(
      partialCount,
      totalResponses
    );

  const topics: IntelligenceTopic[] =
    Array.from(
      topicMap.values()
    ).map((item) => {
      const total =
        item.understood +
        item.partial +
        item.confused;

      const confusion =
        percentage(
          item.confused,
          total
        );

      const understanding =
        percentage(
          item.understood,
          total
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
        topic: item.topic,
        round: item.round,

        confusionPercentage:
          confusion,

        understandingPercentage:
          understanding,

        confusedCount:
          item.confused,

        partialCount:
          item.partial,

        understoodCount:
          item.understood,

        totalResponses: total,

        level,
      };
    });

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
    Array.from(
      roundMap.values()
    )
      .map((item) => {
        const total =
          item.understood +
          item.partial +
          item.confused;

        return {
          round: item.round,

          understandingPercentage:
            percentage(
              item.understood,
              total
            ),

          confusionPercentage:
            percentage(
              item.confused,
              total
            ),

          level: "stable" as const,

          title:
            "Understanding stable",

          description:
            "The classroom is maintaining a stable learning pattern.",

          timestamp:
            item.timestamp,
        };
      })
      .sort(
        (a, b) =>
          a.round - b.round
      );

  /*
  |--------------------------------------------------------------------------
  | Interpret timeline
  |--------------------------------------------------------------------------
  */

  let previousUnderstanding:
    | number
    | null = null;

  for (let i = 0; i < timeline.length; i++) {
    const current =
      timeline[i];

    if (i === 0) {
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
| Main realtime subscription
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
  const cleanSessionId =
    sessionId.trim();

  if (!cleanSessionId) {
    callback(
      createEmptyIntelligence()
    );

    return () => {};
  }

  /*
  |--------------------------------------------------------------------------
  | Firestore references
  |--------------------------------------------------------------------------
  */

  const sessionRef =
    doc(
      db,
      "sessions",
      cleanSessionId
    );

  const signalsQuery =
    query(
      collection(db, "signals"),
      where(
        "sessionId",
        "==",
        cleanSessionId
      )
    );

  const questionsQuery =
    query(
      collection(db, "questions"),
      where(
        "sessionId",
        "==",
        cleanSessionId
      )
    );

  let sessionData:
    RawDocument = {};

  let signalDocuments:
    RawDocument[] = [];

  let questionDocuments:
    {
      id: string;
      data: RawDocument;
    }[] = [];

  let sessionLoaded = false;
  let signalsLoaded = false;
  let questionsLoaded = false;

  function publish() {
    /*
    |--------------------------------------------------------------------------
    | Wait until all realtime sources have responded once
    |--------------------------------------------------------------------------
    */

    if (
      !sessionLoaded ||
      !signalsLoaded ||
      !questionsLoaded
    ) {
      return;
    }

    const analysis =
      analyseSignals(
        signalDocuments,
        sessionData
      );

    const questions: IntelligenceQuestion[] =
      questionDocuments.map(
        (item) => ({
          id: item.id,

          text:
            getQuestionText(
              item.data
            ),

          status:
            getQuestionStatus(
              item.data
            ),

          createdAt:
            getDate(
              item.data.createdAt ??
                item.data.timestamp
            ),
        })
      );

    const answeredQuestions =
      questions.filter(
        isAnsweredQuestion
      ).length;

    const unansweredQuestions =
      Math.max(
        0,
        questions.length -
          answeredQuestions
      );

    const criticalTopics =
      analysis.topics.filter(
        (topic) =>
          topic.level ===
          "critical"
      );

    const moderateTopics =
      analysis.topics.filter(
        (topic) =>
          topic.level ===
          "moderate"
      );

    const strongTopics =
      analysis.topics.filter(
        (topic) =>
          topic.level ===
          "strong"
      );

    const criticalMoments =
      analysis.timeline.filter(
        (item) =>
          item.level ===
          "critical"
      );

    const recoveryMoments =
      analysis.timeline.filter(
        (item) =>
          item.level ===
          "recovery"
      );

    const biggestLearningGap =
      analysis.topics.length > 0
        ? analysis.topics[0]
        : null;

    /*
    |--------------------------------------------------------------------------
    | Current classroom status
    |--------------------------------------------------------------------------
    */

    let currentStatus:
      | "excellent"
      | "healthy"
      | "attention"
      | "critical" =
      "healthy";

    if (
      analysis.confusionPercentage >=
      50
    ) {
      currentStatus = "critical";
    } else if (
      analysis.confusionPercentage >=
      30
    ) {
      currentStatus = "attention";
    } else if (
      analysis.understandingPercentage >=
      75
    ) {
      currentStatus = "excellent";
    }

    /*
    |--------------------------------------------------------------------------
    | Faculty action
    |--------------------------------------------------------------------------
    */

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
        `Address the ${unansweredQuestions} unanswered anonymous question${
          unansweredQuestions === 1
            ? ""
            : "s"
        } from this session.`;
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

    /*
    |--------------------------------------------------------------------------
    | Classroom summary
    |--------------------------------------------------------------------------
    */

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
    } else if (
      analysis.totalPulseResponses ===
      0
    ) {
      classroomSummary =
        "No valid classroom pulse responses have been received yet.";
    }

    callback({
      totalPulseResponses:
        analysis.totalPulseResponses,

      understoodCount:
        analysis.understoodCount,

      partialCount:
        analysis.partialCount,

      confusedCount:
        analysis.confusedCount,

      understandingPercentage:
        analysis.understandingPercentage,

      confusionPercentage:
        analysis.confusionPercentage,

      partialPercentage:
        analysis.partialPercentage,

      totalQuestions:
        questions.length,

      answeredQuestions,

      unansweredQuestions,

      topics:
        analysis.topics,

      criticalTopics,

      moderateTopics,

      strongTopics,

      timeline:
        analysis.timeline,

      criticalMoments,

      recoveryMoments,

      biggestLearningGap,

      currentStatus,

      facultyAction,

      classroomSummary,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | SESSION REALTIME
  |--------------------------------------------------------------------------
  */

  const unsubscribeSession =
    onSnapshot(
      sessionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          sessionData =
            snapshot.data() as RawDocument;
        } else {
          sessionData = {};
        }

        sessionLoaded = true;

        publish();
      },
      (error) => {
        console.error(
          "Classroom intelligence session error:",
          error
        );

        sessionLoaded = true;

        onError?.(error);
      }
    );

  /*
  |--------------------------------------------------------------------------
  | SIGNALS REALTIME
  |--------------------------------------------------------------------------
  */

  const unsubscribeSignals =
    onSnapshot(
      signalsQuery,
      (snapshot) => {
        signalDocuments =
          snapshot.docs.map(
            (signalDoc) =>
              signalDoc.data() as RawDocument
          );

        signalsLoaded = true;

        publish();
      },
      (error) => {
        console.error(
          "Classroom intelligence signals error:",
          error
        );

        signalsLoaded = true;

        onError?.(error);
      }
    );

  /*
  |--------------------------------------------------------------------------
  | QUESTIONS REALTIME
  |--------------------------------------------------------------------------
  */

  const unsubscribeQuestions =
    onSnapshot(
      questionsQuery,
      (snapshot) => {
        questionDocuments =
          snapshot.docs.map(
            (questionDoc) => ({
              id:
                questionDoc.id,

              data:
                questionDoc.data() as RawDocument,
            })
          );

        questionsLoaded = true;

        publish();
      },
      (error) => {
        /*
        |--------------------------------------------------------------------------
        | Questions should never break the intelligence dashboard.
        |--------------------------------------------------------------------------
        */

        console.error(
          "Classroom intelligence questions error:",
          error
        );

        questionDocuments = [];

        questionsLoaded = true;

        publish();
      }
    );

  /*
  |--------------------------------------------------------------------------
  | Cleanup
  |--------------------------------------------------------------------------
  */

  return () => {
    unsubscribeSession();
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