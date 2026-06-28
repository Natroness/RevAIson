import { addHours, addDays } from "date-fns";
import type { ItemStatus, Rating } from "@/types";

export const RATINGS: ReadonlyArray<Rating> = [
  "Easy",
  "Medium",
  "Hard",
  "Again",
];

/** Adaptive spacing: rating → offset from "now". No future rows are stored. */
const RATING_SCHEDULE: Record<Rating, (base: Date) => Date> = {
  Easy: (d) => addDays(d, 3),
  Medium: (d) => addDays(d, 1),
  Hard: (d) => addHours(d, 8),
  Again: (d) => addHours(d, 1),
};

export function isValidRating(value: unknown): value is Rating {
  return (
    value === "Easy" ||
    value === "Medium" ||
    value === "Hard" ||
    value === "Again"
  );
}

/** Compute the single next review time for an item from its latest rating. */
export function computeNextReview(rating: Rating, from: Date = new Date()): Date {
  return RATING_SCHEDULE[rating](from);
}

/**
 * Derive the next status from the latest rating, current status and attempt
 * count. Pure — callers persist the result on the main row.
 *
 * - "Again"/"Hard"  → weak (the item needs more work)
 * - "Easy" with 2+ prior attempts → mastered
 * - otherwise       → learning
 */
export function nextStatus(
  rating: Rating,
  attemptCountAfter: number,
): ItemStatus {
  if (rating === "Again" || rating === "Hard") return "weak";
  if (rating === "Easy" && attemptCountAfter >= 3) return "mastered";
  return "learning";
}
