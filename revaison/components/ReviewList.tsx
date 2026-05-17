"use client";

import ReviewCard from "./ReviewCard";
import type { ReviewWithTopic } from "@/types";

interface ReviewListProps {
  title: string;
  description?: string;
  reviews: ReviewWithTopic[];
  emptyMessage: string;
  variant?: "due" | "upcoming" | "completed";
  onComplete?: (reviewId: string) => Promise<void> | void;
}

export default function ReviewList({
  title,
  description,
  reviews,
  emptyMessage,
  variant = "due",
  onComplete,
}: ReviewListProps) {
  return (
    <section className="space-y-3">
      <header className="space-y-0.5">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({reviews.length})
          </span>
        </h2>
        {description ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </header>
      {reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white/50 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              variant={variant}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
