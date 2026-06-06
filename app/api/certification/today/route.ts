import { NextResponse } from "next/server";
import { normalizeStoredQuiz, sanitizeQuizForClient } from "@/lib/certification-quiz";
import { todayIsoDate } from "@/lib/date";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("certification_bytes")
      .select("*")
      .eq("briefing_date", todayIsoDate())
      .maybeSingle();

    if (error) throw error;

    const { data: quizRow, error: quizError } = await supabase
      .from("certification_quizzes")
      .select("*, questions:certification_quiz_questions(*)")
      .eq("briefing_date", todayIsoDate())
      .maybeSingle();

    if (quizError) throw quizError;

    const quiz = sanitizeQuizForClient(normalizeStoredQuiz(quizRow));

    return NextResponse.json({ certification_byte: data ?? null, quiz });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load certification byte" },
      { status: 500 }
    );
  }
}
