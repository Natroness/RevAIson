"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import Navbar from "@/components/Navbar";
import NotesEditor from "@/components/NotesEditor";
import AdaptiveReviewControls from "@/components/AdaptiveReviewControls";
import { getCurrentUser } from "@/lib/authService";
import {
  getNeetCodeByNumber,
  updateNeetCode,
} from "@/lib/neetcodeService";
import { completeAdaptiveReview } from "@/lib/reviewService";
import type {
  Confidence,
  ItemStatus,
  NeetCodeQuestion,
  Rating,
} from "@/types";

const STATUS_BADGE: Record<ItemStatus, string> = {
  not_started: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  learning: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  weak: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  mastered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
};

const STATUS_OPTIONS: ItemStatus[] = [
  "not_started",
  "learning",
  "weak",
  "mastered",
];
const CONFIDENCE_OPTIONS: Confidence[] = ["low", "medium", "high"];

interface NeetCodeDetailPageProps {
  params: Promise<{ number: string }>;
}

export default function NeetCodeDetailPage({
  params,
}: NeetCodeDetailPageProps) {
  const { number } = use(params);
  const router = useRouter();
  const [question, setQuestion] = useState<NeetCodeQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const questionNumber = Number(number);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!Number.isInteger(questionNumber)) {
        setError("Invalid question number");
        setLoading(false);
        return;
      }
      const userRes = await getCurrentUser();
      if (!active) return;
      if (!userRes.data) {
        router.replace("/login");
        return;
      }
      const res = await getNeetCodeByNumber(userRes.data.id, questionNumber);
      if (!active) return;
      if (res.error || !res.data) {
        setError(res.error ?? "Question not found");
      } else {
        setQuestion(res.data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [questionNumber, router]);

  async function handleRate(rating: Rating) {
    if (!question) return;
    const { data, error: e } = await completeAdaptiveReview(
      question.user_id,
      "neetcode",
      question.id,
      rating,
    );
    if (e || !data) {
      setError(e ?? "Could not save review");
      return;
    }
    setQuestion((prev) =>
      prev
        ? {
            ...prev,
            next_review_at: data.next_review_at,
            last_reviewed_at: new Date().toISOString(),
            attempt_count: data.attempt_count,
            status: data.status,
          }
        : prev,
    );
  }

  async function patch(update: Parameters<typeof updateNeetCode>[2]) {
    if (!question) return;
    const { data, error: e } = await updateNeetCode(
      question.user_id,
      question.id,
      update,
    );
    if (e || !data) throw new Error(e ?? "Could not update");
    setQuestion(data);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : error || !question ? (
          <div className="space-y-4">
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
            >
              {error ?? "Question not found"}
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <article className="space-y-8">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[question.status ?? "not_started"]}`}
                >
                  {(question.status ?? "not_started").replace("_", " ")}
                </span>
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  #{question.question_number} · {question.category}
                </span>
                {question.difficulty ? (
                  <span className="text-xs font-medium capitalize text-zinc-500 dark:text-zinc-400">
                    {question.difficulty}
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {question.title}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {question.attempt_count ?? 0} attempt
                {(question.attempt_count ?? 0) === 1 ? "" : "s"}
                {question.last_reviewed_at
                  ? ` · Last reviewed ${formatDistanceToNowStrict(new Date(question.last_reviewed_at))} ago`
                  : ""}
                {question.next_review_at
                  ? ` · Next ${formatDistanceToNowStrict(new Date(question.next_review_at), { addSuffix: true })}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-3 pt-1 text-sm">
                {question.leetcode_url ? (
                  <a
                    href={question.leetcode_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    LeetCode ↗
                  </a>
                ) : null}
                {question.neetcode_url ? (
                  <a
                    href={question.neetcode_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    NeetCode ↗
                  </a>
                ) : null}
              </div>
            </header>

            <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Review this question
              </h2>
              <AdaptiveReviewControls onRate={handleRate} />

              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    Status
                  </span>
                  <select
                    value={question.status}
                    onChange={(e) =>
                      patch({ status: e.target.value as ItemStatus }).catch(
                        (err) => setError(err.message),
                      )
                    }
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    Confidence
                  </span>
                  <select
                    value={question.confidence ?? ""}
                    onChange={(e) =>
                      patch({
                        confidence: (e.target.value || null) as Confidence | null,
                      }).catch((err) => setError(err.message))
                    }
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <option value="">—</option>
                    {CONFIDENCE_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {error ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : null}
            </section>

            <NotesEditor
              initialNotes={question.notes}
              onSave={(notes) => patch({ notes })}
              placeholder="Approach, pattern, complexity, gotchas, links…"
            />

            <section>
              <Link
                href="/dashboard"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Back to dashboard
              </Link>
            </section>
          </article>
        )}
      </main>
    </div>
  );
}
