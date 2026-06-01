import type { BriefingItem } from "@/lib/types";
import { BriefingCard } from "@/components/BriefingCard";

type Props = {
  title: string;
  items: BriefingItem[];
};

export function BriefingSection({ title, items }: Props) {
  return (
    <section className="mt-8 min-w-0">
      <div className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-2">
        <h2 className="min-w-0 text-xl font-bold leading-tight text-ink">{title}</h2>
        <span className="shrink-0 text-sm font-medium text-ink/45">
          {items.length} updates
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <BriefingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
