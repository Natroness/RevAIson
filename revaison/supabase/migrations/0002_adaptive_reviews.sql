-- RevAIson — Adaptive review model migration
-- Replaces fixed future review-row generation with a next-review-state model:
--   * one main row per topic / NeetCode question
--   * review_attempts stores history ONLY when a review actually happens
--   * notes live permanently on the main row
--
-- Run in Supabase → SQL editor. Safe to run more than once (idempotent guards).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. topics — extend into an adaptive study item
-- ───────────────────────────────────────────────────────────────────────────
alter table topics
  add column if not exists difficulty       text default 'medium',
  add column if not exists status           text default 'learning',
  add column if not exists next_review_at   timestamptz,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists attempt_count    integer default 0;
-- `notes` already exists on topics; keep it as the permanent notes field.

-- New topics become immediately due for their first review.
update topics
  set next_review_at = coalesce(next_review_at, studied_at, now())
  where next_review_at is null;

create index if not exists topics_user_idx          on topics (user_id);
create index if not exists topics_status_idx        on topics (status);
create index if not exists topics_next_review_idx   on topics (next_review_at);
create index if not exists topics_last_reviewed_idx on topics (last_reviewed_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. review_attempts — small history table, one row per actual review
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists review_attempts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  topic_id       uuid references topics(id) on delete cascade,
  rating         text not null,
  reviewed_at    timestamptz default now(),
  next_review_at timestamptz
);

create index if not exists review_attempts_user_idx     on review_attempts (user_id);
create index if not exists review_attempts_topic_idx     on review_attempts (topic_id);
create index if not exists review_attempts_reviewed_idx  on review_attempts (reviewed_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. neetcode_questions — fixed NeetCode 150 tracking, one row per question/user
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists neetcode_questions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,
  question_number  int not null,
  title            text not null,
  category         text not null,
  difficulty       text,
  neetcode_url     text,
  leetcode_url     text,
  status           text default 'not_started',
  notes            text,
  confidence       text,
  next_review_at   timestamptz,
  last_reviewed_at timestamptz,
  attempt_count    integer default 0,
  created_at       timestamptz default now(),
  unique (user_id, question_number)
);

create index if not exists neetcode_user_idx        on neetcode_questions (user_id);
create index if not exists neetcode_status_idx      on neetcode_questions (status);
create index if not exists neetcode_next_review_idx on neetcode_questions (next_review_at);
create index if not exists neetcode_number_idx      on neetcode_questions (question_number);
create index if not exists neetcode_user_number_idx on neetcode_questions (user_id, question_number);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security — users manage only their own rows
-- ───────────────────────────────────────────────────────────────────────────
alter table review_attempts    enable row level security;
alter table neetcode_questions enable row level security;

drop policy if exists "Users manage own review_attempts" on review_attempts;
create policy "Users manage own review_attempts"
  on review_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own neetcode_questions" on neetcode_questions;
create policy "Users manage own neetcode_questions"
  on neetcode_questions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. (Optional) retire the legacy fixed-schedule reviews table.
--    The adaptive model no longer pre-generates review rows. Uncomment to drop:
-- drop table if exists reviews;
