import Link from "next/link";

export function Nav() {
  return (
    <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
      <Link
        href="/"
        className="text-sm font-semibold uppercase tracking-[0.14em] text-fern dark:text-emerald-300 sm:tracking-[0.18em]"
      >
        Morning Briefing
      </Link>
      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-ink/70 dark:text-white/70">
        <Link href="/reports" className="hover:text-ink dark:hover:text-white">
          Reports
        </Link>
        <Link href="/saved" className="hover:text-ink dark:hover:text-white">
          Saved
        </Link>
        <Link href="/certification" className="hover:text-ink dark:hover:text-white">
          Certification
        </Link>
      </div>
    </nav>
  );
}
