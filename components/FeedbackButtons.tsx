"use client";

import { useState } from "react";
import type { FeedbackAction } from "@/lib/types";

type Props = {
  itemId: string;
  saved?: boolean;
};

const actions: Array<{ label: string; action: FeedbackAction }> = [
  { label: "More like this", action: "more_like_this" },
  { label: "Less like this", action: "less_like_this" },
  { label: "Save", action: "save" }
];

export function FeedbackButtons({ itemId, saved }: Props) {
  const [pending, setPending] = useState<FeedbackAction | null>(null);
  const [isSaved, setIsSaved] = useState(saved ?? false);

  async function sendFeedback(action: FeedbackAction) {
    setPending(action);
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefingItemId: itemId, action })
    });

    if (response.ok && action === "save") setIsSaved(true);
    setPending(null);
  }

  return (
    <div className="grid grid-cols-1 gap-2 pt-3 min-[380px]:grid-cols-3 sm:flex sm:flex-wrap">
      {actions.map(({ label, action }) => (
        <button
          key={action}
          type="button"
          onClick={() => sendFeedback(action)}
          disabled={pending !== null || (action === "save" && isSaved)}
          className="min-w-0 rounded-md border border-ink/10 bg-white/70 px-3 py-1.5 text-center text-xs font-semibold leading-5 text-ink/70 transition hover:border-fern/40 hover:text-fern disabled:cursor-not-allowed disabled:opacity-50"
        >
          {action === "save" && isSaved ? "Saved" : pending === action ? "Saving" : label}
        </button>
      ))}
    </div>
  );
}
