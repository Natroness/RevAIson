// ── Core enums ───────────────────────────────────────────────────────────────

export type Rating = "Easy" | "Medium" | "Hard" | "Again";

export type Difficulty = "easy" | "medium" | "hard";

export type Confidence = "low" | "medium" | "high";

/** Status shared by topics and NeetCode questions. */
export type ItemStatus = "not_started" | "learning" | "weak" | "mastered";

export type ReviewItemType = "topic" | "neetcode";

// ── Main study item: Topic ───────────────────────────────────────────────────

export interface Topic {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  studied_at: string;
  created_at: string;
  difficulty: Difficulty;
  status: ItemStatus;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  attempt_count: number;
}

// ── Review history (one row per actual review) ───────────────────────────────

export interface ReviewAttempt {
  id: string;
  user_id: string;
  topic_id: string | null;
  rating: Rating;
  reviewed_at: string;
  next_review_at: string | null;
}

/** A completed review attempt joined with its parent topic, for history views. */
export interface CompletedReview extends ReviewAttempt {
  topic: Pick<Topic, "id" | "title"> | null;
}

// ── NeetCode 150 question ────────────────────────────────────────────────────

export interface NeetCodeQuestion {
  id: string;
  user_id: string;
  question_number: number;
  title: string;
  category: string;
  difficulty: Difficulty | null;
  neetcode_url: string | null;
  leetcode_url: string | null;
  status: ItemStatus;
  notes: string | null;
  confidence: Confidence | null;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  attempt_count: number;
  created_at: string;
}

/** Lightweight row for the 150-dot progress grid. */
export interface NeetCodeGridCell {
  id: string;
  question_number: number;
  title: string;
  category: string;
  difficulty: Difficulty | null;
  status: ItemStatus;
}

// ── Normalized review item (dashboard cards reuse this) ──────────────────────

export interface ReviewItem {
  id: string;
  item_type: ReviewItemType;
  title: string;
  href: string;
  category: string | null;
  difficulty: Difficulty | null;
  status: ItemStatus;
  notes: string | null;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  attempt_count: number;
}

// ── Filters & results ────────────────────────────────────────────────────────

export interface CompletedReviewFilters {
  search?: string;
  rating?: Rating;
  sortDirection?: "asc" | "desc";
}

export interface CompletedReviewStats {
  total: number;
  byRating: Partial<Record<Rating, number>>;
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
