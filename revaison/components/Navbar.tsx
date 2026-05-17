"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/authService";

export default function Navbar() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await signOut();
    setSigningOut(false);
    if (error) {
      window.alert(error);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          RevAIson
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <Link
            href="/add-topic"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add topic
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {signingOut ? "Signing out…" : "Logout"}
          </button>
        </div>
      </nav>
    </header>
  );
}
