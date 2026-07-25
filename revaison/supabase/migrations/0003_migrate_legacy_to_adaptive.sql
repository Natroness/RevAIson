-- ═══════════════════════════════════════════════════════════════════════════
-- RevAIson — Migrate legacy fixed-schedule reviews → adaptive review model
-- ═══════════════════════════════════════════════════════════════════════════
--
-- DISCOVERED LIVE SCHEMA (inspected before writing this file):
--   public.topics   17 rows — id, user_id, title, notes, studied_at, created_at
--   public.reviews  85 rows — id, topic_id, user_id, interval_label,
--                             review_time, completed, completed_at, created_at
--   49 completed / 36 pending · 0 null topic_id · 0 null completed
--   0 completed rows missing completed_at · 0 orphaned user_id · no triggers
--   RLS enabled on both tables with auth.uid() = user_id policies
--
-- MAPPING DECISIONS:
--   legacy reviews.completed = true      → one review_attempts row
--   legacy reviews.completed_at          → review_attempts.reviewed_at
--   legacy reviews.id                    → review_attempts.legacy_review_id
--   rating                               → 'Medium' (legacy has NO rating column;
--                                          neutral value keeps every topic in
--                                          'learning' and never fabricates
--                                          'weak' or 'mastered')
--   pending reviews (completed = false)  → collapsed to ONE topics.next_review_at
--                                          = MIN(review_time) per topic
--
-- SAFETY:
--   * Legacy public.reviews is NOT dropped, renamed or modified.
--   * A snapshot is copied into the private `migration_backup` schema, which is
--     NOT exposed to PostgREST (no client access, no RLS needed).
--   * Fully idempotent — safe to rerun; inserts 0 duplicate rows on rerun.
--   * Set-based SQL only (no row loops).
--
-- If running manually in the Supabase SQL editor, wrap in BEGIN; ... COMMIT;
-- (the MCP apply_migration tool already executes this atomically).
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 0. Safety snapshot — private schema, not API-exposed
-- ───────────────────────────────────────────────────────────────────────────
create schema if not exists migration_backup;

create table if not exists migration_backup.topics_pre_adaptive as
  select * from public.topics;

create table if not exists migration_backup.reviews_pre_adaptive as
  select * from public.reviews;


-- ───────────────────────────────────────────────────────────────────────────
-- 1. Upgrade the EXISTING topics table (no replacement table, no duplicates)
-- ───────────────────────────────────────────────────────────────────────────
alter table public.topics
  add column if not exists difficulty       text,
  add column if not exists status           text,
  add column if not exists next_review_at   timestamptz,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists attempt_count    integer;

alter table public.topics
  alter column difficulty    set default 'medium',
  alter column status        set default 'learning',
  alter column attempt_count set default 0;

