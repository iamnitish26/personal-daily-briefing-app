import { NextRequest, NextResponse } from "next/server";
import { runDailyIngestion } from "@/lib/briefing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return bearer === secret || querySecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const briefing = await runDailyIngestion();
    return NextResponse.json({ briefing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
