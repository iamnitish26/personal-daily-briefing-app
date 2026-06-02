import OpenAI from "openai";
import type {
  BriefingItem,
  DailySignal,
  DailyVideoPick,
  LinkedInIdea,
  RawItem,
  YouTubeVideo
} from "@/lib/types";
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
  detailed_summary?: string;
  key_takeaways?: string[];
  related_technologies?: string[];
  category: string;
  why_it_matters: string;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 6)
    : [];
}

function signalCard(value: unknown, fallback: DailySignal["most_important_ai"]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const candidate = value as Partial<DailySignal["most_important_ai"]>;
  return {
    ...fallback,
    ...candidate,
    title: candidate.title || fallback.title,
    summary: candidate.summary || fallback.summary
  };
}

function normalizeEmergingSignals(
  value: unknown,
  fallback: DailySignal["emerging_signals"]
) {
  const categories = new Set(["ai", "data_engineering", "certification", "community"]);
  const momentumValues = new Set(["High", "Medium", "Low"]);

  if (!Array.isArray(value)) return fallback;

  const signals = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      topic:
        (typeof item.topic === "string" && item.topic) ||
        (typeof item.title === "string" && item.title) ||
        "Emerging signal",
      category:
        typeof item.category === "string" && categories.has(item.category)
          ? (item.category as DailySignal["emerging_signals"][number]["category"])
          : "community",
      evidence: stringArray(item.evidence).length
        ? stringArray(item.evidence)
        : [typeof item.summary === "string" ? item.summary : "Repeated in today’s briefing."],
      momentum:
        typeof item.momentum === "string" && momentumValues.has(item.momentum)
          ? (item.momentum as DailySignal["emerging_signals"][number]["momentum"])
          : "Medium"
    }))
    .slice(0, 5);

  return signals.length ? signals : fallback;
}

function normalizeTryToday(value: unknown, fallback: DailySignal["what_to_try"]) {
  type TryTodayType = DailySignal["what_to_try"][number]["type"];
  const allowedTypes = new Set([
    "databricks",
    "ai_tool",
    "github_project",
    "workflow",
    "productivity"
  ]);

  if (!Array.isArray(value)) return fallback;

  const items = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      const fallbackItem = fallback[index] ?? fallback[0];
      const type: TryTodayType =
        typeof item.type === "string" && allowedTypes.has(item.type)
          ? (item.type as TryTodayType)
          : fallbackItem.type;

      return {
        title: typeof item.title === "string" ? item.title : fallbackItem.title,
        description:
          typeof item.description === "string" ? item.description : fallbackItem.description,
        type,
        link: typeof item.link === "string" ? item.link : fallbackItem.link
      };
    })
    .slice(0, 3);

  return items.length ? items : fallback;
}

function fallbackSummary(item: RawItem): SummaryResult {
  const content = item.content?.replace(/\s+/g, " ").trim();
  return {
    title: item.title,
    summary:
      content?.slice(0, 520) ||
      "This source published a relevant update. Open the source link for the full context.",
    detailed_summary:
      content?.slice(0, 900) ||
      "The source did not provide enough extractable text for a detailed summary. Use the source link for the full article.",
    key_takeaways: [
      "This item matched the current data engineering and AI interest profile.",
      "Review the source if the topic affects your tools, architecture, or learning plan."
    ],
    related_technologies: [item.category.replace("_", " ")],
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
            "Return exactly one output item for each input item. Preserve item_key exactly so summaries can be matched to the correct source. Do not reorder, merge, or invent items. For each item also return detailed_summary, key_takeaways as 2-4 bullets, and related_technologies as 2-6 concrete technologies or concepts."
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
      detailed_summary: summary.detailed_summary ?? summary.summary,
      key_takeaways: stringArray(summary.key_takeaways),
      related_technologies: stringArray(summary.related_technologies),
      source: item.url,
      link: item.url,
      category: summary.category,
      why_it_matters: summary.why_it_matters,
      read_time_minutes: estimateReadTime(`${summary.summary} ${summary.why_it_matters}`),
      saved: false
    };
  });
}

