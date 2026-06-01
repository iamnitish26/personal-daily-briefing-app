import type { Priority } from "@/lib/types";

export const interestProfile: Record<Priority, string[]> = {
  high: [
    "Databricks",
    "Apache Spark",
    "Spark",
    "Delta Lake",
    "Unity Catalog",
    "Lakeflow",
    "Data Engineering",
    "OpenAI",
    "Claude",
    "Gemini",
    "AI agents",
    "agentic AI",
    "LLM apps"
  ],
  medium: ["Airflow", "dbt", "Snowflake", "data platform", "orchestration"],
  low: ["crypto", "unrelated startup", "generic AI hype", "funding"]
};

export function scoreText(text: string): number {
  const normalized = text.toLowerCase();
  let score = 0;

  for (const term of interestProfile.high) {
    if (normalized.includes(term.toLowerCase())) score += 5;
  }

  for (const term of interestProfile.medium) {
    if (normalized.includes(term.toLowerCase())) score += 2;
  }

  for (const term of interestProfile.low) {
    if (normalized.includes(term.toLowerCase())) score -= 3;
  }

  return score;
}
