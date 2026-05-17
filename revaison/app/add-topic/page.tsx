"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TopicForm from "@/components/TopicForm";
import { getCurrentUser } from "@/lib/authService";

export default function AddTopicPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await getCurrentUser();
      if (!active) return;
      if (!data) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add a topic
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            We&apos;ll schedule reviews at 1h, 8h, 1d, 1w, and 1mo from your
            study time.
          </p>
        </header>
        <TopicForm />
      </main>
    </div>
  );
}
