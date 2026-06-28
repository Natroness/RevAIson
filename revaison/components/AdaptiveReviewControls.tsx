"use client";

import { useState } from "react";
import { RATINGS } from "@/lib/reviewSchedule";
import type { Rating } from "@/types";

interface AdaptiveReviewControlsProps {
  onRate: (rating: Rating) => Promise<void> | void;
  size?: "sm" | "md";
}

const RATING_STYLES: Record<Rating, string> = {
  Easy: "bg-emerald-600 text-white hover:bg-emerald-700",
  Medium: "bg-sky-600 text-white hover:bg-sky-700",
  Hard: "bg-amber-600 text-white hover:bg-amber-700",
  Again: "bg-rose-600 text-white hover:bg-rose-700",
};

const RATING_HINT: Record<Rating, string> = {
  Easy: "+3d",
  Medium: "+1d",
  Hard: "+8h",
  Again: "+1h",
};

export default function AdaptiveReviewControls({
  onRate,
  size = "md",
}: AdaptiveReviewControlsProps) {
  const [pending, setPending] = useState<Rating | null>(null);

  async function handle(rating: Rating) {
    if (pending) return;
    setPending(rating);
    try {
      await onRate(rating);
    } finally {
      setPending(null);
    }
  }

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      {RATINGS.map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => handle(rating)}
          disabled={pending !== null}
          title={`Next review in ${RATING_HINT[rating]}`}
          className={`rounded-md font-medium transition disabled:opacity-50 ${pad} ${RATING_STYLES[rating]}`}
        >
          {pending === rating ? "…" : rating}
          <span className="ml-1 opacity-70">{RATING_HINT[rating]}</span>
        </button>
      ))}
    </div>
  );
}
