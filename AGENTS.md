AGENTS.md

Project Context

This is a personal daily briefing web app.

The app should provide:

* Daily data engineering news.
* Daily AI and agentic AI updates.
* Databricks certification learning bytes.
* Saved/bookmarked items.
* Personal feedback such as “more like this” and “less like this”.
* Daily action intelligence: what to read, watch, learn, post, and try.
* Weekly intelligence reports.
* Daily signal cards, YouTube intelligence, emerging trends, and LinkedIn content opportunities.

Primary user profile:

* Data engineer.
* Interested in Databricks, Spark, Delta Lake, Airflow, dbt, Snowflake, OpenAI, Claude, Gemini, and agentic AI.
* Prefers practical, concise, high-signal content.

⸻

Development Ground Rules

1. Work Style

Codex should:

* Make small, focused changes.
* Explain the purpose of each change.
* Avoid large rewrites unless explicitly requested.
* Prefer simple, maintainable code over clever abstractions.
* Keep the app deployable after every meaningful change.
* Never leave broken TypeScript, lint, or build errors knowingly.

Before making major changes:

* Identify affected files.
* Explain the intended approach.
* Keep implementation aligned with the current architecture.

⸻

2. Code Quality Standards

Use:

* TypeScript everywhere.
* Clear type definitions.
* Explicit interfaces for API responses, database records, and UI props.
* Server-side code for secrets and external API calls.
* Reusable utilities for ingestion, scoring, summarisation, and certification content.

Avoid:

* any unless absolutely necessary.
* Hardcoded secrets.
* Duplicated logic.
* Over-engineering.
* Large components with mixed data-fetching, business logic, and UI logic.

⸻

3. Architecture Principles

The app should follow this structure:

/app
  /api
  /briefing
  /saved
  /certification
/components
/lib
  /db
  /ingestion
  /summarisation
  /certification
  /scoring
  /sources
/types
/supabase

General rules:

* Keep UI components in /components.
* Keep business logic in /lib.
* Keep shared types in /types.
* Keep database SQL and migrations in /supabase.
* Keep API route handlers thin.
* Put complex logic in testable helper functions.

⸻

4. Security Rules

Never expose:

* OPENAI_API_KEY
* SUPABASE_SERVICE_ROLE_KEY
* cron secrets
* private user preferences
* internal logs containing API responses

Rules:

* Use environment variables for secrets.
* Validate cron requests using CRON_SECRET.
* Use Supabase service role key only on the server.
* Do not send secrets to the browser.
* Do not commit .env.local.

⸻

5. Data Ingestion Rules

Sources should be configurable.

Each ingested item should include:

* title
* url
* source name
* source category
* published date where available
* raw summary or content snippet
* ingestion timestamp

Deduplication should use:

* URL matching first.
* Normalised title matching second.
* Similarity-based deduplication later, only if needed.

Do not summarise the same item repeatedly if it already exists.

⸻

6. Briefing Quality Rules

Daily briefings should be:

* Short.
* High-signal.
* Practical.
* Relevant to data engineering, AI engineering, and certification preparation.

Each news item should include:

* Title
* Source
* Link
* 2 to 4 line summary
* Detailed expanded summary
* Key takeaways
* Why it matters
* Category
* Relevance score
* Suggested action

Avoid:

* Generic AI hype.
* Unverified rumours.
* Thin promotional posts.
* Duplicate release-note summaries.
* Overly long summaries.

⸻

7. Certification Byte Rules

Certification content should focus on:

* Databricks Data Engineer Associate first.
* Databricks Data Engineer Professional second.

Each daily byte should include:

* Topic
* Level: Associate or Professional
* Concept explanation
* Exam relevance
* Practical example
* One multiple-choice question
* Correct answer
* Explanation

Each daily quiz should include:

* 10 multiple-choice questions.
* Databricks Data Engineer Associate questions first.
* Databricks Data Engineer Professional stretch questions where useful.
* Clickable answers in the UI.
* Score, strengths, weaknesses, and answer review after submission.
* Server-side scoring so answer keys are not exposed to the browser before submission.

Prioritise topics such as:

