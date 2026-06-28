"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ReviewList from "@/components/ReviewList";
import WeakQuestionsList from "@/components/WeakQuestionsList";
import NeetCodeProgressGrid from "@/components/NeetCodeProgressGrid";
import CompletedReviewCard from "@/components/CompletedReviewCard";
import { getCurrentUser } from "@/lib/authService";
import {
  completeAdaptiveReview,
  getCompletedReviews,
  getDueReviews,
  getUpcomingReviews,
  getWeakQuestions,
  reopenReview,
} from "@/lib/reviewService";
import { getNeetCodeGrid } from "@/lib/neetcodeService";
import {
  requestNotificationPermission,
  showReviewNotification,
} from "@/lib/notifications";
import type {
  CompletedReview,
  NeetCodeGridCell,
  Rating,
  ReviewItem,
} from "@/types";

const REFRESH_INTERVAL_MS = 60_000;

interface DashboardState {
  due: ReviewItem[];
  upcoming: ReviewItem[];
  weak: ReviewItem[];
  grid: NeetCodeGridCell[];
  completed: CompletedReview[];
}

const EMPTY: DashboardState = {
  due: [],
  upcoming: [],
  weak: [],
  grid: [],
  completed: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<DashboardState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (uid: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setRefreshing(true);
    try {
      const [dueRes, upcomingRes, weakRes, gridRes, completedRes] =
        await Promise.all([
          getDueReviews(uid),
          getUpcomingReviews(uid, 10),
          getWeakQuestions(uid, 6),
          getNeetCodeGrid(uid),
          getCompletedReviews(uid, 5),
        ]);

      const firstError =
        dueRes.error ||
        upcomingRes.error ||
        weakRes.error ||
        gridRes.error ||
        completedRes.error;
      if (firstError) throw new Error(firstError);

      const due = dueRes.data ?? [];
      setState({
        due,
        upcoming: upcomingRes.data ?? [],
        weak: weakRes.data ?? [],
        grid: gridRes.data ?? [],
        completed: completedRes.data ?? [],
      });
      for (const item of due) showReviewNotification(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const userRes = await getCurrentUser();
      if (!active) return;
      if (userRes.error || !userRes.data) {
        router.replace("/login");
        return;
      }
      const uid = userRes.data.id;
      setUserId(uid);
      await requestNotificationPermission();
      await load(uid);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router, load]);

  useEffect(() => {
    if (!userId) return;
    const interval = window.setInterval(() => {
      load(userId, { silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [userId, load]);

  const handleRate = useCallback(
    async (item: ReviewItem, rating: Rating) => {
      if (!userId) return;
      const { error: e } = await completeAdaptiveReview(
        userId,
        item.item_type,
        item.id,
        rating,
      );
      if (e) throw new Error(e);
      await load(userId, { silent: true });
    },
    [userId, load],
  );

  const handleReopen = useCallback(
    async (review: CompletedReview) => {
      if (!userId || !review.topic_id) return;
      const { error: e } = await reopenReview(userId, "topic", review.topic_id);
      if (e) throw new Error(e);
      await load(userId, { silent: true });
    },
    [userId, load],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your adaptive study queue.
            </p>
          </div>
          {refreshing ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Refreshing…
            </span>
          ) : null}
        </header>

        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading your dashboard…
          </p>
        ) : (
          <div className="space-y-10">
            <ReviewList
              title="Due now"
              description="Rate each item to schedule its next review."
              items={state.due}
              variant="due"
              emptyMessage="Nothing due right now. Nice work!"
              onRate={handleRate}
            />

            <ReviewList
              title="Upcoming reviews"
              description="Scheduled but not yet due."
              items={state.upcoming}
              variant="upcoming"
              emptyMessage="Add a topic or review a NeetCode question to schedule reviews."
            />

            <NeetCodeProgressGrid cells={state.grid} />

            <WeakQuestionsList items={state.weak} onRate={handleRate} />

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Recently completed
                  <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                    (latest {state.completed.length})
                  </span>
                </h2>
                <Link
                  href="/completed"
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  View all completed reviews →
                </Link>
              </div>
              {state.completed.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-white/50 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                  Completed reviews will appear here.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {state.completed.map((review) => (
                    <CompletedReviewCard
                      key={review.id}
                      review={review}
                      onReopen={handleReopen}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
