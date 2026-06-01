import { NextResponse } from "next/server";
import { getTodayBriefing } from "@/lib/briefing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const briefing = await getTodayBriefing();
    return NextResponse.json({ briefing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load briefing" },
      { status: 500 }
    );
  }
}
