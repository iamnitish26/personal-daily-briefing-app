import type { BriefingItem } from "@/lib/types";
import { FeedbackButtons } from "@/components/FeedbackButtons";

function getSourceLabel(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

export function BriefingCard({ item }: { item: BriefingItem }) {
  const sourceLabel = getSourceLabel(item.link);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white/85 shadow-soft">
      <details className="group min-w-0">
        <summary className="grid min-w-0 cursor-pointer list-none gap-3 p-4 marker:hidden sm:p-5 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-fern sm:tracking-[0.14em]">
            <span className="min-w-0 break-words">{item.category}</span>
            <span className="text-ink/25">/</span>
            <span className="shrink-0">{item.read_time_minutes} min read</span>
            <span className="text-ink/25">/</span>
            <span className="min-w-0 [overflow-wrap:anywhere] text-ink/45">
              {sourceLabel}
            </span>
          </div>
          <div className="flex min-w-0 items-start justify-between gap-4">
            <h3 className="min-w-0 [overflow-wrap:anywhere] text-lg font-semibold leading-snug text-ink">
              {item.title}
            </h3>
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-ink/10 text-lg leading-none text-ink/55 group-open:bg-fern group-open:text-white"
            >
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">-</span>
            </span>
          </div>
        </summary>

        <div className="border-t border-ink/10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-gold">
                Curated Summary
              </div>
              <p className="mt-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/75">
                {item.summary}
              </p>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-gold">
                Takeaway
              </div>
              <p className="mt-2 min-w-0 [overflow-wrap:anywhere] border-l-2 border-gold pl-3 text-sm leading-6 text-ink/75">
                {item.why_it_matters}
              </p>
            </div>
          </div>

          <div className="mt-5 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-sm font-semibold text-fern underline"
            >
              Open source
            </a>
            <span className="w-full min-w-0 [overflow-wrap:anywhere] text-xs leading-5 text-ink/45 sm:w-auto sm:max-w-[65%]">
              {item.source}
            </span>
          </div>

          <FeedbackButtons itemId={item.id} saved={item.saved} />
        </div>
      </details>
    </article>
  );
}
