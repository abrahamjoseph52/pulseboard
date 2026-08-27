"use client";

import { useState } from "react";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { MessageCircleQuestion, Send } from "lucide-react";

import { auth, db } from "@/lib/firebase";

type AnonymousQuestionProps = {
  sessionId: string;
};

export default function AnonymousQuestion({
  sessionId,
}: AnonymousQuestionProps) {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = question.trim();

    if (!text || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      await addDoc(
        collection(db, "sessions", sessionId, "questions"),
        {
          text,
          question: text,
          studentId: auth.currentUser?.uid ?? null,
          status: "pending",
          answered: false,
          createdAt: serverTimestamp(),
        }
      );

      setQuestion("");
      setMessage("Your anonymous question was sent.");
    } catch (error) {
      console.error("Failed to send question:", error);
      setMessage("Unable to send your question. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex items-center gap-2 text-cyan-400">
        <MessageCircleQuestion className="h-5 w-5" />
        <h2 className="text-sm font-bold">
          Ask an anonymous question
        </h2>
      </div>

      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Type your question here..."
        maxLength={500}
        rows={5}
        disabled={submitting}
        className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/50 disabled:opacity-50"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-white/30">
          {question.length}/500
        </span>

        <button
          type="submit"
          disabled={!question.trim() || submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Sending..." : "Send question"}
        </button>
      </div>

      {message && (
        <p className="mt-3 text-xs text-cyan-300">
          {message}
        </p>
      )}
    </form>
  );
}