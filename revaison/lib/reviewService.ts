import { supabase } from "./supabaseClient";
import { computeNextReview, isValidRating, nextStatus } from "./reviewSchedule";
import type {
  CompletedReview,
  CompletedReviewFilters,
  CompletedReviewStats,
  ItemStatus,
  Rating,
  ReviewItem,
  ReviewItemType,
  ServiceResult,
} from "@/types";

function requireUserId(userId: string | null | undefined): string | null {
  if (!userId) return "Missing user id";
  return null;
}

// ── Row → ReviewItem mappers (keep card payloads lightweight) ────────────────

const TOPIC_ITEM_COLS =
  "id, title, notes, difficulty, status, next_review_at, last_reviewed_at, attempt_count";
const NEETCODE_ITEM_COLS =
  "id, question_number, title, category, difficulty, status, notes, next_review_at, last_reviewed_at, attempt_count";

/* eslint-disable @typescript-eslint/no-explicit-any */
function topicToItem(row: any): ReviewItem {
  return {
    id: row.id,
    item_type: "topic",
    title: row.title,
    href: `/topic/${row.id}`,
    category: null,
    difficulty: row.difficulty ?? null,
    status: (row.status ?? "learning") as ItemStatus,
    notes: row.notes ?? null,
    next_review_at: row.next_review_at ?? null,
    last_reviewed_at: row.last_reviewed_at ?? null,
    attempt_count: row.attempt_count ?? 0,
  };
}

function neetcodeToItem(row: any): ReviewItem {
  return {
    id: row.id,
    item_type: "neetcode",
    title: row.title,
    href: `/neetcode/${row.question_number}`,
    category: row.category ?? null,
    difficulty: row.difficulty ?? null,
    status: (row.status ?? "not_started") as ItemStatus,
    notes: row.notes ?? null,
    next_review_at: row.next_review_at ?? null,
    last_reviewed_at: row.last_reviewed_at ?? null,
    attempt_count: row.attempt_count ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function byNextReviewAsc(a: ReviewItem, b: ReviewItem): number {
  const ta = a.next_review_at ? Date.parse(a.next_review_at) : Infinity;
  const tb = b.next_review_at ? Date.parse(b.next_review_at) : Infinity;
  return ta - tb;
}

// ── Adaptive completion ──────────────────────────────────────────────────────

/**
 * Record a single review. Updates ONLY the main item row's next_review_at /
 * status / attempt_count, and (for topics) inserts exactly one history row.
 * Never generates multiple future review rows.
 */
export async function completeAdaptiveReview(
  userId: string,
  itemType: ReviewItemType,
  itemId: string,
  rating: Rating,
): Promise<
  ServiceResult<{
    next_review_at: string;
    status: ItemStatus;
    attempt_count: number;
  }>
> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!itemId) return { data: null, error: "Missing item id" };
  if (!isValidRating(rating)) return { data: null, error: "Invalid rating" };

  const table = itemType === "topic" ? "topics" : "neetcode_questions";

  // Fetch current row (ownership enforced by user_id filter + RLS).
  const { data: current, error: fetchError } = await supabase
    .from(table)
    .select("attempt_count, status")
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle();

  if (fetchError) return { data: null, error: fetchError.message };
  if (!current) return { data: null, error: "Review item not found" };

  const now = new Date();
  const nextReview = computeNextReview(rating, now);
  const attemptCount = (current.attempt_count ?? 0) + 1;
  const status = nextStatus(rating, attemptCount);

  const { error: updateError } = await supabase
    .from(table)
    .update({
      next_review_at: nextReview.toISOString(),
      last_reviewed_at: now.toISOString(),
      attempt_count: attemptCount,
      status,
    })
    .eq("user_id", userId)
    .eq("id", itemId);

  if (updateError) return { data: null, error: updateError.message };

  // History row only for topics (review_attempts.topic_id → topics).
  if (itemType === "topic") {
    const { error: historyError } = await supabase
      .from("review_attempts")
      .insert({
        user_id: userId,
        topic_id: itemId,
        rating,
        reviewed_at: now.toISOString(),
        next_review_at: nextReview.toISOString(),
      });
    if (historyError) return { data: null, error: historyError.message };
  }

  return {
    data: {
      next_review_at: nextReview.toISOString(),
      status,
      attempt_count: attemptCount,
    },
    error: null,
  };
}

// ── Dashboard queries (lightweight, server-filtered) ─────────────────────────

export async function getDueReviews(
  userId: string,
): Promise<ServiceResult<ReviewItem[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const nowIso = new Date().toISOString();

  const [topicRes, neetRes] = await Promise.all([
    supabase
      .from("topics")
      .select(TOPIC_ITEM_COLS)
      .eq("user_id", userId)
      .neq("status", "mastered")
      .lte("next_review_at", nowIso)
      .order("next_review_at", { ascending: true }),
    supabase
      .from("neetcode_questions")
      .select(NEETCODE_ITEM_COLS)
      .eq("user_id", userId)
      .neq("status", "mastered")
      .lte("next_review_at", nowIso)
      .order("next_review_at", { ascending: true }),
  ]);

  if (topicRes.error) return { data: null, error: topicRes.error.message };
  if (neetRes.error) return { data: null, error: neetRes.error.message };

  const items = [
    ...(topicRes.data ?? []).map(topicToItem),
    ...(neetRes.data ?? []).map(neetcodeToItem),
  ].sort(byNextReviewAsc);

  return { data: items, error: null };
}

