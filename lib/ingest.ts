import crypto from "node:crypto";
import Parser from "rss-parser";
import type { RawItem, Source } from "@/lib/types";
import { scoreText } from "@/lib/preferences";

const parser = new Parser();

function stableHash(input: string): string {
  return crypto.createHash("sha256").update(input.toLowerCase()).digest("hex");
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function dedupeRawItems(items: RawItem[]): RawItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.hash;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchRssSource(source: Source): Promise<RawItem[]> {
  const feed = await parser.parseURL(source.url);

  return feed.items.slice(0, 20).map((item) => {
    const url = normalizeUrl(item.link ?? source.url);
    const title = item.title ?? "Untitled update";
    const content = item.contentSnippet ?? item.content ?? "";
    const hash = stableHash(`${title}:${url}`);

    return {
      source_id: source.id,
      external_id: item.guid ?? url,
      title,
      url,
      author: item.creator ?? item.author ?? null,
      published_at: item.isoDate ?? item.pubDate ?? null,
      content,
      hash,
      category: source.category,
      relevance_score: scoreText(`${title} ${content}`)
    };
  });
}

async function fetchStaticSource(source: Source): Promise<RawItem[]> {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "personal-daily-briefing-app/0.1"
    },
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descriptionMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
  );
  const title = titleMatch?.[1]?.trim() || source.name;
  const content = descriptionMatch?.[1]?.trim() || "";
  const url = normalizeUrl(source.url);

  return [
    {
      source_id: source.id,
      external_id: url,
      title,
      url,
      author: null,
      published_at: new Date().toISOString(),
      content,
      hash: stableHash(`${title}:${url}`),
      category: source.category,
      relevance_score: scoreText(`${title} ${content}`)
    }
  ];
}

export async function fetchSourceItems(source: Source): Promise<RawItem[]> {
  if (source.kind === "rss") return fetchRssSource(source);
  return fetchStaticSource(source);
}

export async function fetchAllSourceItems(sources: Source[]): Promise<RawItem[]> {
  const settled = await Promise.allSettled(
    sources.filter((source) => source.enabled).map(fetchSourceItems)
  );

  const items = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  return dedupeRawItems(items).sort(
    (a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
  );
}
