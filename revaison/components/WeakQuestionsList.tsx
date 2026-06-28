"use client";

import ReviewList from "./ReviewList";
import type { Rating, ReviewItem } from "@/types";

interface WeakQuestionsListProps {
  items: ReviewItem[];
  onRate?: (item: ReviewItem, rating: Rating) => Promise<void>;
}

/** Weak / repeatedly-hard items, surfaced for extra practice. */
export default function WeakQuestionsList({
  items,
  onRate,
}: WeakQuestionsListProps) {
  return (
    <ReviewList
      title="Weak questions"
      description="Items rated Hard or Again — give these extra reps."
      items={items}
      variant="weak"
      emptyMessage="No weak items. Keep it up!"
      onRate={onRate}
    />
  );
}
