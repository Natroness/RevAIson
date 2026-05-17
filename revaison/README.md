# RevAIson

A small spaced-repetition reminder app. Capture what you learned, get reminded
to review it at **1 hour, 8 hours, 1 day, 1 week, and 1 month**.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase Auth
+ Database, and browser notifications.

---

## 1. Stack

| Layer        | Tech                                  |
| ------------ | ------------------------------------- |
| Frontend     | Next.js (App Router) + TypeScript     |
| Styling      | Tailwind CSS v4                       |
| Auth + DB    | Supabase (`@supabase/supabase-js`)    |
| Scheduling   | `date-fns`                            |
| Notifications | Web Notifications API                |
| Deployment   | Vercel-ready                          |

## 2. Local setup

```bash
cd revaison
npm install
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Required env vars (Vercel + local):

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Never expose the `service_role` key in this app.

## 3. Supabase setup

Run the following in **Supabase → SQL editor**:

```sql
-- Tables
create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  notes text,
  studied_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade,
  user_id uuid not null,
  interval_label text not null,
  review_time timestamptz not null,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- One row per (topic, interval) — prevents duplicate review schedules
create unique index if not exists reviews_topic_interval_uniq
  on reviews (topic_id, interval_label);

-- Helpful indexes for dashboard queries
create index if not exists reviews_user_due_idx
  on reviews (user_id, completed, review_time);

-- Row Level Security
alter table topics enable row level security;
alter table reviews enable row level security;

create policy "Users manage own topics"
  on topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own reviews"
  on reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Then under **Auth → Providers → Email**:

- Either enable "Confirm email" (users must confirm before they can log in), or
- Disable it for a friction-free MVP demo.

## 4. App structure

```
revaison/
├─ app/
│  ├─ layout.tsx              # Root layout
│  ├─ page.tsx                # Landing page
│  ├─ login/page.tsx          # Login
│  ├─ signup/page.tsx         # Signup
│  ├─ dashboard/page.tsx      # Due / Upcoming / Completed
│  ├─ add-topic/page.tsx      # Create a topic + auto schedule reviews
│  └─ topic/[id]/page.tsx     # Topic detail + per-stage actions
├─ components/
│  ├─ Navbar.tsx
│  ├─ AuthForm.tsx
│  ├─ TopicForm.tsx
│  ├─ ReviewCard.tsx
│  └─ ReviewList.tsx
├─ lib/
│  ├─ supabaseClient.ts       # Single shared client
│  ├─ authService.ts          # signUp / signIn / signOut / getCurrentUser
│  ├─ topicService.ts         # CRUD + ownership checks
│  ├─ reviewService.ts        # Due / Upcoming / Completed / markCompleted
│  ├─ reviewSchedule.ts       # Pure schedule generator (date-fns)
│  └─ notifications.ts        # Permission + de-duplicated notifications
├─ types/index.ts             # Topic, Review, IntervalLabel, etc.
├─ .env.local                 # NEXT_PUBLIC_SUPABASE_* (gitignored)
└─ next.config.ts
```

## 5. Deploy on Vercel

1. Push `revaison/` to a Git repo.
2. Import the repo into Vercel; set **Root Directory** to `revaison`.
3. Add the two env vars in **Settings → Environment Variables**.
4. Deploy. No additional config needed.

## 6. Notes

- All DB access is performed with the anon key + Supabase Auth session. RLS
  policies enforce row-level ownership server-side; the client only requests
  rows it owns.
- Notifications are best-effort: they require user permission and are skipped
  silently if unsupported or denied.
- The dashboard polls every 60s for new due reviews; it does not poll faster
  to avoid quota churn.
