"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ItemStatus, NeetCodeGridCell } from "@/types";

interface NeetCodeProgressGridProps {
  cells: NeetCodeGridCell[];
}

const STATUS_DOT: Record<ItemStatus, string> = {
  not_started:
    "bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600",
  learning: "bg-amber-400 hover:bg-amber-500",
  weak: "bg-rose-500 hover:bg-rose-600",
  mastered: "bg-emerald-500 hover:bg-emerald-600",
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  not_started: "Not started",
  learning: "Learning",
  weak: "Weak",
  mastered: "Mastered",
};

const LEGEND: ItemStatus[] = ["not_started", "learning", "weak", "mastered"];

export default function NeetCodeProgressGrid({
  cells,
}: NeetCodeProgressGridProps) {
  const router = useRouter();

  const counts = useMemo(() => {
    const c: Record<ItemStatus, number> = {
      not_started: 0,
      learning: 0,
      weak: 0,
      mastered: 0,
    };
    for (const cell of cells) c[cell.status] = (c[cell.status] ?? 0) + 1;
    return c;
  }, [cells]);

  const done = counts.mastered;

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            NeetCode 150 progress
            <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              ({done}/{cells.length} mastered)
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {LEGEND.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s].split(" ")[0]}`} />
              {STATUS_LABEL[s]} ({counts[s]})
            </span>
          ))}
        </div>
      </header>

      {cells.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white/50 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          Loading questions…
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap gap-1.5">
            {cells.map((cell) => (
              <button
                key={cell.id}
                type="button"
                onClick={() => router.push(`/neetcode/${cell.question_number}`)}
                title={`#${cell.question_number} ${cell.title} — ${STATUS_LABEL[cell.status]}`}
                aria-label={`${cell.title}, ${STATUS_LABEL[cell.status]}`}
                className={`h-4 w-4 rounded-sm transition ${STATUS_DOT[cell.status]}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
