"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser, signIn } from "@/lib/authService";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

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

  async function handleLogin(email: string, password: string) {
    const { error } = await signIn(email, password);
    if (error) throw new Error(error);
    router.replace("/dashboard");
    router.refresh();
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
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to continue your reviews.
        </p>
      </div>
      <AuthForm mode="login" onSubmit={handleLogin} />
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
        >
          Create one
        </Link>
      </p>
    </main>
  );
}
