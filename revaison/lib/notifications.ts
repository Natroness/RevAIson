import type { ReviewItem } from "@/types";

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

const shownItemIds = new Set<string>();

export function showReviewNotification(item: ReviewItem): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (shownItemIds.has(item.id)) return;

  try {
    new Notification(`RevAIson: ${item.title}`, {
      body: "This item is due for review.",
      tag: `review-${item.id}`,
      icon: "/favicon.ico",
    });
    shownItemIds.add(item.id);
  } catch {
    // Some browsers throw when invoked outside of a user gesture; ignore.
  }
}

export function resetNotificationCache(): void {
  shownItemIds.clear();
}
