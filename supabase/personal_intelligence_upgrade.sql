alter table briefing_items
  add column if not exists suggested_action text;

alter table article_summaries
  add column if not exists suggested_action text;

create table if not exists daily_focus (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  theme text not null,
  read_item jsonb not null default '{}'::jsonb,
  watch_item jsonb not null default '{}'::jsonb,
  learn_item jsonb not null default '{}'::jsonb,
  post_item jsonb not null default '{}'::jsonb,
  try_item jsonb not null default '{}'::jsonb,
  estimated_total_minutes integer not null default 30,
  why_selected text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cto_briefings (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  what_matters text not null,
  why_it_matters text not null,
  should_care text not null check (should_care in ('High', 'Medium', 'Low')),
  practical_action text not null,
  related_technologies jsonb not null default '[]'::jsonb,
  expected_impact text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_opportunities (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null,
  opportunity_type text not null check (opportunity_type in ('ai', 'data_engineering', 'engineering_leadership')),
  topic text not null,
  why_relevant_now text not null,
  source_links jsonb not null default '[]'::jsonb,
  talking_points jsonb not null default '[]'::jsonb,
  personal_angle text not null,
  opportunity_score integer not null default 50,
  created_at timestamptz not null default now(),
  unique (briefing_date, opportunity_type)
);

create table if not exists career_radar (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null,
  topic text not null,
  momentum_score integer not null default 50,
  why_growing text not null,
  relevance_to_data_engineer text not null,
  suggested_learning_action text not null,
  created_at timestamptz not null default now(),
  unique (briefing_date, topic)
);

create table if not exists tool_recommendations (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null,
  tool_name text not null,
  what_it_does text not null,
  why_it_matters text not null,
  trial_step text not null,
  source_link text,
  created_at timestamptz not null default now(),
  unique (briefing_date, tool_name)
);

create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null unique,
  biggest_ai_development jsonb not null default '{}'::jsonb,
  biggest_data_engineering_development jsonb not null default '{}'::jsonb,
  biggest_databricks_update jsonb not null default '{}'::jsonb,
  most_discussed_trend text not null,
  top_video jsonb not null default '{}'::jsonb,
  best_content_opportunity jsonb not null default '{}'::jsonb,
  certification_topics_covered jsonb not null default '[]'::jsonb,
  recommended_focus_next_week text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expanded_summaries (
  id uuid primary key default gen_random_uuid(),
  raw_item_hash text not null unique,
  briefing_item_id uuid references briefing_items(id) on delete set null,
  short_summary text not null,
  detailed_summary text not null,
  key_takeaways jsonb not null default '[]'::jsonb,
  why_it_matters text not null,
  suggested_action text not null,
  source_link text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists certification_progress (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references certification_topics(id) on delete cascade,
  level text not null check (level in ('associate', 'professional')),
  domain text not null,
  topic text not null,
  attempts integer not null default 0,
  correct_attempts integer not null default 0,
  weak_area boolean not null default false,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (topic_id)
);

create table if not exists revision_queue (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references certification_topics(id) on delete cascade,
  topic text not null,
  level text not null check (level in ('associate', 'professional')),
  reason text not null,
  priority integer not null default 3,
  due_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (topic_id)
);

create index if not exists content_opportunities_date_idx on content_opportunities(briefing_date);
create index if not exists career_radar_date_idx on career_radar(briefing_date);
create index if not exists tool_recommendations_date_idx on tool_recommendations(briefing_date);
create index if not exists weekly_reports_week_end_idx on weekly_reports(week_end desc);
create index if not exists revision_queue_due_idx on revision_queue(due_at, priority);

alter table daily_focus enable row level security;
alter table cto_briefings enable row level security;
alter table content_opportunities enable row level security;
alter table career_radar enable row level security;
alter table tool_recommendations enable row level security;
alter table weekly_reports enable row level security;
alter table expanded_summaries enable row level security;
alter table certification_progress enable row level security;
alter table revision_queue enable row level security;

create policy "public read daily focus" on daily_focus for select using (true);
create policy "public read cto briefings" on cto_briefings for select using (true);
create policy "public read content opportunities" on content_opportunities for select using (true);
create policy "public read career radar" on career_radar for select using (true);
create policy "public read tool recommendations" on tool_recommendations for select using (true);
create policy "public read weekly reports" on weekly_reports for select using (true);
create policy "public read expanded summaries" on expanded_summaries for select using (true);
