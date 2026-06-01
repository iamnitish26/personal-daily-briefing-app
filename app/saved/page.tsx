import { BriefingCard } from "@/components/BriefingCard";
import { Nav } from "@/components/Nav";
import { getSupabaseAnonClient } from "@/lib/supabase";
import type { BriefingItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const supabase = getSupabaseAnonClient();
  const { data } = await supabase
    .from("briefing_items")
    .select("*")
    .eq("saved", true)
    .order("created_at", { ascending: false });

  const items = (data ?? []) as BriefingItem[];

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <header className="py-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">
            Reading List
          </p>
          <h1 className="mt-3 text-4xl font-black text-ink">Saved Items</h1>
        </header>
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <BriefingCard key={item.id} item={item} />
          ))}
        </div>
        {!items.length ? (
          <div className="rounded-lg border border-ink/10 bg-white/80 p-6 text-sm text-ink/65 shadow-soft">
            Saved briefing items will appear here.
          </div>
        ) : null}
      </main>
    </>
  );
}
