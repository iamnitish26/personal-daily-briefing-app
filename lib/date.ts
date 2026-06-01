export function todayIsoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function formatBriefingDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date(`${date}T08:00:00Z`));
}
