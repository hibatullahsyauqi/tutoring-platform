import Link from 'next/link';
import { hrefWith } from '@/lib/pagination';

/** Previous / next links with a "Page x of y" label. Renders nothing when everything fits on one page. */
export default function Pagination({
  basePath,
  params,
  pageParam = 'page',
  page,
  pageCount,
  total,
  noun = 'item',
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  pageParam?: string;
  page: number;
  pageCount: number;
  total: number;
  noun?: string;
}) {
  if (pageCount <= 1) return null;
  const go = (p: number) => hrefWith(basePath, params, { [pageParam]: p === 1 ? undefined : String(p) });

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <span className="text-xs font-medium text-slate-700">
        Page {page} of {pageCount} · {total} {noun}
        {total !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={go(page - 1)} className="glass-btn glass-btn-sm" scroll={false}>
            ← Previous
          </Link>
        ) : (
          <span className="glass-btn glass-btn-sm opacity-40 pointer-events-none" aria-disabled="true">
            ← Previous
          </span>
        )}
        {page < pageCount ? (
          <Link href={go(page + 1)} className="glass-btn glass-btn-sm" scroll={false}>
            Next →
          </Link>
        ) : (
          <span className="glass-btn glass-btn-sm opacity-40 pointer-events-none" aria-disabled="true">
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
