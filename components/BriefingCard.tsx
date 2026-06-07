import type { BriefingItem } from "@/lib/types";
import { FeedbackButtons } from "@/components/FeedbackButtons";

function getSourceLabel(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

function formatItemDate(value?: string | null): string {
  if (!value) return "Today";

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function BriefingCard({ item }: { item: BriefingItem }) {
  const sourceLabel = getSourceLabel(item.link);
  const detailedSummary = item.detailed_summary || item.summary;
  const takeaways = item.key_takeaways ?? [];
  const technologies = item.related_technologies ?? [];

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white/90 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-fern/25 dark:border-white/10 dark:bg-white/[0.06]">
      <details className="group min-w-0">
        <summary className="grid min-w-0 cursor-pointer list-none gap-3 p-4 marker:hidden sm:p-5 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-fern sm:tracking-[0.14em] dark:text-emerald-300">
            <span className="min-w-0 break-words">{item.category}</span>
            <span className="text-ink/25">/</span>
            <span className="shrink-0">{formatItemDate(item.published_at)}</span>
            <span className="text-ink/25">/</span>
            <span className="shrink-0">{item.read_time_minutes} min read</span>
            <span className="text-ink/25">/</span>
            <span className="min-w-0 [overflow-wrap:anywhere] text-ink/45 dark:text-white/50">
              {sourceLabel}
            </span>
          </div>
          <div className="flex min-w-0 items-start justify-between gap-4">
            <h3 className="min-w-0 [overflow-wrap:anywhere] text-lg font-semibold leading-snug text-ink dark:text-white">
              {item.title}
            </h3>
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-ink/10 text-lg leading-none text-ink/55 transition group-open:bg-fern group-open:text-white dark:border-white/15 dark:text-white/70"
            >
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">-</span>
            </span>
          </div>
          <p className="line-clamp-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
            {item.summary}
          </p>
        </summary>

        <div className="border-t border-ink/10 px-4 pb-4 pt-4 dark:border-white/10 sm:px-5 sm:pb-5">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-gold dark:text-amber-300">
                Detailed Summary
              </div>
              <p className="mt-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/75 dark:text-white/75">
                {detailedSummary}
              </p>
            </div>
            {takeaways.length ? (
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-gold dark:text-amber-300">
                  Key Takeaways
                </div>
                <ul className="mt-2 grid min-w-0 gap-2 text-sm leading-6 text-ink/75 dark:text-white/75">
                  {takeaways.map((takeaway) => (
                    <li key={takeaway} className="min-w-0 [overflow-wrap:anywhere]">
                      <span className="mr-2 text-fern dark:text-emerald-300">•</span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-gold dark:text-amber-300">
                Why This Matters
              </div>
              <p className="mt-2 min-w-0 [overflow-wrap:anywhere] border-l-2 border-gold pl-3 text-sm leading-6 text-ink/75 dark:text-white/75">
                {item.why_it_matters}
              </p>
            </div>
            {item.suggested_action ? (
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-gold dark:text-amber-300">
                  Suggested Action
                </div>
                <p className="mt-2 min-w-0 [overflow-wrap:anywhere] rounded-md bg-cloud/70 p-3 text-sm leading-6 text-ink/75 dark:bg-white/10 dark:text-white/75">
                  {item.suggested_action}
                </p>
              </div>
            ) : null}
            {technologies.length ? (
              <div className="flex min-w-0 flex-wrap gap-2">
                {technologies.map((technology) => (
                  <span
                    key={technology}
                    className="rounded-full border border-ink/10 bg-cloud/70 px-2.5 py-1 text-xs font-semibold text-ink/65 dark:border-white/10 dark:bg-white/10 dark:text-white/70"
                  >
                    {technology}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-sm font-semibold text-fern underline dark:text-emerald-300"
            >
              Open source
            </a>
            <span className="w-full min-w-0 [overflow-wrap:anywhere] text-xs leading-5 text-ink/45 dark:text-white/45 sm:w-auto sm:max-w-[65%]">
              {item.source}
            </span>
          </div>

          <FeedbackButtons itemId={item.id} saved={item.saved} />
        </div>
      </details>
    </article>
  );
}
