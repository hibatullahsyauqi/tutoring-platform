export type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  group: 'Go to' | 'Students' | 'Actions';
  /** Extra words that should also match, e.g. "calendar" for the schedule. */
  keywords?: string;
};

/** Lowest score is the best match; null means no match. Prefix beats word-start beats anywhere. */
export function matchScore(item: PaletteItem, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const label = item.label.toLowerCase();
  const haystack = `${label} ${(item.hint ?? '').toLowerCase()} ${(item.keywords ?? '').toLowerCase()}`;
  if (label.startsWith(q)) return 1;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  if (label.includes(q)) return 3;
  // Every typed word must appear somewhere (label, hint or keywords).
  const words = q.split(/\s+/);
  if (words.every((w) => haystack.includes(w))) return 4;
  return null;
}

export function filterItems(items: PaletteItem[], query: string): PaletteItem[] {
  return items
    .map((item, order) => ({ item, order, score: matchScore(item, query) }))
    .filter((x): x is { item: PaletteItem; order: number; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map((x) => x.item);
}
