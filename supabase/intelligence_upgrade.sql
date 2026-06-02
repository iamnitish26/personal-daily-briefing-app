create table if not exists article_summaries (
  id uuid primary key default gen_random_uuid(),
  raw_item_hash text not null unique,
  raw_item_id uuid references raw_items(id) on delete set null,
  title text not null,
  summary text not null,
  detailed_summary text not null,
  key_takeaways jsonb not null default '[]'::jsonb,
  why_it_matters text not null,
  related_technologies jsonb not null default '[]'::jsonb,
  category text not null,
  model text,
  token_estimate integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table briefing_items
  add column if not exists detailed_summary text,
  add column if not exists key_takeaways jsonb not null default '[]'::jsonb,
  add column if not exists related_technologies jsonb not null default '[]'::jsonb,
  add column if not exists published_at timestamptz;

create table if not exists daily_signals (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  most_important_ai jsonb not null default '{}'::jsonb,
  most_important_data_engineering jsonb not null default '{}'::jsonb,
  certification_concept jsonb not null default '{}'::jsonb,
  video_worth_watching jsonb not null default '{}'::jsonb,
  linkedin_opportunity jsonb not null default '{}'::jsonb,
  what_to_try jsonb not null default '[]'::jsonb,
  emerging_signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists youtube_videos (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique,
  title text not null,
  channel text not null,
  channel_id text,
  thumbnail text,
  views bigint not null default 0,
  published_at timestamptz,
  description text,
  url text not null,
  query text,
  score integer not null default 0,
  score_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_video_picks (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null,
  video_id uuid not null references youtube_videos(id) on delete cascade,
  rank integer not null,
  why_useful text not null,
  estimated_value text not null check (estimated_value in ('High', 'Medium', 'Low')),
  created_at timestamptz not null default now(),
  unique (briefing_date, rank),
  unique (briefing_date, video_id)
);

create table if not exists linkedin_ideas (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null,
  idea_type text not null check (idea_type in ('ai', 'data_engineering', 'engineering_career')),
  topic text not null,
  why_trending text not null,
  discussion_points jsonb not null default '[]'::jsonb,
  useful_references jsonb not null default '[]'::jsonb,
  personal_angle text not null,
  confidence_score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (briefing_date, idea_type)
);

create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  mode text not null default 'scheduled',
  status text not null default 'started',
  articles_fetched integer not null default 0,
  articles_deduplicated integer not null default 0,
  summaries_generated integer not null default 0,
  videos_fetched integer not null default 0,
  videos_selected integer not null default 0,
  token_estimate integer not null default 0,
  dry_run boolean not null default false,
  notes jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table certification_topics
  add column if not exists viewed_count integer not null default 0,
  add column if not exists saved boolean not null default false,
  add column if not exists weak_area boolean not null default false,
  add column if not exists last_viewed_at timestamptz;

create table if not exists certification_topic_progress (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references certification_topics(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  saved boolean not null default false,
  weak_area boolean not null default false,
  revision_due_at timestamptz,
  notes text,
  unique (topic_id)
);

alter table article_summaries enable row level security;
alter table daily_signals enable row level security;
alter table youtube_videos enable row level security;
alter table daily_video_picks enable row level security;
alter table linkedin_ideas enable row level security;
alter table ingestion_runs enable row level security;
alter table certification_topic_progress enable row level security;

create policy "public read article summaries" on article_summaries for select using (true);
create policy "public read daily signals" on daily_signals for select using (true);
create policy "public read youtube videos" on youtube_videos for select using (true);
create policy "public read daily video picks" on daily_video_picks for select using (true);
create policy "public read linkedin ideas" on linkedin_ideas for select using (true);
create policy "public read ingestion runs" on ingestion_runs for select using (true);
create policy "public read certification topic progress" on certification_topic_progress for select using (true);
