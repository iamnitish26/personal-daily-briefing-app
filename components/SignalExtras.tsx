import type { EmergingSignal, TryTodayItem } from "@/lib/types";

export function SignalExtras({
  whatToTry,
  emergingSignals
}: {
  whatToTry: TryTodayItem[];
  emergingSignals: EmergingSignal[];
}) {
  if (!whatToTry.length && !emergingSignals.length) return null;

  return (
    <section className="mt-8 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      {whatToTry.length ? (
        <div className="min-w-0 rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
          <h2 className="text-xl font-bold text-ink dark:text-white">What To Try Today</h2>
          <div className="mt-4 grid gap-3">
            {whatToTry.map((item) => (
              <article key={item.title} className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
                  {(item.type ?? "workflow").replace(/_/g, " ")}
                </p>
                <h3 className="mt-1 min-w-0 [overflow-wrap:anywhere] font-semibold text-ink dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {emergingSignals.length ? (
        <div className="min-w-0 rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
          <h2 className="text-xl font-bold text-ink dark:text-white">Emerging Signals</h2>
          <div className="mt-4 grid gap-3">
            {emergingSignals.map((signal) => (
              <article key={signal.topic} className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 [overflow-wrap:anywhere] font-semibold text-ink dark:text-white">
                    {signal.topic}
                  </h3>
                  <span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-semibold text-ink/60 dark:bg-white/10 dark:text-white/65">
                    {signal.momentum}
                  </span>
                </div>
                <p className="mt-1 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
                  {signal.evidence.slice(0, 2).join(" ")}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
