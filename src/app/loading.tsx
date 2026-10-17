export default function Loading() {
  return (
    <main className="min-h-screen p-6 md:p-10" aria-busy="true" aria-live="polite">
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-24 rounded-3xl bg-black/5" />
        <div className="h-40 rounded-3xl bg-black/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-56 rounded-3xl bg-black/5" />
          <div className="h-56 rounded-3xl bg-black/5 md:col-span-2" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </main>
  );
}
