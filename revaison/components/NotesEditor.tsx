"use client";

import { useState } from "react";

interface NotesEditorProps {
  initialNotes: string | null;
  /** Persist notes. Should resolve when saved, throw on failure. */
  onSave: (notes: string) => Promise<void>;
  placeholder?: string;
}

/**
 * Permanent notes panel reused by topics and NeetCode questions.
 * Notes stay visible and editable at any time, including after mastery.
 */
export default function NotesEditor({
  initialNotes,
  onSave,
  placeholder = "Key takeaways, patterns, edge cases, links…",
}: NotesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setSaved(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Notes
        </h2>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(saved);
              setEditing(true);
            }}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {saved ? "Edit notes" : "Add notes"}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            rows={8}
            value={draft}
            maxLength={20000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          {error ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {saving ? "Saving…" : "Save notes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : saved ? (
        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
          {saved}
        </p>
      ) : (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          No notes yet.
        </p>
      )}
    </section>
  );
}
