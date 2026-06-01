import OpenAI from "openai";
import type { CertificationByte } from "@/lib/types";

type Topic = {
  id: string;
  title: string;
  level: "associate" | "professional";
  domain: string;
  order_index: number;
};

function fallbackByte(topic: Topic, date: string): CertificationByte {
  return {
    id: crypto.randomUUID(),
    topic_id: topic.id,
    briefing_date: date,
    level: topic.level,
    title: topic.title,
    concept:
      "Understand the core Databricks workflow, the object being managed, and which feature provides governance, reliability, or orchestration for that workflow.",
    exam_relevance:
      "The exam often checks whether you can choose the right Databricks feature for a production data engineering scenario.",
    example:
      "For a governed pipeline, use Unity Catalog for permissions and lineage, Delta Lake for reliable tables, and Lakeflow or workflows for orchestration.",
    question: `Which capability is most directly related to ${topic.title}?`,
    choices: [
      "A. Applying governance and data engineering best practices in Databricks",
      "B. Replacing all SQL workloads with notebooks",
      "C. Avoiding managed tables in production",
      "D. Disabling lineage to improve performance"
    ],
    answer: "A",
    answer_explanation:
      "Databricks certification questions favor practical feature selection for reliable, governed data engineering."
  };
}

export async function generateCertificationByte(
  topic: Topic,
  date: string
): Promise<CertificationByte> {
  if (!process.env.OPENAI_API_KEY) return fallbackByte(topic, date);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Create one Databricks Data Engineer certification study byte. Return JSON with concept, exam_relevance, example, question, choices, answer, answer_explanation. Choices must be an array of four strings labelled A-D. Keep it practical."
      },
      {
        role: "user",
        content: JSON.stringify(topic)
      }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Partial<
    CertificationByte
  >;

  return {
    ...fallbackByte(topic, date),
    ...parsed,
    id: crypto.randomUUID(),
    topic_id: topic.id,
    briefing_date: date,
    level: topic.level,
    title: topic.title
  };
}

export function selectTopicForDate(topics: Topic[], date: string): Topic | null {
  const associate = topics
    .filter((topic) => topic.level === "associate")
    .sort((a, b) => a.order_index - b.order_index);
  const professional = topics
    .filter((topic) => topic.level === "professional")
    .sort((a, b) => a.order_index - b.order_index);
  const rotation = associate.length ? associate : professional;
  if (!rotation.length) return null;

  const dayNumber = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
  return rotation[dayNumber % rotation.length];
}
