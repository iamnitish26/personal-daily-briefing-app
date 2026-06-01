import type { BriefingItem, DailyBriefing, RawItem, Source } from "@/lib/types";
import { todayIsoDate } from "@/lib/date";
import { fetchAllSourceItems } from "@/lib/ingest";
import { summarizeItems } from "@/lib/openai";
import { generateCertificationByte, selectTopicForDate } from "@/lib/certification";
import { getSupabaseAnonClient, getSupabaseServiceClient } from "@/lib/supabase";

export async function getTodayBriefing(): Promise<DailyBriefing | null> {
  const supabase = getSupabaseAnonClient();
  const date = todayIsoDate();

  const { data: briefing, error: briefingError } = await supabase
    .from("briefings")
    .select("*")
    .eq("briefing_date", date)
    .maybeSingle();

  if (briefingError) throw briefingError;
  if (!briefing) return null;

  const [{ data: items, error: itemsError }, { data: certificationByte }] =
    await Promise.all([
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
        .maybeSingle()
    ]);

  if (itemsError) throw itemsError;

  return {
    ...briefing,
    items: items ?? [],
    certification_byte: certificationByte ?? null
  };
}

export async function runDailyIngestion(date = todayIsoDate()) {
  const supabase = getSupabaseServiceClient();

  const { data: sources, error: sourceError } = await supabase
    .from("sources")
    .select("*")
    .eq("enabled", true);

  if (sourceError) throw sourceError;

  const rawItems = await fetchAllSourceItems((sources ?? []) as Source[]);
  const rawRows = rawItems.map((item) => ({
    ...item,
    fetched_at: new Date().toISOString()
  }));

  if (rawRows.length) {
    const { error } = await supabase
      .from("raw_items")
      .upsert(rawRows, { onConflict: "hash" });
    if (error) throw error;
  }

  const { data: storedRawItems, error: rawError } = await supabase
    .from("raw_items")
    .select("*")
    .gte("fetched_at", `${date}T00:00:00.000Z`)
    .order("relevance_score", { ascending: false })
    .limit(30);

  if (rawError) throw rawError;

  const dataItems = ((storedRawItems ?? []) as RawItem[])
    .filter((item) => item.category !== "ai")
    .slice(0, 5);
  const aiItems = ((storedRawItems ?? []) as RawItem[])
    .filter((item) => item.category === "ai")
    .slice(0, 5);

  const summarized = await summarizeItems([...dataItems, ...aiItems]);
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
        read_time_minutes: item.read_time_minutes,
        saved: item.saved
      }))
    );
    if (error) throw error;
  }

  const { data: topics, error: topicsError } = await supabase
    .from("certification_topics")
    .select("*")
    .eq("enabled", true)
    .order("order_index");

  if (topicsError) throw topicsError;

  const topic = selectTopicForDate(topics ?? [], date);
  if (topic) {
    const byte = await generateCertificationByte(topic, date);
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
  }

  return getTodayBriefing();
}
