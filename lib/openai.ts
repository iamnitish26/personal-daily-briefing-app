import OpenAI from "openai";
import type {
  BriefingItem,
  CareerRadarItem,
  ContentOpportunity,
  CTOBriefing,
  DailyFocus,
  DailySignal,
  DailyVideoPick,
  LinkedInIdea,
  RawItem,
  ToolRecommendation,
  WeeklyReport,
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
  suggested_action?: string;
};

export type DailyActionIntelligence = {
  daily_focus: Omit<DailyFocus, "id">;
  cto_briefing: Omit<CTOBriefing, "id">;
  content_opportunities: Omit<ContentOpportunity, "id" | "briefing_date">[];
  career_radar: Omit<CareerRadarItem, "id" | "briefing_date">[];
  tool_recommendations: Omit<ToolRecommendation, "id" | "briefing_date">[];
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

function boundedScore(value: unknown, fallback: number): number {
  return typeof value === "number" ? Math.max(0, Math.min(100, Math.round(value))) : fallback;
}

function sourceLinks(value: unknown, fallback: ContentOpportunity["source_links"]) {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "Source",
      url: typeof item.url === "string" ? item.url : undefined,
      source: typeof item.source === "string" ? item.source : undefined
    }))
    .slice(0, 4);
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
      "It matches your briefing profile and may affect data platform, AI engineering, or certification priorities.",
    suggested_action: "Skim the details and decide whether this changes a tool, workflow, or learning priority."
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
            "Return exactly one output item for each input item. Preserve item_key exactly so summaries can be matched to the correct source. Do not reorder, merge, or invent items. For each item also return detailed_summary, key_takeaways as 2-4 bullets, related_technologies as 2-6 concrete technologies or concepts, and suggested_action as one practical next step the user can take in 5-15 minutes."
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
      suggested_action:
        summary.suggested_action ??
        "Save this if it affects your current data platform, AI engineering, or learning plan.",
      read_time_minutes: estimateReadTime(`${summary.summary} ${summary.why_it_matters}`),
      saved: false
    };
  });
}

