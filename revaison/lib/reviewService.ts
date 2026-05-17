import { supabase } from "./supabaseClient";
import type {
  Review,
  ReviewScheduleItem,
  ReviewWithTopic,
  ServiceResult,
} from "@/types";

function requireUserId(userId: string | null | undefined): string | null {
  if (!userId) return "Missing user id";
  return null;
}

export async function createReviews(
  userId: string,
  topicId: string,
  scheduleItems: ReviewScheduleItem[],
): Promise<ServiceResult<Review[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!topicId) return { data: null, error: "Missing topic id" };
  if (!Array.isArray(scheduleItems) || scheduleItems.length === 0) {
    return { data: null, error: "No review schedule provided" };
  }

  const { data: existing, error: existingError } = await supabase
    .from("reviews")
    .select("interval_label")
    .eq("user_id", userId)
    .eq("topic_id", topicId);

  if (existingError) return { data: null, error: existingError.message };

  const existingLabels = new Set(
    (existing ?? []).map((r) => r.interval_label as string),
  );

  const seen = new Set<string>();
  const rows = scheduleItems
    .filter((item) => {
      if (existingLabels.has(item.interval_label)) return false;
      if (seen.has(item.interval_label)) return false;
      seen.add(item.interval_label);
      return true;
    })
    .map((item) => ({
      user_id: userId,
      topic_id: topicId,
      interval_label: item.interval_label,
      review_time: item.review_time.toISOString(),
      completed: false,
    }));

  if (rows.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert(rows)
    .select("*");

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Review[], error: null };
}

export async function getDueReviews(
  userId: string,
): Promise<ServiceResult<ReviewWithTopic[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("reviews")
    .select("*, topic:topics(id, title)")
    .eq("user_id", userId)
    .eq("completed", false)
    .lte("review_time", nowIso)
    .order("review_time", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as ReviewWithTopic[], error: null };
}

export async function getUpcomingReviews(
  userId: string,
): Promise<ServiceResult<ReviewWithTopic[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("reviews")
    .select("*, topic:topics(id, title)")
    .eq("user_id", userId)
    .eq("completed", false)
    .gt("review_time", nowIso)
    .order("review_time", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as ReviewWithTopic[], error: null };
}

export async function getCompletedReviews(
  userId: string,
): Promise<ServiceResult<ReviewWithTopic[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const { data, error } = await supabase
    .from("reviews")
    .select("*, topic:topics(id, title)")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(50);

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as ReviewWithTopic[], error: null };
}

export async function getReviewsForTopic(
  userId: string,
  topicId: string,
): Promise<ServiceResult<Review[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!topicId) return { data: null, error: "Missing topic id" };

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .order("review_time", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Review[], error: null };
}

export async function markReviewCompleted(
  userId: string,
  reviewId: string,
): Promise<ServiceResult<Review>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!reviewId) return { data: null, error: "Missing review id" };

  const { data, error } = await supabase
    .from("reviews")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", reviewId)
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Review, error: null };
}
