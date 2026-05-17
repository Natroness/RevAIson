import { supabase } from "./supabaseClient";
import type { ServiceResult, Topic } from "@/types";

const TITLE_MAX_LENGTH = 200;
const NOTES_MAX_LENGTH = 5000;

function sanitize(value: string | null | undefined, max: number): string {
  if (value == null) return "";
  return value.trim().slice(0, max);
}

function requireUserId(userId: string | null | undefined): string | null {
  if (!userId) return "Missing user id";
  return null;
}

export async function createTopic(
  userId: string,
  title: string,
  notes: string | null,
  studiedAt: Date,
): Promise<ServiceResult<Topic>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const cleanTitle = sanitize(title, TITLE_MAX_LENGTH);
  if (!cleanTitle) return { data: null, error: "Title is required" };

  if (!(studiedAt instanceof Date) || Number.isNaN(studiedAt.getTime())) {
    return { data: null, error: "Invalid study date" };
  }

  const cleanNotes = sanitize(notes ?? "", NOTES_MAX_LENGTH) || null;

  const { data, error } = await supabase
    .from("topics")
    .insert({
      user_id: userId,
      title: cleanTitle,
      notes: cleanNotes,
      studied_at: studiedAt.toISOString(),
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Topic, error: null };
}

export async function getTopics(
  userId: string,
): Promise<ServiceResult<Topic[]>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };

  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Topic[], error: null };
}

export async function getTopicById(
  userId: string,
  topicId: string,
): Promise<ServiceResult<Topic>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!topicId) return { data: null, error: "Missing topic id" };

  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("user_id", userId)
    .eq("id", topicId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Topic not found" };
  return { data: data as Topic, error: null };
}

export async function deleteTopic(
  userId: string,
  topicId: string,
): Promise<ServiceResult<true>> {
  const idError = requireUserId(userId);
  if (idError) return { data: null, error: idError };
  if (!topicId) return { data: null, error: "Missing topic id" };

  const { error } = await supabase
    .from("topics")
    .delete()
    .eq("user_id", userId)
    .eq("id", topicId);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}