export async function generateDailyActionIntelligence(args: {
  date: string;
  briefingItems: BriefingItem[];
  videos: DailyVideoPick[];
  linkedinIdeas: LinkedInIdea[];
  certificationTitle?: string;
}): Promise<DailyActionIntelligence> {
  const topItem = args.briefingItems[0];
  const topVideo = args.videos[0];
  const topIdea = args.linkedinIdeas[0];
  const references = args.briefingItems.slice(0, 4).map((item) => ({
    title: item.title,
    url: item.link,
    source: item.source
  }));
  const fallback: DailyActionIntelligence = {
    daily_focus: {
      briefing_date: args.date,
      theme: topItem?.category || "AI-ready data engineering",
      read_item: topItem
        ? { title: topItem.title, summary: topItem.summary, link: topItem.link }
        : { title: "Read the top briefing item", summary: "Run ingestion to populate today’s reading focus." },
      watch_item: topVideo
        ? { title: topVideo.video.title, summary: topVideo.why_useful, link: topVideo.video.url }
        : { title: "Watch today’s selected video", summary: "Add YouTube discovery or use stored video picks." },
      learn_item: {
        title: args.certificationTitle ?? "Databricks certification byte",
        summary: "Spend a few minutes on today’s Databricks concept and quiz."
      },
      post_item: topIdea
        ? { title: topIdea.topic, summary: topIdea.personal_angle }
        : { title: "Post one practical learning note", summary: "Share one engineering takeaway from today’s scan." },
      try_item: {
        title: "Turn one signal into a tiny experiment",
        summary: "Pick one tool, feature, or pattern and test it for five minutes."
      },
      estimated_total_minutes: 35,
      why_selected:
        "This focus balances immediate news, practical learning, and one small action you can complete today."
    },
    cto_briefing: {
      briefing_date: args.date,
      what_matters: topItem?.title ?? "No major signal available yet.",
      why_it_matters: topItem?.why_it_matters ?? "Ingestion has not produced enough context yet.",
      should_care: topItem ? "High" : "Low",
      practical_action: topItem?.suggested_action ?? "Review the dashboard once ingestion completes.",
      related_technologies: topItem?.related_technologies?.slice(0, 5) ?? [],
      expected_impact: "Useful for prioritising what to read, learn, post, or try today."
    },
    content_opportunities: [
      {
        opportunity_type: "ai",
        topic: topIdea?.topic ?? "AI agents need reliable data context",
        why_relevant_now: topIdea?.why_trending ?? "Agentic AI remains a recurring theme across sources.",
        source_links: references,
        talking_points: topIdea?.discussion_points ?? [
          "Agents need governed data access.",
          "Evaluation and observability are becoming core engineering concerns.",
          "Data engineers can provide the reliability layer."
        ],
        personal_angle: topIdea?.personal_angle ?? "Connect the trend to a real data engineering workflow.",
        opportunity_score: topIdea?.confidence_score ?? 70
      },
      {
        opportunity_type: "data_engineering",
        topic: "Data platforms for AI-ready analytics",
        why_relevant_now: "Today’s sources include platform, governance, and pipeline reliability signals.",
        source_links: references,
        talking_points: [
          "Governance matters more as AI consumes data assets.",
          "Reliability starts with table design and orchestration.",
          "Platform comparisons should be framed around operating model."
        ],
        personal_angle: "Explain what you would evaluate before choosing a platform pattern.",
        opportunity_score: 68
      },
      {
        opportunity_type: "engineering_leadership",
        topic: "Building a daily learning system",
        why_relevant_now: "Certification practice and daily scanning create compounding career benefits.",
        source_links: references.slice(0, 2),
        talking_points: [
          "Small daily reps beat irregular cramming.",
          "Learning sticks when tied to practical examples.",
          "Sharing concise lessons builds credibility."
        ],
        personal_angle: "Share the concept you studied today and one question it clarified.",
        opportunity_score: 64
      }
    ],
    career_radar: [
      {
        topic: "AI agents",
        momentum_score: 82,
        why_growing: "Agentic AI appears repeatedly across product updates, videos, and community projects.",
        relevance_to_data_engineer: "Agents need governed data access, quality checks, and operational context.",
        suggested_learning_action: "Review one agent workflow and identify where data reliability can fail."
      },
      {
        topic: "Unity Catalog",
        momentum_score: 74,
        why_growing: "Governance and lineage keep showing up in Databricks and AI-ready data discussions.",
        relevance_to_data_engineer: "It is central to secure data discovery, permissions, and lineage.",
        suggested_learning_action: "Practice grants, schemas, managed tables, and lineage questions."
      },
      {
        topic: "Lakeflow",
        momentum_score: 70,
        why_growing: "Pipeline automation and declarative data quality are increasingly important.",
        relevance_to_data_engineer: "It maps directly to production pipeline design and certification prep.",
        suggested_learning_action: "Compare Lakeflow Declarative Pipelines with classic job orchestration."
      }
    ],
    tool_recommendations: [
      {
        tool_name: topItem?.related_technologies?.[0] ?? "Databricks documentation",
        what_it_does: "Gives you a practical source to explore the highest-signal item from today.",
        why_it_matters: "A five-minute trial converts passive reading into useful context.",
        trial_step: "Open the source, find one feature or command, and write one practical takeaway.",
        source_link: topItem?.link
      }
    ]
  };

  if (!process.env.OPENAI_API_KEY) return fallback;

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Create a personal action intelligence dashboard for a data engineer. Return JSON with daily_focus, cto_briefing, content_opportunities, career_radar, tool_recommendations. Be concise, practical, and high-signal. Do not create complete LinkedIn posts. Use only provided sources."
      },
      {
        role: "user",
        content: JSON.stringify({
          date: args.date,
          briefing_items: args.briefingItems.slice(0, 10),
          videos: args.videos.slice(0, 3),
          content_ideas: args.linkedinIdeas,
          certification_title: args.certificationTitle,
          required_shapes: {
            content_opportunities: "exactly 3: ai, data_engineering, engineering_leadership",
            career_radar: "3 to 5 items",
            tool_recommendations: "1 to 3 items"
          }
        })
      }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Partial<{
    daily_focus: Partial<DailyFocus>;
    cto_briefing: Partial<CTOBriefing>;
    content_opportunities: Array<Partial<ContentOpportunity>>;
    career_radar: Array<Partial<CareerRadarItem>>;
    tool_recommendations: Array<Partial<ToolRecommendation>>;
  }>;

  const opportunityTypes = ["ai", "data_engineering", "engineering_leadership"] as const;

  return {
    daily_focus: {
      ...fallback.daily_focus,
      ...parsed.daily_focus,
      briefing_date: args.date,
      estimated_total_minutes: boundedScore(
        parsed.daily_focus?.estimated_total_minutes,
        fallback.daily_focus.estimated_total_minutes
      ),
      read_item: signalCard(parsed.daily_focus?.read_item, fallback.daily_focus.read_item),
      watch_item: signalCard(parsed.daily_focus?.watch_item, fallback.daily_focus.watch_item),
      learn_item: signalCard(parsed.daily_focus?.learn_item, fallback.daily_focus.learn_item),
      post_item: signalCard(parsed.daily_focus?.post_item, fallback.daily_focus.post_item),
      try_item: signalCard(parsed.daily_focus?.try_item, fallback.daily_focus.try_item)
    },
    cto_briefing: {
      ...fallback.cto_briefing,
      ...parsed.cto_briefing,
      briefing_date: args.date,
      should_care:
        parsed.cto_briefing?.should_care === "High" ||
        parsed.cto_briefing?.should_care === "Medium" ||
        parsed.cto_briefing?.should_care === "Low"
          ? parsed.cto_briefing.should_care
          : fallback.cto_briefing.should_care,
      related_technologies: stringArray(parsed.cto_briefing?.related_technologies).length
        ? stringArray(parsed.cto_briefing?.related_technologies)
        : fallback.cto_briefing.related_technologies
    },
    content_opportunities: opportunityTypes.map((type, index) => {
      const model = parsed.content_opportunities?.find((item) => item.opportunity_type === type) ??
        parsed.content_opportunities?.[index];
      const base = fallback.content_opportunities[index];
      return {
        ...base,
        ...model,
        opportunity_type: type,
        source_links: sourceLinks(model?.source_links, base.source_links),
        talking_points: stringArray(model?.talking_points).length
          ? stringArray(model?.talking_points).slice(0, 3)
          : base.talking_points,
        opportunity_score: boundedScore(model?.opportunity_score, base.opportunity_score)
      };
    }),
    career_radar: (parsed.career_radar?.length ? parsed.career_radar : fallback.career_radar)
      .slice(0, 5)
      .map((item, index) => {
        const base = fallback.career_radar[index] ?? fallback.career_radar[0];
        return {
          ...base,
          ...item,
          momentum_score: boundedScore(item.momentum_score, base.momentum_score)
        };
      }),
    tool_recommendations: (parsed.tool_recommendations?.length
      ? parsed.tool_recommendations
      : fallback.tool_recommendations
    )
      .slice(0, 3)
      .map((item, index) => ({
        ...fallback.tool_recommendations[index] ?? fallback.tool_recommendations[0],
        ...item
      }))
  };
}

