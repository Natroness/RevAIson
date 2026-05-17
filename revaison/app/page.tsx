import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">RevAIson</span>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="mt-20 flex flex-1 flex-col items-start gap-6">
        <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          Spaced repetition · MVP
        </span>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Remember what you learn.
          <br />
          <span className="text-zinc-500 dark:text-zinc-400">
            Without rereading everything.
          </span>
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          RevAIson is a tiny spaced-repetition reminder. Add a topic the moment
          you finish studying it, and we&apos;ll prompt you to review it after
          1 hour, 8 hours, 1 day, 1 week, and 1 month.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            I already have one
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        <Feature
          title="Capture in seconds"
          body="Log what you studied, when, and any quick notes."
        />
        <Feature
          title="Auto-scheduled reviews"
          body="1h, 8h, 1d, 1w, 1mo — generated for you."
        />
        <Feature
          title="Browser reminders"
          body="Get a desktop notification the moment a review is due."
        />
      </section>

      <footer className="mt-auto pt-20 text-xs text-zinc-500 dark:text-zinc-400">
        Built with Next.js, Supabase, and Tailwind CSS.
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{body}</p>
    </div>
  );
}
