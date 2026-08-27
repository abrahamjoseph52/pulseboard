"use client";

import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export type QuestionStatus = "visible" | "answered";

export interface AnonymousQuestion {
  id: string;
  sessionId: string;
  question: string;
  topic: string;
  status: QuestionStatus;
  createdAt: Date | null;
}

/*
|--------------------------------------------------------------------------
| Nuisance detection
|--------------------------------------------------------------------------
|
| This is intentionally conservative.
| It is NOT intended to replace proper server-side moderation.
|
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
| Text normalization
|--------------------------------------------------------------------------
*/

function normalizeText(text: string): string {
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
  const normalized = normalizeText(text);

  return BLOCKED_PATTERNS.some((pattern) =>
    pattern.test(normalized)
  );
}

/*
|--------------------------------------------------------------------------
| Question validation
|--------------------------------------------------------------------------
*/

export function validateQuestion(text: string): {
  valid: boolean;
  reason?: string;
} {
  const question = normalizeText(text);

  if (!question) {
    return {
      valid: false,
      reason: "Please enter a question.",
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

  if (containsNuisanceContent(question)) {
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
| Submit anonymous question
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| We deliberately DO NOT save:
|
| uid
| studentId
| email
| name
| registerNumber
|
*/

export async function submitAnonymousQuestion(
  sessionId: string,
  question: string,
  topic = "General"
): Promise<string> {
  const validation = validateQuestion(question);

  if (!validation.valid) {
    throw new Error(
      validation.reason || "Invalid question."
    );
  }

  if (!sessionId?.trim()) {
    throw new Error("Session ID is missing.");
  }

  const cleanQuestion = normalizeText(question);

  const cleanTopic =
    normalizeText(topic || "General") || "General";

  const questionRef = await addDoc(
    collection(db, "questions"),
    {
      sessionId: sessionId.trim(),
      question: cleanQuestion,
      topic: cleanTopic,
      status: "visible",
      createdAt: serverTimestamp(),
    }
  );

  return questionRef.id;
}

/*
|--------------------------------------------------------------------------
| Subscribe to session questions
|--------------------------------------------------------------------------
|
| We only use:
|
| where(sessionId == ...)
|
| and sort in JavaScript.
|
| This avoids requiring a composite Firestore index.
|
*/

export function subscribeToQuestions(
  sessionId: string,
  callback: (questions: AnonymousQuestion[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!sessionId) {
    callback([]);
    return () => {};
  }

  const questionsQuery = query(
    collection(db, "questions"),
    where("sessionId", "==", sessionId)
  );

  return onSnapshot(
    questionsQuery,
    (snapshot) => {
      const questions: AnonymousQuestion[] =
        snapshot.docs.map((document) => {
          const data = document.data();

          let createdAt: Date | null = null;

          if (
            data.createdAt &&
            typeof data.createdAt.toDate === "function"
          ) {
            createdAt = data.createdAt.toDate();
          }

          return {
            id: document.id,
            sessionId:
              typeof data.sessionId === "string"
                ? data.sessionId
                : sessionId,
            question:
              typeof data.question === "string"
                ? data.question
                : "",
            topic:
              typeof data.topic === "string"
                ? data.topic
                : "General",
            status:
              data.status === "answered"
                ? "answered"
                : "visible",
            createdAt,
          };
        });

      questions.sort((a, b) => {
        const aTime =
          a.createdAt?.getTime() ?? 0;

        const bTime =
          b.createdAt?.getTime() ?? 0;

        return bTime - aTime;
      });

      callback(questions);
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
| Topic statistics
|--------------------------------------------------------------------------
*/

export function getQuestionTopicCounts(
  questions: AnonymousQuestion[]
): Array<{
  topic: string;
  count: number;
}> {
  const counts: Record<string, number> = {};

  for (const question of questions) {
    const topic =
      question.topic?.trim() || "General";

    counts[topic] = (counts[topic] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([topic, count]) => ({
      topic,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}