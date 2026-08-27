"use client";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  BookOpen,
} from "lucide-react";

import TopicLearningGaps from "@/app/components/admin/TopicLearningGaps";

export default function LearningGapsPage() {
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

      <div className="mx-auto w-full max-w-6xl">

        {/* Back */}

        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to session
        </button>

        {/* Heading */}

        <div className="mb-6">

          <div className="flex items-center gap-2 text-cyan-400">

            <BookOpen className="h-5 w-5" />

            <span className="text-xs font-bold uppercase tracking-[0.2em]">
              Learning Analytics
            </span>

          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Topic Learning Gaps
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            PulseBoard analyses anonymous classroom
            responses to identify concepts that need
            more attention.
          </p>

        </div>

        {/* Main analytics */}

        <TopicLearningGaps
          sessionId={sessionId}
        />

      </div>

    </main>
  );
}