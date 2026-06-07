import type {
  BriefingItem,
  CareerRadarItem,
  ContentOpportunity,
  CTOBriefing,
  DailyBriefing,
  DailyFocus,
  DailySignal,
  DailyVideoPick,
  IngestionRun,
  LinkedInIdea,
  RawItem,
  Source,
  ToolRecommendation,
  WeeklyReport,
  YouTubeVideo
} from "@/lib/types";
import { todayIsoDate } from "@/lib/date";
import { fetchAllSourceItems } from "@/lib/ingest";
import {
  enrichVideoPicks,
  generateDailyActionIntelligence,
  generateDailySignal,
  generateWeeklyIntelligenceReport,
  generateLinkedInIdeas,
  summarizeItems
} from "@/lib/openai";
import {
  generateCertificationByte,
  generateCertificationQuiz,
  selectTopicForDate
} from "@/lib/certification";
import { getSupabaseAnonClient, getSupabaseServiceClient } from "@/lib/supabase";
import { discoverYouTubeVideos } from "@/lib/youtube";

type IngestionOptions = {
  date?: string;
  dryRun?: boolean;
  force?: boolean;
  mode?: string;
};

type RecentBriefingItem = {
  title: string;
  link: string;
  section: BriefingItem["section"];
};

const RECENT_ITEM_LOOKBACK_DAYS = 7;
const CANDIDATE_POOL_SIZE = 80;
const SECTION_ITEM_LIMIT = 5;

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function isSunday(date: string): boolean {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay() === 0;
}

function weekStartFor(date: string): string {
  const current = new Date(`${date}T00:00:00.000Z`);
  current.setUTCDate(current.getUTCDate() - current.getUTCDay());
  return current.toISOString().slice(0, 10);
}

function dateDaysBefore(date: string, days: number): string {
  const current = new Date(`${date}T00:00:00.000Z`);
  current.setUTCDate(current.getUTCDate() - days);
  return current.toISOString().slice(0, 10);
}

function normalizeComparableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

function topicSignature(title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const hasDatabricks = normalized.includes("databricks");
  const hasSnowflake = normalized.includes("snowflake");
  const hasFivetran = normalized.includes("fivetran");
  const hasDbt = /\bdbt\b/.test(normalized);

  if (hasFivetran && hasDbt && /\b(merger|merge|merged|acquisition|acquire)\b/.test(normalized)) {
    return "fivetran-dbt-merger";
  }

  if (
    hasDatabricks &&
    hasSnowflake &&
    /\b(vs|versus|compare|comparison|showdown|weekly|better|which)\b/.test(normalized)
  ) {
    return "databricks-snowflake-comparison";
  }

  return normalized
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 8)
    .join("-");
}

function topicTokens(title: string): Set<string> {
  const stopWords = new Set([
    "about",
    "after",
    "already",
    "better",
    "build",
    "from",
    "into",
    "that",
    "their",
    "this",
    "using",
    "what",
    "with",
    "your"
  ]);

  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
  );
}

