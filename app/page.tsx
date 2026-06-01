import { BriefingSection } from "@/components/BriefingSection";
import { CertificationByteCard } from "@/components/CertificationByteCard";
import { Nav } from "@/components/Nav";
import { formatBriefingDate } from "@/lib/date";
import { getTodayBriefing } from "@/lib/briefing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let briefing = null;
  let errorMessage = "";

  try {
    briefing = await getTodayBriefing();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load briefing.";
  }

  const dataItems =
    briefing?.items.filter((item) => item.section === "data_engineering") ?? [];
  const aiItems = briefing?.items.filter((item) => item.section === "ai") ?? [];

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl overflow-hidden px-4 pb-16 sm:px-6">
        <section className="grid min-w-0 grid-cols-1 gap-6 py-8 sm:py-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-gold sm:tracking-[0.18em]">
              {briefing ? formatBriefingDate(briefing.briefing_date) : "Today"}
            </p>
            <h1 className="mt-3 max-w-3xl [overflow-wrap:anywhere] text-4xl font-black leading-tight text-ink sm:text-6xl">
              {briefing?.title ?? "Morning Data Briefing"}
            </h1>
            <p className="mt-5 max-w-2xl [overflow-wrap:anywhere] text-base leading-7 text-ink/70">
              {briefing?.intro ??
                "Run the daily ingestion job to create your first focused briefing."}
            </p>
          </div>
          <div className="min-w-0 rounded-lg border border-ink/10 bg-white/75 p-4 shadow-soft sm:p-5">
            <div className="text-sm font-bold uppercase tracking-[0.14em] text-fern sm:tracking-[0.16em]">
              Read Time
            </div>
            <div className="mt-2 text-4xl font-black text-ink">
              {briefing?.total_read_time_minutes ?? 0} min
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Data engineering, AI, and one certification rep for the morning.
            </p>
          </div>
        </section>

        {errorMessage ? (
          <div className="min-w-0 [overflow-wrap:anywhere] rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {!briefing ? (
          <div className="min-w-0 rounded-lg border border-ink/10 bg-white/80 p-5 shadow-soft sm:p-6">
            <h2 className="text-xl font-bold text-ink">No briefing yet</h2>
            <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65">
              After configuring Supabase and environment variables, call
              <code className="mx-1 rounded bg-cloud px-1.5 py-0.5 break-all">
                POST /api/ingest/run
              </code>
              or wait for the Vercel Cron schedule.
            </p>
          </div>
        ) : (
          <>
            <BriefingSection title="Top 5 Data Engineering Updates" items={dataItems} />
            <BriefingSection title="Top 5 AI Updates" items={aiItems} />
            {briefing.certification_byte ? (
              <CertificationByteCard byte={briefing.certification_byte} />
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
