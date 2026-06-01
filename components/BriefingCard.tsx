import type { BriefingItem } from "@/lib/types";
import { FeedbackButtons } from "@/components/FeedbackButtons";

export function BriefingCard({ item }: { item: BriefingItem }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white/85 p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-fern sm:tracking-[0.14em]">
        <span className="min-w-0 break-words">{item.category}</span>
        <span className="text-ink/25">/</span>
        <span className="shrink-0">{item.read_time_minutes} min read</span>
      </div>
      <h3 className="min-w-0 [overflow-wrap:anywhere] text-lg font-semibold leading-snug text-ink">
        {item.title}
      </h3>
      <p className="mt-3 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/72">
        {item.summary}
      </p>
      <p className="mt-4 min-w-0 [overflow-wrap:anywhere] border-l-2 border-gold pl-3 text-sm leading-6 text-ink/75">
        <span className="font-semibold text-ink">Why it matters: </span>
        {item.why_it_matters}
      </p>
      <div className="mt-4 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
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
    </article>
  );
}
