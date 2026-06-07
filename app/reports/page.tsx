import { Nav } from "@/components/Nav";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { WeeklyReport } from "@/lib/types";

export const dynamic = "force-dynamic";

function SignalBlock({
  label,
  title,
  summary
}: {
  label: string;
  title: string;
  summary: string;
}) {
  return (
    <div className="rounded-md bg-cloud/70 p-3 dark:bg-white/10">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
        {label}
      </p>
      <h3 className="mt-1 [overflow-wrap:anywhere] font-bold text-ink dark:text-white">
        {title}
      </h3>
      <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
        {summary}
      </p>
    </div>
  );
}

export default async function ReportsPage() {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("week_end", { ascending: false })
    .limit(12);

  const reports = (data ?? []) as WeeklyReport[];

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <header className="py-10">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-gold dark:text-amber-300">
            Weekly Intelligence
          </p>
          <h1 className="mt-3 text-4xl font-black text-ink dark:text-white">
            Reports
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65 dark:text-white/65">
            Sunday summaries of the biggest AI, data engineering, Databricks, video,
            content, and certification signals.
          </p>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error.message}
          </div>
        ) : null}

        <div className="space-y-5">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
                    {report.week_start} to {report.week_end}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">
                    {report.most_discussed_trend}
                  </h2>
                </div>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <SignalBlock label="AI" {...report.biggest_ai_development} />
                <SignalBlock
                  label="Data Engineering"
                  {...report.biggest_data_engineering_development}
                />
                <SignalBlock label="Databricks" {...report.biggest_databricks_update} />
                <SignalBlock label="Top Video" {...report.top_video} />
                <SignalBlock
                  label="Content"
                  {...report.best_content_opportunity}
                />
                <div className="rounded-md bg-cloud/70 p-3 dark:bg-white/10">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
                    Next Week
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">
                    {report.recommended_focus_next_week}
                  </p>
                </div>
              </div>
              {report.certification_topics_covered.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.certification_topics_covered.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-cloud px-2.5 py-1 text-xs font-semibold text-ink/65 dark:bg-white/10 dark:text-white/70"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {!reports.length ? (
          <div className="rounded-lg border border-ink/10 bg-white/85 p-6 text-sm text-ink/65 shadow-soft dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65">
            Weekly reports are generated on Sundays by the ingestion job.
          </div>
        ) : null}
      </main>
    </>
  );
}
