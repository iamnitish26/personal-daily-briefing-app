import { CertificationByteCard } from "@/components/CertificationByteCard";
import { Nav } from "@/components/Nav";
import { getSupabaseAnonClient } from "@/lib/supabase";
import type { CertificationByte } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CertificationArchivePage() {
  const supabase = getSupabaseAnonClient();
  const { data } = await supabase
    .from("certification_bytes")
    .select("*")
    .order("briefing_date", { ascending: false })
    .limit(30);

  const bytes = (data ?? []) as CertificationByte[];

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl overflow-hidden px-4 pb-16 sm:px-6">
        <header className="py-10">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-gold sm:tracking-[0.18em]">
            Study Archive
          </p>
          <h1 className="mt-3 [overflow-wrap:anywhere] text-4xl font-black text-ink">
            Certification Archive
          </h1>
        </header>
        <div className="min-w-0 space-y-5">
          {bytes.map((byte) => (
            <CertificationByteCard key={byte.id} byte={byte} />
          ))}
        </div>
        {!bytes.length ? (
          <div className="rounded-lg border border-ink/10 bg-white/80 p-6 text-sm text-ink/65 shadow-soft">
            Daily certification bytes will appear here after ingestion runs.
          </div>
        ) : null}
      </main>
    </>
  );
}
