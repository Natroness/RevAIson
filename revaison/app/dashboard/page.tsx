"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ReviewList from "@/components/ReviewList";
import { getCurrentUser } from "@/lib/authService";
import {
  getCompletedReviews,
  getDueReviews,
  getUpcomingReviews,
  markReviewCompleted,
} from "@/lib/reviewService";
import {
  requestNotificationPermission,
  showReviewNotification,
} from "@/lib/notifications";
import type { ReviewWithTopic } from "@/types";

interface DashboardState {
  due: ReviewWithTopic[];
  upcoming: ReviewWithTopic[];
  completed: ReviewWithTopic[];
}

const REFRESH_INTERVAL_MS = 60_000;

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<DashboardState>({
    due: [],
    upcoming: [],
    completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(
    async (uid: string, options?: { silent?: boolean }) => {
      if (!options?.silent) setRefreshing(true);
      try {
        const [dueRes, upcomingRes, completedRes] = await Promise.all([
          getDueReviews(uid),
          getUpcomingReviews(uid),
          getCompletedReviews(uid),
        ]);
        if (dueRes.error) throw new Error(dueRes.error);
        if (upcomingRes.error) throw new Error(upcomingRes.error);
        if (completedRes.error) throw new Error(completedRes.error);

        const due = dueRes.data ?? [];
        setState({
          due,
          upcoming: upcomingRes.data ?? [],
          completed: completedRes.data ?? [],
        });

        for (const review of due) {
          showReviewNotification(review);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not load reviews";
        setError(message);
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

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
      await loadReviews(uid);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router, loadReviews]);

  useEffect(() => {
    if (!userId) return;
    const interval = window.setInterval(() => {
      loadReviews(userId, { silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [userId, loadReviews]);

  const handleComplete = useCallback(
    async (reviewId: string) => {
      if (!userId) return;
      const previous = state;
      const completedReview = previous.due.find((r) => r.id === reviewId);
      setState((prev) => ({
        due: prev.due.filter((r) => r.id !== reviewId),
        upcoming: prev.upcoming,
        completed: completedReview
          ? [
              {
                ...completedReview,
                completed: true,
                completed_at: new Date().toISOString(),
              },
              ...prev.completed,
            ]
          : prev.completed,
      }));

      const { error: serviceError } = await markReviewCompleted(
        userId,
        reviewId,
      );
      if (serviceError) {
        setState(previous);
        setError(serviceError);
        throw new Error(serviceError);
      }
    },
    [state, userId],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your spaced-repetition queue.
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
            Loading your reviews…
          </p>
        ) : (
          <div className="space-y-10">
            <ReviewList
              title="Due now"
              description="Review these before they pile up."
              reviews={state.due}
              variant="due"
              emptyMessage="Nothing due right now. Nice work!"
              onComplete={handleComplete}
            />
            <ReviewList
              title="Upcoming"
              description="Scheduled but not yet due."
              reviews={state.upcoming}
              variant="upcoming"
              emptyMessage="Add a topic to start scheduling reviews."
            />
            <ReviewList
              title="Recently completed"
              reviews={state.completed}
              variant="completed"
              emptyMessage="Completed reviews will appear here."
            />
          </div>
        )}
      </main>
    </div>
  );
}
