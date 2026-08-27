"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageCircleQuestion,
} from "lucide-react";
import AnonymousQuestion from "@/app/components/student/AnonymousQuestion";

export default function StudentQuestionsPage() {
  const params = useParams();
  const router = useRouter();

  const sessionId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">

        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to session
        </button>

        {/* Page heading */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-cyan-400">
            <MessageCircleQuestion className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">
              Student Voice
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Ask without hesitation.
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
            Ask your faculty anything related to
            today&apos;s class. Your identity will not
            be displayed with the question.
          </p>
        </div>

        {/* Anonymous question box */}
        {sessionId ? (
          <AnonymousQuestion
            sessionId={sessionId}
          />
        ) : (
          <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-5">
            <p className="text-sm font-semibold text-red-300">
              Session not found
            </p>

            <p className="mt-1 text-xs text-red-300/60">
              The session ID is missing from this page.
            </p>
          </div>
        )}

        {/* Information */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold text-white/45">
            💡 Tip
          </p>
          <p className="mt-1 text-xs leading-5 text-white/25">
            Instead of saying &quot;I don&apos;t understand&quot;,
            mention the exact concept that confused you.
            This helps your faculty address the learning
            gap quickly.
          </p>
        </div>

      </div>
    </main>
  );
}