export async function generateDailySignal(args: {
  date: string;
  dataItems: BriefingItem[];
  aiItems: BriefingItem[];
  certificationTitle?: string;
  videos: DailyVideoPick[];
  linkedinIdeas: LinkedInIdea[];
}): Promise<Omit<DailySignal, "id">> {
  const fallback: Omit<DailySignal, "id"> = {
    briefing_date: args.date,
    most_important_ai: args.aiItems[0]
      ? {
          title: args.aiItems[0].title,
          summary: args.aiItems[0].summary,
          why_it_matters: args.aiItems[0].why_it_matters,
          link: args.aiItems[0].link,
          category: args.aiItems[0].category
        }
      : { title: "No AI signal yet", summary: "Run ingestion to generate today’s AI signal." },
    most_important_data_engineering: args.dataItems[0]
      ? {
          title: args.dataItems[0].title,
          summary: args.dataItems[0].summary,
          why_it_matters: args.dataItems[0].why_it_matters,
          link: args.dataItems[0].link,
          category: args.dataItems[0].category
        }
      : {
          title: "No data engineering signal yet",
          summary: "Run ingestion to generate today’s data engineering signal."
        },
    certification_concept: {
      title: args.certificationTitle ?? "Databricks certification byte",
      summary: "Review today’s Databricks certification concept and mini quiz."
    },
    video_worth_watching: args.videos[0]
      ? {
          title: args.videos[0].video.title,
          summary: args.videos[0].why_useful,
          link: args.videos[0].video.url,
          category: args.videos[0].estimated_value
        }
      : { title: "No video selected", summary: "Add YOUTUBE_API_KEY to enable video discovery." },
    linkedin_opportunity: args.linkedinIdeas[0]
      ? {
          title: args.linkedinIdeas[0].topic,
          summary: args.linkedinIdeas[0].why_trending,
          category: args.linkedinIdeas[0].idea_type
        }
      : {
          title: "No LinkedIn idea yet",
          summary: "Daily ideas are generated after briefing ingestion."
        },
    what_to_try: [
      {
        title: "Review one signal deeply",
        description: "Pick the highest-impact briefing item and try one related tool or workflow.",
        type: "workflow"
      }
    ],
    emerging_signals: []
  };

  if (!process.env.OPENAI_API_KEY) return fallback;

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Create a concise executive intelligence dashboard for a data engineer. Return JSON with most_important_ai, most_important_data_engineering, certification_concept, video_worth_watching, linkedin_opportunity, what_to_try, emerging_signals. Each signal needs title and summary. what_to_try is 3 practical items. emerging_signals is 3 topics with category, evidence array, and momentum High/Medium/Low."
      },
      {
        role: "user",
        content: JSON.stringify(args)
      }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Partial<
    Omit<DailySignal, "id">
  >;

  return {
    ...fallback,
    ...parsed,
    briefing_date: args.date,
    most_important_ai: signalCard(parsed.most_important_ai, fallback.most_important_ai),
    most_important_data_engineering: signalCard(
      parsed.most_important_data_engineering,
      fallback.most_important_data_engineering
    ),
    certification_concept: signalCard(
      parsed.certification_concept,
      fallback.certification_concept
    ),
    video_worth_watching: signalCard(
      parsed.video_worth_watching,
      fallback.video_worth_watching
    ),
    linkedin_opportunity: signalCard(
      parsed.linkedin_opportunity,
      fallback.linkedin_opportunity
    ),
    what_to_try: normalizeTryToday(parsed.what_to_try, fallback.what_to_try),
    emerging_signals: normalizeEmergingSignals(
      parsed.emerging_signals,
      fallback.emerging_signals
    )
  };
}

