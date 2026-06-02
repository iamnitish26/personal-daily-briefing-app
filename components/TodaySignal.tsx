import type { DailySignal } from "@/lib/types";

type Props = {
  signal?: DailySignal | null;
};

const signalItems = [
  ["AI", "most_important_ai"],
  ["Data Engineering", "most_important_data_engineering"],
  ["Certification", "certification_concept"],
  ["Video", "video_worth_watching"],
  ["LinkedIn", "linkedin_opportunity"]
] as const;

export function TodaySignal({ signal }: Props) {
  if (!signal) return null;

  return (
    <section className="mt-4 min-w-0">
      <div className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold dark:text-amber-300">
            Executive scan
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink dark:text-white">
            Today&apos;s Signal
          </h2>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-5">
        {signalItems.map(([label, key]) => {
          const item = signal[key];
          return (
            <article
              key={key}
              className="min-w-0 rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
                {label}
              </p>
              <h3 className="mt-2 min-w-0 [overflow-wrap:anywhere] text-sm font-bold leading-5 text-ink dark:text-white">
                {item.title}
              </h3>
              <p className="mt-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
                {item.summary}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
