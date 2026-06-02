import type { DailyVideoPick } from "@/lib/types";

export function VideoPicksSection({ videos }: { videos: DailyVideoPick[] }) {
  if (!videos.length) return null;

  return (
    <section className="mt-8 min-w-0">
      <div className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-bold leading-tight text-ink dark:text-white">
          Today&apos;s Videos Worth Watching
        </h2>
        <span className="text-sm font-medium text-ink/45 dark:text-white/45">
          Top {videos.length}
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        {videos.map((pick) => (
          <article
            key={pick.id || pick.video.video_id}
            className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white/90 shadow-soft dark:border-white/10 dark:bg-white/[0.06]"
          >
            {pick.video.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pick.video.thumbnail}
                alt=""
                className="aspect-video w-full object-cover"
              />
            ) : null}
            <div className="p-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-fern dark:text-emerald-300">
                <span>{pick.video.channel}</span>
                <span className="text-ink/25 dark:text-white/25">/</span>
                <span>{pick.estimated_value} value</span>
              </div>
              <h3 className="mt-2 min-w-0 [overflow-wrap:anywhere] text-base font-bold leading-6 text-ink dark:text-white">
                {pick.video.title}
              </h3>
              <p className="mt-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
                {pick.why_useful}
              </p>
              <a
                href={pick.video.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-semibold text-fern underline dark:text-emerald-300"
              >
                Watch on YouTube
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
