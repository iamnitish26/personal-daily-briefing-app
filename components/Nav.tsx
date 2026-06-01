import Link from "next/link";

export function Nav() {
  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-fern">
        Morning Briefing
      </Link>
      <div className="flex items-center gap-3 text-sm font-medium text-ink/70">
        <Link href="/saved" className="hover:text-ink">
          Saved
        </Link>
        <Link href="/certification" className="hover:text-ink">
          Certification
        </Link>
      </div>
    </nav>
  );
}
