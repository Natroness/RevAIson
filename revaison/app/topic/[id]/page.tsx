"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import Navbar from "@/components/Navbar";
import NotesEditor from "@/components/NotesEditor";
import AdaptiveReviewControls from "@/components/AdaptiveReviewControls";
import { getCurrentUser } from "@/lib/authService";
import {
  getTopicById,
  deleteTopic,
  updateTopicNotes,
} from "@/lib/topicService";
import { completeAdaptiveReview } from "@/lib/reviewService";
import type { ItemStatus, Rating, Topic } from "@/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_BADGE: Record<ItemStatus, string> = {
  not_started: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  learning: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  weak: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  mastered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
};

interface TopicDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TopicDetailPage({ params }: TopicDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!UUID_REGEX.test(id)) {
        setError("Invalid topic id");
        setLoading(false);
        return;
      }
      const userRes = await getCurrentUser();
      if (!active) return;
      if (!userRes.data) {
        router.replace("/login");
        return;
      }
      const topicRes = await getTopicById(userRes.data.id, id);
      if (!active) return;
      if (topicRes.error || !topicRes.data) {
        setError(topicRes.error ?? "Topic not found");
      } else {
        setTopic(topicRes.data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, router]);

  async function handleRate(rating: Rating) {
    if (!topic) return;
    const { data, error: e } = await completeAdaptiveReview(
      topic.user_id,
      "topic",
      topic.id,
      rating,
    );
    if (e || !data) {
      setError(e ?? "Could not save review");
      return;
    }
    setTopic((prev) =>
      prev
        ? {
            ...prev,
            next_review_at: data.next_review_at,
            last_reviewed_at: new Date().toISOString(),
            attempt_count: data.attempt_count,
            status: data.status,
          }
        : prev,
    );
  }

  async function handleSaveNotes(notes: string) {
    if (!topic) return;
    const { data, error: e } = await updateTopicNotes(
      topic.user_id,
      topic.id,
      notes,
    );
    if (e || !data) throw new Error(e ?? "Could not save notes");
    setTopic((prev) => (prev ? { ...prev, notes: data.notes } : prev));
  }

  async function handleDelete() {
    if (!topic || deleting) return;
    const confirmed = window.confirm(
      "Delete this topic and its review history? This cannot be undone.",
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error: e } = await deleteTopic(topic.user_id, topic.id);
    if (e) {
      setError(e);
      setDeleting(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : error || !topic ? (
          <div className="space-y-4">
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
            >
              {error ?? "Topic not found"}
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <article className="space-y-8">
            <header className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[topic.status ?? "learning"]}`}
                >
                  {(topic.status ?? "learning").replace("_", " ")}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {topic.attempt_count ?? 0} attempt
                  {(topic.attempt_count ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {topic.title}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Studied {format(new Date(topic.studied_at), "PPpp")}
                {topic.next_review_at
                  ? ` · Next review ${formatDistanceToNowStrict(new Date(topic.next_review_at), { addSuffix: true })}`
                  : ""}
              </p>
            </header>

            <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Review this topic
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                How well did you recall it? Your rating sets the next review.
              </p>
              <AdaptiveReviewControls onRate={handleRate} />
            </section>

            <NotesEditor
              initialNotes={topic.notes}
              onSave={handleSaveNotes}
            />

            <section className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Back to dashboard
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                {deleting ? "Deleting…" : "Delete topic"}
              </button>
            </section>
          </article>
        )}
      </main>
    </div>
  );
}
