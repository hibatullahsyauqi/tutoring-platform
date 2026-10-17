/**
 * Server actions end with redirect(), which works by throwing an error with a
 * NEXT_REDIRECT digest. A client-side catch must rethrow it so Next can navigate.
 */
export function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

/** Friendly alert text; in development it also carries the real error so failures are diagnosable. */
export function describeError(friendly: string, err: unknown): string {
  if (process.env.NODE_ENV !== 'development') return friendly;
  const e = err as { name?: string; message?: string; digest?: string };
  return `${friendly}\n\n[dev] ${e?.name ?? 'Error'}: ${e?.message ?? String(err)}${e?.digest ? `\ndigest: ${e.digest}` : ''}`;
}