* Delta Lake
* Medallion architecture
* Spark SQL
* Unity Catalog
* Auto Loader
* Lakeflow Jobs
* Lakeflow Declarative Pipelines
* Streaming
* Data quality
* Performance optimisation
* Permissions and governance
* Monitoring and troubleshooting

Do not invent official exam rules. If exam-specific facts are uncertain, phrase them as general preparation guidance.

Daily intelligence should be generated during ingestion, never during page render.

Each daily focus should answer:

* What should I read?
* What should I watch?
* What should I learn?
* What should I post about?
* What should I try?

Weekly reports should be generated on Sundays and stored for archive viewing.

⸻

8. UI Rules

The UI should be:

* Clean.
* Mobile-friendly.
* Fast.
* Easy to read in the morning.

Use:

* Card-based layout.
* Clear section headings.
* Source badges.
* Save buttons.
* Feedback buttons.
* Read-time estimate.
* Simple navigation.

Avoid:

* Dense tables for daily reading.
* Too many colours.
* Complex dashboards before the MVP is stable.

⸻

9. Testing and Validation

Before completing a task, Codex should run or provide instructions for:

npm run lint
npm run typecheck
npm run build

If tests are added:

npm test

Do not mark work as complete if:

* TypeScript fails.
* Build fails.
* Environment variables are missing from documentation.
* API routes are untested manually or through basic checks.

⸻

10. Git and PR Rules

For every meaningful change:

* Use a clear branch name.
* Keep commits focused.
* Write a concise PR summary.
* Include testing notes.
* Mention any follow-up work.

Suggested branch names:

feature/daily-briefing-dashboard
feature/rss-ingestion
feature/certification-byte
fix/briefing-deduplication
refactor/source-scoring

Suggested PR format:

## Summary
- Added ...
- Updated ...
- Fixed ...
## Testing
- [ ] npm run lint
- [ ] npm run typecheck
- [ ] npm run build
- [ ] Manual test completed
## Notes
- Any assumptions or follow-ups.

Codex may approve and merge PRs only when:

* The change is small and clear.
* Build and checks pass.
* No secrets are exposed.
* The change matches the requested scope.
* The PR summary and testing notes are complete.

Codex should not approve or merge PRs when:

* Security-sensitive code changed without review.
* Database schema changed without migration notes.
* API cost behaviour changed.
* Authentication or permissions changed.
* The change is large or risky.

⸻

11. Cost Control Rules

The app should avoid unnecessary API spend.

Rules:

* Summarise only new items.
* Cache generated summaries.
* Generate daily signals once during ingestion, never live on page load.
* Limit daily ingested items per source.
* Limit OpenAI calls during local development.
* Add a dry-run mode for ingestion.
* Log token/call usage where practical.

⸻

12. Logging Rules

Logs should help debugging but avoid leaking private data.

Log:

* ingestion start/end
* source count
* item count
* deduped count
* summarisation count
* errors with safe messages

Do not log:

* full API keys
* full OpenAI prompts with personal data
* Supabase service key
* private user feedback details

⸻

13. Documentation Rules

Keep README.md updated with:

* Project purpose
* Tech stack
* Local setup
* Environment variables
* Database setup
* How to run ingestion manually
* How cron works
* Deployment steps
* Known limitations

Keep .env.example updated whenever env vars change.

⸻

14. MVP Discipline

Build in this order:

1. Project setup.
2. Database schema.
3. Source seed data.
4. Manual ingestion.
5. Daily briefing dashboard.
6. OpenAI summarisation.
7. Certification byte generator.
8. Saved items.
9. Feedback buttons.
10. Vercel Cron.
11. Email delivery only after the web dashboard works.

Do not start with:

* Complex auth.
* Multi-user support.
* Mobile app.
* Recommendation engine.
* Vector database.
* Browser extension.
* Complex analytics.

⸻

15. Definition of Done

A task is done only when:

* The feature works locally.
* Code is typed.
* Build passes.
* Relevant README updates are made.
* No secrets are committed.
* The implementation is simple enough to maintain.
* Follow-up limitations are documented.
