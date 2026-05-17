"use client";

import { FormEvent, useState } from "react";

export type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export default function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitLabel =
    mode === "login"
      ? loading
        ? "Signing in…"
        : "Sign in"
      : loading
        ? "Creating account…"
        : "Create account";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Minimum 8 characters.
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
        disabled={loading}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/30 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitLabel}
      </button>
    </form>
  );
}
