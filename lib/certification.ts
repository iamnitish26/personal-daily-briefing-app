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

function topicSpecificQuestion(topic: Topic, index: number): Pick<
  GeneratedQuizQuestion,
  "question" | "choices" | "answer" | "answer_explanation"
> {
  const normalizedTitle = topic.title.toLowerCase();

  if (normalizedTitle.includes("acid")) {
    return {
      question: "What is the primary benefit of ACID transactions in Delta Lake?",
      choices: [
        "A. They make table writes reliable by preserving atomicity, consistency, isolation, and durability",
        "B. They automatically convert every batch pipeline into a streaming pipeline",
        "C. They remove the need to define schemas for production tables",
        "D. They guarantee that every query runs without shuffle"
      ],
      answer: "A",
      answer_explanation:
        "Delta Lake ACID transactions protect table reliability by ensuring writes are committed consistently and readers do not see partial updates."
    };
  }

  if (normalizedTitle.includes("managed") && normalizedTitle.includes("external")) {
    return {
      question: "What is a key difference between managed and external tables in Unity Catalog?",
      choices: [
        "A. Managed tables have storage lifecycle managed by Databricks, while external tables reference data in an external location",
        "B. External tables cannot be queried with Spark SQL",
        "C. Managed tables are never governed by Unity Catalog",
        "D. External tables always store data in DBFS root"
      ],
      answer: "A",
      answer_explanation:
        "Unity Catalog can govern both table types, but managed tables let Databricks manage the storage location and lifecycle."
    };
  }

  if (normalizedTitle.includes("medallion")) {
    return {
      question: "In the Medallion Architecture, what is the primary purpose of the bronze layer?",
      choices: [
        "A. Store raw or lightly processed ingested data as the durable starting point",
        "B. Serve only final business aggregates to dashboards",
        "C. Replace silver and gold tables with a single table",
        "D. Store temporary driver-only data for notebook sessions"
      ],
      answer: "A",
      answer_explanation:
        "Bronze tables usually preserve raw ingested data so downstream silver and gold layers can clean, conform, and aggregate it."
    };
  }

  if (normalizedTitle.includes("auto loader")) {
    return {
      question: "What is the main advantage of using Auto Loader for file ingestion in Databricks?",
      choices: [
        "A. It incrementally discovers and processes new files without repeatedly listing all files",
        "B. It requires manually entering every new file path before ingestion",
        "C. It disables schema inference and schema evolution for all workloads",
        "D. It only works for single-file development datasets"
      ],
      answer: "A",
      answer_explanation:
        "Auto Loader is designed for scalable incremental file ingestion and can track newly arriving files efficiently."
    };
  }

  if (normalizedTitle.includes("workflow")) {
    return {
      question: "Which Databricks Workflows feature helps run tasks in a specific dependency order?",
      choices: [
        "A. Task dependencies in a job",
        "B. Disabling retries on every task",
        "C. Saving all task outputs only to the driver",
        "D. Running every task as an unrelated one-off notebook"
      ],
      answer: "A",
      answer_explanation:
        "Databricks Workflows jobs can define task dependencies so tasks run only after upstream tasks complete successfully."
    };
  }

  if (normalizedTitle.includes("spark sql")) {
    return {
      question: "What type of join returns all records from both tables, matching rows where possible?",
      choices: [
        "A. Full outer join",
        "B. Left semi join",
        "C. Inner join",
        "D. Cross join"
      ],
      answer: "A",
      answer_explanation:
        "A full outer join keeps unmatched rows from both sides and fills missing columns with nulls."
    };
  }

  if (normalizedTitle.includes("expectations") || normalizedTitle.includes("quality")) {
    return {
      question: "What is the purpose of expectations in Lakeflow Declarative Pipelines or Delta Live Tables?",
      choices: [
        "A. Define data quality rules that can monitor, drop, quarantine, or fail invalid records",
        "B. Convert all streaming tables into unmanaged CSV files",
        "C. Remove the need to test pipeline logic",
        "D. Disable lineage collection for governed datasets"
      ],
      answer: "A",
      answer_explanation:
        "Expectations express data quality checks directly in the pipeline so invalid records can be handled predictably."
    };
  }

  if (normalizedTitle.includes("unity catalog") || normalizedTitle.includes("governance")) {
    return {
      question: "What is the primary role of Unity Catalog in Databricks?",
      choices: [
        "A. Provide centralized governance for data, permissions, lineage, and discovery",
        "B. Replace Spark SQL with a separate query language",
        "C. Store only temporary notebook variables",
        "D. Disable access controls for shared workspaces"
      ],
      answer: "A",
      answer_explanation:
        "Unity Catalog centralizes governance across data and AI assets, including permissions, lineage, and metadata."
    };
  }

  if (normalizedTitle.includes("cluster policies") || normalizedTitle.includes("compute")) {
    return {
      question: "What is the purpose of cluster policies in Databricks?",
      choices: [
        "A. Control allowed compute settings so users follow cost, security, and governance rules",
        "B. Make every user a workspace administrator",
        "C. Disable job compute for production workloads",
        "D. Store Delta transaction logs outside the table location"
      ],
      answer: "A",
      answer_explanation:
        "Cluster policies constrain compute configuration, helping teams standardize safe and cost-aware settings."
    };
  }

  if (normalizedTitle.includes("change data capture")) {
    return {
      question: "Why is change data capture useful in Delta Lake pipelines?",
      choices: [
        "A. It lets downstream logic process changed records incrementally instead of reprocessing everything",
        "B. It prevents tables from supporting updates or deletes",
        "C. It requires every pipeline to run only once per month",
        "D. It stores only aggregate counts and discards source changes"
      ],
      answer: "A",
      answer_explanation:
        "CDC patterns reduce unnecessary reprocessing by focusing downstream work on inserts, updates, and deletes."
    };
  }

  if (normalizedTitle.includes("performance") || normalizedTitle.includes("optimization")) {
    return {
      question: "Which technique commonly helps optimize Spark job performance?",
      choices: [
        "A. Reduce unnecessary shuffles with appropriate partitioning, joins, and file layout",
        "B. Collect production-scale data to the driver before every transformation",
        "C. Disable caching and query plans for every workload",
        "D. Increase small files indefinitely to improve scan speed"
      ],
      answer: "A",
      answer_explanation:
        "Spark performance work often focuses on minimizing expensive shuffles, improving file layout, and choosing appropriate join strategies."
    };
  }

  const letter = index % 4 === 0 ? "B" : "A";
  return {
    question:
      letter === "A"
        ? `A production pipeline needs ${topic.title}. Which Databricks capability is the best fit?`
        : `A data engineer is reviewing ${topic.title}. Which practice is least appropriate for a production Databricks workload?`,
    choices:
      letter === "A"
        ? [
            `A. Use ${topic.title} to support the production scenario directly`,
            "B. Store production data only in local driver memory",
            "C. Avoid access controls until after users report issues",
            "D. Disable monitoring to reduce operational overhead"
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

function fallbackQuestion(topic: Topic, _date: string, index: number): GeneratedQuizQuestion {
  return {
    topic_id: topic.id,
    rank: index + 1,
    level: topic.level,
    domain: topic.domain,
    ...topicSpecificQuestion(topic, index)
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

function labelChoice(choice: string, index: number): string {
  const trimmed = choice.trim();
  const label = String.fromCharCode(65 + index);
  return /^[A-D][\).:-]\s*/i.test(trimmed) ? trimmed : `${label}. ${trimmed}`;
}

function choiceFromUnknown(choice: unknown): string | null {
  if (typeof choice === "string") return choice;
  if (!choice || typeof choice !== "object") return null;

  const record = choice as Record<string, unknown>;
  const text = record.text ?? record.choice ?? record.label ?? record.value ?? record.answer;
  return typeof text === "string" ? text : null;
}

function normalizeChoices(choices: unknown): string[] {
  if (Array.isArray(choices)) {
    const normalized = choices
      .map(choiceFromUnknown)
      .filter((choice): choice is string => Boolean(choice?.trim()))
      .slice(0, 4)
      .map(labelChoice);
    return new Set(normalized.map((choice) => choice.toLowerCase())).size === 4
      ? normalized
      : [];
  }

  if (choices && typeof choices === "object") {
    const record = choices as Record<string, unknown>;
    const normalized = ["A", "B", "C", "D"]
      .map((letter) => choiceFromUnknown(record[letter] ?? record[letter.toLowerCase()]))
      .filter((choice): choice is string => Boolean(choice?.trim()))
      .map(labelChoice);
    return normalized.length === 4 ? normalized : [];
  }

  return [];
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
    const choices = normalizeChoices(question.choices);
    const hasGeneratedChoices = choices.length === 4;
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
      question: hasGeneratedChoices
        ? question.question ?? fallbackQuestionForIndex.question
        : fallbackQuestionForIndex.question,
      choices: hasGeneratedChoices ? choices : fallbackQuestionForIndex.choices,
      answer: hasGeneratedChoices ? normalizeAnswer(question.answer) : fallbackQuestionForIndex.answer,
      answer_explanation:
        hasGeneratedChoices && question.answer_explanation
          ? question.answer_explanation
          : fallbackQuestionForIndex.answer_explanation
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
