import OpenAI from "openai";
import type {
  CertificationByte,
  CertificationQuizQuestion,
  StoredCertificationQuiz
} from "@/lib/types";

type Topic = {
  id: string;
  title: string;
  level: "associate" | "professional";
  domain: string;
  order_index: number;
};

type GeneratedQuizQuestion = Omit<CertificationQuizQuestion, "id" | "quiz_id">;

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

function fallbackQuestion(topic: Topic, date: string, index: number): GeneratedQuizQuestion {
  const letter = index % 4 === 0 ? "B" : "A";
  return {
    topic_id: topic.id,
    rank: index + 1,
    level: topic.level,
    domain: topic.domain,
    question:
      letter === "A"
        ? `A production pipeline needs ${topic.title}. Which Databricks capability is the best fit?`
        : `A data engineer is reviewing ${topic.title}. Which practice is least appropriate for a production Databricks workload?`,
    choices:
      letter === "A"
        ? [
            "A. Use the Databricks feature that directly supports the governed workflow",
            "B. Disable table history to simplify operations",
            "C. Store production data only in local driver memory",
            "D. Avoid access controls until the pipeline is complete"
          ]
        : [
            "A. Document ownership, lineage, and operational expectations",
            "B. Skip validation and rely only on manual notebook inspection",
            "C. Use managed governance where sensitive data is involved",
            "D. Monitor failures and make the workflow restartable"
          ],
    answer: letter,
    answer_explanation:
      letter === "A"
        ? `${topic.title} questions usually test whether you can choose the right Databricks capability for a reliable, governed data engineering scenario.`
        : "Production Databricks workloads should be validated, monitored, governed, and repeatable; manual-only inspection is not a strong operational pattern."
  };
}

function fallbackQuiz(topics: Topic[], date: string): StoredCertificationQuiz {
  const associate = topics.filter((topic) => topic.level === "associate");
  const professional = topics.filter((topic) => topic.level === "professional");
  const rotation = [...associate, ...professional, ...topics];
  const selected = Array.from({ length: 10 }, (_, index) => {
    const topic = rotation[index % Math.max(rotation.length, 1)] ?? {
      id: crypto.randomUUID(),
      title: "Delta Lake reliability",
      level: "associate" as const,
      domain: "Delta Lake",
      order_index: 0
    };
    return fallbackQuestion(topic, date, index);
  });

  return {
    id: crypto.randomUUID(),
    briefing_date: date,
    title: "Daily Databricks Certification Quiz",
    focus: "Associate-first review with a light Professional stretch.",
    questions: selected.map((question) => ({
      ...question,
      id: crypto.randomUUID(),
      quiz_id: ""
    }))
  };
}

function normalizeAnswer(answer: string | undefined): string {
  const trimmed = (answer ?? "").trim().toUpperCase();
  return ["A", "B", "C", "D"].includes(trimmed) ? trimmed : "A";
}

function normalizeChoices(choices: unknown): string[] {
  if (!Array.isArray(choices)) return [];
  return choices.filter((choice): choice is string => typeof choice === "string").slice(0, 4);
}

export async function generateCertificationQuiz(
  topics: Topic[],
  date: string
): Promise<StoredCertificationQuiz> {
  const fallback = fallbackQuiz(topics, date);
  if (!process.env.OPENAI_API_KEY || !topics.length) return fallback;

  const associateTopics = topics
    .filter((topic) => topic.level === "associate")
    .sort((a, b) => a.order_index - b.order_index)
    .slice(0, 16);
  const professionalTopics = topics
    .filter((topic) => topic.level === "professional")
    .sort((a, b) => a.order_index - b.order_index)
    .slice(0, 8);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Create a 10-question Databricks Data Engineer certification quiz. Return JSON {title, focus, questions}. Questions must be relevant to Databricks Data Engineer Associate first, with 2-3 Professional stretch questions. Each question needs topic_title, level, domain, question, choices, answer, answer_explanation. choices must be four strings labelled A-D. answer must be A, B, C, or D. Avoid claiming official exam coverage; phrase as preparation practice."
      },
      {
        role: "user",
        content: JSON.stringify({
          date,
          associate_first: associateTopics,
          professional_stretch: professionalTopics,
          required_question_count: 10
        })
      }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as {
    title?: string;
    focus?: string;
    questions?: Array<{
      topic_title?: string;
      level?: "associate" | "professional";
      domain?: string;
      question?: string;
      choices?: string[];
      answer?: string;
      answer_explanation?: string;
    }>;
  };

  const topicByTitle = new Map(topics.map((topic) => [topic.title.toLowerCase(), topic]));
  const questions = (parsed.questions ?? []).slice(0, 10).map((question, index) => {
    const matchedTopic = question.topic_title
      ? topicByTitle.get(question.topic_title.toLowerCase())
      : undefined;
    const fallbackQuestionForIndex = fallback.questions[index] ?? fallback.questions[0];
    return {
      id: crypto.randomUUID(),
      quiz_id: "",
      topic_id: matchedTopic?.id ?? fallbackQuestionForIndex.topic_id ?? null,
      rank: index + 1,
      level:
        question.level === "professional" || question.level === "associate"
          ? question.level
          : fallbackQuestionForIndex.level,
      domain: question.domain ?? matchedTopic?.domain ?? fallbackQuestionForIndex.domain,
      question: question.question ?? fallbackQuestionForIndex.question,
      choices:
        normalizeChoices(question.choices).length === 4
          ? normalizeChoices(question.choices)
          : fallbackQuestionForIndex.choices,
      answer: normalizeAnswer(question.answer),
      answer_explanation:
        question.answer_explanation ?? fallbackQuestionForIndex.answer_explanation
    };
  });

  return {
    ...fallback,
    title: parsed.title ?? fallback.title,
    focus: parsed.focus ?? fallback.focus,
    questions: questions.length === 10 ? questions : fallback.questions
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
