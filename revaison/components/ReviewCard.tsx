"use client";

import { useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import type { ReviewWithTopic } from "@/types";

interface ReviewCardProps {
  review: ReviewWithTopic;
  onComplete?: (reviewId: string) => Promise<void> | void;
  variant?: "due" | "upcoming" | "completed";
}

export default function ReviewCard({
  review,
  onComplete,
  variant = "due",
}: ReviewCardProps) {
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewDate = new Date(review.review_time);
  const reviewIsPast = isPast(reviewDate);

  async function handleComplete() {
    if (!onComplete || marking) return;
    setError(null);
    setMarking(true);
    try {
      await onComplete(review.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not mark complete";
      setError(message);
      setMarking(false);
    }
  }

  const accent =
    variant === "due"
      ? "border-amber-300 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/30"
      : variant === "completed"
        ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

  return (
    <article
      className={`flex flex-col gap-3 rounded-lg border p-4 shadow-sm ${accent}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {review.topic ? (
            <Link
              href={`/topic/${review.topic.id}`}
              className="block truncate text-base font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
              title={review.topic.title}
            >
              {review.topic.title}
            </Link>
          ) : (
            <span className="block text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Untitled topic
            </span>
          )}
          <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {review.interval_label} review
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          {variant === "completed"
            ? "Completed"
            : reviewIsPast
              ? "Due now"
              : `In ${formatDistanceToNowStrict(reviewDate)}`}
        </span>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Scheduled for {format(reviewDate, "PP p")}
        {variant === "completed" && review.completed_at
          ? ` · Completed ${format(new Date(review.completed_at), "PP p")}`
          : ""}
      </p>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {variant !== "completed" && onComplete ? (
        <button
          type="button"
          onClick={handleComplete}
          disabled={marking}
          className="self-start rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {marking ? "Marking…" : "Mark complete"}
        </button>
      ) : null}
    </article>
  );
}