export async function generateWeeklyIntelligenceReport(args: {
  weekStart: string;
  weekEnd: string;
  items: BriefingItem[];
  videos: DailyVideoPick[];
  contentOpportunities: ContentOpportunity[];
  certificationTopics: string[];
}): Promise<Omit<WeeklyReport, "id">> {
  const fallback: Omit<WeeklyReport, "id"> = {
    week_start: args.weekStart,
    week_end: args.weekEnd,
    biggest_ai_development: args.items.find((item) => item.section === "ai")
      ? signalCard(args.items.find((item) => item.section === "ai"), {
          title: "AI development",
          summary: "AI updates appeared throughout the week."
        })
      : { title: "AI development", summary: "No AI items found for this week." },
    biggest_data_engineering_development: args.items.find((item) => item.section === "data_engineering")
      ? signalCard(args.items.find((item) => item.section === "data_engineering"), {
          title: "Data engineering development",
          summary: "Data engineering updates appeared throughout the week."
        })
      : { title: "Data engineering development", summary: "No data items found for this week." },
    biggest_databricks_update: args.items.find((item) => /databricks|spark|delta|unity catalog|lakeflow/i.test(item.title))
      ? signalCard(args.items.find((item) => /databricks|spark|delta|unity catalog|lakeflow/i.test(item.title)), {
          title: "Databricks update",
          summary: "Databricks-related items appeared this week."
        })
      : { title: "Databricks update", summary: "No Databricks-specific item stood out this week." },
    most_discussed_trend: "AI-ready data platforms",
    top_video: args.videos[0]
      ? { title: args.videos[0].video.title, summary: args.videos[0].why_useful, link: args.videos[0].video.url }
      : { title: "No video selected", summary: "No weekly video was available." },
    best_content_opportunity: args.contentOpportunities[0]
      ? {
          title: args.contentOpportunities[0].topic,
          summary: args.contentOpportunities[0].personal_angle
        }
      : { title: "No content opportunity", summary: "No weekly content idea was available." },
    certification_topics_covered: args.certificationTopics,
    recommended_focus_next_week:
      "Spend next week connecting Databricks certification practice to one practical data engineering workflow."
  };

  if (!process.env.OPENAI_API_KEY) return fallback;

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Create a concise weekly intelligence report for a data engineer. Return JSON with biggest_ai_development, biggest_data_engineering_development, biggest_databricks_update, most_discussed_trend, top_video, best_content_opportunity, certification_topics_covered, recommended_focus_next_week."
      },
      { role: "user", content: JSON.stringify(args) }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Partial<WeeklyReport>;
  return {
    ...fallback,
    ...parsed,
    week_start: args.weekStart,
    week_end: args.weekEnd,
    biggest_ai_development: signalCard(
      parsed.biggest_ai_development,
      fallback.biggest_ai_development
    ),
    biggest_data_engineering_development: signalCard(
      parsed.biggest_data_engineering_development,
      fallback.biggest_data_engineering_development
    ),
    biggest_databricks_update: signalCard(
      parsed.biggest_databricks_update,
      fallback.biggest_databricks_update
    ),
    top_video: signalCard(parsed.top_video, fallback.top_video),
    best_content_opportunity: signalCard(
      parsed.best_content_opportunity,
      fallback.best_content_opportunity
    ),
    certification_topics_covered: stringArray(parsed.certification_topics_covered).length
      ? stringArray(parsed.certification_topics_covered)
      : fallback.certification_topics_covered
  };
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
