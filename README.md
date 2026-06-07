# Personal Daily Briefing App

A focused personal intelligence dashboard for deciding what to read, watch, learn, post, and try each day across data engineering, Databricks, AI/agentic AI, certification practice, useful videos, and content opportunities.

## Stack

- Next.js with TypeScript and App Router
- Tailwind CSS
- Supabase Postgres
- Vercel Cron
- OpenAI API for summarisation, certification-byte generation, and daily quiz generation
- YouTube Data API for limited daily video discovery

## Architecture

- `app/` contains App Router pages and thin API routes.
- `components/` contains dashboard cards, signal sections, navigation, feedback controls, and certification views.
- `lib/` contains ingestion, source fetching, scoring, OpenAI summarisation, YouTube discovery, certification generation, and Supabase clients.
- `supabase/` contains the base schema, seed data, and additive production migrations.
- `vercel.json` runs the daily ingestion cron once per day.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project, then run:

```sql
-- Supabase SQL editor
-- paste supabase/schema.sql first
-- then paste supabase/seed.sql
```

3. Copy environment variables:

```bash
cp .env.example .env.local
```

4. Fill in `.env.local`:

```bash
OPENAI_API_KEY=...
SUPABASE_URL=https://fdzfltqnqjistxuzttdz.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
YOUTUBE_API_KEY=...
CRON_SECRET=choose-a-long-random-string
```

This repo is already pointed at Supabase project `fdzfltqnqjistxuzttdz`. The checked-in example includes the project URL, and `.env.local` contains the current publishable key. Add the service-role key from the Supabase dashboard before running ingestion or feedback routes.

5. Start the app:

```bash
npm run dev
```

6. Generate today’s briefing:

```bash
curl -X POST "http://localhost:3000/api/ingest/run" \
  -H "Authorization: Bearer $CRON_SECRET"
```

To preview ingestion cost and selection without writing raw items or generating OpenAI summaries:

```bash
curl -X POST "http://localhost:3000/api/ingest/run?dryRun=true" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## API Routes

- `GET /api/briefing/today` returns today’s full briefing.
- `POST /api/ingest/run` fetches sources, deduplicates, scores, summarises, and stores a briefing.
- `POST /api/ingest/run?dryRun=true` estimates the run without OpenAI generation.
- `POST /api/ingest/run?force=true` regenerates today’s stored dashboard.
- `GET /api/certification/today` returns today’s certification byte and sanitized quiz questions.
- `POST /api/certification/quiz/submit` scores a quiz attempt and returns answer review, strengths, and weaknesses.
- `/reports` displays stored Sunday weekly intelligence reports.
- `POST /api/feedback` records `more_like_this`, `less_like_this`, or `save`.
- `GET /api/saved` returns saved briefing items.

## Deployment

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add all environment variables from `.env.example`.
4. Deploy.
5. Vercel Cron is configured in `vercel.json` to call `/api/ingest/run` daily at 06:00 UTC.

The cron route requires `CRON_SECRET` and accepts `Authorization: Bearer your-secret`.

For quick manual runs, call:

```bash
curl -X POST "https://your-app.vercel.app/api/ingest/run?secret=your-secret"
```

## Intelligence Dashboard Upgrade

The dashboard stores richer daily intelligence instead of generating it live on page load:

- `daily_focus` stores the primary daily action card: one thing to read, watch, learn, post, and try.
- `cto_briefings` stores a concise practical briefing: what matters, why it matters, whether to care, related technologies, and expected impact.
- `content_opportunities` stores three daily content ideas with talking points and source links.
- `career_radar` stores momentum topics and suggested learning actions.
- `tool_recommendations` stores one to three tools/features worth trying with a 5-minute trial step.
- `weekly_reports` stores Sunday summaries and the next-week focus.
- Expanded briefing cards use cached article summaries with detailed summaries, key takeaways, related technologies, why-it-matters notes, read time, source links, and save/feedback actions.
- `daily_signals` stores the daily executive scan: top AI signal, top data engineering signal, certification concept, video pick, LinkedIn opportunity, what to try, and emerging signals.
- `youtube_videos` and `daily_video_picks` store limited YouTube discovery results and the top three daily picks.
- `linkedin_ideas` stores three content opportunities: AI, data engineering, and engineering career.
- `ingestion_runs` stores safe counts for fetched articles, selected videos, generated summaries, dry-run status, and token estimates.
- Certification progress is additive through topic counters, saved flags, weak-area flags, a revision queue, daily 10-question quizzes, and quiz attempts.

## Database Changes

Apply `supabase/intelligence_upgrade.sql` after the base schema and seed data. The migration is additive and preserves existing data. It adds:

- `article_summaries`
- `daily_signals`
- `youtube_videos`
- `daily_video_picks`
- `linkedin_ideas`
- `ingestion_runs`
- `certification_topic_progress`
- `certification_quizzes`
- `certification_quiz_questions`
- `certification_quiz_attempts`
- `daily_focus`
- `cto_briefings`
- `content_opportunities`
- `career_radar`
- `tool_recommendations`
- `weekly_reports`
- `expanded_summaries`
- `certification_progress`
- `revision_queue`
- New columns on `briefing_items` for detailed summaries, key takeaways, related technologies, and published dates
- New progress columns on `certification_topics`

Apply `supabase/certification_quiz_upgrade.sql` to add the daily quiz tables. Quiz rows are protected by RLS without public-read policies; server routes use the Supabase service role and only send sanitized question prompts to the browser before submission.
Apply `supabase/personal_intelligence_upgrade.sql` to add the action-intelligence tables. Certification progress and revision queue tables are protected by RLS without public-read policies.

## Cost Controls

- Ingestion fetches many source items, ranks them, then summarises only the selected top items.
- Summaries are cached permanently in `article_summaries` by raw-item hash.
- Existing daily briefings are reused unless `force=true` is passed.
- Dry run mode avoids OpenAI generation.
- YouTube discovery limits each query to a small result set.
- `ingestion_runs` records summary counts and token estimates for basic cost visibility.
- Daily action intelligence is generated once during ingestion and cached by date.
- Weekly reports are generated only by Sunday ingestion and cached by `week_end`.

Expected daily API cost should remain low for personal use because only selected items are summarised and cached. Actual cost depends on OpenAI model pricing, YouTube API quota usage, and whether `force=true` is used repeatedly.

## Rollout Plan

1. Apply the additive Supabase migration.
2. Add `YOUTUBE_API_KEY` to local and Vercel environments when video discovery is desired.
3. Deploy the app to Vercel.
4. Run `/api/ingest/run?dryRun=true` to confirm source selection.
5. Run `/api/ingest/run?force=true` once to populate the new dashboard tables.
6. Let Vercel Cron continue the daily 06:00 UTC refresh.

## MVP Notes

- Source ingestion supports RSS feeds and static URLs.
- Similar story deduplication is intentionally simple and hash-based for now.
- Relevance scoring uses the hardcoded interest profile in `lib/preferences.ts`.
- If `OPENAI_API_KEY` is missing, ingestion still stores fallback summaries, certification bytes, and quiz questions for development.
- If `YOUTUBE_API_KEY` is missing, the app skips YouTube discovery and uses any previously stored picks.
- Feedback is stored immediately; only `save` currently changes item state.
- LinkedIn ideas are content opportunities only; the app does not scrape LinkedIn or generate full posts.
- The app is still single-user/personal; there is no authentication or multi-user partitioning yet.