-- Validity constraints (guarded: CHECK has no IF NOT EXISTS)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'topics_status_chk' and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics add constraint topics_status_chk
      check (status in ('not_started','learning','weak','mastered'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'topics_difficulty_chk' and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics add constraint topics_difficulty_chk
      check (difficulty in ('easy','medium','hard'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'topics_attempt_count_chk' and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics add constraint topics_attempt_count_chk
      check (attempt_count >= 0);
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. review_attempts — compact history-only table
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.review_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  topic_id         uuid references public.topics(id) on delete cascade,
  rating           text not null,
  reviewed_at      timestamptz not null default now(),
  next_review_at   timestamptz,
  legacy_review_id uuid,
  created_at       timestamptz not null default now()
);

-- If the table pre-existed without these, add them safely.
alter table public.review_attempts
  add column if not exists legacy_review_id uuid,
  add column if not exists next_review_at   timestamptz,
  add column if not exists created_at       timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'review_attempts_rating_chk'
      and conrelid = 'public.review_attempts'::regclass
  ) then
    alter table public.review_attempts add constraint review_attempts_rating_chk
      check (rating in ('Easy','Medium','Hard','Again'));
  end if;
end $$;

-- Idempotency guarantee: a legacy review can never be imported twice.
create unique index if not exists review_attempts_legacy_uniq
  on public.review_attempts (legacy_review_id)
  where legacy_review_id is not null;


-- ───────────────────────────────────────────────────────────────────────────
-- 3. Migrate ONLY genuinely completed legacy reviews into history
--    Anti-join makes this a no-op on rerun. Pending rows are NOT copied.
-- ───────────────────────────────────────────────────────────────────────────
insert into public.review_attempts
  (user_id, topic_id, rating, reviewed_at, next_review_at, legacy_review_id)
select
  r.user_id,
  r.topic_id,
  'Medium',                                   -- legacy has no recall rating
  coalesce(r.completed_at, r.review_time),    -- verified: 0 rows need fallback
  null,                                       -- legacy stored no per-attempt next
  r.id
from public.reviews r
where r.completed is true
  and r.topic_id is not null
  and not exists (
    select 1 from public.review_attempts ra
    where ra.legacy_review_id = r.id
  );


-- ───────────────────────────────────────────────────────────────────────────
-- 4. Collapse many pending schedules → ONE next_review_at per topic
--    Only fills NULLs, so newer adaptive values are never overwritten.
-- ───────────────────────────────────────────────────────────────────────────
update public.topics t
set next_review_at = n.next_rt
from (
  select topic_id, min(review_time) as next_rt
  from public.reviews
  where completed is not true
    and topic_id is not null
  group by topic_id
) n
where n.topic_id = t.id
  and t.next_review_at is null;

-- Fallback for topics with no pending legacy schedule.
update public.topics
set next_review_at = coalesce(studied_at, created_at, now())
where next_review_at is null;


-- ───────────────────────────────────────────────────────────────────────────
-- 5. Backfill adaptive state from review_attempts (the single source of truth)
--    Recomputed rather than incremented, so it stays correct and idempotent
--    even after the app records new reviews.
-- ───────────────────────────────────────────────────────────────────────────
with agg as (
  select topic_id,
         count(*)          as attempts,
         max(reviewed_at)  as last_reviewed
  from public.review_attempts
  where topic_id is not null
  group by topic_id
),
latest as (
  select distinct on (topic_id) topic_id, rating
  from public.review_attempts
  where topic_id is not null
  order by topic_id, reviewed_at desc, id desc
)
update public.topics t
set attempt_count    = a.attempts,
    last_reviewed_at = a.last_reviewed,
    status = case
      when l.rating in ('Hard','Again')              then 'weak'
      when l.rating = 'Easy' and a.attempts >= 3     then 'mastered'
      else 'learning'
    end
from agg a
join latest l on l.topic_id = a.topic_id
where t.id = a.topic_id;

-- Topics that were never reviewed: apply clean defaults.
update public.topics
set attempt_count = coalesce(attempt_count, 0),
    status        = coalesce(status, 'learning'),
    difficulty    = coalesce(difficulty, 'medium')
where attempt_count is null
   or status is null
   or difficulty is null;

-- Now that every row is populated, enforce NOT NULL.
alter table public.topics
  alter column difficulty    set not null,
  alter column status        set not null,
  alter column attempt_count set not null;


-- ───────────────────────────────────────────────────────────────────────────
-- 6. neetcode_questions — required by the adaptive dashboard
--    unique(user_id, question_number) makes the app's seed upsert idempotent.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.neetcode_questions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  question_number  int  not null,
  title            text not null,
  category         text not null,
  difficulty       text,
  neetcode_url     text,
  leetcode_url     text,
  status           text not null default 'not_started',
  notes            text,
  confidence       text,
  next_review_at   timestamptz,
  last_reviewed_at timestamptz,
  attempt_count    integer not null default 0,
  created_at       timestamptz not null default now(),
  constraint neetcode_user_question_uniq unique (user_id, question_number),
  constraint neetcode_status_chk
    check (status in ('not_started','learning','weak','mastered')),
  constraint neetcode_difficulty_chk
    check (difficulty is null or difficulty in ('easy','medium','hard')),
  constraint neetcode_confidence_chk
    check (confidence is null or confidence in ('low','medium','high'))
);


-- ───────────────────────────────────────────────────────────────────────────
-- 7. Indexes — composite, matching real query shapes; no redundant singles.
--    (user_id, X) also serves user_id-only lookups via leftmost prefix.
-- ───────────────────────────────────────────────────────────────────────────
create index if not exists topics_user_next_review_idx
  on public.topics (user_id, next_review_at);
create index if not exists topics_user_status_idx
  on public.topics (user_id, status);

create index if not exists review_attempts_user_reviewed_idx
  on public.review_attempts (user_id, reviewed_at desc);
create index if not exists review_attempts_topic_idx
  on public.review_attempts (topic_id);

create index if not exists neetcode_user_next_review_idx
  on public.neetcode_questions (user_id, next_review_at);
create index if not exists neetcode_user_status_idx
  on public.neetcode_questions (user_id, status);


-- ───────────────────────────────────────────────────────────────────────────
-- 8. RLS — new tables only; existing topics/reviews policies untouched
-- ───────────────────────────────────────────────────────────────────────────
alter table public.review_attempts    enable row level security;
alter table public.neetcode_questions enable row level security;

drop policy if exists "Users manage own review_attempts" on public.review_attempts;
create policy "Users manage own review_attempts"
  on public.review_attempts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own neetcode_questions" on public.neetcode_questions;
create policy "Users manage own neetcode_questions"
  on public.neetcode_questions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ───────────────────────────────────────────────────────────────────────────
-- 9. Legacy table handling
--    public.reviews is intentionally PRESERVED as a live backup.
--    Only after validation + app testing, and with explicit approval:
--      -- alter table public.reviews rename to reviews_legacy_deprecated;
--      -- drop table public.reviews;
-- ───────────────────────────────────────────────────────────────────────────
