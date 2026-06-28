"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/authService";
import { createTopic } from "@/lib/topicService";

function defaultStudiedAtValue(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

export default function TopicForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [studiedAt, setStudiedAt] = useState<string>(defaultStudiedAtValue());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }
    const studiedDate = new Date(studiedAt);
    if (Number.isNaN(studiedDate.getTime())) {
      setError("Please pick a valid study date");
      return;
    }

    setSubmitting(true);
    try {
      const userRes = await getCurrentUser();
      if (userRes.error || !userRes.data) {
        setError(userRes.error ?? "You must be signed in");
        return;
      }
      const userId = userRes.data.id;

      const topicRes = await createTopic(
        userId,
        trimmedTitle,
        notes,
        studiedDate,
      );
      if (topicRes.error || !topicRes.data) {
        setError(topicRes.error ?? "Could not create topic");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create topic";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="space-y-1">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Topic title
        </label>
        <input
          id="title"
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Spaced repetition principles"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Notes (optional)
        </label>
        <textarea
          id="notes"
          rows={4}
          maxLength={5000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key takeaways, links, questions to revisit…"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="studied-at"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          When did you study this?
        </label>
        <input
          id="studied-at"
          type="datetime-local"
          required
          value={studiedAt}
          onChange={(e) => setStudiedAt(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The topic becomes due for its first review at this time. Each review
          you rate adaptively schedules the next one.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/30 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? "Creating…" : "Create topic & schedule reviews"}
      </button>
    </form>
  );
}
