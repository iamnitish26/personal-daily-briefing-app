import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { CertificationQuizAnswerReview, CertificationQuizQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

type SubmitBody = {
  quiz_id?: string;
  answers?: Record<string, string>;
};

function normalizeAnswer(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const answer = value.trim().toUpperCase();
  return ["A", "B", "C", "D"].includes(answer) ? answer : null;
}

function summarizeDomains(
  review: CertificationQuizAnswerReview[],
  mode: "strength" | "weakness"
): string[] {
  const byDomain = new Map<string, { correct: number; total: number }>();

  for (const item of review) {
    const current = byDomain.get(item.domain) ?? { correct: 0, total: 0 };
    byDomain.set(item.domain, {
      correct: current.correct + (item.is_correct ? 1 : 0),
      total: current.total + 1
    });
  }

  return [...byDomain.entries()]
    .filter(([, stats]) => {
      const ratio = stats.correct / stats.total;
      return mode === "strength" ? ratio >= 0.7 : ratio < 0.7;
    })
    .map(([domain, stats]) => `${domain} (${stats.correct}/${stats.total})`);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody;
    if (!body.quiz_id || !body.answers) {
      return NextResponse.json({ error: "quiz_id and answers are required" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { data: quiz, error: quizError } = await supabase
      .from("certification_quizzes")
      .select("id, briefing_date")
      .eq("id", body.quiz_id)
      .single();

    if (quizError) throw quizError;

    const { data: questionRows, error: questionsError } = await supabase
      .from("certification_quiz_questions")
      .select("*")
      .eq("quiz_id", body.quiz_id)
      .order("rank");

    if (questionsError) throw questionsError;

    const questions = (questionRows ?? []) as CertificationQuizQuestion[];
    if (!questions.length) {
      return NextResponse.json({ error: "Quiz has no questions" }, { status: 404 });
    }

    const normalizedAnswers = Object.fromEntries(
      Object.entries(body.answers)
        .map(([questionId, answer]) => [questionId, normalizeAnswer(answer)] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    );

    const review: CertificationQuizAnswerReview[] = questions.map((question) => {
      const selected = normalizedAnswers[question.id] ?? null;
      return {
        question_id: question.id,
        selected_answer: selected,
        correct_answer: question.answer,
        is_correct: selected === question.answer,
        explanation: question.answer_explanation,
        domain: question.domain,
        level: question.level
      };
    });

    const score = review.filter((item) => item.is_correct).length;
    const strengths = summarizeDomains(review, "strength");
    const weaknesses = summarizeDomains(review, "weakness");

    const { data: attempt, error: attemptError } = await supabase
      .from("certification_quiz_attempts")
      .insert({
        quiz_id: quiz.id,
        briefing_date: quiz.briefing_date,
        score,
        total_questions: questions.length,
        strengths,
        weaknesses,
        answers: normalizedAnswers,
        review
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    const weakTopicIds = questions
      .filter((question) =>
        review.some((item) => item.question_id === question.id && !item.is_correct)
      )
      .map((question) => question.topic_id)
      .filter((topicId): topicId is string => Boolean(topicId));

    if (weakTopicIds.length) {
      await supabase
        .from("certification_topics")
        .update({ weak_area: true })
        .in("id", weakTopicIds);
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit quiz" },
      { status: 500 }
    );
  }
}
