import { NextResponse } from "next/server";
import { todayIsoDate } from "@/lib/date";
import { getSupabaseAnonClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase
      .from("certification_bytes")
      .select("*")
      .eq("briefing_date", todayIsoDate())
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ certification_byte: data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load certification byte" },
      { status: 500 }
    );
  }
}
