# Personal Daily Briefing App

A focused morning briefing for data engineering news, AI news, and Databricks Data Engineer certification practice.

## Stack

- Next.js with TypeScript and App Router
- Tailwind CSS
- Supabase Postgres
- Vercel Cron
- OpenAI API for summarisation and certification-byte generation

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

## API Routes

- `GET /api/briefing/today` returns today’s full briefing.
- `POST /api/ingest/run` fetches sources, deduplicates, scores, summarises, and stores a briefing.
- `GET /api/certification/today` returns today’s certification byte.
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

## MVP Notes

- Source ingestion supports RSS feeds and static URLs.
- Similar story deduplication is intentionally simple and hash-based for now.
- Relevance scoring uses the hardcoded interest profile in `lib/preferences.ts`.
- If `OPENAI_API_KEY` is missing, ingestion still stores fallback summaries and certification bytes for development.
- Feedback is stored immediately; only `save` currently changes item state.
