import { CertificationByteCard } from "@/components/CertificationByteCard";
import { CertificationQuiz } from "@/components/CertificationQuiz";
import { Nav } from "@/components/Nav";
import {
  normalizeQuizAttempt,
  normalizeStoredQuiz,
  sanitizeQuizForClient
} from "@/lib/certification-quiz";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type {
  CertificationByte,
  CertificationTopicProgress
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CertificationArchivePage() {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("certification_bytes")
    .select("*")
    .order("briefing_date", { ascending: false })
    .limit(30);
  const { data: topicData } = await supabase
    .from("certification_topics")
    .select("id,title,level,domain,viewed_count,saved,weak_area,last_viewed_at")
    .eq("enabled", true)
    .order("order_index");
  const { data: todayQuizData } = await supabase
    .from("certification_quizzes")
    .select("*, questions:certification_quiz_questions(*)")
    .order("briefing_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: latestAttemptData } = todayQuizData?.id
    ? await supabase
        .from("certification_quiz_attempts")
        .select("*")
        .eq("quiz_id", todayQuizData.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const bytes = (data ?? []) as CertificationByte[];
  const todayQuiz = sanitizeQuizForClient(normalizeStoredQuiz(todayQuizData));
  const latestAttempt = normalizeQuizAttempt(latestAttemptData);
  const topics = (topicData ?? []) as CertificationTopicProgress[];
  const viewedTopics = topics.filter((topic) => topic.viewed_count > 0);
  const savedTopics = topics.filter((topic) => topic.saved);
  const weakAreas = topics.filter((topic) => topic.weak_area);
  const revisionQueue = topics
    .filter((topic) => topic.weak_area || topic.viewed_count === 0)
    .slice(0, 5);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl overflow-hidden px-4 pb-16 sm:px-6">
        <header className="py-10">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-gold dark:text-amber-300 sm:tracking-[0.18em]">
            Databricks Certification Hub
          </p>
          <h1 className="mt-3 [overflow-wrap:anywhere] text-4xl font-black text-ink dark:text-white">
            Progress and Revision
          </h1>
        </header>
        <section className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Viewed", viewedTopics.length],
            ["Saved", savedTopics.length],
            ["Weak Areas", weakAreas.length],
            ["Topic Pool", topics.length]
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-ink/10 bg-white/85 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black text-ink dark:text-white">{value}</p>
            </div>
          ))}
        </section>
        <CertificationQuiz quiz={todayQuiz} latestAttempt={latestAttempt} />
        <section className="mt-6 rounded-lg border border-ink/10 bg-white/85 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold text-ink dark:text-white">Revision Queue</h2>
            <span className="text-sm text-ink/45 dark:text-white/45">
              Associate first, Professional next
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {revisionQueue.map((topic) => (
              <article
                key={topic.id}
                className="grid min-w-0 gap-1 rounded-md bg-cloud/70 p-3 dark:bg-white/10 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="min-w-0 [overflow-wrap:anywhere] font-semibold text-ink dark:text-white">
                    {topic.title}
                  </p>
                  <p className="text-sm text-ink/55 dark:text-white/55">
                    {topic.domain} / {topic.level}
                  </p>
                </div>
                <span className="text-sm font-semibold text-fern dark:text-emerald-300">
                  {topic.weak_area ? "Weak area" : "Not viewed"}
                </span>
              </article>
            ))}
            {!revisionQueue.length ? (
              <p className="text-sm text-ink/60 dark:text-white/60">
                No revision items yet. New topics will be added as daily bytes are generated.
              </p>
            ) : null}
          </div>
        </section>
        <h2 className="mt-8 text-xl font-bold text-ink dark:text-white">
          Daily Byte Archive
        </h2>
        <div className="min-w-0 space-y-5">
          {bytes.map((byte) => (
            <CertificationByteCard key={byte.id} byte={byte} />
          ))}
        </div>
        {!bytes.length ? (
          <div className="rounded-lg border border-ink/10 bg-white/80 p-6 text-sm text-ink/65 shadow-soft">
            Daily certification bytes will appear here after ingestion runs.
          </div>
        ) : null}
      </main>
    </>
  );
}
