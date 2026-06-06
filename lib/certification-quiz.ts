import type {
  CertificationQuiz,
  CertificationQuizAttempt,
  CertificationQuizQuestion,
  StoredCertificationQuiz
} from "@/lib/types";

export function sanitizeQuizForClient(quiz: StoredCertificationQuiz | null): CertificationQuiz | null {
  if (!quiz) return null;

  return {
    ...quiz,
    questions: quiz.questions
      .map((question) => ({
        id: question.id,
        quiz_id: question.quiz_id,
        topic_id: question.topic_id,
        rank: question.rank,
        level: question.level,
        domain: question.domain,
        question: question.question,
        choices: question.choices
      }))
      .sort((a, b) => a.rank - b.rank)
  };
}

export function normalizeStoredQuiz(row: unknown): StoredCertificationQuiz | null {
  if (!row || typeof row !== "object") return null;
  const quiz = row as Omit<StoredCertificationQuiz, "questions"> & {
    questions?: CertificationQuizQuestion[];
  };

  return {
    ...quiz,
    questions: [...(quiz.questions ?? [])].sort((a, b) => a.rank - b.rank)
  };
}

export function normalizeQuizAttempt(row: unknown): CertificationQuizAttempt | null {
  if (!row || typeof row !== "object") return null;
  const attempt = row as CertificationQuizAttempt;
  return {
    ...attempt,
    strengths: Array.isArray(attempt.strengths) ? attempt.strengths : [],
    weaknesses: Array.isArray(attempt.weaknesses) ? attempt.weaknesses : [],
    answers:
      attempt.answers && typeof attempt.answers === "object" && !Array.isArray(attempt.answers)
        ? attempt.answers
        : {},
    review: Array.isArray(attempt.review) ? attempt.review : []
  };
}
