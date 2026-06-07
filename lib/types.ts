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
  suggested_action?: string | null;
  detailed_summary?: string | null;
  key_takeaways?: string[];
  related_technologies?: string[];
  published_at?: string | null;
  read_time_minutes: number;
  saved?: boolean;
};

export type DailyFocus = {
  id: string;
  briefing_date: string;
  theme: string;
  read_item: SignalCard;
  watch_item: SignalCard;
  learn_item: SignalCard;
  post_item: SignalCard;
  try_item: SignalCard;
  estimated_total_minutes: number;
  why_selected: string;
};

export type CTOBriefing = {
  id: string;
  briefing_date: string;
  what_matters: string;
  why_it_matters: string;
  should_care: "High" | "Medium" | "Low";
  practical_action: string;
  related_technologies: string[];
  expected_impact: string;
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

export type CertificationQuizQuestion = {
  id: string;
  quiz_id: string;
  topic_id?: string | null;
  rank: number;
  level: "associate" | "professional";
  domain: string;
  question: string;
  choices: string[];
  answer: string;
  answer_explanation: string;
};

export type CertificationQuizPromptQuestion = Omit<
  CertificationQuizQuestion,
  "answer" | "answer_explanation"
>;

export type CertificationQuiz = {
  id: string;
  briefing_date: string;
  title: string;
  focus: string;
  created_at?: string;
  questions: CertificationQuizPromptQuestion[];
};

export type StoredCertificationQuiz = Omit<CertificationQuiz, "questions"> & {
  questions: CertificationQuizQuestion[];
};

export type CertificationQuizAnswerReview = {
  question_id: string;
  selected_answer?: string | null;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  domain: string;
  level: "associate" | "professional";
};

export type CertificationQuizAttempt = {
  id: string;
  quiz_id: string;
  briefing_date: string;
  score: number;
  total_questions: number;
  strengths: string[];
  weaknesses: string[];
  answers: Record<string, string>;
  review: CertificationQuizAnswerReview[];
  created_at: string;
};

export type SignalCard = {
  title: string;
  summary: string;
  why_it_matters?: string;
  link?: string;
  category?: string;
};

export type TryTodayItem = {
  title: string;
  description: string;
  type: "databricks" | "ai_tool" | "github_project" | "workflow" | "productivity";
  link?: string;
};

export type EmergingSignal = {
  topic: string;
  category: "ai" | "data_engineering" | "certification" | "community";
  evidence: string[];
  momentum: "High" | "Medium" | "Low";
};

export type DailySignal = {
  id: string;
  briefing_date: string;
  most_important_ai: SignalCard;
  most_important_data_engineering: SignalCard;
  certification_concept: SignalCard;
  video_worth_watching: SignalCard;
  linkedin_opportunity: SignalCard;
  what_to_try: TryTodayItem[];
  emerging_signals: EmergingSignal[];
};

export type YouTubeVideo = {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  channel_id?: string | null;
  thumbnail?: string | null;
  views: number;
  published_at?: string | null;
  description?: string | null;
  url: string;
  query?: string | null;
  score: number;
  score_breakdown?: Record<string, number>;
};

export type DailyVideoPick = {
  id: string;
  briefing_date: string;
  rank: number;
  why_useful: string;
  estimated_value: "High" | "Medium" | "Low";
  video: YouTubeVideo;
};

export type LinkedInIdea = {
  id: string;
  briefing_date: string;
  idea_type: "ai" | "data_engineering" | "engineering_career";
  topic: string;
  why_trending: string;
  discussion_points: string[];
  useful_references: Array<{ title: string; url?: string; source?: string }>;
  personal_angle: string;
  confidence_score: number;
};

export type ContentOpportunity = {
  id: string;
  briefing_date: string;
  opportunity_type: "ai" | "data_engineering" | "engineering_leadership";
  topic: string;
  why_relevant_now: string;
  source_links: Array<{ title: string; url?: string; source?: string }>;
  talking_points: string[];
  personal_angle: string;
  opportunity_score: number;
};

export type CareerRadarItem = {
  id: string;
  briefing_date: string;
  topic: string;
  momentum_score: number;
  why_growing: string;
  relevance_to_data_engineer: string;
  suggested_learning_action: string;
};

export type ToolRecommendation = {
  id: string;
  briefing_date: string;
  tool_name: string;
  what_it_does: string;
  why_it_matters: string;
  trial_step: string;
  source_link?: string | null;
};

export type WeeklyReport = {
  id: string;
  week_start: string;
  week_end: string;
  biggest_ai_development: SignalCard;
  biggest_data_engineering_development: SignalCard;
  biggest_databricks_update: SignalCard;
  most_discussed_trend: string;
  top_video: SignalCard;
  best_content_opportunity: SignalCard;
  certification_topics_covered: string[];
  recommended_focus_next_week: string;
};

export type IngestionRun = {
  id: string;
  run_date: string;
  mode: string;
  status: string;
  articles_fetched: number;
  articles_deduplicated: number;
  summaries_generated: number;
  videos_fetched: number;
  videos_selected: number;
  token_estimate: number;
  dry_run: boolean;
};

export type CertificationTopicProgress = {
  id: string;
  title: string;
  level: "associate" | "professional";
  domain: string;
  viewed_count: number;
  saved: boolean;
  weak_area: boolean;
  last_viewed_at?: string | null;
};

export type DailyBriefing = {
  id: string;
  briefing_date: string;
  title: string;
  intro: string;
  total_read_time_minutes: number;
  items: BriefingItem[];
  certification_byte?: CertificationByte | null;
  daily_focus?: DailyFocus | null;
  cto_briefing?: CTOBriefing | null;
  daily_signal?: DailySignal | null;
  video_picks?: DailyVideoPick[];
  linkedin_ideas?: LinkedInIdea[];
  content_opportunities?: ContentOpportunity[];
  career_radar?: CareerRadarItem[];
  tool_recommendations?: ToolRecommendation[];
  weekly_report?: WeeklyReport | null;
  latest_ingestion_run?: IngestionRun | null;
};

export type FeedbackAction = "more_like_this" | "less_like_this" | "save";
