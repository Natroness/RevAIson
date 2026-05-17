"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isPast } from "date-fns";
import Navbar from "@/components/Navbar";
import { getCurrentUser } from "@/lib/authService";
import { getTopicById, deleteTopic } from "@/lib/topicService";
import {
  getReviewsForTopic,
  markReviewCompleted,
} from "@/lib/reviewService";
import type { Review, Topic } from "@/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TopicDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TopicDetailPage({ params }: TopicDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
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
      const uid = userRes.data.id;

      const [topicRes, reviewsRes] = await Promise.all([
        getTopicById(uid, id),
        getReviewsForTopic(uid, id),
      ]);
      if (!active) return;

      if (topicRes.error || !topicRes.data) {
        setError(topicRes.error ?? "Topic not found");
        setLoading(false);
        return;
      }
      if (reviewsRes.error) {
        setError(reviewsRes.error);
        setLoading(false);
        return;
      }

      setTopic(topicRes.data);
      setReviews(reviewsRes.data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, router]);

  async function handleMarkComplete(reviewId: string) {
    if (!topic) return;
    setMarking(reviewId);
    const { error: serviceError } = await markReviewCompleted(
      topic.user_id,
      reviewId,
    );
    setMarking(null);
    if (serviceError) {
      setError(serviceError);
      return;
    }
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, completed: true, completed_at: new Date().toISOString() }
          : r,
      ),
    );
  }

  async function handleDelete() {
    if (!topic || deleting) return;
    const confirmed = window.confirm(
      "Delete this topic and all its reviews? This cannot be undone.",
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error: serviceError } = await deleteTopic(topic.user_id, topic.id);
    if (serviceError) {
      setError(serviceError);
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
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Topic
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {topic.title}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Studied {format(new Date(topic.studied_at), "PPpp")}
              </p>
            </header>

            {topic.notes ? (
              <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Notes
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                  {topic.notes}
                </p>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Review schedule
              </h2>
              <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {reviews.map((review) => {
                  const due = isPast(new Date(review.review_time));
                  return (
                    <li
                      key={review.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {review.interval_label}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {format(new Date(review.review_time), "PPpp")}
                          {review.completed && review.completed_at
                            ? ` · Completed ${format(new Date(review.completed_at), "PPpp")}`
                            : ""}
                        </p>
                      </div>
                      {review.completed ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Completed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkComplete(review.id)}
                          disabled={marking === review.id}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            due
                              ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                              : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {marking === review.id
                            ? "Marking…"
                            : due
                              ? "Mark complete"
                              : "Complete early"}
                        </button>
                      )}
                    </li>
                  );
                })}
                {reviews.length === 0 ? (
                  <li className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                    No reviews scheduled for this topic.
                  </li>
                ) : null}
              </ul>
            </section>

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
