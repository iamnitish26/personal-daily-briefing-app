"use client";

import { useMemo, useState } from "react";
import type {
  CertificationQuiz as CertificationQuizType,
  CertificationQuizAnswerReview,
  CertificationQuizAttempt
} from "@/lib/types";

type Props = {
  quiz: CertificationQuizType | null;
  latestAttempt?: CertificationQuizAttempt | null;
};

function answerLetter(choice: string, index: number): string {
  const match = choice.match(/^([A-D])[\).:-]\s*/i);
  return (match?.[1] ?? String.fromCharCode(65 + index)).toUpperCase();
}

function choiceText(choice: string): string {
  return choice.replace(/^[A-D][\).:-]\s*/i, "");
}

function reviewByQuestion(review: CertificationQuizAnswerReview[]) {
  return new Map(review.map((item) => [item.question_id, item]));
}

export function CertificationQuiz({ quiz, latestAttempt = null }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    latestAttempt?.answers ?? {}
  );
  const [attempt, setAttempt] = useState<CertificationQuizAttempt | null>(latestAttempt);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const answeredCount = quiz?.questions.filter((question) => answers[question.id]).length ?? 0;
  const reviewMap = useMemo(() => reviewByQuestion(attempt?.review ?? []), [attempt]);
  const isComplete = Boolean(quiz?.questions.length && answeredCount === quiz.questions.length);

  async function submitQuiz() {
    if (!quiz || !isComplete) return;
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/certification/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quiz.id, answers })
      });
      const payload = (await response.json()) as {
        attempt?: CertificationQuizAttempt;
        error?: string;
      };

      if (!response.ok || !payload.attempt) {
        throw new Error(payload.error ?? "Unable to submit quiz");
      }

      setAttempt(payload.attempt);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetAnswers() {
    setAnswers({});
    setAttempt(null);
    setError("");
  }

  if (!quiz) {
    return (
      <section className="mt-6 rounded-lg border border-ink/10 bg-white/85 p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.06]">
        <h2 className="text-xl font-bold text-ink dark:text-white">Daily Quiz</h2>
        <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">
          Today’s 10-question quiz will appear after the ingestion job runs.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
            Daily Databricks Quiz
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">{quiz.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">
            {quiz.focus}
          </p>
        </div>
        <div className="rounded-md bg-cloud/70 px-4 py-3 text-sm font-semibold text-ink dark:bg-white/10 dark:text-white">
          {attempt ? `${attempt.score}/${attempt.total_questions}` : `${answeredCount}/10`} complete
        </div>
      </div>

      {attempt ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-fern p-4 text-white dark:bg-emerald-950">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">
              Score
            </p>
            <p className="mt-2 text-4xl font-black">
              {Math.round((attempt.score / attempt.total_questions) * 100)}%
            </p>
            <p className="mt-1 text-sm text-white/75">
              {attempt.score} correct out of {attempt.total_questions}
            </p>
          </div>
          <div className="rounded-md bg-cloud/70 p-4 dark:bg-white/10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-fern dark:text-emerald-300">
              Strengths
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-white/70">
              {attempt.strengths.length ? attempt.strengths.join(", ") : "No clear strength yet"}
            </p>
          </div>
          <div className="rounded-md bg-cloud/70 p-4 dark:bg-white/10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold dark:text-amber-300">
              Weaknesses
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-white/70">
              {attempt.weaknesses.length ? attempt.weaknesses.join(", ") : "No weak area flagged"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {quiz.questions.map((question) => {
          const questionReview = reviewMap.get(question.id);
          return (
            <article
              key={question.id}
              className="rounded-lg border border-ink/10 bg-morning/70 p-4 dark:border-white/10 dark:bg-black/10"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/45 dark:text-white/45">
                <span>Question {question.rank}</span>
                <span>{question.level}</span>
                <span>{question.domain}</span>
              </div>
              <h3 className="mt-3 [overflow-wrap:anywhere] text-base font-bold leading-7 text-ink dark:text-white">
                {question.question}
              </h3>
              <div className="mt-4 grid gap-2">
                {question.choices.map((choice, index) => {
                  const letter = answerLetter(choice, index);
                  const isSelected = answers[question.id] === letter;
                  const isCorrect = questionReview?.correct_answer === letter;
                  const isWrongSelection = Boolean(questionReview && isSelected && !isCorrect);
                  const resultClass = questionReview
                    ? isCorrect
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-100"
                      : isWrongSelection
                        ? "border-red-400 bg-red-50 text-red-950 dark:bg-red-500/15 dark:text-red-100"
                        : "border-ink/10 bg-white/70 text-ink/65 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60"
                    : isSelected
                      ? "border-fern bg-fern text-white"
                      : "border-ink/10 bg-white/80 text-ink hover:border-fern/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white";

                  return (
                    <button
                      key={`${question.id}-${letter}`}
                      type="button"
                      disabled={Boolean(attempt)}
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [question.id]: letter }))
                      }
                      className={`flex min-h-12 w-full items-start gap-3 rounded-md border px-3 py-3 text-left text-sm transition ${resultClass}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-black">
                        {letter}
                      </span>
                      <span className="[overflow-wrap:anywhere] leading-6">{choiceText(choice)}</span>
                    </button>
                  );
                })}
              </div>
              {questionReview ? (
                <p className="mt-3 [overflow-wrap:anywhere] text-sm leading-6 text-ink/65 dark:text-white/65">
                  <span className="font-semibold text-ink dark:text-white">
                    Correct answer: {questionReview.correct_answer}.
                  </span>{" "}
                  {questionReview.explanation}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/55 dark:text-white/55">
          {attempt ? "Review your answers above." : "Choose one answer for every question to submit."}
        </p>
        <div className="flex gap-2">
          {attempt ? (
            <button
              type="button"
              onClick={resetAnswers}
              className="rounded-md border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:border-fern/50 dark:border-white/10 dark:text-white"
            >
              Retake
            </button>
          ) : null}
          <button
            type="button"
            disabled={!isComplete || isSubmitting || Boolean(attempt)}
            onClick={submitQuiz}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-fern disabled:cursor-not-allowed disabled:bg-ink/30 dark:bg-white dark:text-ink dark:hover:bg-emerald-200 dark:disabled:bg-white/20"
          >
            {isSubmitting ? "Scoring..." : "Submit Quiz"}
          </button>
        </div>
      </div>
    </section>
  );
}
