"use client";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/*
|--------------------------------------------------------------------------
| Question types
|--------------------------------------------------------------------------
*/

export type QuestionStatus =
  | "visible"
  | "answered";

export interface AnonymousQuestion {
  id: string;
  sessionId: string;
  question: string;
  topic: string;
  status: QuestionStatus;

  /*
   * Faculty answer.
   *
   * This is optional because unanswered
   * questions do not have an answer yet.
   */
  answer?: string;

  /*
   * When faculty answered the question.
   */
  answeredAt?: Date | null;

  createdAt: Date | null;
}

/*
|--------------------------------------------------------------------------
| Nuisance detection
|--------------------------------------------------------------------------
*/

const BLOCKED_PATTERNS: RegExp[] = [
  /\bspam\b/i,
  /\btest\s+test\b/i,
  /\bblah\s+blah\b/i,
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\bdummy\b/i,
  /\brubbish\b/i,
  /\bnonsense\b/i,
];

/*
|--------------------------------------------------------------------------
| Normalize text
|--------------------------------------------------------------------------
*/

function normalizeText(
  text: string
): string {
  return text
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

/*
|--------------------------------------------------------------------------
| Nuisance check
|--------------------------------------------------------------------------
*/

export function containsNuisanceContent(
  text: string
): boolean {
  const normalized =
    normalizeText(text);

  return BLOCKED_PATTERNS.some(
    (pattern) =>
      pattern.test(normalized)
  );
}

/*
|--------------------------------------------------------------------------
| Question validation
|--------------------------------------------------------------------------
*/

export function validateQuestion(
  text: string
): {
  valid: boolean;
  reason?: string;
} {
  const question =
    normalizeText(text);

  if (!question) {
    return {
      valid: false,
      reason:
        "Please enter a question.",
    };
  }

  if (question.length < 5) {
    return {
      valid: false,
      reason:
        "Please enter at least a few words so your faculty can understand the question.",
    };
  }

  if (question.length > 500) {
    return {
      valid: false,
      reason:
        "Your question is too long. Please keep it below 500 characters.",
    };
  }

  if (
    containsNuisanceContent(question)
  ) {
    return {
      valid: false,
      reason:
        "This message was rejected because it doesn't appear to be an academic question.",
    };
  }

  return {
    valid: true,
  };
}

/*
|--------------------------------------------------------------------------
| Answer validation
|--------------------------------------------------------------------------
*/

export function validateAnswer(
  text: string
): {
  valid: boolean;
  reason?: string;
} {
  const answer =
    normalizeText(text);

  if (!answer) {
    return {
      valid: false,
      reason:
        "Please enter an answer.",
    };
  }

  if (answer.length < 2) {
    return {
      valid: false,
      reason:
        "Please enter a little more detail in the answer.",
    };
  }

  if (answer.length > 1000) {
    return {
      valid: false,
      reason:
        "The answer is too long. Please keep it below 1000 characters.",
    };
  }

  return {
    valid: true,
  };
}

/*
|--------------------------------------------------------------------------
| Submit anonymous question
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| We intentionally DO NOT store:
|
| - uid
| - studentId
| - email
| - name
| - registerNumber
|
*/

export async function submitAnonymousQuestion(
  sessionId: string,
  question: string,
  topic = "General"
): Promise<string> {
  const cleanSessionId =
    sessionId.trim();

  if (!cleanSessionId) {
    throw new Error(
      "Session ID is missing."
    );
  }

  const validation =
    validateQuestion(question);

  if (!validation.valid) {
    throw new Error(
      validation.reason ||
        "Invalid question."
    );
  }

  const cleanQuestion =
    normalizeText(question);

  const cleanTopic =
    normalizeText(
      topic || "General"
    ) || "General";

  const questionRef =
    await addDoc(
      collection(
        db,
        "questions"
      ),
      {
        sessionId:
          cleanSessionId,

        question:
          cleanQuestion,

        topic:
          cleanTopic,

        status:
          "visible",

        createdAt:
          serverTimestamp(),
      }
    );

  return questionRef.id;
}

/*
|--------------------------------------------------------------------------
| Subscribe to session questions
|--------------------------------------------------------------------------
*/

export function subscribeToQuestions(
  sessionId: string,
  callback: (
    questions: AnonymousQuestion[]
  ) => void,
  onError?: (
    error: Error
  ) => void
): () => void {
  if (!sessionId) {
    callback([]);

    return () => {};
  }

  const questionsQuery =
    query(
      collection(
        db,
        "questions"
      ),
      where(
        "sessionId",
        "==",
        sessionId
      )
    );

  return onSnapshot(
    questionsQuery,
    (snapshot) => {
      const questions: AnonymousQuestion[] =
        snapshot.docs.map(
          (document) => {
            const data =
              document.data();

            /*
             * Created timestamp.
             */

            let createdAt:
              Date | null = null;

            if (
              data.createdAt &&
              typeof data
                .createdAt
                .toDate ===
                "function"
            ) {
              createdAt =
                data.createdAt.toDate();
            }

            /*
             * Answered timestamp.
             */

            let answeredAt:
              Date | null = null;

            if (
              data.answeredAt &&
              typeof data
                .answeredAt
                .toDate ===
                "function"
            ) {
              answeredAt =
                data.answeredAt.toDate();
            }

            return {
              id:
                document.id,

              sessionId:
                typeof data.sessionId ===
                "string"
                  ? data.sessionId
                  : sessionId,

              question:
                typeof data.question ===
                "string"
                  ? data.question
                  : "",

              topic:
                typeof data.topic ===
                "string"
                  ? data.topic
                  : "General",

              status:
                data.status ===
                "answered"
                  ? "answered"
                  : "visible",

              answer:
                typeof data.answer ===
                "string"
                  ? data.answer
                  : undefined,

              answeredAt,

              createdAt,
            };
          }
        );

      /*
       * Newest questions first.
       */

      questions.sort(
        (a, b) => {
          const aTime =
            a.createdAt
              ?.getTime() ?? 0;

          const bTime =
            b.createdAt
              ?.getTime() ?? 0;

          return (
            bTime - aTime
          );
        }
      );

      callback(
        questions
      );
    },
    (error) => {
      console.error(
        "Anonymous question listener error:",
        error
      );

      onError?.(error);
    }
  );
}

/*
|--------------------------------------------------------------------------
| Answer anonymous question
|--------------------------------------------------------------------------
|
| Faculty-side action.
|--------------------------------------------------------------------------
*/

export async function answerAnonymousQuestion(
  questionId: string,
  answer: string
): Promise<void> {
  const cleanId =
    questionId.trim();

  if (!cleanId) {
    throw new Error(
      "Question ID is missing."
    );
  }

  const validation =
    validateAnswer(answer);

  if (!validation.valid) {
    throw new Error(
      validation.reason ||
        "Invalid answer."
    );
  }

  const cleanAnswer =
    normalizeText(answer);

  await updateDoc(
    doc(
      db,
      "questions",
      cleanId
    ),
    {
      answer:
        cleanAnswer,

      status:
        "answered",

      answeredAt:
        serverTimestamp(),
    }
  );
}

/*
|--------------------------------------------------------------------------
| Mark question as answered
|--------------------------------------------------------------------------
|
| Kept for backwards compatibility
| with your existing faculty code.
|--------------------------------------------------------------------------
*/

export async function markQuestionAnswered(
  questionId: string
): Promise<void> {
  const cleanId =
    questionId.trim();

  if (!cleanId) {
    throw new Error(
      "Question ID is missing."
    );
  }

  await updateDoc(
    doc(
      db,
      "questions",
      cleanId
    ),
    {
      status:
        "answered",

      answeredAt:
        serverTimestamp(),
    }
  );
}

/*
|--------------------------------------------------------------------------
| Topic statistics
|--------------------------------------------------------------------------
*/

export function getQuestionTopicCounts(
  questions: AnonymousQuestion[]
): Array<{
  topic: string;
  count: number;
}> {
  const counts:
    Record<string, number> =
    {};

  for (
    const question of questions
  ) {
    const topic =
      question.topic?.trim() ||
      "General";

    counts[topic] =
      (counts[topic] || 0) +
      1;
  }

  return Object.entries(
    counts
  )
    .map(
      ([
        topic,
        count,
      ]) => ({
        topic,
        count,
      })
    )
    .sort(
      (a, b) =>
        b.count - a.count
    );
}