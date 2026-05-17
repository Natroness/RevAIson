"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser, signUp } from "@/lib/authService";

export default function SignupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await getCurrentUser();
      if (!active) return;
      if (data) {
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignup(email: string, password: string) {
    const { data, error } = await signUp(email, password);
    if (error) throw new Error(error);
    if (data?.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    setInfo("Check your inbox to confirm your email, then log in.");
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1 text-center">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          RevAIson
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Start scheduling smart reviews in seconds.
        </p>
      </div>
      <AuthForm mode="signup" onSubmit={handleSignup} />
      {info ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          {info}
        </p>
      ) : null}
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
