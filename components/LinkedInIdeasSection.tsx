import type { LinkedInIdea } from "@/lib/types";

const labels: Record<LinkedInIdea["idea_type"], string> = {
  ai: "AI",
  data_engineering: "Data Engineering",
  engineering_career: "Engineering Career"
};

export function LinkedInIdeasSection({ ideas }: { ideas: LinkedInIdea[] }) {
  if (!ideas.length) return null;

  return (
    <section className="mt-8 min-w-0">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold dark:text-amber-300">
          Content opportunities
        </p>
        <h2 className="mt-1 text-xl font-bold leading-tight text-ink dark:text-white">
          Ideas To Post About Today
        </h2>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        {ideas.map((idea) => (
          <article
            key={idea.id || idea.idea_type}
            className="min-w-0 rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06]"
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
                {labels[idea.idea_type]}
              </span>
              <span className="text-xs font-semibold text-ink/45 dark:text-white/45">
                {idea.confidence_score}% confidence
              </span>
            </div>
            <h3 className="mt-2 min-w-0 [overflow-wrap:anywhere] text-lg font-bold leading-6 text-ink dark:text-white">
              {idea.topic}
            </h3>
            <p className="mt-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
              {idea.why_trending}
            </p>
            <div className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-gold dark:text-amber-300">
              Personal angle
            </div>
            <p className="mt-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/70 dark:text-white/70">
              {idea.personal_angle}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
