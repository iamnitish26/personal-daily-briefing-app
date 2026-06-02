import type { YouTubeVideo } from "@/lib/types";
import { scoreText } from "@/lib/preferences";

const SEARCH_QUERIES = [
  "OpenAI",
  "ChatGPT",
  "Codex",
  "GPT",
  "Claude Anthropic",
  "Gemini AI",
  "AI Agents",
  "Agentic AI",
  "Databricks",
  "Apache Spark",
  "Delta Lake",
  "Data Engineering",
  "Cloud Compute"
];

const QUALITY_CHANNELS = [
  "openai",
  "anthropic",
  "google cloud",
  "google deepmind",
  "databricks",
  "dbt",
  "snowflake",
  "microsoft developer",
  "aws developers",
  "fireship",
  "deeplearning.ai",
  "lex fridman",
  "seattle data guy"
];

const CLICKBAIT_TERMS = [
  "shocking",
  "you won't believe",
  "destroyed",
  "insane",
  "secret",
  "must watch",
  "changed forever",
  "end of"
];

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    description?: string;
    thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
  };
};

type VideoDetail = {
  id: string;
  statistics?: { viewCount?: string };
};

function daysSince(date?: string | null): number {
  if (!date) return 999;
  return Math.max(0, (Date.now() - new Date(date).getTime()) / 86_400_000);
}

function clickbaitPenalty(title: string): number {
  const normalized = title.toLowerCase();
  const termPenalty = CLICKBAIT_TERMS.some((term) => normalized.includes(term)) ? 25 : 0;
  const capsPenalty =
    title.length > 16 && title.replace(/[^A-Z]/g, "").length / title.length > 0.45 ? 15 : 0;
  const punctuationPenalty = (title.match(/!/g)?.length ?? 0) > 1 ? 10 : 0;
  return termPenalty + capsPenalty + punctuationPenalty;
}

function scoreVideo(video: Omit<YouTubeVideo, "id">): Record<string, number> {
  const recency = Math.max(0, 35 - Math.floor(daysSince(video.published_at) * 2));
  const channelQuality = QUALITY_CHANNELS.some((channel) =>
    video.channel.toLowerCase().includes(channel)
  )
    ? 25
    : 8;
  const ageDays = Math.max(1, daysSince(video.published_at));
  const viewVelocity = Math.min(25, Math.floor(video.views / ageDays / 5000));
  const keywordMatch = Math.min(25, Math.max(0, scoreText(`${video.title} ${video.description}`)));
  const topicRelevance = /databricks|spark|delta|openai|claude|gemini|agent|data engineering|llm/i.test(
    `${video.title} ${video.description}`
  )
    ? 20
    : 5;
  const clickbait = -clickbaitPenalty(video.title);

  return {
    recency,
    channelQuality,
    viewVelocity,
    keywordMatch,
    topicRelevance,
    clickbait
  };
}

function totalScore(breakdown: Record<string, number>): number {
  return Object.values(breakdown).reduce((sum, value) => sum + value, 0);
}

async function youtubeGet<T>(path: string, params: Record<string, string>) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Missing YOUTUBE_API_KEY");

  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [name, value] of Object.entries({ ...params, key })) {
    url.searchParams.set(name, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`YouTube API failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export async function discoverYouTubeVideos(): Promise<YouTubeVideo[]> {
  if (!process.env.YOUTUBE_API_KEY) return [];

  const searchResults = await Promise.allSettled(
    SEARCH_QUERIES.map((query) =>
      youtubeGet<{ items?: SearchItem[] }>("search", {
        part: "snippet",
        q: query,
        type: "video",
        order: "relevance",
        maxResults: "3",
        publishedAfter: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        safeSearch: "moderate"
      }).then((result) => ({ query, items: result.items ?? [] }))
    )
  );

  const searchItems = searchResults.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value.items.map((item) => ({ query: result.value.query, item }))
      : []
  );

  const videoIds = Array.from(
    new Set(searchItems.map(({ item }) => item.id?.videoId).filter(Boolean))
  ) as string[];

  if (!videoIds.length) return [];

  const detailChunks = await Promise.all(
    Array.from({ length: Math.ceil(videoIds.length / 50) }, (_, index) =>
      youtubeGet<{ items?: VideoDetail[] }>("videos", {
        part: "statistics",
        id: videoIds.slice(index * 50, index * 50 + 50).join(",")
      })
    )
  );

  const details = new Map(
    detailChunks.flatMap((chunk) => chunk.items ?? []).map((item) => [item.id, item])
  );

  const videos: YouTubeVideo[] = [];

  for (const { query, item } of searchItems) {
    const videoId = item.id?.videoId;
    if (!videoId || !item.snippet?.title || !item.snippet.channelTitle) continue;
    const detail = details.get(videoId);
    const views = Number(detail?.statistics?.viewCount ?? 0);
    const base = {
      video_id: videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      channel_id: item.snippet.channelId ?? null,
      thumbnail:
        item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? null,
      views,
      published_at: item.snippet.publishedAt ?? null,
      description: item.snippet.description ?? "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      query,
      score: 0,
      score_breakdown: {}
    };
    const score_breakdown = scoreVideo(base);
    videos.push({
      id: "",
      ...base,
      score_breakdown,
      score: totalScore(score_breakdown)
    });
  }

  return videos
    .filter((video) => (video.score_breakdown?.clickbait ?? 0) > -25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}