export async function getUpcomingReviews(
  userId: string,
  limit = 10,
): Promise<ServiceResult<ReviewItem[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const nowIso = new Date().toISOString();

  const [topicRes, neetRes] = await Promise.all([
    supabase
      .from("topics")
      .select(TOPIC_ITEM_COLS)
      .eq("user_id", userId)
      .neq("status", "mastered")
      .gt("next_review_at", nowIso)
      .order("next_review_at", { ascending: true })
      .limit(limit),
    supabase
      .from("neetcode_questions")
      .select(NEETCODE_ITEM_COLS)
      .eq("user_id", userId)
      .neq("status", "mastered")
      .gt("next_review_at", nowIso)
      .order("next_review_at", { ascending: true })
      .limit(limit),
  ]);

  if (topicRes.error) return { data: null, error: topicRes.error.message };
  if (neetRes.error) return { data: null, error: neetRes.error.message };

  const items = [
    ...(topicRes.data ?? []).map(topicToItem),
    ...(neetRes.data ?? []).map(neetcodeToItem),
  ]
    .sort(byNextReviewAsc)
    .slice(0, limit);

  return { data: items, error: null };
}

export async function getWeakQuestions(
  userId: string,
  limit = 10,
): Promise<ServiceResult<ReviewItem[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const [topicRes, neetRes] = await Promise.all([
    supabase
      .from("topics")
      .select(TOPIC_ITEM_COLS)
      .eq("user_id", userId)
      .eq("status", "weak")
      .order("attempt_count", { ascending: false })
      .limit(limit),
    supabase
      .from("neetcode_questions")
      .select(NEETCODE_ITEM_COLS)
      .eq("user_id", userId)
      .eq("status", "weak")
      .order("attempt_count", { ascending: false })
      .limit(limit),
  ]);

  if (topicRes.error) return { data: null, error: topicRes.error.message };
  if (neetRes.error) return { data: null, error: neetRes.error.message };

  const items = [
    ...(topicRes.data ?? []).map(topicToItem),
    ...(neetRes.data ?? []).map(neetcodeToItem),
  ]
    .sort((a, b) => b.attempt_count - a.attempt_count)
    .slice(0, limit);

  return { data: items, error: null };
}

// ── Completed history (review_attempts) ──────────────────────────────────────

const ATTEMPT_COLS =
  "id, user_id, topic_id, rating, reviewed_at, next_review_at";

/** Latest N completed reviews — dashboard preview. Never fetches all history. */
export async function getCompletedReviews(
  userId: string,
  limit = 5,
): Promise<ServiceResult<CompletedReview[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const { data, error } = await supabase
    .from("review_attempts")
    .select(`${ATTEMPT_COLS}, topic:topics(id, title)`)
    .eq("user_id", userId)
    .order("reviewed_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as unknown as CompletedReview[], error: null };
}

/** Paginated history with DB-level search/filter/sort. */
export async function getCompletedReviewsPaginated(
  userId: string,
  page: number,
  pageSize: number,
  filters?: CompletedReviewFilters,
): Promise<ServiceResult<{ reviews: CompletedReview[]; total: number }>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const trimmedSearch = filters?.search?.trim() ?? "";
  const hasSearch = trimmedSearch.length > 0;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const ascending = filters?.sortDirection === "asc";

  const selectClause = hasSearch
    ? `${ATTEMPT_COLS}, topic:topics!inner(id, title)`
    : `${ATTEMPT_COLS}, topic:topics(id, title)`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from("review_attempts")
    .select(selectClause, { count: "exact" })
    .eq("user_id", userId);

  if (filters?.rating) q = q.eq("rating", filters.rating);
  if (hasSearch) q = q.ilike("topics.title", `%${trimmedSearch}%`);

  const {
    data,
    error,
    count,
  }: {
    data: unknown;
    error: { message: string } | null;
    count: number | null;
  } = await q.order("reviewed_at", { ascending }).range(from, to);

  if (error) return { data: null, error: error.message };
  return {
    data: {
      reviews: (data ?? []) as CompletedReview[],
      total: count ?? 0,
    },
    error: null,
  };
}

const RATINGS_FOR_STATS: ReadonlyArray<Rating> = [
  "Easy",
  "Medium",
  "Hard",
  "Again",
];

export async function getCompletedReviewStats(
  userId: string,
): Promise<ServiceResult<CompletedReviewStats>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const results = await Promise.all(
    RATINGS_FOR_STATS.map((rating) =>
      supabase
        .from("review_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("rating", rating),
    ),
  );

  const byRating: Partial<Record<Rating, number>> = {};
  let total = 0;
  for (let i = 0; i < RATINGS_FOR_STATS.length; i++) {
    const { count, error } = results[i];
    if (error) return { data: null, error: error.message };
    byRating[RATINGS_FOR_STATS[i]] = count ?? 0;
    total += count ?? 0;
  }

  return { data: { total, byRating }, error: null };
}

/**
 * "Review again" / reopen: make the item due immediately without deleting
 * history or creating duplicate rows. Works for topics and NeetCode questions.
 */
export async function reopenReview(
  userId: string,
  itemType: ReviewItemType,
  itemId: string,
): Promise<ServiceResult<true>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!itemId) return { data: null, error: "Missing item id" };

  const table = itemType === "topic" ? "topics" : "neetcode_questions";
  const { error } = await supabase
    .from(table)
    .update({ next_review_at: new Date().toISOString(), status: "learning" })
    .eq("user_id", userId)
    .eq("id", itemId);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}
