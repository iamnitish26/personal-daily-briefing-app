import OpenAI from "openai";
import type { BriefingItem, RawItem } from "@/lib/types";
import { estimateReadTime } from "@/lib/read-time";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

type SummaryResult = {
  item_key?: string;
  title: string;
  summary: string;
  category: string;
  why_it_matters: string;
};

function fallbackSummary(item: RawItem): SummaryResult {
  const content = item.content?.replace(/\s+/g, " ").trim();
  return {
    title: item.title,
    summary:
      content?.slice(0, 520) ||
      "This source published a relevant update. Open the source link for the full context.",
    category: item.category.replace("_", " "),
    why_it_matters:
      "It matches your briefing profile and may affect data platform, AI engineering, or certification priorities."
  };
}

export async function summarizeItems(items: RawItem[]): Promise<BriefingItem[]> {
  if (!items.length) return [];

  if (!process.env.OPENAI_API_KEY) {
    return items.map((item, index) => {
      const summary = fallbackSummary(item);
      return {
        id: crypto.randomUUID(),
        briefing_id: "",
        raw_item_id: item.id ?? null,
        section: item.category === "ai" ? "ai" : "data_engineering",
        rank: index + 1,
        source: item.url,
        link: item.url,
        read_time_minutes: estimateReadTime(`${summary.summary} ${summary.why_it_matters}`),
        saved: false,
        ...summary
      };
    });
  }

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write a practical morning briefing for a data engineer. Return compact JSON with an items array. Each item needs title, summary, category, why_it_matters. The summary must be a curated extract, not a teaser: 80 to 130 words, concrete, plain English, and focused on the actual substance of the article or release. Include the key product, feature, release, decision, or technical change; avoid hype and vague phrasing. why_it_matters must be one specific takeaway for someone interested in Databricks, Spark, Delta Lake, Unity Catalog, Airflow, dbt, Snowflake, OpenAI, Claude, Gemini, AI agents, LLM apps, or AI engineering."
      },
      {
        role: "user",
        content: JSON.stringify({
          items: items.map((item) => ({
            item_key: item.hash,
            title: item.title,
            url: item.url,
            category: item.category,
            content: item.content?.slice(0, 3000)
          })),
          instructions:
            "Return exactly one output item for each input item. Preserve item_key exactly so summaries can be matched to the correct source. Do not reorder, merge, or invent items."
        })
      }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as {
    items?: SummaryResult[];
  };
  const summariesByKey = new Map(
    (parsed.items ?? [])
      .filter((item): item is SummaryResult & { item_key: string } => Boolean(item.item_key))
      .map((item) => [item.item_key, item])
  );
  const canUseIndexFallback = summariesByKey.size === 0;

  return items.map((item, index) => {
    const summary =
      summariesByKey.get(item.hash) ??
      (canUseIndexFallback ? parsed.items?.[index] : undefined) ??
      fallbackSummary(item);
    return {
      id: crypto.randomUUID(),
      briefing_id: "",
      raw_item_id: item.id ?? null,
      section: item.category === "ai" ? "ai" : "data_engineering",
      rank: index + 1,
      title: summary.title || item.title,
      summary: summary.summary,
      source: item.url,
      link: item.url,
      category: summary.category,
      why_it_matters: summary.why_it_matters,
      read_time_minutes: estimateReadTime(`${summary.summary} ${summary.why_it_matters}`),
      saved: false
    };
  });
}
