/** Hard ceiling on any page size, however a caller or URL asks. */
export const MAX_PAGE_SIZE = 100;

export type PageWindow = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  skip: number;
  take: number;
};

/** Reads a ?page= value: whole numbers from 1, anything else (missing, NaN, negative, huge) is page 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : 1;
}

/**
 * Turns a requested page and a row count into a safe skip/take window. A page past the end is
 * pulled back to the last page, so a stale link never produces an empty screen.
 */
export function paginate(requestedPage: number, total: number, pageSize: number): PageWindow {
  const size = Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE);
  const safeTotal = Math.max(0, Math.floor(total));
  const pageCount = Math.max(1, Math.ceil(safeTotal / size));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), pageCount);
  return { page, pageSize: size, pageCount, total: safeTotal, skip: (page - 1) * size, take: size };
}

/** Builds a URL that keeps the current params and sets (or clears) one. */
export function hrefWith(
  basePath: string,
  current: Record<string, string | undefined>,
  changes: Record<string, string | undefined>
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...changes })) {
    if (v !== undefined && v !== '') q.set(k, v);
  }
  const qs = q.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
