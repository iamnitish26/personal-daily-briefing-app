export type SourceKind = "rss" | "static_url";
export type SourceCategory =
  | "data_engineering"
  | "ai"
  | "certification"
  | "community";

export type BriefingSection = "data_engineering" | "ai" | "certification";

export type Priority = "high" | "medium" | "low";

export type Source = {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  category: SourceCategory;
  enabled: boolean;
};

export type RawItem = {
  id?: string;
  source_id: string;
  external_id: string;
  title: string;
  url: string;
  author?: string | null;
  published_at?: string | null;
  content?: string | null;
  hash: string;
  category: SourceCategory;
  relevance_score?: number;
};

export type BriefingItem = {
  id: string;
  briefing_id: string;
  raw_item_id?: string | null;
  section: BriefingSection;
  rank: number;
  title: string;
  summary: string;
  source: string;
  link: string;
  category: string;
  why_it_matters: string;
  read_time_minutes: number;
  saved?: boolean;
};

export type CertificationByte = {
  id: string;
  topic_id: string;
  briefing_date: string;
  level: "associate" | "professional";
  title: string;
  concept: string;
  exam_relevance: string;
  example: string;
  question: string;
  choices: string[];
  answer: string;
  answer_explanation: string;
};

export type DailyBriefing = {
  id: string;
  briefing_date: string;
  title: string;
  intro: string;
  total_read_time_minutes: number;
  items: BriefingItem[];
  certification_byte?: CertificationByte | null;
};

export type FeedbackAction = "more_like_this" | "less_like_this" | "save";
