"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CompletedReviewCard from "@/components/CompletedReviewCard";
import { getCurrentUser } from "@/lib/authService";
import {
  getCompletedReviewStats,
  getCompletedReviewsPaginated,
  reopenReview,
} from "@/lib/reviewService";
import { RATINGS } from "@/lib/reviewSchedule";
import type {
  CompletedReview,
  CompletedReviewFilters,
  CompletedReviewStats,
  Rating,
} from "@/types";

const PAGE_SIZE = 20;

const INPUT_CLS =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

function StatCard({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: number;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-center ${
        primary
          ? "border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
      }`}
    >
      <p className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

export default function CompletedPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [reviews, setReviews] = useState<CompletedReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CompletedReviewStats | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<Rating | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtersRef = useRef({ debouncedSearch, ratingFilter, sortDir });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await getCurrentUser();
      if (!active) return;
      if (!data) {
        router.replace("/login");
        return;
      }
      setUserId(data.id);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!userId) return;
    getCompletedReviewStats(userId).then(({ data }) => {
      if (data) setStats(data);
    });
  }, [userId]);

  // Re-query from page 0 whenever filters change.
  useEffect(() => {
    if (!userId) return;
    const filters: CompletedReviewFilters = {
      search: debouncedSearch || undefined,
      rating: ratingFilter || undefined,
      sortDirection: sortDir,
    };
    filtersRef.current = { debouncedSearch, ratingFilter, sortDir };
    setPage(0);
    setLoading(true);
    setError(null);
    getCompletedReviewsPaginated(userId, 0, PAGE_SIZE, filters).then(
      ({ data, error: e }) => {
        if (e) setError(e);
        else if (data) {
          setReviews(data.reviews);
          setTotal(data.total);
        }
        setLoading(false);
      },
    );
  }, [userId, debouncedSearch, ratingFilter, sortDir]);

  function handleLoadMore() {
    if (!userId || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    const f = filtersRef.current;
    const filters: CompletedReviewFilters = {
      search: f.debouncedSearch || undefined,
      rating: f.ratingFilter || undefined,
      sortDirection: f.sortDir,
    };
    getCompletedReviewsPaginated(userId, nextPage, PAGE_SIZE, filters).then(
      ({ data, error: e }) => {
        if (e) setError(e);
        else if (data) {
          setReviews((prev) => [...prev, ...data.reviews]);
          setTotal(data.total);
        }
        setLoadingMore(false);
      },
    );
  }

  async function handleReopen(review: CompletedReview) {
    if (!userId || !review.topic_id) return;
    const { error: e } = await reopenReview(userId, "topic", review.topic_id);
    if (e) {
      setError(e);
      throw new Error(e);
    }
    setReviews((prev) => prev.filter((r) => r.id !== review.id));
    setTotal((t) => Math.max(0, t - 1));
  }

  const hasMore = reviews.length < total;
  const isEmpty = !loading && reviews.length === 0;
  const filtersActive = !!debouncedSearch || !!ratingFilter;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Completed Reviews
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Full history · search, filter, and reopen any review.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Dashboard
          </Link>
        </header>

        {stats ? (
          <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
            <StatCard label="Total" value={stats.total} primary />
            {RATINGS.map((r) => (
              <StatCard key={r} label={r} value={stats.byRating[r] ?? 0} />
            ))}
          </div>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search by topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${INPUT_CLS} min-w-0 flex-1`}
            aria-label="Search completed reviews"
          />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as Rating | "")}
            className={INPUT_CLS}
            aria-label="Filter by rating"
          >
            <option value="">All ratings</option>
            {RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
            className={INPUT_CLS}
            aria-label="Sort order"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>

        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : isEmpty ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white/50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filtersActive
                ? "No completed reviews match your search or filters."
                : "You haven't completed any reviews yet."}
            </p>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setRatingFilter("");
                }}
                className="mt-3 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-200"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
              Showing {reviews.length} of {total}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {reviews.map((review) => (
                <CompletedReviewCard
                  key={review.id}
                  review={review}
                  onReopen={handleReopen}
                />
              ))}
            </div>

            {hasMore ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-md border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {loadingMore
                    ? "Loading…"
                    : `Load more (${reviews.length} of ${total})`}
                </button>
              </div>
            ) : (
              reviews.length > 0 && (
                <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  All {total} completed reviews loaded.
                </p>
              )
            )}
          </>
        )}
      </main>
    </div>
  );
}
