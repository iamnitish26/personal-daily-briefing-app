import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { FeedbackAction } from "@/lib/types";

const allowedActions = new Set<FeedbackAction>([
  "more_like_this",
  "less_like_this",
  "save"
]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      briefingItemId?: string;
      action?: FeedbackAction;
    };

    if (!body.briefingItemId || !body.action || !allowedActions.has(body.action)) {
      return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("feedback").insert({
      briefing_item_id: body.briefingItemId,
      action: body.action
    });

    if (error) throw error;

    if (body.action === "save") {
      const { error: saveError } = await supabase
        .from("briefing_items")
        .update({ saved: true })
        .eq("id", body.briefingItemId);
      if (saveError) throw saveError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feedback failed" },
      { status: 500 }
    );
  }
}
