import type { BriefingItem } from "@/lib/types";
import { FeedbackButtons } from "@/components/FeedbackButtons";

export function BriefingCard({ item }: { item: BriefingItem }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white/85 p-5 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-fern">
        <span>{item.category}</span>
        <span className="text-ink/25">/</span>
        <span>{item.read_time_minutes} min read</span>
      </div>
      <h3 className="text-lg font-semibold leading-snug text-ink">{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/72">{item.summary}</p>
      <p className="mt-4 border-l-2 border-gold pl-3 text-sm leading-6 text-ink/75">
        <span className="font-semibold text-ink">Why it matters: </span>
        {item.why_it_matters}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-fern underline"
        >
          Open source
        </a>
        <span className="max-w-full truncate text-xs text-ink/45">{item.source}</span>
      </div>
      <FeedbackButtons itemId={item.id} saved={item.saved} />
    </article>
  );
}
