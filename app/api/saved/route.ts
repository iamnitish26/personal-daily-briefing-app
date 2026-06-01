import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase
      .from("briefing_items")
      .select("*")
      .eq("saved", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load saved items" },
      { status: 500 }
    );
  }
}