export async function generateLinkedInIdeas(args: {
  date: string;
  items: BriefingItem[];
  videos: YouTubeVideo[];
}): Promise<Omit<LinkedInIdea, "id" | "briefing_date">[]> {
  const expectedTypes = ["ai", "data_engineering", "engineering_career"] as const;
  const fallback: Omit<LinkedInIdea, "id" | "briefing_date">[] = [
    {
      idea_type: "ai",
      topic: "What reliable AI agents need from structured data",
      why_trending: "Agentic AI updates and tooling are appearing repeatedly across today’s sources.",
      discussion_points: [
        "Agents need governed context, not just chat interfaces.",
        "Structured retrieval matters for production quality.",
        "Data teams can become the reliability layer for AI apps."
      ],
      useful_references: args.items.slice(0, 2).map((item) => ({
        title: item.title,
        url: item.link,
        source: item.source
      })),
      personal_angle: "Share a lesson from your own data engineering work about making AI outputs trustworthy.",
      confidence_score: 70
    },
    {
      idea_type: "data_engineering",
      topic: "Databricks, dbt, and Snowflake architecture decisions",
      why_trending: "Data platform comparison and architecture content remains prominent in today’s briefing.",
      discussion_points: [
        "Tool choice depends on governance, performance, and team workflow.",
        "dbt and semantic layers are becoming more important for AI-ready data.",
        "Platform decisions should be framed around operating model, not brand preference."
      ],
      useful_references: args.items.slice(0, 3).map((item) => ({
        title: item.title,
        url: item.link,
        source: item.source
      })),
      personal_angle: "Explain how you would evaluate a platform decision as a working data engineer.",
      confidence_score: 68
    },
    {
      idea_type: "engineering_career",
      topic: "Learning in public through certification bytes",
      why_trending: "Daily certification practice creates repeatable learning moments for career growth.",
      discussion_points: [
        "Small daily reps compound faster than occasional cramming.",
        "Certification concepts are stronger when tied to real-world examples.",
        "Public learning posts can show consistency without pretending expertise."
      ],
      useful_references: [],
      personal_angle: "Post one concept you learned today and one mistake you are trying to avoid.",
      confidence_score: 64
    }
  ];

  if (!process.env.OPENAI_API_KEY) return fallback;

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Generate LinkedIn content opportunities, not full posts. Return JSON {ideas:[...]} with exactly one ai, one data_engineering, and one engineering_career idea. Each idea needs topic, why_trending, discussion_points array, useful_references array, personal_angle, confidence_score 0-100. Do not write complete LinkedIn posts."
      },
      { role: "user", content: JSON.stringify(args) }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as {
    ideas?: Omit<LinkedInIdea, "id" | "briefing_date">[];
  };

  if (!parsed.ideas?.length) return fallback;

  return expectedTypes.map((ideaType, index) => {
    const modelIdea =
      parsed.ideas?.find((idea) => idea.idea_type === ideaType) ?? parsed.ideas?.[index];
    const fallbackIdea = fallback[index];

    return {
      ...fallbackIdea,
      ...modelIdea,
      idea_type: ideaType,
      discussion_points: stringArray(modelIdea?.discussion_points) || fallbackIdea.discussion_points,
      useful_references: Array.isArray(modelIdea?.useful_references)
        ? modelIdea.useful_references.slice(0, 4)
        : fallbackIdea.useful_references,
      confidence_score:
        typeof modelIdea?.confidence_score === "number"
          ? Math.max(0, Math.min(100, modelIdea.confidence_score))
          : fallbackIdea.confidence_score
    };
  });
}

export async function enrichVideoPicks(
  videos: YouTubeVideo[],
  date: string
): Promise<Omit<DailyVideoPick, "id" | "briefing_date" | "video">[]> {
  const fallback = videos.slice(0, 3).map((video, index) => ({
    rank: index + 1,
    why_useful:
      "This video matches today’s AI and data engineering interest profile and has enough recency or relevance to be worth a quick scan.",
    estimated_value: (video.score > 70 ? "High" : video.score > 45 ? "Medium" : "Low") as
      | "High"
      | "Medium"
      | "Low"
  }));

  if (!process.env.OPENAI_API_KEY || !videos.length) return fallback;

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "For each selected YouTube video, explain why it is useful to a data/AI engineer. Return JSON {videos:[{rank, why_useful, estimated_value}]}. estimated_value must be High, Medium, or Low."
      },
      { role: "user", content: JSON.stringify({ date, videos: videos.slice(0, 3) }) }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as {
    videos?: Omit<DailyVideoPick, "id" | "briefing_date" | "video">[];
  };

  return parsed.videos?.length ? parsed.videos.slice(0, 3) : fallback;
}
