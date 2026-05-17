import { addHours, addDays, addWeeks, addMonths, isValid } from "date-fns";
import type { IntervalLabel, ReviewScheduleItem } from "@/types";

const INTERVAL_BUILDERS: ReadonlyArray<{
  label: IntervalLabel;
  build: (base: Date) => Date;
}> = [
  { label: "1 hour", build: (d) => addHours(d, 1) },
  { label: "8 hours", build: (d) => addHours(d, 8) },
  { label: "1 day", build: (d) => addDays(d, 1) },
  { label: "1 week", build: (d) => addWeeks(d, 1) },
  { label: "1 month", build: (d) => addMonths(d, 1) },
];

export function generateReviewSchedule(studiedAt: Date): ReviewScheduleItem[] {
  if (!(studiedAt instanceof Date) || !isValid(studiedAt)) {
    throw new Error("Invalid studiedAt date");
  }

  const seen = new Set<IntervalLabel>();
  const schedule: ReviewScheduleItem[] = [];

  for (const { label, build } of INTERVAL_BUILDERS) {
    if (seen.has(label)) continue;
    seen.add(label);
    schedule.push({ interval_label: label, review_time: build(studiedAt) });
  }

  return schedule;
}

export const REVIEW_INTERVAL_LABELS: ReadonlyArray<IntervalLabel> =
  INTERVAL_BUILDERS.map((i) => i.label);
