"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Difficulty, ItemStatus } from "@/types";

type Tone = "amber" | "emerald" | "rose" | "sky" | "zinc";

interface Badge {
  label: string;
  tone: Tone;
}

interface ReviewCardProps {
  title: string;
  href?: string;
  /** Small uppercase eyebrow, e.g. category or item type. */
  eyebrow?: string;
  /** Free-form secondary line(s) under the title. */
  meta?: ReactNode;
  badge?: Badge;
  difficulty?: Difficulty | null;
  status?: ItemStatus | null;
  accent?: Tone;
  error?: string | null;
  /** Action area (AdaptiveReviewControls, Reopen button, etc.). */
  children?: ReactNode;
}

const BADGE_TONES: Record<Tone, string> = {
  amber:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  emerald:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
};

const ACCENT_BORDERS: Record<Tone, string> = {
  amber: "border-amber-300 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
  emerald:
    "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
  rose: "border-rose-300 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20",
  sky: "border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20",
  zinc: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
};

const DIFF_TONES: Record<Difficulty, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
};

export default function ReviewCard({
  title,
  href,
  eyebrow,
  meta,
  badge,
  difficulty,
  accent = "zinc",
  error,
  children,
}: ReviewCardProps) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-lg border p-4 shadow-sm ${ACCENT_BORDERS[accent]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-0.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {eyebrow}
            </p>
          ) : null}
          {href ? (
            <Link
              href={href}
              className="block truncate text-base font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
              title={title}
            >
              {title}
            </Link>
          ) : (
            <span className="block truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </span>
          )}
          {difficulty ? (
            <span className={`text-xs font-medium capitalize ${DIFF_TONES[difficulty]}`}>
              {difficulty}
            </span>
          ) : null}
        </div>
        {badge ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_TONES[badge.tone]}`}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      {meta ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-300">{meta}</div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {children ? <div>{children}</div> : null}
    </article>
  );
}
