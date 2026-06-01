import type { BriefingItem } from "@/lib/types";
import { BriefingCard } from "@/components/BriefingCard";

type Props = {
  title: string;
  items: BriefingItem[];
};

export function BriefingSection({ title, items }: Props) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <span className="text-sm font-medium text-ink/45">{items.length} updates</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <BriefingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
