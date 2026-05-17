import type { ReviewWithTopic } from "@/types";

export function isNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof window.Notification !== "undefined"
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

const shownReviewIds = new Set<string>();

export function showReviewNotification(review: ReviewWithTopic): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (shownReviewIds.has(review.id)) return;

  const title = review.topic?.title ?? "Review due";
  const body = `It's time to review (${review.interval_label}).`;

  try {
    new Notification(`RevAIson: ${title}`, {
      body,
      tag: `review-${review.id}`,
      icon: "/favicon.ico",
    });
    shownReviewIds.add(review.id);
  } catch {
    // Some browsers throw when invoked outside of a user gesture; ignore.
  }
}

export function resetNotificationCache(): void {
  shownReviewIds.clear();
}