function topicSimilarity(left: string, right: string): number {
  const leftTokens = topicTokens(left);
  const rightTokens = topicTokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function hasSimilarTopic(title: string, otherTitles: string[]): boolean {
  return otherTitles.some((otherTitle) => topicSimilarity(title, otherTitle) >= 0.5);
}

function selectFreshItems(
  candidates: RawItem[],
  section: BriefingItem["section"],
  recentItems: RecentBriefingItem[],
  limit = SECTION_ITEM_LIMIT
): RawItem[] {
  const sectionRecentItems = recentItems.filter((item) => item.section === section);
  const recentLinks = new Set(sectionRecentItems.map((item) => normalizeComparableUrl(item.link)));
  const recentTopicCounts = new Map<string, number>();

  for (const item of sectionRecentItems) {
    const signature = topicSignature(item.title);
    recentTopicCounts.set(signature, (recentTopicCounts.get(signature) ?? 0) + 1);
  }

  const scored = candidates.map((item) => {
    const exactRepeatPenalty = recentLinks.has(normalizeComparableUrl(item.url)) ? 1000 : 0;
    const recentTopicPenalty = (recentTopicCounts.get(topicSignature(item.title)) ?? 0) * 8;
    const similarRecentTopicPenalty = hasSimilarTopic(
      item.title,
      sectionRecentItems.map((recentItem) => recentItem.title)
    )
      ? 6
      : 0;
    return {
      item,
      freshnessScore:
        (item.relevance_score ?? 0) -
        exactRepeatPenalty -
        recentTopicPenalty -
        similarRecentTopicPenalty
    };
  });

  const selected: RawItem[] = [];
  const selectedTopics = new Set<string>();
  const selectedTitles: string[] = [];

  for (const candidate of scored.sort((a, b) => b.freshnessScore - a.freshnessScore)) {
    const signature = topicSignature(candidate.item.title);
    if (selectedTopics.has(signature) && selected.length < limit) continue;
    if (hasSimilarTopic(candidate.item.title, selectedTitles) && selected.length < limit) continue;
    selected.push(candidate.item);
    selectedTopics.add(signature);
    selectedTitles.push(candidate.item.title);
    if (selected.length === limit) break;
  }

  return selected;
}

export async function getTodayBriefing(): Promise<DailyBriefing | null> {
  const supabase =
    typeof window === "undefined" ? getSupabaseServiceClient() : getSupabaseAnonClient();
  const date = todayIsoDate();

  const { data: briefing, error: briefingError } = await supabase
    .from("briefings")
    .select("*")
    .eq("briefing_date", date)
    .maybeSingle();

  if (briefingError) throw briefingError;
  if (!briefing) return null;

  const [
    { data: items, error: itemsError },
    { data: certificationByte },
    { data: dailyFocus },
    { data: ctoBriefing },
    { data: dailySignal },
    { data: videoPicks },
    { data: linkedinIdeas },
    { data: contentOpportunities },
    { data: careerRadar },
    { data: toolRecommendations },
    { data: weeklyReport },
    { data: latestRun }
  ] = await Promise.all([
      supabase
        .from("briefing_items")
        .select("*")
        .eq("briefing_id", briefing.id)
        .order("section")
        .order("rank"),
      supabase
        .from("certification_bytes")
        .select("*")
        .eq("briefing_date", date)
        .maybeSingle(),
      supabase.from("daily_focus").select("*").eq("briefing_date", date).maybeSingle(),
      supabase.from("cto_briefings").select("*").eq("briefing_date", date).maybeSingle(),
      supabase.from("daily_signals").select("*").eq("briefing_date", date).maybeSingle(),
      supabase
        .from("daily_video_picks")
        .select("*, video:youtube_videos(*)")
        .eq("briefing_date", date)
        .order("rank"),
      supabase
        .from("linkedin_ideas")
        .select("*")
        .eq("briefing_date", date)
        .order("idea_type"),
      supabase
        .from("content_opportunities")
        .select("*")
        .eq("briefing_date", date)
        .order("opportunity_type"),
      supabase
        .from("career_radar")
        .select("*")
        .eq("briefing_date", date)
        .order("momentum_score", { ascending: false }),
      supabase
        .from("tool_recommendations")
        .select("*")
        .eq("briefing_date", date)
        .order("created_at"),
      supabase
        .from("weekly_reports")
        .select("*")
        .eq("week_end", date)
        .maybeSingle(),
      supabase
        .from("ingestion_runs")
        .select("*")
        .eq("run_date", date)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

  if (itemsError) throw itemsError;

  return {
    ...briefing,
    items: ((items ?? []) as BriefingItem[]).map((item) => ({
      ...item,
      key_takeaways: normalizeStringArray(item.key_takeaways),
      related_technologies: normalizeStringArray(item.related_technologies)
    })),
    certification_byte: certificationByte ?? null,
    daily_focus: (dailyFocus as DailyFocus | null) ?? null,
    cto_briefing: ctoBriefing
      ? ({
          ...ctoBriefing,
          related_technologies: normalizeStringArray(ctoBriefing.related_technologies)
        } as CTOBriefing)
      : null,
    daily_signal: (dailySignal as DailySignal | null) ?? null,
    video_picks: ((videoPicks ?? []) as DailyVideoPick[]) ?? [],
    linkedin_ideas: ((linkedinIdeas ?? []) as LinkedInIdea[]) ?? [],
    content_opportunities: ((contentOpportunities ?? []) as ContentOpportunity[]) ?? [],
    career_radar: ((careerRadar ?? []) as CareerRadarItem[]) ?? [],
    tool_recommendations: ((toolRecommendations ?? []) as ToolRecommendation[]) ?? [],
    weekly_report: (weeklyReport as WeeklyReport | null) ?? null,
    latest_ingestion_run: (latestRun as IngestionRun | null) ?? null
  };
}

async function summarizeWithCache(items: RawItem[]) {
  const supabase = getSupabaseServiceClient();
  if (!items.length) return { items: [] as BriefingItem[], generatedCount: 0, tokenEstimate: 0 };

  const hashes = items.map((item) => item.hash);
  const { data: cachedRows, error: cacheError } = await supabase
    .from("article_summaries")
    .select("*")
    .in("raw_item_hash", hashes);

  if (cacheError) throw cacheError;

  const cachedByHash = new Map((cachedRows ?? []).map((row) => [row.raw_item_hash, row]));
  const missing = items.filter((item) => !cachedByHash.has(item.hash));
  const generated = await summarizeItems(missing);

  if (generated.length) {
    const rawByIdOrHash = new Map(
      missing.map((item) => [item.id ?? item.hash, item] as const)
    );
    const rows = generated.map((summary) => {
      const raw = summary.raw_item_id ? rawByIdOrHash.get(summary.raw_item_id) : undefined;
      const fallbackRaw = missing.find((item) => item.url === summary.link);
      const item = raw ?? fallbackRaw;
      return {
        raw_item_hash: item?.hash ?? summary.link,
        raw_item_id: item?.id ?? null,
        title: summary.title,
        summary: summary.summary,
        detailed_summary: summary.detailed_summary ?? summary.summary,
        key_takeaways: summary.key_takeaways ?? [],
        why_it_matters: summary.why_it_matters,
        suggested_action: summary.suggested_action ?? null,
        related_technologies: summary.related_technologies ?? [],
        category: summary.category,
        model: process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "fallback",
        token_estimate: estimateTokens(
          `${item?.title ?? ""} ${item?.content ?? ""} ${summary.summary} ${summary.why_it_matters}`
        ),
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase
      .from("article_summaries")
      .upsert(rows, { onConflict: "raw_item_hash" });
    if (error) throw error;
  }

  const generatedByRawId = new Map(generated.map((item) => [item.raw_item_id, item]));
  const generatedByLink = new Map(generated.map((item) => [item.link, item]));
  const briefingItems = items.map((raw, index) => {
    const generatedItem = generatedByRawId.get(raw.id ?? "") ?? generatedByLink.get(raw.url);
    const cached = cachedByHash.get(raw.hash);
    const source = generatedItem ?? {
      id: crypto.randomUUID(),
      briefing_id: "",
      raw_item_id: raw.id ?? null,
      section: raw.category === "ai" ? "ai" : "data_engineering",
      rank: index + 1,
      title: cached?.title ?? raw.title,
      summary: cached?.summary ?? raw.content ?? "No summary available.",
      detailed_summary: cached?.detailed_summary ?? cached?.summary ?? raw.content ?? null,
      key_takeaways: normalizeStringArray(cached?.key_takeaways),
      related_technologies: normalizeStringArray(cached?.related_technologies),
      source: raw.url,
      link: raw.url,
      category: cached?.category ?? raw.category,
      why_it_matters: cached?.why_it_matters ?? "This item matched the briefing profile.",
      suggested_action:
        cached?.suggested_action ??
        "Decide whether this changes a tool, workflow, learning topic, or content idea.",
      read_time_minutes: 1,
      published_at: raw.published_at ?? null,
      saved: false
    };
    return {
      ...source,
      rank: index + 1,
      published_at: raw.published_at ?? null,
      read_time_minutes: estimateTokens(
        `${source.summary} ${source.detailed_summary ?? ""} ${source.why_it_matters}`
      )
        ? Math.max(1, Math.ceil(`${source.summary} ${source.detailed_summary ?? ""}`.split(/\s+/).length / 220))
        : 1
    };
  });

  const tokenEstimate = [...(cachedRows ?? []), ...generated].reduce(
    (sum, item) =>
      sum +
      estimateTokens(
        `${item.title ?? ""} ${item.summary ?? ""} ${item.detailed_summary ?? ""} ${item.why_it_matters ?? ""}`
      ),
    0
  );

  return { items: briefingItems, generatedCount: generated.length, tokenEstimate };
}

export async function runDailyIngestion(options: IngestionOptions = {}) {
  const supabase = getSupabaseServiceClient();
  const date = options.date ?? todayIsoDate();
  const mode = options.mode ?? (options.dryRun ? "dry_run" : "manual_or_cron");

  const { data: existingBriefing } = await supabase
    .from("briefings")
    .select("id")
    .eq("briefing_date", date)
    .maybeSingle();

  if (existingBriefing && !options.force && !options.dryRun) {
    const [{ count: itemCount }, { data: signal }] = await Promise.all([
      supabase
        .from("briefing_items")
        .select("id", { count: "exact", head: true })
        .eq("briefing_id", existingBriefing.id),
      supabase.from("daily_signals").select("id").eq("briefing_date", date).maybeSingle()
    ]);

    if ((itemCount ?? 0) > 0 && signal) {
      return getTodayBriefing();
    }
  }

  const { data: runRow } = await supabase
    .from("ingestion_runs")
    .insert({
      run_date: date,
      mode,
      status: "started",
      dry_run: options.dryRun ?? false
    })
    .select()
    .single();

  const { data: sources, error: sourceError } = await supabase
    .from("sources")
    .select("*")
    .eq("enabled", true);

  if (sourceError) throw sourceError;

  const rawItems = await fetchAllSourceItems((sources ?? []) as Source[]);
  const articlesDeduplicated = rawItems.length;
  const rawRows = rawItems.map((item) => ({
    ...item,
    fetched_at: new Date().toISOString()
  }));

  if (rawRows.length && !options.dryRun) {
    const { error } = await supabase
      .from("raw_items")
      .upsert(rawRows, { onConflict: "hash" });
    if (error) throw error;
  }

  let candidateRawItems: RawItem[];
  if (options.dryRun) {
    candidateRawItems = rawItems
      .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
      .slice(0, 30);
  } else {
    const { data: storedRawItems, error: rawError } = await supabase
      .from("raw_items")
      .select("*")
      .gte("fetched_at", `${date}T00:00:00.000Z`)
      .order("relevance_score", { ascending: false })
      .limit(CANDIDATE_POOL_SIZE);

    if (rawError) throw rawError;
    candidateRawItems = (storedRawItems ?? []) as RawItem[];
  }

  let recentBriefingItems: RecentBriefingItem[] = [];
  if (!options.dryRun) {
    const { data: recentRows, error: recentError } = await supabase
      .from("briefing_items")
      .select("title, link, section, briefings!inner(briefing_date)")
      .gte("briefings.briefing_date", dateDaysBefore(date, RECENT_ITEM_LOOKBACK_DAYS))
      .lt("briefings.briefing_date", date);

    if (recentError) throw recentError;
    recentBriefingItems = ((recentRows ?? []) as Array<{
      title: string;
      link: string;
      section: BriefingItem["section"];
    }>).map((item) => ({
      title: item.title,
      link: item.link,
      section: item.section
    }));
  }

  const dataCandidates = candidateRawItems.filter((item) => item.category !== "ai");
  const aiCandidates = candidateRawItems.filter((item) => item.category === "ai");
  const dataItems = selectFreshItems(dataCandidates, "data_engineering", recentBriefingItems);
  const aiItems = selectFreshItems(aiCandidates, "ai", recentBriefingItems);

  const selectedRawItems = [...dataItems, ...aiItems];
  const summarizedResult = options.dryRun
    ? {
        items: [] as BriefingItem[],
        generatedCount: 0,
        tokenEstimate: selectedRawItems.reduce(
          (sum, item) => sum + estimateTokens(`${item.title} ${item.content ?? ""}`),
          0
        )
      }
    : await summarizeWithCache(selectedRawItems);
  const summarized = summarizedResult.items;
  const briefingItems: BriefingItem[] = [
    ...summarized
      .filter((item) => item.section === "data_engineering")
      .map((item, index) => ({ ...item, rank: index + 1 })),
    ...summarized
      .filter((item) => item.section === "ai")
      .map((item, index) => ({ ...item, rank: index + 1 }))
  ];

  const totalReadTime = briefingItems.reduce(
    (sum, item) => sum + item.read_time_minutes,
    4
  );

  if (options.dryRun) {
    if (runRow?.id) {
      await supabase
        .from("ingestion_runs")
        .update({
          status: "completed",
          articles_fetched: rawRows.length,
          articles_deduplicated: articlesDeduplicated,
          summaries_generated: summarizedResult.generatedCount,
          token_estimate: summarizedResult.tokenEstimate,
          completed_at: new Date().toISOString(),
          notes: { selected_items: selectedRawItems.length }
        })
        .eq("id", runRow.id);
    }
    return {
      dry_run: true,
      articles_fetched: rawRows.length,
      articles_deduplicated: articlesDeduplicated,
      selected_items: selectedRawItems.length,
      summaries_generated: summarizedResult.generatedCount,
      token_estimate: summarizedResult.tokenEstimate
    };
  }

  const { data: briefing, error: briefingError } = await supabase
    .from("briefings")
    .upsert(
      {
        briefing_date: date,
        title: "Morning Data Briefing",
        intro:
          "A focused scan of the data engineering and AI updates most likely to matter today.",
        total_read_time_minutes: totalReadTime
      },
      { onConflict: "briefing_date" }
    )
    .select()
    .single();

  if (briefingError) throw briefingError;

  await supabase.from("briefing_items").delete().eq("briefing_id", briefing.id);

  if (briefingItems.length) {
    const { error } = await supabase.from("briefing_items").insert(
      briefingItems.map((item) => ({
        briefing_id: briefing.id,
        raw_item_id: item.raw_item_id,
        section: item.section,
        rank: item.rank,
        title: item.title,
        summary: item.summary,
        source: item.source,
        link: item.link,
        category: item.category,
        why_it_matters: item.why_it_matters,
        suggested_action: item.suggested_action,
        detailed_summary: item.detailed_summary,
        key_takeaways: item.key_takeaways ?? [],
        related_technologies: item.related_technologies ?? [],
        published_at: item.published_at,
        read_time_minutes: item.read_time_minutes,
        saved: item.saved
      }))
    );
    if (error) throw error;

    await supabase.from("expanded_summaries").upsert(
      briefingItems.map((item) => ({
        raw_item_hash: item.raw_item_id ?? item.link,
        briefing_item_id: null,
        short_summary: item.summary,
        detailed_summary: item.detailed_summary ?? item.summary,
        key_takeaways: item.key_takeaways ?? [],
        why_it_matters: item.why_it_matters,
        suggested_action:
          item.suggested_action ??
          "Use this item to decide what to read, learn, post, or try next.",
        source_link: item.link,
        updated_at: new Date().toISOString()
      })),
      { onConflict: "raw_item_hash" }
    );
  }

  const { data: topics, error: topicsError } = await supabase
    .from("certification_topics")
    .select("*")
    .eq("enabled", true)
    .order("order_index");

  if (topicsError) throw topicsError;

  const topic = selectTopicForDate(topics ?? [], date);
  let certificationTitle: string | undefined;
  if (topic) {
    const byte = await generateCertificationByte(topic, date);
    certificationTitle = byte.title;
    const { error } = await supabase.from("certification_bytes").upsert(
      {
        topic_id: byte.topic_id,
        briefing_date: byte.briefing_date,
        level: byte.level,
        title: byte.title,
        concept: byte.concept,
        exam_relevance: byte.exam_relevance,
        example: byte.example,
        question: byte.question,
        choices: byte.choices,
        answer: byte.answer,
        answer_explanation: byte.answer_explanation
      },
      { onConflict: "briefing_date" }
    );
    if (error) throw error;

    await supabase
      .from("certification_topics")
      .update({
        viewed_count: ((topic as { viewed_count?: number }).viewed_count ?? 0) + 1,
        last_viewed_at: new Date().toISOString()
      })
      .eq("id", topic.id);

    await supabase.from("certification_topic_progress").upsert(
      {
        topic_id: topic.id,
        viewed_at: new Date().toISOString()
      },
      { onConflict: "topic_id" }
    );
  }

  if ((topics ?? []).length) {
    const quiz = await generateCertificationQuiz(topics ?? [], date);
    const { data: quizRow, error: quizError } = await supabase
      .from("certification_quizzes")
      .upsert(
        {
          briefing_date: date,
          title: quiz.title,
          focus: quiz.focus
        },
        { onConflict: "briefing_date" }
      )
      .select()
      .single();

    if (quizError) throw quizError;

    await supabase.from("certification_quiz_questions").delete().eq("quiz_id", quizRow.id);

    const { error: questionsError } = await supabase
      .from("certification_quiz_questions")
      .insert(
        quiz.questions.map((question) => ({
          quiz_id: quizRow.id,
          topic_id: question.topic_id,
          rank: question.rank,
          level: question.level,
          domain: question.domain,
          question: question.question,
          choices: question.choices,
          answer: question.answer,
          answer_explanation: question.answer_explanation
        }))
      );

    if (questionsError) throw questionsError;
  }

  const discoveredVideos = await discoverYouTubeVideos();
  const uniqueDiscoveredVideos = Array.from(
    new Map(discoveredVideos.map((video) => [video.video_id, video])).values()
  );
  let storedVideos: YouTubeVideo[] = [];
  if (uniqueDiscoveredVideos.length) {
    const { data, error } = await supabase
      .from("youtube_videos")
      .upsert(
        uniqueDiscoveredVideos.map((video) => ({
          video_id: video.video_id,
          title: video.title,
          channel: video.channel,
          channel_id: video.channel_id,
          thumbnail: video.thumbnail,
          views: video.views,
          published_at: video.published_at,
          description: video.description,
          url: video.url,
          query: video.query,
          score: video.score,
          score_breakdown: video.score_breakdown ?? {},
          updated_at: new Date().toISOString()
        })),
        { onConflict: "video_id" }
      )
      .select("*");
    if (error) throw error;
    storedVideos = (data ?? []) as YouTubeVideo[];
  } else {
    const { data } = await supabase
      .from("youtube_videos")
      .select("*")
      .order("score", { ascending: false })
      .limit(3);
    storedVideos = (data ?? []) as YouTubeVideo[];
  }

  const topVideos = storedVideos.sort((a, b) => b.score - a.score).slice(0, 3);
  const videoInsights = await enrichVideoPicks(topVideos, date);
  await supabase.from("daily_video_picks").delete().eq("briefing_date", date);
  if (topVideos.length) {
    const { error } = await supabase.from("daily_video_picks").insert(
      topVideos.map((video, index) => ({
        briefing_date: date,
        video_id: video.id,
        rank: index + 1,
        why_useful: videoInsights[index]?.why_useful ?? "Relevant to today’s AI/data briefing.",
        estimated_value: videoInsights[index]?.estimated_value ?? "Medium"
      }))
    );
    if (error) throw error;
  }

  const ideas = await generateLinkedInIdeas({
    date,
    items: briefingItems,
    videos: topVideos
  });
  await supabase.from("linkedin_ideas").delete().eq("briefing_date", date);
  if (ideas.length) {
    const { error } = await supabase.from("linkedin_ideas").insert(
      ideas.map((idea) => ({
        briefing_date: date,
        ...idea
      }))
    );
    if (error) throw error;
  }

  const videoPickModels = topVideos.map((video, index) => ({
    id: "",
    briefing_date: date,
    rank: index + 1,
    why_useful: videoInsights[index]?.why_useful ?? "Relevant to today’s AI/data briefing.",
    estimated_value: videoInsights[index]?.estimated_value ?? "Medium",
    video
  })) as DailyVideoPick[];

  const signal = await generateDailySignal({
    date,
    dataItems: briefingItems.filter((item) => item.section === "data_engineering"),
    aiItems: briefingItems.filter((item) => item.section === "ai"),
    certificationTitle,
    videos: videoPickModels,
    linkedinIdeas: ideas.map((idea) => ({ id: "", briefing_date: date, ...idea }))
  });

  const { error: signalError } = await supabase.from("daily_signals").upsert(
    {
      ...signal,
      updated_at: new Date().toISOString()
    },
    { onConflict: "briefing_date" }
  );
  if (signalError) throw signalError;

  const actionIntelligence = await generateDailyActionIntelligence({
    date,
    briefingItems,
    videos: videoPickModels,
    linkedinIdeas: ideas.map((idea) => ({ id: "", briefing_date: date, ...idea })),
    certificationTitle
  });

  const { error: focusError } = await supabase.from("daily_focus").upsert(
    {
      briefing_date: date,
      theme: actionIntelligence.daily_focus.theme,
      read_item: actionIntelligence.daily_focus.read_item,
      watch_item: actionIntelligence.daily_focus.watch_item,
      learn_item: actionIntelligence.daily_focus.learn_item,
      post_item: actionIntelligence.daily_focus.post_item,
      try_item: actionIntelligence.daily_focus.try_item,
      estimated_total_minutes: actionIntelligence.daily_focus.estimated_total_minutes,
      why_selected: actionIntelligence.daily_focus.why_selected,
      updated_at: new Date().toISOString()
    },
    { onConflict: "briefing_date" }
  );
  if (focusError) throw focusError;

  const { error: ctoError } = await supabase.from("cto_briefings").upsert(
    {
      briefing_date: date,
      what_matters: actionIntelligence.cto_briefing.what_matters,
      why_it_matters: actionIntelligence.cto_briefing.why_it_matters,
      should_care: actionIntelligence.cto_briefing.should_care,
      practical_action: actionIntelligence.cto_briefing.practical_action,
      related_technologies: actionIntelligence.cto_briefing.related_technologies,
      expected_impact: actionIntelligence.cto_briefing.expected_impact,
      updated_at: new Date().toISOString()
    },
    { onConflict: "briefing_date" }
  );
  if (ctoError) throw ctoError;

  await supabase.from("content_opportunities").delete().eq("briefing_date", date);
  if (actionIntelligence.content_opportunities.length) {
    const { error } = await supabase.from("content_opportunities").insert(
      actionIntelligence.content_opportunities.map((opportunity) => ({
        briefing_date: date,
        opportunity_type: opportunity.opportunity_type,
        topic: opportunity.topic,
        why_relevant_now: opportunity.why_relevant_now,
        source_links: opportunity.source_links,
        talking_points: opportunity.talking_points,
        personal_angle: opportunity.personal_angle,
        opportunity_score: opportunity.opportunity_score
      }))
    );
    if (error) throw error;
  }

  await supabase.from("career_radar").delete().eq("briefing_date", date);
  if (actionIntelligence.career_radar.length) {
    const { error } = await supabase.from("career_radar").insert(
      actionIntelligence.career_radar.map((item) => ({
        briefing_date: date,
        topic: item.topic,
        momentum_score: item.momentum_score,
        why_growing: item.why_growing,
        relevance_to_data_engineer: item.relevance_to_data_engineer,
        suggested_learning_action: item.suggested_learning_action
      }))
    );
    if (error) throw error;
  }

  await supabase.from("tool_recommendations").delete().eq("briefing_date", date);
  if (actionIntelligence.tool_recommendations.length) {
    const { error } = await supabase.from("tool_recommendations").insert(
      actionIntelligence.tool_recommendations.map((item) => ({
        briefing_date: date,
        tool_name: item.tool_name,
        what_it_does: item.what_it_does,
        why_it_matters: item.why_it_matters,
        trial_step: item.trial_step,
        source_link: item.source_link ?? null
      }))
    );
    if (error) throw error;
  }

  if (isSunday(date)) {
    const weekStart = weekStartFor(date);
    const { data: weekItems } = await supabase
      .from("briefing_items")
      .select("*, briefings!inner(briefing_date)")
      .gte("briefings.briefing_date", weekStart)
      .lte("briefings.briefing_date", date);
    const { data: weekVideos } = await supabase
      .from("daily_video_picks")
      .select("*, video:youtube_videos(*)")
      .gte("briefing_date", weekStart)
      .lte("briefing_date", date)
      .order("rank");
    const { data: weekContent } = await supabase
      .from("content_opportunities")
      .select("*")
      .gte("briefing_date", weekStart)
      .lte("briefing_date", date)
      .order("opportunity_score", { ascending: false });
    const { data: weekCertTopics } = await supabase
      .from("certification_bytes")
      .select("title")
      .gte("briefing_date", weekStart)
      .lte("briefing_date", date);

    const weeklyReport = await generateWeeklyIntelligenceReport({
      weekStart,
      weekEnd: date,
      items: (weekItems ?? []) as BriefingItem[],
      videos: (weekVideos ?? []) as DailyVideoPick[],
      contentOpportunities: (weekContent ?? []) as ContentOpportunity[],
      certificationTopics: (weekCertTopics ?? []).map((item) => item.title as string)
    });

    const { error } = await supabase.from("weekly_reports").upsert(
      {
        week_start: weeklyReport.week_start,
        week_end: weeklyReport.week_end,
        biggest_ai_development: weeklyReport.biggest_ai_development,
        biggest_data_engineering_development:
          weeklyReport.biggest_data_engineering_development,
        biggest_databricks_update: weeklyReport.biggest_databricks_update,
        most_discussed_trend: weeklyReport.most_discussed_trend,
        top_video: weeklyReport.top_video,
        best_content_opportunity: weeklyReport.best_content_opportunity,
        certification_topics_covered: weeklyReport.certification_topics_covered,
        recommended_focus_next_week: weeklyReport.recommended_focus_next_week,
        updated_at: new Date().toISOString()
      },
      { onConflict: "week_end" }
    );
    if (error) throw error;
  }

  if (runRow?.id) {
    await supabase
      .from("ingestion_runs")
      .update({
        status: "completed",
        articles_fetched: rawRows.length,
        articles_deduplicated: articlesDeduplicated,
        summaries_generated: summarizedResult.generatedCount,
        videos_fetched: discoveredVideos.length,
        videos_selected: topVideos.length,
        token_estimate: summarizedResult.tokenEstimate,
        completed_at: new Date().toISOString(),
        notes: { selected_items: selectedRawItems.length, youtube_enabled: Boolean(process.env.YOUTUBE_API_KEY) }
      })
      .eq("id", runRow.id);
  }

  return getTodayBriefing();
}
