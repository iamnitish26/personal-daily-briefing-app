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

create index if not exists certification_quiz_questions_quiz_idx
  on certification_quiz_questions(quiz_id, rank);

create index if not exists certification_quiz_attempts_quiz_idx
  on certification_quiz_attempts(quiz_id, created_at desc);

create index if not exists certification_quiz_attempts_date_idx
  on certification_quiz_attempts(briefing_date, created_at desc);

alter table certification_quizzes enable row level security;
alter table certification_quiz_questions enable row level security;
alter table certification_quiz_attempts enable row level security;
