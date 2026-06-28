import { supabase } from "./supabaseClient";
import { NEETCODE_150 } from "./neetcode150";
import type {
  Confidence,
  ItemStatus,
  NeetCodeGridCell,
  NeetCodeQuestion,
  ServiceResult,
} from "@/types";

const NOTES_MAX_LENGTH = 20000;
const GRID_COLS = "id, question_number, title, category, difficulty, status";

function requireUserId(userId: string | null | undefined): string | null {
  if (!userId) return "Missing user id";
  return null;
}

/**
 * Seed the fixed NeetCode 150 for a user. Uses unique(user_id, question_number)
 * with ignoreDuplicates so repeated calls never create duplicate rows.
 */
export async function seedNeetCode150(
  userId: string,
): Promise<ServiceResult<true>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const rows = NEETCODE_150.map((q) => ({
    user_id: userId,
    question_number: q.question_number,
    title: q.title,
    category: q.category,
    difficulty: q.difficulty,
    neetcode_url: q.neetcode_url,
    leetcode_url: q.leetcode_url,
    status: "not_started" as ItemStatus,
  }));

  const { error } = await supabase
    .from("neetcode_questions")
    .upsert(rows, { onConflict: "user_id,question_number", ignoreDuplicates: true });

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

/**
 * Fetch the 150-cell grid. Seeds on first use if the user has no rows yet.
 */
export async function getNeetCodeGrid(
  userId: string,
): Promise<ServiceResult<NeetCodeGridCell[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const first = await supabase
    .from("neetcode_questions")
    .select(GRID_COLS)
    .eq("user_id", userId)
    .order("question_number", { ascending: true });

  if (first.error) return { data: null, error: first.error.message };

  if ((first.data ?? []).length === 0) {
    const seedRes = await seedNeetCode150(userId);
    if (seedRes.error) return { data: null, error: seedRes.error };

    const second = await supabase
      .from("neetcode_questions")
      .select(GRID_COLS)
      .eq("user_id", userId)
      .order("question_number", { ascending: true });
    if (second.error) return { data: null, error: second.error.message };
    return { data: (second.data ?? []) as NeetCodeGridCell[], error: null };
  }

  return { data: (first.data ?? []) as NeetCodeGridCell[], error: null };
}

export async function getNeetCodeByNumber(
  userId: string,
  questionNumber: number,
): Promise<ServiceResult<NeetCodeQuestion>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!Number.isFinite(questionNumber)) {
    return { data: null, error: "Invalid question number" };
  }

  const { data, error } = await supabase
    .from("neetcode_questions")
    .select("*")
    .eq("user_id", userId)
    .eq("question_number", questionNumber)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Question not found" };
  return { data: data as NeetCodeQuestion, error: null };
}

export async function getNeetCodeById(
  userId: string,
  id: string,
): Promise<ServiceResult<NeetCodeQuestion>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!id) return { data: null, error: "Missing question id" };

  const { data, error } = await supabase
    .from("neetcode_questions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Question not found" };
  return { data: data as NeetCodeQuestion, error: null };
}

export interface NeetCodePatch {
  notes?: string;
  status?: ItemStatus;
  confidence?: Confidence | null;
}

/** Update editable fields. Notes are permanent and editable any time. */
export async function updateNeetCode(
  userId: string,
  id: string,
  patch: NeetCodePatch,
): Promise<ServiceResult<NeetCodeQuestion>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!id) return { data: null, error: "Missing question id" };

  const update: Record<string, unknown> = {};
  if (patch.notes !== undefined) {
    update.notes = patch.notes.trim().slice(0, NOTES_MAX_LENGTH) || null;
  }
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.confidence !== undefined) update.confidence = patch.confidence;

  if (Object.keys(update).length === 0) {
    return { data: null, error: "No changes to save" };
  }

  const { data, error } = await supabase
    .from("neetcode_questions")
    .update(update)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as NeetCodeQuestion, error: null };
}

/** Lightweight status tally for the grid header. */
export async function getNeetCodeProgress(userId: string): Promise<
  ServiceResult<{ total: number; byStatus: Record<ItemStatus, number> }>
> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const statuses: ItemStatus[] = ["not_started", "learning", "weak", "mastered"];
  const results = await Promise.all(
    statuses.map((status) =>
      supabase
        .from("neetcode_questions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", status),
    ),
  );

  const byStatus: Record<ItemStatus, number> = {
    not_started: 0,
    learning: 0,
    weak: 0,
    mastered: 0,
  };
  let total = 0;
  for (let i = 0; i < statuses.length; i++) {
    const { count, error } = results[i];
    if (error) return { data: null, error: error.message };
    byStatus[statuses[i]] = count ?? 0;
    total += count ?? 0;
  }

  return { data: { total, byStatus }, error: null };
}
