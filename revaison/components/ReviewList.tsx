"use client";

import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import ReviewCard from "./ReviewCard";
import AdaptiveReviewControls from "./AdaptiveReviewControls";
import type { Rating, ReviewItem } from "@/types";

type Variant = "due" | "upcoming" | "weak";

interface ReviewListProps {
  title: string;
  description?: string;
  items: ReviewItem[];
  emptyMessage: string;
  variant: Variant;
  /** When provided, due/weak cards show adaptive rating controls. */
  onRate?: (item: ReviewItem, rating: Rating) => Promise<void>;
}

function itemMeta(item: ReviewItem, variant: Variant): string {
  const attempts = `${item.attempt_count} attempt${item.attempt_count === 1 ? "" : "s"}`;
  if (variant === "upcoming" && item.next_review_at) {
    return `Due in ${formatDistanceToNowStrict(new Date(item.next_review_at))} · ${attempts}`;
  }
  if (item.last_reviewed_at) {
    return `Last reviewed ${formatDistanceToNowStrict(new Date(item.last_reviewed_at))} ago · ${attempts}`;
  }
  return `Not reviewed yet`;
}

function CardRow({
  item,
  variant,
  onRate,
}: {
  item: ReviewItem;
  variant: Variant;
  onRate?: (item: ReviewItem, rating: Rating) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);

  const badge =
    variant === "due"
      ? { label: "Due now", tone: "amber" as const }
      : variant === "weak"
        ? { label: "Weak", tone: "rose" as const }
        : { label: "Upcoming", tone: "sky" as const };
  const accent = variant === "due" ? "amber" : variant === "weak" ? "rose" : "zinc";

  const showControls = (variant === "due" || variant === "weak") && !!onRate;

  return (
    <ReviewCard
      title={item.title}
      href={item.href}
      eyebrow={item.item_type === "neetcode" ? item.category ?? "NeetCode" : "Topic"}
      meta={itemMeta(item, variant)}
      badge={badge}
      difficulty={item.difficulty}
      accent={accent}
      error={error}
    >
      {showControls ? (
        <AdaptiveReviewControls
          size="sm"
          onRate={async (rating) => {
            setError(null);
            try {
              await onRate!(item, rating);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Could not save review",
              );
            }
          }}
        />
      ) : null}
    </ReviewCard>
  );
}

export default function ReviewList({
  title,
  description,
  items,
  emptyMessage,
  variant,
  onRate,
}: ReviewListProps) {
  return (
    <section className="space-y-3">
      <header className="space-y-0.5">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({items.length})
          </span>
        </h2>
        {description ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </header>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white/50 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <CardRow
              key={`${item.item_type}-${item.id}`}
              item={item}
              variant={variant}
              onRate={onRate}
            />
          ))}
        </div>
      )}
    </section>
  );
}
