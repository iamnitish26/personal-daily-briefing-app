create extension if not exists pgcrypto;

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  kind text not null check (kind in ('rss', 'static_url')),
  category text not null check (category in ('data_engineering', 'ai', 'certification', 'community')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists raw_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  external_id text not null,
  title text not null,
  url text not null,
  author text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  content text,
  hash text not null unique,
  category text not null check (category in ('data_engineering', 'ai', 'certification', 'community')),
  relevance_score integer not null default 0
);

create index if not exists raw_items_fetched_at_idx on raw_items(fetched_at desc);
create index if not exists raw_items_relevance_idx on raw_items(relevance_score desc);

create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  title text not null,
  intro text not null,
  total_read_time_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists briefing_items (
  id uuid primary key default gen_random_uuid(),
  briefing_id uuid not null references briefings(id) on delete cascade,
  raw_item_id uuid references raw_items(id) on delete set null,
  section text not null check (section in ('data_engineering', 'ai', 'certification')),
  rank integer not null,
  title text not null,
  summary text not null,
  source text not null,
  link text not null,
  category text not null,
  why_it_matters text not null,
  read_time_minutes integer not null default 1,
  saved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists briefing_items_briefing_idx on briefing_items(briefing_id, section, rank);
create index if not exists briefing_items_saved_idx on briefing_items(saved) where saved = true;

create table if not exists certification_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level text not null check (level in ('associate', 'professional')),
  domain text not null,
  order_index integer not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(level, order_index)
);

create table if not exists certification_bytes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references certification_topics(id) on delete restrict,
  briefing_date date not null unique,
  level text not null check (level in ('associate', 'professional')),
  title text not null,
  concept text not null,
  exam_relevance text not null,
  example text not null,
  question text not null,
  choices jsonb not null,
  answer text not null,
  answer_explanation text not null,
  created_at timestamptz not null default now()
);

create table if not exists certification_quizzes (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  title text not null,
  focus text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists certification_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references certification_quizzes(id) on delete cascade,
  topic_id uuid references certification_topics(id) on delete set null,
  rank integer not null,
  level text not null check (level in ('associate', 'professional')),
  domain text not null,
  question text not null,
  choices jsonb not null,
  answer text not null check (answer in ('A', 'B', 'C', 'D')),
  answer_explanation text not null,
  created_at timestamptz not null default now(),
  unique (quiz_id, rank)
);

create table if not exists certification_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references certification_quizzes(id) on delete cascade,
  briefing_date date not null,
  score integer not null,
  total_questions integer not null,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  review jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists certification_quiz_questions_quiz_idx on certification_quiz_questions(quiz_id, rank);
create index if not exists certification_quiz_attempts_quiz_idx on certification_quiz_attempts(quiz_id, created_at desc);
create index if not exists certification_quiz_attempts_date_idx on certification_quiz_attempts(briefing_date, created_at desc);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  briefing_item_id uuid not null references briefing_items(id) on delete cascade,
  action text not null check (action in ('more_like_this', 'less_like_this', 'save')),
  created_at timestamptz not null default now()
);

-- Additive dashboard schema is maintained in:
-- - supabase/intelligence_upgrade.sql
-- - supabase/certification_quiz_upgrade.sql
-- - supabase/personal_intelligence_upgrade.sql

alter table sources enable row level security;
alter table raw_items enable row level security;
alter table briefings enable row level security;
alter table briefing_items enable row level security;
alter table certification_topics enable row level security;
alter table certification_bytes enable row level security;
alter table certification_quizzes enable row level security;
alter table certification_quiz_questions enable row level security;
alter table certification_quiz_attempts enable row level security;
alter table feedback enable row level security;

create policy "public read sources" on sources for select using (true);
create policy "public read briefings" on briefings for select using (true);
create policy "public read briefing items" on briefing_items for select using (true);
create policy "public read certification topics" on certification_topics for select using (true);
create policy "public read certification bytes" on certification_bytes for select using (true);
