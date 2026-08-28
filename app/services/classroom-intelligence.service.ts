"use client";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/*
|--------------------------------------------------------------------------
| TYPES
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
| INTERNAL TYPES
|--------------------------------------------------------------------------
*/

type RawDocument = Record<string, unknown>;

type SignalKind =
  | "understood"
  | "partial"
  | "confused"
  | "interesting";

interface TopicCounter {
  round: number;
  topic: string;

  understood: number;
  partial: number;
  confused: number;
  interesting: number;
}

interface RoundCounter {
  round: number;

  understood: number;
  partial: number;
  confused: number;
  interesting: number;

  timestamp: Date | null;
}

/*
|--------------------------------------------------------------------------
| DATE HELPER
|--------------------------------------------------------------------------
*/

function getDate(
  value: unknown
): Date | null {
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
    try {
      const date = (
        value as {
          toDate: () => Date;
        }
      ).toDate();

      return date instanceof Date &&
        !Number.isNaN(date.getTime())
        ? date
        : null;
    } catch {
      return null;
    }
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
| ROUND HELPER
|--------------------------------------------------------------------------
*/

function normalizeRound(
  value: unknown
): number | null {
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
| SIGNAL NORMALIZATION
|--------------------------------------------------------------------------
|
| Supported existing values:
|
| got_it
| slightly_lost
| confused
| interesting
|
|--------------------------------------------------------------------------
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

  /*
  |--------------------------------------------------------------------------
  | UNDERSTOOD
  |--------------------------------------------------------------------------
  */

  if (
    signal === "got it" ||
    signal === "gotit" ||
    signal === "understood" ||
    signal.includes("understand") ||
    signal.includes("clear") ||
    signal === "green"
  ) {
    return "understood";
  }

  /*
  |--------------------------------------------------------------------------
  | PARTIAL
  |--------------------------------------------------------------------------
  */

  if (
    signal === "slightly lost" ||
    signal === "slightlylost" ||
    signal.includes("slightly lost") ||
    signal.includes("partial") ||
    signal.includes("somewhat") ||
    signal.includes("maybe") ||
    signal === "yellow"
  ) {
    return "partial";
  }

  /*
  |--------------------------------------------------------------------------
  | CONFUSED
  |--------------------------------------------------------------------------
  */

  if (
    signal === "confused" ||
    signal.includes("confus") ||
    signal.includes("unclear") ||
    signal.includes("not understand") ||
    signal.includes("lost") ||
    signal === "red"
  ) {
    return "confused";
  }

  /*
  |--------------------------------------------------------------------------
  | INTERESTING / NEUTRAL
  |--------------------------------------------------------------------------
  |
  | This is a valid pulse, but it does not mean "understood".
  |
  */

  if (
    signal === "interesting" ||
    signal.includes("interesting")
  ) {
    return "interesting";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| QUESTION HELPERS
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
| SIGNAL ROUND EXTRACTION
|--------------------------------------------------------------------------
*/

function getSignalRound(
  data: RawDocument
): number | null {
  return normalizeRound(
    data.round ??
      data.roundNumber ??
      data.pulseRound ??
      data.currentRound
  );
}

/*
|--------------------------------------------------------------------------
| SESSION TOPIC EXTRACTION
|--------------------------------------------------------------------------
*/

function getSessionRoundTopic(
  sessionData: RawDocument,
  round: number
): string {
  /*
  |--------------------------------------------------------------------------
  | Historical rounds
  |--------------------------------------------------------------------------
  */

  const rounds =
    sessionData.rounds;

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
            roundData.roundNumber ??
            roundData.number
        );

      if (itemRound !== round) {
        continue;
      }

      const topicValues = [
        roundData.topic,
        roundData.topicName,
        roundData.roundTopic,
        roundData.title,
        roundData.subject,
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

  /*
  |--------------------------------------------------------------------------
  | Current round
  |--------------------------------------------------------------------------
  */

  const currentRound =
    normalizeRound(
      sessionData.currentRound
    );

  if (
    currentRound === round
  ) {
    const currentTopicValues = [
      sessionData.roundTopic,
      sessionData.topic,
      sessionData.topicName,
    ];

    for (
      const value of currentTopicValues
    ) {
      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Generic fallback
  |--------------------------------------------------------------------------
  */

  return `Round ${round}`;
}

/*
|--------------------------------------------------------------------------
| PERCENTAGE
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
| ANALYSE SIGNALS
|--------------------------------------------------------------------------
*/

function analyseSignals(
  documents: RawDocument[],
  sessionData: RawDocument
) {
  let understoodCount = 0;
  let partialCount = 0;
  let confusedCount = 0;

  /*
  |--------------------------------------------------------------------------
  | Interesting is counted as a pulse response,
  | but not as understanding/confusion.
  |--------------------------------------------------------------------------
  */

  let interestingCount = 0;

  const topicMap =
    new Map<number, TopicCounter>();

  const roundMap =
    new Map<number, RoundCounter>();

  for (const data of documents) {
    const signal =
      normalizeSignal(
        data.signal
      );

    if (!signal) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Overall counts
    |--------------------------------------------------------------------------
    */

    if (signal === "understood") {
      understoodCount++;
    }

    if (signal === "partial") {
      partialCount++;
    }

    if (signal === "confused") {
      confusedCount++;
    }

    if (signal === "interesting") {
      interestingCount++;
    }

    /*
    |--------------------------------------------------------------------------
    | Round
    |--------------------------------------------------------------------------
    */

    const round =
      getSignalRound(data);

    /*
    |--------------------------------------------------------------------------
    | Signals without a round still count
    | toward total classroom pulse responses.
    |--------------------------------------------------------------------------
    */

    if (round === null) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Topic
    |--------------------------------------------------------------------------
    */

    const topic =
      getSessionRoundTopic(
        sessionData,
        round
      );

    if (!topicMap.has(round)) {
      topicMap.set(
        round,
        {
          round,
          topic,

          understood: 0,
          partial: 0,
          confused: 0,
          interesting: 0,
        }
      );
    }

    const topicCounter =
      topicMap.get(round)!;

    topicCounter[signal]++;

    /*
    |--------------------------------------------------------------------------
    | Timeline round
    |--------------------------------------------------------------------------
    */

    if (!roundMap.has(round)) {
      roundMap.set(
        round,
        {
          round,

          understood: 0,
          partial: 0,
          confused: 0,
          interesting: 0,

          timestamp: null,
        }
      );
    }

    const roundCounter =
      roundMap.get(round)!;

    roundCounter[signal]++;

    /*
    |--------------------------------------------------------------------------
    | Timestamp
    |--------------------------------------------------------------------------
    */

    const timestamp =
      getDate(
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

  /*
  |--------------------------------------------------------------------------
  | TOTAL PULSE RESPONSES
  |--------------------------------------------------------------------------
  */

  const totalPulseResponses =
    understoodCount +
    partialCount +
    confusedCount +
    interestingCount;

  /*
  |--------------------------------------------------------------------------
  | Comprehension percentage
  |--------------------------------------------------------------------------
  |
  | "Interesting" is excluded from the comprehension denominator because
  | it doesn't tell us whether the student understood or was confused.
  |
  |--------------------------------------------------------------------------
  */

  const comprehensionResponses =
    understoodCount +
    partialCount +
    confusedCount;

  const understandingPercentage =
    percentage(
      understoodCount,
      comprehensionResponses
    );

  const confusionPercentage =
    percentage(
      confusedCount,
      comprehensionResponses
    );

  const partialPercentage =
    percentage(
      partialCount,
      comprehensionResponses
    );

  /*
  |--------------------------------------------------------------------------
  | TOPICS
  |--------------------------------------------------------------------------
  */

  const topics: IntelligenceTopic[] =
    Array.from(
      topicMap.values()
    ).map((item) => {
      const comprehensionTotal =
        item.understood +
        item.partial +
        item.confused;

      const confusion =
        percentage(
          item.confused,
          comprehensionTotal
        );

      const understanding =
        percentage(
          item.understood,
          comprehensionTotal
        );

      let level:
        | "strong"
        | "moderate"
        | "critical" =
        "strong";

      if (
        confusion >= 50
      ) {
        level = "critical";
      } else if (
        confusion >= 25
      ) {
        level = "moderate";
      }

      return {
        topic:
          item.topic,

        round:
          item.round,

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

        totalResponses:
          comprehensionTotal,

        level,
      };
    });

  /*
  |--------------------------------------------------------------------------
  | Sort learning gaps
  |--------------------------------------------------------------------------
  |
  | Critical topics first, then confusion %, then response count.
  |--------------------------------------------------------------------------
  */

  topics.sort((a, b) => {
    const levelWeight = {
      critical: 3,
      moderate: 2,
      strong: 1,
    };

    const levelDifference =
      levelWeight[b.level] -
      levelWeight[a.level];

    if (levelDifference !== 0) {
      return levelDifference;
    }

    if (
      b.confusionPercentage !==
      a.confusionPercentage
    ) {
      return (
        b.confusionPercentage -
        a.confusionPercentage
      );
    }

    return (
      b.totalResponses -
      a.totalResponses
    );
  });

  /*
  |--------------------------------------------------------------------------
  | TIMELINE
  |--------------------------------------------------------------------------
  */

  const timeline: IntelligenceTimeline[] =
    Array.from(
      roundMap.values()
    )
      .map((item) => {
        const comprehensionTotal =
          item.understood +
          item.partial +
          item.confused;

        return {
          round:
            item.round,

          understandingPercentage:
            percentage(
              item.understood,
              comprehensionTotal
            ),

          confusionPercentage:
            percentage(
              item.confused,
              comprehensionTotal
            ),

          level:
            "stable" as const,

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
  | TIMELINE INTERPRETATION
  |--------------------------------------------------------------------------
  */

  let previousUnderstanding:
    | number
    | null = null;

  for (
    let i = 0;
    i < timeline.length;
    i++
  ) {
    const current =
      timeline[i];

    /*
    |--------------------------------------------------------------------------
    | First round
    |--------------------------------------------------------------------------
    */

    if (i === 0) {
      if (
        current.understandingPercentage >=
        70
      ) {
        current.level =
          "strong";

        current.title =
          "Strong start";

        current.description =
          "Students began the session with good understanding.";
      } else if (
        current.confusionPercentage >=
        50
      ) {
        current.level =
          "critical";

        current.title =
          "Early learning gap";

        current.description =
          "Significant confusion was detected early in the session.";
      } else if (
        current.confusionPercentage >=
        25
      ) {
        current.level =
          "warning";

        current.title =
          "Early confusion";

        current.description =
          "A noticeable group of students may need additional explanation.";
      } else {
        current.level =
          "stable";

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
    | Critical
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
        "A large portion of students are showing confusion.";
    }

    /*
    |--------------------------------------------------------------------------
    | Recovery
    |--------------------------------------------------------------------------
    */

    else if (
      previousUnderstanding !== null &&
      current.understandingPercentage -
        previousUnderstanding >=
        15
    ) {
      current.level =
        "recovery";

      current.title =
        "Understanding recovered";

      current.description =
        "Student understanding improved significantly.";
    }

    /*
    |--------------------------------------------------------------------------
    | Drop
    |--------------------------------------------------------------------------
    */

    else if (
      previousUnderstanding !== null &&
      previousUnderstanding -
        current.understandingPercentage >=
        15
    ) {
      current.level =
        "warning";

      current.title =
        "Understanding dropped";

      current.description =
        "Student understanding decreased noticeably.";
    }

    /*
    |--------------------------------------------------------------------------
    | Strong
    |--------------------------------------------------------------------------
    */

    else if (
      current.understandingPercentage >=
      70
    ) {
      current.level =
        "strong";

      current.title =
        "Strong understanding";

      current.description =
        "Most students are following the concept confidently.";
    }

    /*
    |--------------------------------------------------------------------------
    | Warning
    |--------------------------------------------------------------------------
    */

    else if (
      current.confusionPercentage >=
      25
    ) {
      current.level =
        "warning";

      current.title =
        "Confusion increasing";

      current.description =
        "A noticeable group of students may need additional explanation.";
    }

    /*
    |--------------------------------------------------------------------------
    | Stable
    |--------------------------------------------------------------------------
    */

    else {
      current.level =
        "stable";

      current.title =
        "Understanding stable";

      current.description =
        "The classroom is maintaining a stable learning pattern.";
    }

    previousUnderstanding =
      current.understandingPercentage;
  }

  return {
    totalPulseResponses,

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
| MAIN REALTIME SUBSCRIPTION
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

  /*
  |--------------------------------------------------------------------------
  | Empty session
  |--------------------------------------------------------------------------
  */

  if (!cleanSessionId) {
    callback(
      createEmptyIntelligence()
    );

    return () => {};
  }

  /*
  |--------------------------------------------------------------------------
  | FIRESTORE REFERENCES
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

  /*
  |--------------------------------------------------------------------------
  | REALTIME STATE
  |--------------------------------------------------------------------------
  */

  let sessionData:
    RawDocument = {};

  let signalDocuments:
    RawDocument[] = [];

  let questionDocuments:
    {
      id: string;
      data: RawDocument;
    }[] = [];

  let sessionLoaded =
    false;

  let signalsLoaded =
    false;

  let questionsLoaded =
    false;

  /*
  |--------------------------------------------------------------------------
  | PUBLISH
  |--------------------------------------------------------------------------
  */

  function publish() {
    /*
    |--------------------------------------------------------------------------
    | Wait for initial snapshots
    |--------------------------------------------------------------------------
    */

    if (
      !sessionLoaded ||
      !signalsLoaded ||
      !questionsLoaded
    ) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Analyse classroom signals
    |--------------------------------------------------------------------------
    */

    const analysis =
      analyseSignals(
        signalDocuments,
        sessionData
      );

    /*
    |--------------------------------------------------------------------------
    | Questions
    |--------------------------------------------------------------------------
    */

    const questions:
      IntelligenceQuestion[] =
      questionDocuments.map(
        (item) => ({
          id:
            item.id,

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

    /*
    |--------------------------------------------------------------------------
    | Question counts
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Topic groups
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Timeline groups
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Biggest learning gap
    |--------------------------------------------------------------------------
    */

    const biggestLearningGap =
      analysis.topics.length > 0
        ? analysis.topics[0]
        : null;

    /*
    |--------------------------------------------------------------------------
    | CURRENT CLASSROOM STATUS
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
      currentStatus =
        "critical";
    } else if (
      analysis.confusionPercentage >=
      30
    ) {
      currentStatus =
        "attention";
    } else if (
      analysis.understandingPercentage >=
      75
    ) {
      currentStatus =
        "excellent";
    }

    /*
    |--------------------------------------------------------------------------
    | FACULTY ACTION
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
    } else if (
      analysis.totalPulseResponses ===
      0
    ) {
      facultyAction =
        "Start collecting Live Pulse responses to generate classroom intelligence.";
    }

    /*
    |--------------------------------------------------------------------------
    | CLASSROOM SUMMARY
    |--------------------------------------------------------------------------
    */

    let classroomSummary =
      "The classroom is showing a mixed learning pattern.";

    if (
      analysis.totalPulseResponses ===
      0
    ) {
      classroomSummary =
        "No classroom pulse responses have been received yet.";
    } else if (
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

    /*
    |--------------------------------------------------------------------------
    | FINAL INTELLIGENCE OBJECT
    |--------------------------------------------------------------------------
    */

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
        if (
          snapshot.exists()
        ) {
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

        sessionData = {};

        sessionLoaded = true;

        onError?.(error);

        publish();
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

        signalDocuments = [];

        signalsLoaded = true;

        onError?.(error);

        publish();
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
        | Questions must never destroy the intelligence dashboard.
        |--------------------------------------------------------------------------
        */

        console.error(
          "Classroom intelligence questions error:",
          error
        );

        questionDocuments = [];

        questionsLoaded = true;

        onError?.(error);

        publish();
      }
    );

  /*
  |--------------------------------------------------------------------------
  | CLEANUP
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
| EMPTY STATE
|--------------------------------------------------------------------------
*/

function createEmptyIntelligence():
  ClassroomIntelligence {
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

    currentStatus:
      "healthy",

    facultyAction:
      "Start collecting Live Pulse responses to generate classroom intelligence.",

    classroomSummary:
      "There is not enough classroom data yet.",
  };
}