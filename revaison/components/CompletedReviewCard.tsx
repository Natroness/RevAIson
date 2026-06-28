"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import ReviewCard from "./ReviewCard";
import type { CompletedReview, Rating } from "@/types";

interface CompletedReviewCardProps {
  review: CompletedReview;
  /** When provided, shows a "Review again" action that reopens the topic. */
  onReopen?: (review: CompletedReview) => Promise<void>;
}

const RATING_TONE: Record<Rating, "emerald" | "sky" | "amber" | "rose"> = {
  Easy: "emerald",
  Medium: "sky",
  Hard: "amber",
  Again: "rose",
};

export default function CompletedReviewCard({
  review,
  onReopen,
}: CompletedReviewCardProps) {
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewedAt = review.reviewed_at ? new Date(review.reviewed_at) : null;
  const title = review.topic?.title ?? "Deleted topic";

  async function handleReopen() {
    if (!onReopen || reopening) return;
    setReopening(true);
    setError(null);
    try {
      await onReopen(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reopen");
      setReopening(false);
    }
  }

  return (
    <ReviewCard
      title={title}
      href={review.topic ? `/topic/${review.topic.id}` : undefined}
      eyebrow="Completed review"
      badge={{ label: review.rating, tone: RATING_TONE[review.rating] }}
      accent="emerald"
      error={error}
      meta={
        reviewedAt
          ? `Reviewed ${formatDistanceToNowStrict(reviewedAt)} ago · ${format(reviewedAt, "PP p")}`
          : "Review date unavailable"
      }
    >
      {onReopen && review.topic ? (
        <button
          type="button"
          onClick={handleReopen}
          disabled={reopening}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {reopening ? "Reopening…" : "Review again"}
        </button>
      ) : null}
    </ReviewCard>
  );
}
