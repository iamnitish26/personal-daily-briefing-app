import type {
  CareerRadarItem,
  ContentOpportunity,
  CTOBriefing,
  DailyFocus,
  ToolRecommendation
} from "@/lib/types";

function MiniSignal({
  label,
  title,
  summary
}: {
  label: string;
  title: string;
  summary: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-white/70 p-3 dark:bg-white/[0.06]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
        {label}
      </p>
      <h3 className="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-ink dark:text-white">
        {title}
      </h3>
      <p className="mt-1 line-clamp-3 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
        {summary}
      </p>
    </div>
  );
}

export function TodayFocusCard({ focus }: { focus?: DailyFocus | null }) {
  if (!focus) return null;

  return (
    <section className="mt-4 rounded-lg border border-ink/10 bg-white/95 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.07] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold dark:text-amber-300">
            Today&apos;s Focus
          </p>
          <h2 className="mt-2 [overflow-wrap:anywhere] text-3xl font-black leading-tight text-ink dark:text-white">
            {focus.theme}
          </h2>
        </div>
        <div className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white dark:bg-white dark:text-ink">
          {focus.estimated_total_minutes} min
        </div>
      </div>
      <p className="mt-3 max-w-3xl [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
        {focus.why_selected}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniSignal label="Read" {...focus.read_item} />
        <MiniSignal label="Watch" {...focus.watch_item} />
        <MiniSignal label="Learn" {...focus.learn_item} />
        <MiniSignal label="Post" {...focus.post_item} />
        <MiniSignal label="Try" {...focus.try_item} />
      </div>
    </section>
  );
}

export function CTOBriefingCard({ briefing }: { briefing?: CTOBriefing | null }) {
  if (!briefing) return null;

  return (
    <section className="mt-8 rounded-lg border border-ink/10 bg-ink p-4 text-white shadow-soft dark:border-white/10 dark:bg-black/30 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            Personal CTO Briefing
          </p>
          <h2 className="mt-2 text-2xl font-black">What matters today</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
          Care level: {briefing.should_care}
        </span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
            Signal
          </p>
          <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-white/85">
            {briefing.what_matters}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
            Why It Matters
          </p>
          <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-white/85">
            {briefing.why_it_matters}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
            Practical Action
          </p>
          <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-white/85">
            {briefing.practical_action}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {briefing.related_technologies.map((technology) => (
          <span key={technology} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
            {technology}
          </span>
        ))}
      </div>
      <p className="mt-4 border-l-2 border-emerald-300 pl-3 text-sm leading-6 text-white/75">
        Expected impact: {briefing.expected_impact}
      </p>
    </section>
  );
}

export function ContentOpportunitiesSection({
  opportunities
}: {
  opportunities: ContentOpportunity[];
}) {
  if (!opportunities.length) return null;

  return (
    <section className="mt-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold dark:text-amber-300">
        Content Opportunities
      </p>
      <h2 className="mt-1 text-xl font-bold text-ink dark:text-white">Ideas To Post About Today</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {opportunities.map((idea) => (
          <article key={idea.id} className="rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
                {idea.opportunity_type.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-bold text-ink/45 dark:text-white/45">{idea.opportunity_score}/100</span>
            </div>
            <h3 className="mt-2 [overflow-wrap:anywhere] text-lg font-bold text-ink dark:text-white">{idea.topic}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">{idea.why_relevant_now}</p>
            <ul className="mt-3 space-y-1 text-sm text-ink/70 dark:text-white/70">
              {idea.talking_points.slice(0, 3).map((point) => (
                <li key={point} className="[overflow-wrap:anywhere]">• {point}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink dark:text-white">{idea.personal_angle}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CareerRadarSection({ items }: { items: CareerRadarItem[] }) {
  if (!items.length) return null;

  return (
    <section className="mt-8 rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
      <h2 className="text-xl font-bold text-ink dark:text-white">Career Radar</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-md bg-cloud/70 p-3 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-ink dark:text-white">{item.topic}</h3>
              <span className="text-sm font-black text-fern dark:text-emerald-300">{item.momentum_score}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">{item.why_growing}</p>
            <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-white/70">{item.suggested_learning_action}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ToolRecommendationsSection({ items }: { items: ToolRecommendation[] }) {
  if (!items.length) return null;

  return (
    <section className="mt-8 rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold dark:text-amber-300">
        Tool Worth Trying Today
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id}>
            <h3 className="text-lg font-bold text-ink dark:text-white">{item.tool_name}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">{item.what_it_does}</p>
            <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-white/70">{item.trial_step}</p>
            {item.source_link ? (
              <a href={item.source_link} className="mt-3 inline-block text-sm font-semibold text-fern underline dark:text-emerald-300">
                Open source
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
